import { NextResponse } from "next/server";
import { getActiveCouponByCode } from "@/lib/coupon-store";
import { computeCouponDiscount } from "@/lib/checkout-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string; subtotalAmount?: number };
    const code = body.code?.trim().toUpperCase() ?? "";
    const subtotalAmount = typeof body.subtotalAmount === "number" ? Math.max(0, Math.round(body.subtotalAmount)) : 0;

    if (!code) {
      return NextResponse.json({ valid: false, message: "Enter a coupon code" }, { status: 400 });
    }

    const coupon = await getActiveCouponByCode(code);

    if (!coupon) {
      return NextResponse.json({ valid: false, message: "Coupon code is not valid or has expired" });
    }

    const { eligible, discountAmount } = computeCouponDiscount(subtotalAmount, coupon);

    if (!eligible) {
      return NextResponse.json({
        valid: false,
        message: `This coupon applies on orders above ₹${coupon.minSubtotal}`,
      });
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        label: coupon.label,
        description: coupon.description,
        discountAmount,
      },
      message: `${coupon.code} applied — you save ₹${discountAmount}`,
    });
  } catch (error) {
    console.error("Coupon validation failed", error);
    return NextResponse.json({ valid: false, message: "Could not validate coupon" }, { status: 500 });
  }
}
