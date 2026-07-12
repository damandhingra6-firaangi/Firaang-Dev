import crypto from "crypto";
import { NextResponse } from "next/server";
import { markOrderPaidForSessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";
import { attachShopifySyncResultToOrder } from "@/lib/account-data";
import { claimOrderConfirmationEmailSend, markOrderConfirmationEmailSent, releaseOrderConfirmationEmailClaim } from "@/lib/account-data";
import { syncPaidOrderToShopify, syncShopifyInventoryForOrder } from "@/lib/shopify-admin";
import { notifyOrderPaid } from "@/lib/order-notifications";

type VerifyPaymentRequest = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export async function POST(request: Request) {
  try {
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
      return NextResponse.json({ verified: false, error: "Invalid payment signature" }, { status: 400 });
    }

    const savedOrder = sessionToken
      ? await markOrderPaidForSessionToken(sessionToken, {
          orderId,
          paymentId,
        })
      : null;

    if (savedOrder && savedOrder.shopifySyncStatus !== "synced") {
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

      if (savedOrder.inventorySyncStatus !== "reserved") {
        await syncShopifyInventoryForOrder(orderId, "reserve").catch((error) => {
          console.error("Shopify inventory reserve sync failed during verification", error);
        });
      }

      const claimed = await claimOrderConfirmationEmailSend(savedOrder.id);

      if (claimed) {
        try {
          await notifyOrderPaid({
            orderId: savedOrder.id,
            customerName: savedOrder.shippingName,
            customerEmail: savedOrder.shippingEmail,
            totalAmount: savedOrder.totalAmount,
            currencyCode: savedOrder.currencyCode,
            subtotalAmount: savedOrder.subtotalAmount,
            shippingFee: savedOrder.shippingFee,
            taxAmount: savedOrder.taxAmount,
            discountAmount: savedOrder.discountAmount,
            shippingMethod: savedOrder.shippingMethod,
            shippingAddress: {
              name: savedOrder.shippingName,
              email: savedOrder.shippingEmail,
              line1: savedOrder.shippingAddress,
              city: savedOrder.shippingCity,
              state: savedOrder.shippingState,
              pinCode: savedOrder.shippingPinCode,
            },
            items: savedOrder.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          });
          await markOrderConfirmationEmailSent(savedOrder.id);
        } catch (error) {
          await releaseOrderConfirmationEmailClaim(savedOrder.id);
          console.error("Order confirmation email failed during verification", error);
        }
      }
    }

    return NextResponse.json({
      verified: true,
      order: savedOrder,
      meta: {
        accountLinked: savedOrder !== null,
      },
    });
  } catch (error) {
    console.error("Payment verification failed", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
