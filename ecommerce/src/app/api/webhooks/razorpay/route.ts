import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  attachShopifySyncResultToOrder,
  claimOrderConfirmationEmailSend,
  findOrderWithCustomerByOrderId,
  findOrderWithCustomerByPaymentId,
  markOrderConfirmationEmailSent,
  markOrderFailedByOrderId,
  markOrderPaidByOrderId,
  markOrderRefundedByOrderId,
  releaseOrderConfirmationEmailClaim,
} from "@/lib/account-data";
import { notifyOrderPaid, notifyRefundProcessed } from "@/lib/order-notifications";
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

export async function POST(request: Request) {
  try {
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

    if (eventName === "payment.captured" || eventName === "payment.authorized") {
      const payment = eventPayload.payload?.payment?.entity;

      if (!payment?.id) {
        return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
      }

      const pendingOrder = await findOrderWithCustomerByOrderId(orderId);

      const paidOrder = await markOrderPaidByOrderId({
        orderId,
        paymentId: payment.id,
        paymentStatus: eventName === "payment.authorized" ? "authorized" : "captured",
      });

      if (!paidOrder) {
        return NextResponse.json({ ok: true, ignored: true, reason: "order_not_found" });
      }

      const syncResult = await syncPaidOrderToShopify(orderId).catch((error) => ({
        status: "failed" as const,
        reason: error instanceof Error ? error.message : "Unknown Shopify sync failure",
      }));

      if (syncResult.status === "synced") {
        await attachShopifySyncResultToOrder({
          orderId,
          shopifyOrderId: syncResult.shopifyOrderId,
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

      const claimed = await claimOrderConfirmationEmailSend(paidOrder.id);

      if (claimed) {
        try {
          await notifyOrderPaid({
            orderId: paidOrder.id,
            customerName: pendingOrder?.customer?.fullName ?? paidOrder.shippingName,
            customerEmail: pendingOrder?.customer?.email ?? paidOrder.shippingEmail,
            totalAmount: paidOrder.totalAmount,
            currencyCode: paidOrder.currencyCode,
            subtotalAmount: paidOrder.subtotalAmount,
            shippingFee: paidOrder.shippingFee,
            taxAmount: paidOrder.taxAmount,
            discountAmount: paidOrder.discountAmount,
            shippingMethod: paidOrder.shippingMethod,
            shippingAddress: {
              name: paidOrder.shippingName,
              email: paidOrder.shippingEmail,
              line1: paidOrder.shippingAddress,
              city: paidOrder.shippingCity,
              state: paidOrder.shippingState,
              pinCode: paidOrder.shippingPinCode,
            },
            items: paidOrder.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          });
          await markOrderConfirmationEmailSent(paidOrder.id);
        } catch (error) {
          await releaseOrderConfirmationEmailClaim(paidOrder.id);
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