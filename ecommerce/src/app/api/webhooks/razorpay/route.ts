import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { redeemCampaignCouponByOrder, releaseCampaignCouponReservationByOrderId } from "@/lib/campaigns";
import {
  attachShopifySyncResultToOrder,
  claimOrderConfirmationEmailSend,
  findOrderWithCustomerByOrderId,
  findOrderWithCustomerByPaymentId,
  markOrderConfirmationEmailSent,
  markOrderFailedByOrderId,
  markOrderPaidByOrderId,
  markOrderPendingByOrderId,
  markOrderRefundedByOrderId,
  releaseOrderConfirmationEmailClaim,
  syncCustomerAndShippingDetailsByOrderId,
} from "@/lib/account-data";
import { notifyOrderPaid, notifyRefundProcessed } from "@/lib/order-notifications";
import { getSiteUrl } from "@/lib/site";
import { syncPaidOrderToShopify } from "@/lib/shopify-admin";
import { syncShopifyInventoryForOrder } from "@/lib/shopify-admin";

export const runtime = "nodejs";

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number;
        status?: string;
      };
    };
  };
};

function readGatewayOrderId(eventPayload: RazorpayWebhookEvent) {
  return eventPayload.payload?.payment?.entity?.order_id ?? eventPayload.payload?.refund?.entity?.payment_id ?? "";
}

