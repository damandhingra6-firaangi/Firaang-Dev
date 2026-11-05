import crypto from "crypto";
import { NextResponse } from "next/server";
import { findOrderWithCustomerByOrderId, markOrderPaidByOrderId, markOrderPaidForSessionToken, syncCustomerAndShippingDetailsByOrderId } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";
import { parseAttributionCookie, parseGeoFromRequestHeaders, trackAnalyticsEvent } from "@/lib/analytics";
import { attachShopifySyncResultToOrder } from "@/lib/account-data";
import { claimOrderConfirmationEmailSend, markOrderConfirmationEmailSent, releaseOrderConfirmationEmailClaim } from "@/lib/account-data";
import { getRazorpayClient } from "@/lib/razorpay";
import { mapRazorpayPaymentVerificationState } from "@/lib/razorpay-payment-status";
import { syncPaidOrderToShopify, syncShopifyInventoryForOrder } from "@/lib/shopify-admin";
import { notifyOrderPaid } from "@/lib/order-notifications";
import { getSiteUrl } from "@/lib/site";

function parseCookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1];
}

function readFirstDefinedValue(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }

  return undefined;
}

function readNestedValue(record: Record<string, unknown> | null | undefined, path: string[]) {
  let current: unknown = record;

  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  if (typeof current === "string" && current.trim()) {
    return current.trim();
  }

  if (typeof current === "number") {
    return String(current);
  }

  return undefined;
}

function isLikelyPersonName(value: string | undefined) {
  const trimmed = (value ?? "").trim();

  if (!trimmed || trimmed.includes("@") || /^\+?[\d\s\-()]{7,}$/.test(trimmed)) {
    return false;
  }

  return trimmed.length >= 2;
}

