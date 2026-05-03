import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAccountSession,
  getAccountSnapshotBySessionToken,
  isSupportedMobileNumber,
  normalizePhoneNumber,
  upsertMobileAccount,
  verifyMobileOtpCode,
} from "@/lib/account-data";
import { ACCOUNT_SESSION_COOKIE_NAME } from "@/lib/account-session";
import { checkTwilioVerifySms, shouldUseTwilioVerify } from "@/lib/sms";

export const runtime = "nodejs";

const verifyOtpSchema = z.object({
  phone: z.string().trim().min(8).max(20),
  otp: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = verifyOtpSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid OTP payload" }, { status: 400 });
  }

  const phone = normalizePhoneNumber(parsed.data.phone);

  if (!phone || !isSupportedMobileNumber(phone)) {
    return NextResponse.json({ error: "Please enter a valid Indian mobile number" }, { status: 400 });
  }

  try {
    if (shouldUseTwilioVerify()) {
      const verification = await checkTwilioVerifySms({
        phone,
        code: parsed.data.otp,
      });

      if (!verification.approved) {
        return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
      }
    } else {
      const verification = await verifyMobileOtpCode(phone, parsed.data.otp);

      if (!verification.ok) {
        if (verification.reason === "OTP_EXPIRED") {
          return NextResponse.json({ error: "OTP expired. Please request a new OTP." }, { status: 400 });
        }

        if (verification.reason === "OTP_TOO_MANY_ATTEMPTS") {
          return NextResponse.json({ error: "Too many incorrect attempts. Request a fresh OTP." }, { status: 429 });
        }

        return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
      }
    }

    const account = await upsertMobileAccount({ phone });
    const session = await createAccountSession(account.userId);
    const snapshot = await getAccountSnapshotBySessionToken(session.token);

    if (!snapshot) {
      return NextResponse.json({ error: "Could not create account session" }, { status: 500 });
    }

    const response = NextResponse.json({
      ok: true,
      authenticated: true,
      profile: snapshot.profile,
      orders: snapshot.orders,
    });

    response.cookies.set({
      name: ACCOUNT_SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: session.expiresAt,
      path: "/",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OTP verify error";

    if (message.includes("TWILIO_VERIFY_NOT_CONFIGURED") || message.includes("TWILIO_VERIFY_CHECK_FAILED")) {
      console.error("Twilio Verify is not configured correctly", { message });
      return NextResponse.json({ error: "SMS verification service is not configured" }, { status: 503 });
    }

    console.error("Mobile OTP verification failed", error);
    return NextResponse.json({ error: "Could not verify OTP" }, { status: 500 });
  }
}
