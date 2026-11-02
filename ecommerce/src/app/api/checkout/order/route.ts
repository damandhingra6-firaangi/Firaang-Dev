import { NextResponse } from "next/server";
import { createGuestOrder, createPendingOrderForSessionToken, getAccountSessionIdentityByToken, hasSuccessfullyUsedCouponForSessionToken, saveShippingAddressForSessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";
import { parseAttributionCookie, parseGeoFromRequestHeaders, trackAnalyticsEvent } from "@/lib/analytics";
import { calculateCheckoutPricing, computeCouponDiscount, estimateOrderWeightKg, type ShippingMethod } from "@/lib/checkout-config";
import { CUSTOM_DESIGN_SURCHARGE_INR } from "@/lib/catalog";
import { getCampaignCouponValidationErrorDetails, releaseCampaignCouponReservationByOrderId, reserveCampaignCouponForOrder, validateCampaignCouponForCheckout } from "@/lib/campaigns";
import { getDisplayPricing, isInclusiveDisplayPricingEnabled } from "@/lib/pricing-display";
import { getRazorpayClient } from "@/lib/razorpay";
import { resolveCheckoutItems } from "@/lib/products";
import { getActiveCouponByCode } from "@/lib/coupon-store";
import { syncShopifyInventoryForOrder } from "@/lib/shopify-admin";

const WELCOME5_COUPON_CODE = "WELCOME5";
const WELCOME5_SINGLE_USE_MESSAGE = "WELCOME5 can only be used once per customer.";

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
    selectedSize?: string;
    selectedVariantId?: string;
    customDesignSurchargeINR?: number;
  }>;
  shippingName?: string;
  shippingEmail?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPinCode?: string;
  shippingCountry?: string;
  shippingMethod?: ShippingMethod;
  couponCode?: string;
  displaySubtotalAmount?: number;
  displayTotalAmount?: number;
};

