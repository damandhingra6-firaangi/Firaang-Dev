import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOrderForSessionOrAccessToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";

export async function GET(_: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const normalizedOrderId = decodeURIComponent(orderId ?? "").trim();

  if (!normalizedOrderId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const sessionToken = await getAccountSessionTokenFromCookies();
  const accessToken = (await cookies()).get("Firaang_order_success")?.value ?? null;
  const order = await getOrderForSessionOrAccessToken({
    orderId: normalizedOrderId,
    sessionToken: sessionToken ?? undefined,
    accessToken: accessToken ?? undefined,
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "failed" || order.status === "cancelled") {
    return NextResponse.json({ error: "Order was not completed successfully" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
