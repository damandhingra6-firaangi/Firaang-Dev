import { NextResponse } from "next/server";
import { getActiveCouponByCode } from "@/lib/coupon-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      order_id?: string;
      contact?: string;
      email?: string;
      code?: string;
    };

    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!code) {
      return NextResponse.json({ error: "A promotion code is required" }, { status: 400 });
    }

    const coupon = await getActiveCouponByCode(code);

    if (!coupon) {
      return NextResponse.json({ error: "Promotion not found or inactive" }, { status: 404 });
    }

    const valueType = coupon.type === "fixed" ? "fixed_amount" : "percentage";
    const value = coupon.type === "fixed" ? Math.round(coupon.value * 100) : Number(coupon.value);

    return NextResponse.json({
      order_id: orderId,
      contact,
      email,
      promotion: {
        reference_id: `promo_${coupon.id}`,
        type: "offer",
        code: coupon.code,
        value,
        value_type: valueType,
        description: coupon.description || coupon.label,
      },
    });
  } catch (error) {
    console.error("Failed to apply promotion", error);
    return NextResponse.json({ error: "Could not apply promotion" }, { status: 500 });
  }
}
