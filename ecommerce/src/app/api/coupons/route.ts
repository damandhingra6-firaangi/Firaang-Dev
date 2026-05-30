import { NextResponse } from "next/server";
import { listCoupons, createCoupon } from "@/lib/coupon-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const coupons = await listCoupons();
    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("Failed to list coupons", error);
    return NextResponse.json({ error: "Failed to load coupons" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      label?: string;
      description?: string;
      type?: string;
      value?: number;
      minSubtotal?: number;
      maxDiscountAmount?: number;
    };

    const code = body.code?.trim().toUpperCase() ?? "";
    const label = body.label?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    const type = body.type;
    const value = body.value;
    const minSubtotal = body.minSubtotal ?? 0;

    if (!code || !label || !description) {
      return NextResponse.json({ error: "code, label, and description are required" }, { status: 400 });
    }

    if (!/^[A-Z0-9_-]{2,30}$/.test(code)) {
      return NextResponse.json({ error: "Coupon code must be 2-30 alphanumeric characters" }, { status: 400 });
    }

    if (type !== "percentage" && type !== "fixed") {
      return NextResponse.json({ error: "type must be 'percentage' or 'fixed'" }, { status: 400 });
    }

    if (typeof value !== "number" || value <= 0) {
      return NextResponse.json({ error: "value must be a positive number" }, { status: 400 });
    }

    if (type === "percentage" && value > 100) {
      return NextResponse.json({ error: "Percentage value must be 1-100" }, { status: 400 });
    }

    const coupon = await createCoupon({
      code,
      label,
      description,
      type,
      value,
      minSubtotal,
      maxDiscountAmount: typeof body.maxDiscountAmount === "number" && body.maxDiscountAmount > 0
        ? body.maxDiscountAmount
        : undefined,
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000) {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
    }
    console.error("Failed to create coupon", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
