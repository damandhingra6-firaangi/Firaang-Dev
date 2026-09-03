import { NextResponse } from "next/server";
import { hasSuccessfullyUsedCouponForSessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";
import { getActiveCouponByCode } from "@/lib/coupon-store";
import { computeCouponDiscount } from "@/lib/checkout-config";

export const runtime = "nodejs";

const WELCOME5_COUPON_CODE = "WELCOME5";
const WELCOME5_SINGLE_USE_MESSAGE = "WELCOME5 can only be used once per customer.";

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

    if (coupon.code === WELCOME5_COUPON_CODE) {
      const sessionToken = await getAccountSessionTokenFromCookies();

      if (sessionToken) {
        const alreadyUsed = await hasSuccessfullyUsedCouponForSessionToken(sessionToken, coupon.code);

        if (alreadyUsed) {
          return NextResponse.json({ valid: false, message: WELCOME5_SINGLE_USE_MESSAGE });
        }
      }
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