function extractMagicCheckoutCustomerData(paymentRecord: Record<string, unknown> | null | undefined, gatewayOrder: Record<string, unknown> | null | undefined) {
  const paymentSource = paymentRecord ?? {};
  const orderSource = gatewayOrder ?? {};
  const notes = {
    ...(typeof paymentSource.notes === "object" && paymentSource.notes ? (paymentSource.notes as Record<string, unknown>) : {}),
    ...(typeof orderSource.notes === "object" && orderSource.notes ? (orderSource.notes as Record<string, unknown>) : {}),
  };

  const paymentCustomer = typeof paymentSource.customer === "object" && paymentSource.customer ? (paymentSource.customer as Record<string, unknown>) : {};
  const orderCustomer = typeof orderSource.customer === "object" && orderSource.customer ? (orderSource.customer as Record<string, unknown>) : {};
  const paymentCustomerDetails = typeof paymentSource.customer_details === "object" && paymentSource.customer_details ? (paymentSource.customer_details as Record<string, unknown>) : {};
  const orderCustomerDetails = typeof orderSource.customer_details === "object" && orderSource.customer_details ? (orderSource.customer_details as Record<string, unknown>) : {};

  const customerInfo: Record<string, unknown> = {
    ...paymentCustomer,
    ...orderCustomer,
    ...paymentCustomerDetails,
    ...orderCustomerDetails,
  };

  const paymentShipping = typeof paymentSource.shipping === "object" && paymentSource.shipping ? (paymentSource.shipping as Record<string, unknown>) : {};
  const orderShipping = typeof orderSource.shipping === "object" && orderSource.shipping ? (orderSource.shipping as Record<string, unknown>) : {};

  const paymentShippingAddress = typeof paymentSource.shipping_address === "object" && paymentSource.shipping_address ? (paymentSource.shipping_address as Record<string, unknown>) : {};
  const orderShippingAddress = typeof orderSource.shipping_address === "object" && orderSource.shipping_address ? (orderSource.shipping_address as Record<string, unknown>) : {};
  const paymentCustomerShippingAddress = typeof paymentCustomerDetails.shipping_address === "object" && paymentCustomerDetails.shipping_address ? (paymentCustomerDetails.shipping_address as Record<string, unknown>) : {};
  const orderCustomerShippingAddress = typeof orderCustomerDetails.shipping_address === "object" && orderCustomerDetails.shipping_address ? (orderCustomerDetails.shipping_address as Record<string, unknown>) : {};

  const shippingAddressInfo: Record<string, unknown> = {
    ...paymentShippingAddress,
    ...orderShippingAddress,
    ...(typeof paymentShipping.address === "object" && paymentShipping.address ? (paymentShipping.address as Record<string, unknown>) : {}),
    ...(typeof orderShipping.address === "object" && orderShipping.address ? (orderShipping.address as Record<string, unknown>) : {}),
    ...paymentCustomerShippingAddress,
    ...orderCustomerShippingAddress,
  };

  const mergedRecord: Record<string, unknown> = {
    ...notes,
    ...paymentSource,
    ...orderSource,
    ...customerInfo,
    ...paymentShipping,
    ...orderShipping,
    ...shippingAddressInfo,
  };

  const shippingNameValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_name",
    "shippingName",
    "customer_name",
    "customerName",
    "name",
    "full_name",
    "fullName",
  ]) ?? readNestedValue(customerInfo as Record<string, unknown>, ["name"]) ?? readNestedValue(paymentCustomerDetails as Record<string, unknown>, ["name"]) ?? readNestedValue(orderCustomerDetails as Record<string, unknown>, ["name"]) ?? readNestedValue(paymentShipping as Record<string, unknown>, ["name"]) ?? readNestedValue(orderShipping as Record<string, unknown>, ["name"]) ?? (isLikelyPersonName(typeof paymentSource.name === "string" ? paymentSource.name : undefined) ? paymentSource.name as string : undefined) ?? (isLikelyPersonName(typeof orderSource.name === "string" ? orderSource.name : undefined) ? orderSource.name as string : undefined) ?? undefined;

  const shippingEmailValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_email",
    "shippingEmail",
    "customer_email",
    "customerEmail",
    "email",
  ]) ?? readNestedValue(customerInfo as Record<string, unknown>, ["email"]) ?? readNestedValue(paymentCustomerDetails as Record<string, unknown>, ["email"]) ?? readNestedValue(orderCustomerDetails as Record<string, unknown>, ["email"]) ?? readNestedValue(paymentShipping as Record<string, unknown>, ["email"]) ?? readNestedValue(orderShipping as Record<string, unknown>, ["email"]) ?? undefined;

  const shippingPhoneValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_phone",
    "shippingPhone",
    "customer_phone",
    "customerPhone",
    "phone",
    "contact",
  ]) ?? readNestedValue(customerInfo as Record<string, unknown>, ["contact"]) ?? readNestedValue(paymentCustomerDetails as Record<string, unknown>, ["contact"]) ?? readNestedValue(orderCustomerDetails as Record<string, unknown>, ["contact"]) ?? readNestedValue(paymentShipping as Record<string, unknown>, ["contact"]) ?? readNestedValue(orderShipping as Record<string, unknown>, ["contact"]) ?? undefined;

  const shippingAddressValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_address",
    "shippingAddress",
    "address",
    "address1",
    "line1",
    "street",
    "street_address",
    "line_1",
  ]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["line1"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["line_1"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["address"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["street"]) ?? undefined;

  const shippingCityValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_city",
    "shippingCity",
    "city",
  ]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["city"]) ?? readNestedValue(paymentShipping as Record<string, unknown>, ["city"]) ?? readNestedValue(orderShipping as Record<string, unknown>, ["city"]) ?? undefined;

  const shippingStateValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_state",
    "shippingState",
    "state",
    "province",
  ]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["state"]) ?? readNestedValue(paymentShipping as Record<string, unknown>, ["state"]) ?? readNestedValue(orderShipping as Record<string, unknown>, ["state"]) ?? undefined;

  const shippingPinCodeValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_pin_code",
    "shippingPinCode",
    "shipping_pincode",
    "pincode",
    "pin_code",
    "zipcode",
    "zip",
    "postal_code",
  ]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["zipcode"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["zip"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["postal_code"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["pincode"]) ?? undefined;

  const shippingCountryValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_country",
    "shippingCountry",
    "country",
  ]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["country"]) ?? "India";

  return {
    shippingName: shippingNameValue,
    shippingEmail: shippingEmailValue,
    shippingPhone: shippingPhoneValue,
    shippingAddress: shippingAddressValue,
    shippingCity: shippingCityValue,
    shippingState: shippingStateValue,
    shippingPinCode: shippingPinCodeValue,
    shippingCountry: shippingCountryValue,
  };
}

type VerifyPaymentRequest = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

function logPaymentFlow(label: string, details: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "production" && process.env.DEBUG_PAYMENT_FLOW !== "1") {
    return;
  }

  console.info("[payment-flow]", label, details);
}

