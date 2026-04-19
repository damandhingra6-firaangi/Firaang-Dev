import crypto from "crypto";
import { NextResponse } from "next/server";
import { markOrderPaidForSessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";

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
