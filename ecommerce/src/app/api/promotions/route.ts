import { NextResponse } from "next/server";
import { listCoupons } from "@/lib/coupon-store";

export const runtime = "nodejs";

function buildPromotionSummary(coupon: {
  code: string;
  label: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
}) {
  if (coupon.type === "percentage") {
    return `${coupon.value}% off on eligible orders`;
  }

  return `₹${coupon.value} off on eligible orders`;
}

export async function GET() {
  try {
    const couponList = await listCoupons();
    const promotions = couponList
      .filter((coupon) => coupon.isActive)
      .map((coupon) => ({
        code: coupon.code,
        summary: coupon.label || buildPromotionSummary(coupon),
        description: coupon.description || buildPromotionSummary(coupon),
      }));

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error("Failed to load promotions", error);
    return NextResponse.json({ error: "Could not load promotions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      order_id?: string;
      contact?: string;
      email?: string;
    };

    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    const couponList = await listCoupons();
    const promotions = couponList
      .filter((coupon) => coupon.isActive)
      .map((coupon) => ({
        code: coupon.code,
        summary: coupon.label || buildPromotionSummary(coupon),
        description: coupon.description || buildPromotionSummary(coupon),
      }));

    return NextResponse.json({
      order_id: orderId,
      contact,
      email,
      promotions,
    });
  } catch (error) {
    console.error("Failed to fetch promotions", error);
    return NextResponse.json({ error: "Could not fetch promotions" }, { status: 500 });
  }
}