async function runPostPaymentBackgroundTasks(input: {
  orderId: string;
  siteUrl: string;
  savedOrder: any;
  hydratedOrder: any;
  request: Request;
}) {
  const { orderId, siteUrl, savedOrder, hydratedOrder, request } = input;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const attribution = parseAttributionCookie(parseCookieValue(cookieHeader, "Firaang_analytics_attr"));
  const geo = parseGeoFromRequestHeaders(request.headers);

  const asyncTasks: Promise<unknown>[] = [];

  if (savedOrder && savedOrder.shopifySyncStatus !== "synced") {
    asyncTasks.push(
      (async () => {
        const syncPaidOrder = typeof syncPaidOrderToShopify === "function" ? syncPaidOrderToShopify : null;
        const syncResult = syncPaidOrder
          ? await Promise.resolve(syncPaidOrder(orderId)).catch((error) => ({
              status: "failed" as const,
              reason: error instanceof Error ? error.message : "Unknown Shopify sync failure",
            }))
          : { status: "skipped" as const, reason: "sync_handler_unavailable" };

        if (syncResult.status === "synced") {
          await attachShopifySyncResultToOrder({
            orderId,
            shopifyOrderId: syncResult.shopifyOrderId,
            shopifyCustomerId: syncResult.shopifyCustomerId,
            shopifySyncStatus: "synced",
          });
        } else if (syncResult.status === "failed") {
          await attachShopifySyncResultToOrder({
            orderId,
            shopifySyncStatus: "failed",
            shopifySyncError: syncResult.reason,
          });
        } else {
          await attachShopifySyncResultToOrder({
            orderId,
            shopifySyncStatus: "skipped",
          });
        }
      })(),
    );
  }

  if (hydratedOrder && hydratedOrder.inventorySyncStatus !== "reserved") {
    asyncTasks.push(
      (async () => {
        const syncInventory = typeof syncShopifyInventoryForOrder === "function" ? syncShopifyInventoryForOrder : null;
        if (!syncInventory) {
          return;
        }

        await Promise.resolve(syncInventory(orderId, "reserve")).catch((error) => {
          console.error("Shopify inventory reserve sync failed during verification", error);
        });
      })(),
    );
  }

  if (hydratedOrder) {
    asyncTasks.push(
      (async () => {
        const claimed = await claimOrderConfirmationEmailSend(hydratedOrder.id);
        if (!claimed) {
          return;
        }

        try {
          await notifyOrderPaid({
            orderId: hydratedOrder.id,
            customerName: hydratedOrder.shippingName,
            customerEmail: hydratedOrder.shippingEmail,
            totalAmount: hydratedOrder.totalAmount,
            currencyCode: hydratedOrder.currencyCode,
            subtotalAmount: hydratedOrder.subtotalAmount,
            shippingFee: hydratedOrder.shippingFee,
            taxAmount: hydratedOrder.taxAmount,
            discountAmount: hydratedOrder.discountAmount,
            shippingMethod: hydratedOrder.shippingMethod,
            paymentStatus: hydratedOrder.paymentStatus,
            paymentMethod: hydratedOrder.paymentMethod,
            orderDate: hydratedOrder.createdAt,
            estimatedDeliveryDate: hydratedOrder.deliveredAt,
            viewOrderUrl: `${siteUrl}/track-order?orderId=${encodeURIComponent(hydratedOrder.id)}`,
            continueShoppingUrl: siteUrl,
            shippingAddress: {
              name: hydratedOrder.shippingName,
              email: hydratedOrder.shippingEmail,
              line1: hydratedOrder.shippingAddress,
              city: hydratedOrder.shippingCity,
              state: hydratedOrder.shippingState,
              pinCode: hydratedOrder.shippingPinCode,
            },
            items: hydratedOrder.items.map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              image: item.image,
            })),
          });
          await markOrderConfirmationEmailSent(hydratedOrder.id);
        } catch (error) {
          await releaseOrderConfirmationEmailClaim(hydratedOrder.id);
          console.error("Order confirmation email failed during verification", error);
        }
      })(),
    );
  }

  if (typeof trackAnalyticsEvent === "function") {
    asyncTasks.push(
      Promise.resolve(trackAnalyticsEvent({
        eventName: "order_paid",
        visitorId: parseCookieValue(cookieHeader, "Firaang_analytics_vid") ?? "server-anonymous",
        sessionId: parseCookieValue(cookieHeader, "Firaang_analytics_sid") ?? `paid-${Date.now()}`,
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
        orderId,
        orderAmount: savedOrder?.totalAmount,
        currencyCode: savedOrder?.currencyCode,
        metadata: {
          paymentMethod: savedOrder?.paymentMethod ?? "online",
        },
      })).catch(() => {
        // Payment verification should not fail due to analytics.
      }),
    );
  }

  if (asyncTasks.length === 0) {
    return;
  }

  const startedAt = Date.now();
  logPaymentFlow("post-payment background tasks started", { orderId, taskCount: asyncTasks.length });

  await Promise.allSettled(asyncTasks);

  logPaymentFlow("post-payment background tasks completed", {
    orderId,
    elapsedMs: Date.now() - startedAt,
  });
}