function paiseToRupees(amount?: number) {
  return typeof amount === "number" ? Math.max(0, Math.round(amount / 100)) : undefined;
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

function extractMagicCheckoutCustomerData(paymentEntity: Record<string, unknown> | null | undefined, orderEntity: Record<string, unknown> | null | undefined) {
  const paymentSource = paymentEntity ?? {};
  const orderSource = orderEntity ?? {};
  const notes = {
    ...(typeof paymentSource.notes === "object" && paymentSource.notes ? (paymentSource.notes as Record<string, unknown>) : {}),
    ...(typeof orderSource.notes === "object" && orderSource.notes ? (orderSource.notes as Record<string, unknown>) : {}),
  };

  const customerInfo: Record<string, unknown> = {
    ...(typeof paymentSource.customer === "object" && paymentSource.customer ? (paymentSource.customer as Record<string, unknown>) : {}),
    ...(typeof orderSource.customer === "object" && orderSource.customer ? (orderSource.customer as Record<string, unknown>) : {}),
  };

  const shippingInfo: Record<string, unknown> = {
    ...(typeof paymentSource.shipping === "object" && paymentSource.shipping ? (paymentSource.shipping as Record<string, unknown>) : {}),
    ...(typeof orderSource.shipping === "object" && orderSource.shipping ? (orderSource.shipping as Record<string, unknown>) : {}),
  };

  const shippingAddressInfo: Record<string, unknown> = {
    ...(typeof shippingInfo.address === "object" && shippingInfo.address ? (shippingInfo.address as Record<string, unknown>) : {}),
    ...(typeof paymentSource.shipping_address === "object" && paymentSource.shipping_address ? (paymentSource.shipping_address as Record<string, unknown>) : {}),
    ...(typeof orderSource.shipping_address === "object" && orderSource.shipping_address ? (orderSource.shipping_address as Record<string, unknown>) : {}),
  };

  const mergedRecord: Record<string, unknown> = {
    ...notes,
    ...paymentSource,
    ...orderSource,
    ...customerInfo,
    ...shippingInfo,
    ...shippingAddressInfo,
  };

  const shippingNameValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_name",
    "shippingName",
    "customer_name",
    "customerName",
    "shipping.name",
    "customer.name",
    "full_name",
    "fullName",
  ]) ?? (isLikelyPersonName(typeof customerInfo.name === "string" ? customerInfo.name : undefined) ? customerInfo.name as string : undefined)
    ?? (isLikelyPersonName(typeof shippingInfo.name === "string" ? shippingInfo.name : undefined) ? shippingInfo.name as string : undefined)
    ?? (isLikelyPersonName(typeof paymentSource.name === "string" ? paymentSource.name : undefined) ? paymentSource.name as string : undefined)
    ?? (isLikelyPersonName(typeof orderSource.name === "string" ? orderSource.name : undefined) ? orderSource.name as string : undefined)
    ?? (isLikelyPersonName(typeof readNestedValue(customerInfo as Record<string, unknown>, ["full_name"]) === "string" ? readNestedValue(customerInfo as Record<string, unknown>, ["full_name"]) as string : undefined) ? readNestedValue(customerInfo as Record<string, unknown>, ["full_name"]) as string : undefined)
    ?? (isLikelyPersonName(typeof readNestedValue(shippingInfo as Record<string, unknown>, ["full_name"]) === "string" ? readNestedValue(shippingInfo as Record<string, unknown>, ["full_name"]) as string : undefined) ? readNestedValue(shippingInfo as Record<string, unknown>, ["full_name"]) as string : undefined)
    ?? undefined;

  const shippingEmailValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_email",
    "shippingEmail",
    "customer_email",
    "customerEmail",
    "email",
  ]) ?? readNestedValue(customerInfo as Record<string, unknown>, ["email"]) ?? readNestedValue(shippingInfo as Record<string, unknown>, ["email"]) ?? undefined;

  const shippingPhoneValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_phone",
    "shippingPhone",
    "customer_phone",
    "customerPhone",
    "phone",
    "contact",
  ]) ?? readNestedValue(customerInfo as Record<string, unknown>, ["contact"]) ?? readNestedValue(shippingInfo as Record<string, unknown>, ["contact"]) ?? undefined;

  const shippingAddressValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_address",
    "shippingAddress",
    "address",
    "address1",
    "line1",
    "street",
    "street_address",
    "line_1",
  ]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["line1"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["line_1"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["street"]) ?? undefined;

  const shippingCityValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_city",
    "shippingCity",
    "city",
  ]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["city"]) ?? readNestedValue(shippingInfo as Record<string, unknown>, ["city"]) ?? undefined;

  const shippingStateValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_state",
    "shippingState",
    "state",
    "province",
  ]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["state"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["province"]) ?? readNestedValue(shippingInfo as Record<string, unknown>, ["state"]) ?? undefined;

  const shippingPinCodeValue: string | undefined = readFirstDefinedValue(mergedRecord, [
    "shipping_pin_code",
    "shippingPinCode",
    "shipping_pincode",
    "pincode",
    "pin_code",
    "zip",
    "postal_code",
  ]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["zip"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["postal_code"]) ?? readNestedValue(shippingAddressInfo as Record<string, unknown>, ["pincode"]) ?? undefined;

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

export async function POST(request: Request) {
  try {
    const siteUrl = getSiteUrl();
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
    }

    const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const eventPayload = JSON.parse(rawBody) as RazorpayWebhookEvent;
    const eventName = eventPayload.event ?? "";
    const orderId = readGatewayOrderId(eventPayload).trim();

    if (!orderId) {
      return NextResponse.json({ ok: true, ignored: true, reason: "missing_order_id" });
    }

    if (eventName === "payment.pending") {
      const payment = eventPayload.payload?.payment?.entity;

      if (!payment?.id) {
        return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
      }

      await markOrderPendingByOrderId({
        orderId,
        paymentId: payment.id,
      });

      return NextResponse.json({ ok: true, event: eventName, orderId });
    }

    if (eventName === "payment.captured" || eventName === "payment.authorized") {
      const payment = eventPayload.payload?.payment?.entity;

      if (!payment?.id) {
        return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
      }

      const pendingOrder = await findOrderWithCustomerByOrderId(orderId);
      const gatewayOrder = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID ?? ""}:${process.env.RAZORPAY_KEY_SECRET ?? ""}`).toString("base64")}`,
        },
        cache: "no-store",
      }).then(async (response) => response.ok ? (await response.json()) as Record<string, unknown> : null).catch(() => null);

      const magicCheckoutOrderData = extractMagicCheckoutCustomerData(payment as Record<string, unknown> | null, gatewayOrder as Record<string, unknown> | null);
      await syncCustomerAndShippingDetailsByOrderId(orderId, magicCheckoutOrderData);

      const paidOrder = await markOrderPaidByOrderId({
        orderId,
        paymentId: payment.id,
        paymentStatus: eventName === "payment.authorized" ? "authorized" : "captured",
      });

      const hydratedOrder = paidOrder
        ? {
            ...paidOrder,
            shippingName: magicCheckoutOrderData.shippingName ?? paidOrder.shippingName,
            shippingEmail: magicCheckoutOrderData.shippingEmail ?? paidOrder.shippingEmail,
            shippingPhone: magicCheckoutOrderData.shippingPhone ?? paidOrder.shippingPhone,
            shippingAddress: magicCheckoutOrderData.shippingAddress ?? paidOrder.shippingAddress,
            shippingCity: magicCheckoutOrderData.shippingCity ?? paidOrder.shippingCity,
            shippingState: magicCheckoutOrderData.shippingState ?? paidOrder.shippingState,
            shippingPinCode: magicCheckoutOrderData.shippingPinCode ?? paidOrder.shippingPinCode,
            shippingCountry: magicCheckoutOrderData.shippingCountry ?? paidOrder.shippingCountry,
          }
        : null;

      if (!paidOrder) {
        return NextResponse.json({ ok: true, ignored: true, reason: "order_not_found" });
      }

      if (paidOrder.couponCode) {
        await redeemCampaignCouponByOrder({
          orderId,
          couponCode: paidOrder.couponCode,
          orderTotal: paidOrder.totalAmount,
          discountAmount: paidOrder.discountAmount ?? 0,
        }).catch((error) => {
          console.error("Campaign coupon redemption finalization failed", error);
        });
      }

      const syncResult = await syncPaidOrderToShopify(orderId).catch((error) => ({
        status: "failed" as const,
        reason: error instanceof Error ? error.message : "Unknown Shopify sync failure",
      }));

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

      const claimed = await claimOrderConfirmationEmailSend(hydratedOrder?.id ?? paidOrder.id);

      if (claimed) {
        try {
          await notifyOrderPaid({
            orderId: hydratedOrder?.id ?? paidOrder.id,
            customerName: pendingOrder?.customer?.fullName ?? hydratedOrder?.shippingName ?? paidOrder.shippingName,
            customerEmail: pendingOrder?.customer?.email ?? hydratedOrder?.shippingEmail ?? paidOrder.shippingEmail,
            totalAmount: hydratedOrder?.totalAmount ?? paidOrder.totalAmount,
            currencyCode: hydratedOrder?.currencyCode ?? paidOrder.currencyCode,
            subtotalAmount: hydratedOrder?.subtotalAmount ?? paidOrder.subtotalAmount,
            shippingFee: hydratedOrder?.shippingFee ?? paidOrder.shippingFee,
            taxAmount: hydratedOrder?.taxAmount ?? paidOrder.taxAmount,
            discountAmount: hydratedOrder?.discountAmount ?? paidOrder.discountAmount,
            shippingMethod: hydratedOrder?.shippingMethod ?? paidOrder.shippingMethod,
            paymentStatus: hydratedOrder?.paymentStatus ?? paidOrder.paymentStatus,
            paymentMethod: hydratedOrder?.paymentMethod ?? paidOrder.paymentMethod,
            orderDate: hydratedOrder?.createdAt ?? paidOrder.createdAt,
            estimatedDeliveryDate: hydratedOrder?.deliveredAt ?? paidOrder.deliveredAt,
            viewOrderUrl: `${siteUrl}/track-order?orderId=${encodeURIComponent(hydratedOrder?.id ?? paidOrder.id)}`,
            continueShoppingUrl: siteUrl,
            shippingAddress: {
              name: hydratedOrder?.shippingName ?? paidOrder.shippingName,
              email: hydratedOrder?.shippingEmail ?? paidOrder.shippingEmail,
              line1: hydratedOrder?.shippingAddress ?? paidOrder.shippingAddress,
              city: hydratedOrder?.shippingCity ?? paidOrder.shippingCity,
              state: hydratedOrder?.shippingState ?? paidOrder.shippingState,
              pinCode: hydratedOrder?.shippingPinCode ?? paidOrder.shippingPinCode,
            },
            items: (hydratedOrder?.items ?? paidOrder.items).map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              image: item.image,
            })),
          });
          await markOrderConfirmationEmailSent(hydratedOrder?.id ?? paidOrder.id);
        } catch (error) {
          await releaseOrderConfirmationEmailClaim(hydratedOrder?.id ?? paidOrder.id);
          console.error("Paid order notification failed", error);
        }
      }

      return NextResponse.json({ ok: true, event: eventName, orderId });
    }

    if (eventName === "payment.failed") {
      const payment = eventPayload.payload?.payment?.entity;

      if (!payment?.id) {
        return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
      }

      await markOrderFailedByOrderId({
        orderId,
        paymentId: payment.id,
      });

      await releaseCampaignCouponReservationByOrderId(orderId).catch((error) => {
        console.error("Campaign coupon reservation release failed", error);
      });

      await syncShopifyInventoryForOrder(orderId, "release").catch((error) => {
        console.error("Shopify inventory release sync failed", error);
      });

      return NextResponse.json({ ok: true, event: eventName, orderId });
    }

    if (eventName === "refund.processed") {
      const refund = eventPayload.payload?.refund?.entity;

      if (!refund?.id) {
        return NextResponse.json({ error: "Missing refund id" }, { status: 400 });
      }

      const linkedOrder = refund.payment_id ? await findOrderWithCustomerByPaymentId(refund.payment_id) : null;

      if (!linkedOrder) {
        return NextResponse.json({ ok: true, ignored: true, reason: "order_not_found" });
      }

      await markOrderRefundedByOrderId({
        orderId: linkedOrder.order.id,
        paymentId: refund.payment_id,
        refundId: refund.id,
        refundAmount: paiseToRupees(refund.amount),
      });

      await syncShopifyInventoryForOrder(linkedOrder.order.id, "release").catch((error) => {
        console.error("Shopify inventory release sync failed", error);
      });

      await notifyRefundProcessed({
        orderId: linkedOrder.order.id,
        customerName: linkedOrder.customer?.fullName,
        customerEmail: linkedOrder.customer?.email,
        totalAmount: linkedOrder.order.totalAmount,
        currencyCode: linkedOrder.order.currencyCode,
        refundAmount: paiseToRupees(refund.amount),
      }).catch((error) => {
        console.error("Refund notification failed", error);
      });

      return NextResponse.json({ ok: true, event: eventName, orderId: linkedOrder.order.id });
    }

    return NextResponse.json({ ok: true, ignored: true, event: eventName || "unknown" });
  } catch (error) {
    console.error("Razorpay webhook failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}