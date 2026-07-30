import { NextResponse } from "next/server";
import { createPendingOrderForSessionToken, saveShippingAddressForSessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";
import { parseAttributionCookie, parseGeoFromRequestHeaders, trackAnalyticsEvent } from "@/lib/analytics";
import { calculateCheckoutPricing, computeCouponDiscount, estimateOrderWeightKg, type ShippingMethod } from "@/lib/checkout-config";
import { getRazorpayClient } from "@/lib/razorpay";
import { resolveCheckoutItems } from "@/lib/products";
import { getActiveCouponByCode } from "@/lib/coupon-store";
import { syncShopifyInventoryForOrder } from "@/lib/shopify-admin";

function parseCookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1];
}

type CreateOrderRequest = {
  items?: Array<{
    productId?: string;
    quantity?: number;
  }>;
  shippingName?: string;
  shippingEmail?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPinCode?: string;
  shippingMethod?: ShippingMethod;
  couponCode?: string;
};

export async function POST(request: Request) {
  try {
    const sessionToken = await getAccountSessionTokenFromCookies();
    const body = (await request.json()) as CreateOrderRequest;
    const rawItems = body.items ?? [];
    const shippingName = body.shippingName?.trim() ?? "";
    const shippingEmail = body.shippingEmail?.trim() ?? "";
    const shippingAddress = body.shippingAddress?.trim() ?? "";
    const shippingCity = body.shippingCity?.trim() ?? "";
    const shippingState = body.shippingState?.trim() ?? "";
    const shippingPinCode = body.shippingPinCode?.trim() ?? "";
    const shippingMethod: ShippingMethod = body.shippingMethod === "air" ? "air" : "surface";
    const couponCode = body.couponCode?.trim().toUpperCase() ?? "";

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (!shippingAddress || !shippingState) {
      return NextResponse.json({ error: "Shipping address, state, and PIN code are required" }, { status: 400 });
    }

    if (!shippingEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingEmail)) {
      return NextResponse.json({ error: "A valid shipping email is required" }, { status: 400 });
    }

    if (shippingPinCode && !/^\d{6}$/.test(shippingPinCode)) {
      return NextResponse.json({ error: "PIN code must be 6 digits" }, { status: 400 });
    }

    const checkoutItems = rawItems
      .map((item) => ({
        productId: item.productId ?? "",
        quantity: typeof item.quantity === "number" ? item.quantity : 1,
      }))
      .filter((item) => item.productId.length > 0);

    const { items, totalPaise, currencyCode } = await resolveCheckoutItems(checkoutItems);

    if (items.length === 0 || totalPaise <= 0) {
      return NextResponse.json({ error: "No valid items found for checkout" }, { status: 400 });
    }

    const subtotalAmount = Math.round(totalPaise / 100);
    // Resolve coupon from DB
    let validatedCoupon: {
      code: string;
      label: string;
      description: string;
      discountAmount: number;
    } | null = null;

    if (couponCode) {
      const couponRecord = await getActiveCouponByCode(couponCode);
      if (!couponRecord) {
        return NextResponse.json({ error: "Coupon code is not valid or has expired" }, { status: 400 });
      }
      const { eligible, discountAmount } = computeCouponDiscount(subtotalAmount, couponRecord);
      if (!eligible) {
        return NextResponse.json(
          { error: `Coupon applies on orders above ₹${couponRecord.minSubtotal}` },
          { status: 400 },
        );
      }
      validatedCoupon = {
        code: couponRecord.code,
        label: couponRecord.label,
        description: couponRecord.description,
        discountAmount,
      };
    }

    const orderWeightKg = estimateOrderWeightKg(
      items.map((item) => ({ quantity: item.quantity, tags: item.product.tags })),
    );

    const pricing = calculateCheckoutPricing({
      subtotalAmount,
      shippingState,
      shippingMethod,
      orderWeightKg,
      validatedCoupon,
    });

    if (pricing.shippingStatus !== "resolved") {
      return NextResponse.json({ error: "Select a valid shipping state" }, { status: 400 });
    }


    if (pricing.totalAmount <= 0) {
      return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
    }

    const razorpay = getRazorpayClient();

    const order = await razorpay.orders.create({
      amount: pricing.totalAmount * 100,
      currency: currencyCode,
      receipt: `rcpt_${Date.now()}`,
      payment_capture: true,
      notes: {
        itemCount: String(items.length),
        shippingState,
        shippingMethod,
        orderWeightKg: String(orderWeightKg),
        shippingFee: String(pricing.shippingFee),
        discountAmount: String(pricing.discountAmount),
        couponCode: validatedCoupon?.code ?? "",
        shippingName,
        shippingCity,
        shippingPinCode,
      },
    });

    const totalAmount = Math.round(Number(order.amount) / 100);

    if (!sessionToken) {
      return NextResponse.json({ error: "Sign in required to place an order" }, { status: 401 });
    }

    let persistedOrder = null;

    // Save shipping address to user's profile so it's available for future purchases
    if (sessionToken && shippingAddress && shippingState) {
      await saveShippingAddressForSessionToken(sessionToken, {
        fullName: shippingName || undefined,
        email: shippingEmail || undefined,
        address: shippingAddress,
        city: shippingCity || undefined,
        state: shippingState,
        pinCode: shippingPinCode || undefined,
      }).catch(() => {
        // Non-fatal: address save failure should not block checkout
      });
    }

    if (sessionToken) {
      persistedOrder = await createPendingOrderForSessionToken(sessionToken, {
        orderId: order.id,
        totalAmount,
        subtotalAmount: pricing.subtotalAmount,
        shippingFee: pricing.shippingFee,
        taxAmount: 0,
        discountAmount: pricing.discountAmount,
        codFee: pricing.codFee,
        shippingLabel: pricing.shippingLabel,
        shippingMethod: pricing.shippingMethod,
        orderWeightKg,
        couponCode: validatedCoupon?.code,
        couponLabel: validatedCoupon?.label,
        currencyCode: order.currency,
        shippingName,
        shippingEmail,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingPinCode,
        items: items.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          image: item.product.img,
          unitPrice: item.product.priceAmount,
          quantity: item.quantity,
          lineTotal: item.product.priceAmount * item.quantity,
        })),
      });

      if (persistedOrder) {
        await syncShopifyInventoryForOrder(persistedOrder.id, "reserve").catch((error) => {
          console.error("Shopify inventory reserve sync failed", error);
        });
      }
    }

    const cookieHeader = request.headers.get("cookie") ?? "";
    const attribution = parseAttributionCookie(parseCookieValue(cookieHeader, "Firaang_analytics_attr"));
    const geo = parseGeoFromRequestHeaders(request.headers);

    await trackAnalyticsEvent({
      eventName: "order_created",
      visitorId: parseCookieValue(cookieHeader, "Firaang_analytics_vid") ?? "server-anonymous",
      sessionId: parseCookieValue(cookieHeader, "Firaang_analytics_sid") ?? `order-${Date.now()}`,
      pagePath: "/checkout",
      pageType: "checkout",
      referrerUrl: request.headers.get("referer") ?? undefined,
      source: attribution.source,
      campaign: attribution.campaign,
      medium: attribution.medium,
      term: attribution.term,
      content: attribution.content,
      gclid: attribution.gclid,
      fbclid: attribution.fbclid,
      msclkid: attribution.msclkid,
      ttclid: attribution.ttclid,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      userAgent: request.headers.get("user-agent") ?? "",
      orderId: order.id,
      orderAmount: totalAmount,
      currencyCode: order.currency,
      metadata: {
        paymentMethod: "online",
      },
    }).catch(() => {
      // Order creation should not fail due to analytics.
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      meta: {
        accountLinked: persistedOrder !== null,
      },
    });
  } catch (error) {
    console.error("Razorpay order creation failed", error);
    return NextResponse.json({ error: "Unable to create order" }, { status: 500 });
  }
}