export async function POST(request: Request) {
  try {
    const siteUrl = getSiteUrl();
    const sessionToken = await getAccountSessionTokenFromCookies();
    const body = (await request.json()) as VerifyPaymentRequest;

    const orderId = body.razorpay_order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json({ error: "Server not configured for payment verification" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ verified: false, status: "failed", error: "Invalid payment signature" }, { status: 400 });
    }

    const verificationStart = Date.now();
    const razorpay = getRazorpayClient();
    const paymentRecord = await razorpay.payments.fetch(paymentId).catch((error) => {
      console.error("Razorpay payment fetch failed during verification", error);
      return null;
    });

    const gatewayPaymentStatus = mapRazorpayPaymentVerificationState(paymentRecord?.status);
    logPaymentFlow("verify: payment fetched", {
      orderId,
      paymentId,
      elapsedMs: Date.now() - verificationStart,
      status: paymentRecord?.status,
    });

    if (!paymentRecord) {
      return NextResponse.json({ verified: false, status: "failed", error: "Unable to verify payment status" }, { status: 400 });
    }

    if (paymentRecord.order_id !== orderId) {
      return NextResponse.json({ verified: false, status: "failed", error: "Payment does not belong to this order" }, { status: 400 });
    }

    if (gatewayPaymentStatus === "pending") {
      return NextResponse.json({
        verified: false,
        status: "pending",
        message: "Payment is still pending. We will confirm it automatically.",
      });
    }

    if (gatewayPaymentStatus === "failed") {
      return NextResponse.json({
        verified: false,
        status: "failed",
        message: "Payment failed or was cancelled. Please try again.",
      }, { status: 400 });
    }

    const existingOrder = await findOrderWithCustomerByOrderId(orderId);

    if (!existingOrder) {
      return NextResponse.json({ verified: false, status: "failed", error: "Order not found for payment verification" }, { status: 404 });
    }

    const gatewayOrder = await razorpay.orders.fetch(orderId).catch(() => null);
    const paymentMetadata = extractMagicCheckoutCustomerData(paymentRecord as unknown as Record<string, unknown>, gatewayOrder as unknown as Record<string, unknown> | null);

    const enrichedOrder = await syncCustomerAndShippingDetailsByOrderId(orderId, paymentMetadata);

    const paidOrderStatus: "authorized" | "captured" =
      paymentRecord.status === "authorized" ? "authorized" : "captured";

    const saveStart = Date.now();
    const savedOrder = sessionToken
      ? await markOrderPaidForSessionToken(sessionToken, {
          orderId,
          paymentId,
        })
      : await markOrderPaidByOrderId({
          orderId,
          paymentId,
          paymentStatus: paidOrderStatus,
        });
    logPaymentFlow("verify: order marked paid", {
      orderId,
      elapsedMs: Date.now() - saveStart,
      usingSessionToken: Boolean(sessionToken),
    });

    const hydratedOrder = savedOrder
      ? {
          ...savedOrder,
          shippingName: enrichedOrder?.shippingName ?? savedOrder.shippingName,
          shippingEmail: enrichedOrder?.shippingEmail ?? savedOrder.shippingEmail,
          shippingPhone: enrichedOrder?.shippingPhone ?? savedOrder.shippingPhone,
          shippingAddress: enrichedOrder?.shippingAddress ?? savedOrder.shippingAddress,
          shippingCity: enrichedOrder?.shippingCity ?? savedOrder.shippingCity,
          shippingState: enrichedOrder?.shippingState ?? savedOrder.shippingState,
          shippingPinCode: enrichedOrder?.shippingPinCode ?? savedOrder.shippingPinCode,
          shippingCountry: enrichedOrder?.shippingCountry ?? savedOrder.shippingCountry,
        }
      : enrichedOrder;

    const responseOrder = savedOrder ?? hydratedOrder ?? null;

    const response = NextResponse.json({
      verified: true,
      status: "paid",
      order: responseOrder,
      meta: {
        accountLinked: responseOrder !== null,
      },
    });

    void runPostPaymentBackgroundTasks({
      orderId,
      siteUrl,
      savedOrder,
      hydratedOrder,
      request,
    });

    logPaymentFlow("verify: response ready", {
      orderId,
      elapsedMs: Date.now() - verificationStart,
      responseStatus: "paid",
    });

    return response;
  } catch (error) {
    console.error("Payment verification failed", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
