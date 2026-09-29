import { NextResponse } from "next/server";
import { cancelCampaignCoupon } from "@/lib/campaigns";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ couponId: string }> }) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return auth.response;
  }

  const { couponId } = await context.params;

  try {
    const coupon = await cancelCampaignCoupon(couponId);
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error("Failed to cancel campaign coupon", error);
    return NextResponse.json({ error: "Failed to cancel campaign coupon" }, { status: 500 });
  }
}