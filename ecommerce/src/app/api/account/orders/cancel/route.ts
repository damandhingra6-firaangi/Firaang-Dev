import { NextResponse } from "next/server";
import { cancelOrderForSessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";

type CancelOrderRequest = {
  orderId?: string;
  reason?: string;
};

export async function POST(request: Request) {
  try {
    const sessionToken = await getAccountSessionTokenFromCookies();

    if (!sessionToken) {
      return NextResponse.json({ error: "Please sign in to cancel orders" }, { status: 401 });
    }

    const body = (await request.json()) as CancelOrderRequest;
    const orderId = (body.orderId ?? "").trim();
    const reason = (body.reason ?? "").trim();

    if (!orderId) {
      return NextResponse.json({ error: "Order id is required" }, { status: 400 });
    }

    if (reason.length > 160) {
      return NextResponse.json({ error: "Cancellation reason is too long" }, { status: 400 });
    }

    const result = await cancelOrderForSessionToken(sessionToken, { orderId, reason });

    if (result.reason === "NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (result.reason === "ALREADY_CANCELLED") {
      return NextResponse.json({ order: result.order, message: "Order is already cancelled" });
    }

    if (result.reason === "FAILED_ORDER") {
      return NextResponse.json({ error: "Failed orders cannot be cancelled" }, { status: 400 });
    }

    if (result.reason === "WINDOW_EXPIRED") {
      return NextResponse.json({ error: "Cancellation window has expired (7 days)" }, { status: 400 });
    }

    if (!result.order) {
      return NextResponse.json({ error: "Unable to cancel order" }, { status: 500 });
    }

    return NextResponse.json({ cancelled: true, order: result.order });
  } catch (error) {
    console.error("Order cancellation failed", error);
    return NextResponse.json({ error: "Could not cancel order" }, { status: 500 });
  }
}
