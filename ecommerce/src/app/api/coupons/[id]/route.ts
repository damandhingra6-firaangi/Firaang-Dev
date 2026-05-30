import { NextResponse } from "next/server";
import { updateCoupon, deleteCoupon } from "@/lib/coupon-store";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      label?: string;
      description?: string;
      type?: string;
      value?: number;
      minSubtotal?: number;
      maxDiscountAmount?: number;
      isActive?: boolean;
    };

    if (body.type !== undefined && body.type !== "percentage" && body.type !== "fixed") {
      return NextResponse.json({ error: "type must be 'percentage' or 'fixed'" }, { status: 400 });
    }

    if (body.value !== undefined && (typeof body.value !== "number" || body.value <= 0)) {
      return NextResponse.json({ error: "value must be a positive number" }, { status: 400 });
    }

    const updated = await updateCoupon(id, {
      label: body.label,
      description: body.description,
      type: body.type as "percentage" | "fixed" | undefined,
      value: body.value,
      minSubtotal: body.minSubtotal,
      maxDiscountAmount: body.maxDiscountAmount,
      isActive: body.isActive,
    });

    if (!updated) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ coupon: updated });
  } catch (error) {
    console.error("Failed to update coupon", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const deleted = await deleteCoupon(id);

    if (!deleted) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete coupon", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