export async function POST(request: Request) {
  let reservedCampaignOrderId: string | null = null;
  try {
    const sessionToken = await getAccountSessionTokenFromCookies();
    const body = (await request.json()) as CreateOrderRequest;
    const rawItems = body.items ?? [];
    const shippingName = body.shippingName?.trim() ?? "";
    const shippingEmail = body.shippingEmail?.trim() ?? "";
    const shippingPhone = body.shippingPhone?.trim() ?? "";
    const shippingAddress = body.shippingAddress?.trim() ?? "";
    const shippingCity = body.shippingCity?.trim() ?? "";
    const shippingState = body.shippingState?.trim() ?? "";
    const shippingPinCode = body.shippingPinCode?.trim() ?? "";
    const shippingCountry = body.shippingCountry?.trim() || (shippingState ? "India" : "");
    const shippingMethod: ShippingMethod = body.shippingMethod === "air" ? "air" : "surface";
    const couponCode = body.couponCode?.trim().toUpperCase() ?? "";

    const sanitizedItems = rawItems
      .map((item) => {
        const productId = typeof item.productId === "string" ? item.productId.trim() : "";
        const quantityValue = Number(item.quantity);
        const validQuantity = Number.isFinite(quantityValue) && quantityValue > 0 ? Math.max(1, Math.floor(quantityValue)) : 0;
        const selectedSize = typeof item.selectedSize === "string" ? item.selectedSize.trim() : "";
        const selectedVariantId = typeof item.selectedVariantId === "string" ? item.selectedVariantId.trim() : "";

        if (!productId || validQuantity <= 0) {
          return null;
        }

        return {
          productId,
          quantity: validQuantity,
          ...(selectedSize ? { selectedSize } : {}),
          ...(selectedVariantId ? { selectedVariantId } : {}),
        };
      })
      .filter((item): item is { productId: string; quantity: number; selectedSize?: string; selectedVariantId?: string } => item !== null);

    if (rawItems.length === 0 || sanitizedItems.length === 0) {
      return NextResponse.json({ error: "Your cart contains stale or invalid items. Please refresh and try again." }, { status: 400 });
    }

    if (shippingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingEmail)) {
      return NextResponse.json({ error: "A valid shipping email is required" }, { status: 400 });
    }

    if (shippingPinCode && !/^\d{6}$/.test(shippingPinCode)) {
      return NextResponse.json({ error: "PIN code must be 6 digits" }, { status: 400 });
    }

    const checkoutItems = sanitizedItems;

    // Build a per-productId surcharge map (server clamps to the known constant to prevent tampering)
    const surchargeByProductId = new Map<string, number>();
    for (const item of rawItems) {
      const pid = item.productId ?? "";
      if (pid && typeof item.customDesignSurchargeINR === "number" && item.customDesignSurchargeINR > 0) {
        surchargeByProductId.set(pid, CUSTOM_DESIGN_SURCHARGE_INR);
      }
    }

    const { items: resolvedItems, currencyCode, staleProductIds = [] } = await resolveCheckoutItems(checkoutItems);
    const sizeLookup = new Map(sanitizedItems.map((item) => [item.productId, item]));

    // Apply custom design surcharge to matching resolved items
    const items = resolvedItems.map((item) => {
      const surcharge = surchargeByProductId.get(item.product.id) ?? 0;
      const matched = sizeLookup.get(item.product.id);
      const selectedSize = matched?.selectedSize ?? item.product.selectedSize;
      const selectedVariantId = matched?.selectedVariantId ?? item.product.selectedVariantId ?? item.product.id;
      const enrichedItem = {
        ...item,
        product: {
          ...item.product,
          selectedSize,
          selectedVariantId,
        },
        selectedSize,
        selectedVariantId,
      };

      if (surcharge <= 0) return enrichedItem;
      return {
        ...enrichedItem,
        product: {
          ...enrichedItem.product,
          name: `${enrichedItem.product.name} (Custom Print)`,
          priceAmount: enrichedItem.product.priceAmount + surcharge,
        },
      };
    });

    // Recalculate totalPaise from surcharge-adjusted items
    const totalPaise = items.reduce((sum, item) => {
      return sum + Math.round(item.product.priceAmount * 100) * item.quantity;
    }, 0);

    if (items.length === 0 || totalPaise <= 0) {
      console.warn("Checkout rejected: resolved item list is empty or total is non-positive.", {
        rawItemCount: rawItems.length,
        sanitizedItemCount: sanitizedItems.length,
        productIds: sanitizedItems.map((item) => item.productId),
        staleProductIds,
      });
      return NextResponse.json({
        error: "Your cart contains stale or invalid items. Please refresh and try again.",
        staleProductIds,
      }, { status: 400 });
    }

    const subtotalAmount = Math.round(totalPaise / 100);
    const useInclusiveDisplayPayable = isInclusiveDisplayPricingEnabled();

    const displayItems = items.map((item) => {
      const displayPricing = getDisplayPricing({
        priceAmount: item.product.priceAmount,
        compareAt: item.product.oldPrice,
      });

      return {
        ...item,
        displayUnitPrice: displayPricing.priceAmount,
      };
    });

    const pricingSubtotalAmount = subtotalAmount;
    // Resolve coupon from DB
    let validatedCoupon: {
      code: string;
      label: string;
      description: string;
      discountAmount: number;
    } | null = null;
    let campaignCouponCode: string | null = null;

    if (couponCode) {
      const couponRecord = await getActiveCouponByCode(couponCode);
      if (!couponRecord) {
        const sessionIdentity = sessionToken ? await getAccountSessionIdentityByToken(sessionToken) : null;
        const campaignValidation = await validateCampaignCouponForCheckout({
          code: couponCode,
          subtotalAmount: pricingSubtotalAmount,
          userId: sessionIdentity?.userId,
          sessionEmail: sessionIdentity?.email,
          checkoutEmail: shippingEmail,
        });

        if (!campaignValidation.valid) {
          const errorDetails = getCampaignCouponValidationErrorDetails({
            reason: campaignValidation.reason,
            campaign: campaignValidation.campaign,
          });
          return NextResponse.json({ error: errorDetails.message, code: errorDetails.code }, { status: 400 });
        }
        validatedCoupon = {
          code: campaignValidation.checkoutCoupon.code,
          label: campaignValidation.checkoutCoupon.label,
          description: campaignValidation.checkoutCoupon.description,
          discountAmount: campaignValidation.checkoutCoupon.discountAmount,
        };
        campaignCouponCode = campaignValidation.checkoutCoupon.code;
      } else {
        if (couponRecord.code === WELCOME5_COUPON_CODE && sessionToken) {
          const alreadyUsed = await hasSuccessfullyUsedCouponForSessionToken(sessionToken, couponRecord.code);

          if (alreadyUsed) {
            return NextResponse.json({ error: WELCOME5_SINGLE_USE_MESSAGE }, { status: 409 });
          }
        }

        const { eligible, discountAmount } = computeCouponDiscount(pricingSubtotalAmount, couponRecord);
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
    }

    const orderWeightKg = estimateOrderWeightKg(
      items.map((item) => ({ quantity: item.quantity, tags: item.product.tags })),
    );

    const pricing = calculateCheckoutPricing({
      subtotalAmount: pricingSubtotalAmount,
      shippingState,
      shippingMethod,
      orderWeightKg,
      validatedCoupon,
    });

    if (pricing.shippingStatus !== "resolved" && shippingState) {
      return NextResponse.json({ error: "Select a valid shipping state" }, { status: 400 });
    }

    const finalTotalAmount = useInclusiveDisplayPayable
      ? Math.max(0, pricingSubtotalAmount - pricing.discountAmount)
      : pricing.totalAmount;

    if (finalTotalAmount <= 0) {
      return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
    }

    const razorpay = getRazorpayClient();
    const lineItemsTotal = items.reduce((sum, item) => {
      return sum + Math.round(item.product.priceAmount * 100) * item.quantity;
    }, 0);
    const lineItems = items.map((item) => ({
      type: "e-commerce",
      sku: item.product.id,
      variant_id: item.product.parentId || item.product.id,
      price: String(Math.round(item.product.priceAmount * 100)),
      offer_price: String(Math.round(item.product.priceAmount * 100)),
      tax_amount: 0,
      quantity: item.quantity,
      name: item.product.name,
      description: item.product.name,
      weight: "0",
      dimensions: {
        length: "0",
        width: "0",
        height: "0",
      },
      image_url: item.product.img || "",
      product_url: item.product.handle ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"}/product/${item.product.handle}` : "https://example.com",
      notes: {
        productId: item.product.id,
        selectedSize: item.selectedSize ?? item.product.selectedSize ?? "",
        selectedVariantId: item.selectedVariantId ?? item.product.selectedVariantId ?? item.product.id,
      },
    }));

    const order = await razorpay.orders.create({
      amount: finalTotalAmount * 100,
      currency: currencyCode,
      receipt: `rcpt_${Date.now()}`,
      payment_capture: true,
      line_items_total: lineItemsTotal,
      line_items: lineItems,
      notes: {
        itemCount: String(items.length),
        shippingState,
        shippingMethod,
        orderWeightKg: String(orderWeightKg),
        shippingFee: String(useInclusiveDisplayPayable ? 0 : pricing.shippingFee),
        discountAmount: String(pricing.discountAmount),
        couponCode: validatedCoupon?.code ?? "",
        shippingName,
        shippingCity,
        shippingPinCode,
      },
    });

    const successPayload = {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
      staleProductIds: staleProductIds.length > 0 ? staleProductIds : undefined,
    };

    if (campaignCouponCode) {
      const reservation = await reserveCampaignCouponForOrder({ code: campaignCouponCode, orderId: order.id });
      if (!reservation.ok) {
        const errorDetails = getCampaignCouponValidationErrorDetails({ reason: reservation.reason });
        return NextResponse.json({ error: errorDetails.message, code: errorDetails.code }, { status: 409 });
      }
      reservedCampaignOrderId = order.id;
    }

    const totalAmount = Math.round(Number(order.amount) / 100);

    let persistedOrder = null;

    // Save shipping address to user's profile so it's available for future purchases
    if (sessionToken && shippingAddress && shippingState) {
      await saveShippingAddressForSessionToken(sessionToken, {
        fullName: shippingName || undefined,
        email: shippingEmail || undefined,
        phone: shippingPhone || undefined,
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
        subtotalAmount: pricingSubtotalAmount,
        shippingFee: useInclusiveDisplayPayable ? 0 : pricing.shippingFee,
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
        shippingPhone,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingPinCode,
        shippingCountry,
        items: displayItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          image: item.product.img,
          unitPrice: useInclusiveDisplayPayable ? item.displayUnitPrice : item.product.priceAmount,
          quantity: item.quantity,
          lineTotal:
            (useInclusiveDisplayPayable ? item.displayUnitPrice : item.product.priceAmount) *
            item.quantity,
          selectedSize: item.selectedSize ?? item.product.selectedSize,
          selectedVariantId: item.selectedVariantId ?? item.product.selectedVariantId ?? item.product.id,
        })),
      });
    } else {
      persistedOrder = await createGuestOrder({
        orderId: order.id,
        totalAmount,
        subtotalAmount: pricingSubtotalAmount,
        shippingFee: useInclusiveDisplayPayable ? 0 : pricing.shippingFee,
        taxAmount: 0,
        discountAmount: pricing.discountAmount,
        codFee: pricing.codFee,
        shippingLabel: pricing.shippingLabel,
        shippingMethod: pricing.shippingMethod,
        orderWeightKg,
        couponCode: validatedCoupon?.code,
        couponLabel: validatedCoupon?.label,
        currencyCode: order.currency,
        paymentMethod: "online",
        shippingName,
        shippingEmail,
        shippingPhone,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingPinCode,
        shippingCountry,
        items: displayItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          image: item.product.img,
          unitPrice: useInclusiveDisplayPayable ? item.displayUnitPrice : item.product.priceAmount,
          quantity: item.quantity,
          lineTotal: (useInclusiveDisplayPayable ? item.displayUnitPrice : item.product.priceAmount) * item.quantity,
          selectedSize: item.selectedSize ?? item.product.selectedSize,
          selectedVariantId: item.selectedVariantId ?? item.product.selectedVariantId ?? item.product.id,
        })),
      });
    }

    if (persistedOrder) {
      await syncShopifyInventoryForOrder(persistedOrder.id, "reserve").catch((error) => {
        console.error("Shopify inventory reserve sync failed", error);
      });
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
      ...successPayload,
      meta: {
        accountLinked: persistedOrder !== null,
      },
    });
  } catch (error) {
    if (reservedCampaignOrderId) {
      const orderIdToRelease = reservedCampaignOrderId;
      await releaseCampaignCouponReservationByOrderId(orderIdToRelease).catch(() => undefined);
    }
    console.error("Razorpay order creation failed", error);
    return NextResponse.json({ error: "Unable to create order" }, { status: 500 });
  }
}
