import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { claimMetaPixelPurchaseEvent, getOrderForSessionOrAccessToken, saveOrderMetaMarketingConsent } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";
import { isMetaTrackingOptedOut, readMetaMarketingConsent } from "@/lib/meta-consent";
import { sendMetaPurchaseConversion } from "@/lib/meta-conversions";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const normalizedOrderId = decodeURIComponent(orderId ?? "").trim();

    if (!normalizedOrderId) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const cookieHeader = request.headers.get("cookie") ?? "";
    if (readMetaMarketingConsent(cookieHeader) !== "granted" || isMetaTrackingOptedOut(request.headers)) {
      return NextResponse.json({ tracked: false });
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

    if (order.status !== "paid" || order.paymentStatus !== "captured") {
      return NextResponse.json({ tracked: false });
    }

    await saveOrderMetaMarketingConsent(normalizedOrderId, "granted");
    const conversion = await claimMetaPixelPurchaseEvent(normalizedOrderId);

    if (!conversion) {
      return NextResponse.json({ tracked: false });
    }

    const serverSide = await sendMetaPurchaseConversion(normalizedOrderId).then(
      (result) => result.status,
      (error) => {
        console.error("Meta Conversions API purchase tracking failed", error);
        return "failed" as const;
      },
    );

    return NextResponse.json({
      tracked: true,
      eventId: conversion.eventId,
      transactionId: conversion.orderId,
      currencyCode: conversion.currencyCode,
      value: conversion.value,
      coupon: conversion.couponCode,
      items: conversion.items.map((item) => ({
        item_id: item.productId,
        item_name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
      })),
      serverSide,
    });
  } catch (error) {
    console.error("Meta purchase claim failed", error);
    return NextResponse.json({ error: "Unable to claim Meta purchase event" }, { status: 500 });
  }
}
