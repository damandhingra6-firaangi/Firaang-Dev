import { NextResponse } from "next/server";
import { z } from "zod";
import { createMobileOtp, isSupportedMobileNumber, normalizePhoneNumber } from "@/lib/account-data";
import { sendOtpSms, shouldUseTwilioVerify, startTwilioVerifySms } from "@/lib/sms";

export const runtime = "nodejs";

const requestOtpSchema = z.object({
  phone: z.string().trim().min(8).max(20),
});

function parseTwilioErrorCode(message: string) {
  const match = message.match(/TWILIO_SEND_FAILED:(\d+):/);
  if (!match) {
    return null;
  }

  const code = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(code) ? code : null;
}

function mapTwilioSmsErrorMessage(message: string) {
  const code = parseTwilioErrorCode(message);

  if (code === 21660) {
    return "Twilio sender mismatch. Use a valid SMS sender (From number or Messaging Service) from the same Twilio account.";
  }

  if (code === 21608) {
    return "Twilio trial restriction: verify the destination number in Twilio, or upgrade the account.";
  }

  if (code === 21211) {
    return "Destination number is invalid. Please enter a valid mobile number.";
  }

  if (code === 21408) {
    return "Twilio permissions error for this destination/country. Enable SMS geographic permissions in Twilio.";
  }

  if (code === 21705) {
    return "Twilio sender is not valid for SMS on this account. Use an SMS-capable Twilio number or Messaging Service SID from your account.";
  }

  return "OTP SMS delivery failed. Ensure your Twilio sender is SMS-capable and the destination number is allowed for your account.";
}

function parseTwilioVerifyStatus(message: string) {
  const match = message.match(/TWILIO_VERIFY_REQUEST_FAILED:.*\((\d{3})\)/);
  if (!match) {
    return null;
  }

  const status = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(status) ? status : null;
}

function parseTwilioVerifyErrorCode(message: string) {
  const match = message.match(/TWILIO_VERIFY_REQUEST_FAILED:(\d+):/);
  if (!match) {
    return null;
  }

  const code = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(code) ? code : null;
}

function mapTwilioVerifyErrorMessage(message: string) {
  const status = parseTwilioVerifyStatus(message);
  const code = parseTwilioVerifyErrorCode(message);

  if (code === 21608) {
    return "Twilio trial restriction: the destination number is not verified. Verify that phone number in Twilio or upgrade your Twilio account.";
  }

  if (status === 404) {
    return "Twilio Verify Service SID is invalid or not found for this account. Use the VA... SID from Twilio Verify > Services in the same account as your AC SID.";
  }

  if (status === 401 || status === 403) {
    return "Twilio credentials are invalid for Verify API. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.";
  }

  return "Twilio Verify request failed. Check Verify Service configuration and account permissions.";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = requestOtpSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid mobile number" }, { status: 400 });
  }

  const phone = normalizePhoneNumber(parsed.data.phone);

  if (!phone || !isSupportedMobileNumber(phone)) {
    return NextResponse.json({ error: "Please enter a valid Indian mobile number" }, { status: 400 });
  }

  try {
    if (shouldUseTwilioVerify()) {
      await startTwilioVerifySms({ phone });

      return NextResponse.json({
        ok: true,
        phone,
        provider: "twilio-verify",
      });
    }

    const otp = await createMobileOtp(phone);
    await sendOtpSms({
      phone,
      code: otp.code,
    });

    return NextResponse.json({
      ok: true,
      phone,
      expiresAt: otp.expiresAt.toISOString(),
      // Expose OTP only in local/dev for quick testing.
      debugOtp: process.env.NODE_ENV !== "production" ? otp.code : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OTP request error";

    if (message.startsWith("OTP_COOLDOWN:")) {
      const retryAfter = Number.parseInt(message.split(":")[1] ?? "30", 10);
      return NextResponse.json(
        { error: `Please wait ${Number.isFinite(retryAfter) ? retryAfter : 30}s before requesting another OTP.` },
        { status: 429 },
      );
    }

    if (
      message.includes("TWILIO_NOT_CONFIGURED") ||
      message.includes("TWILIO_SENDER_MISSING") ||
      message.includes("TWILIO_VERIFY_NOT_CONFIGURED") ||
      message.includes("SMS_PROVIDER_UNSUPPORTED")
    ) {
      console.error("SMS provider is not configured correctly", { message });
      return NextResponse.json({ error: "SMS service is not configured" }, { status: 503 });
    }

    if (message.includes("TWILIO_VERIFY_REQUEST_FAILED")) {
      console.error("Twilio Verify request failed", { message });

      const responseBody: { error: string; debug?: { verifyHttpStatus: number | null } } = {
        error: mapTwilioVerifyErrorMessage(message),
      };

      if (process.env.NODE_ENV !== "production") {
        responseBody.debug = {
          verifyHttpStatus: parseTwilioVerifyStatus(message),
        };
      }

      return NextResponse.json(responseBody, { status: 503 });
    }

    if (message.includes("TWILIO_SEND_FAILED")) {
      console.error("Twilio SMS delivery failed", { message });

      const responseBody: { error: string; debug?: { twilioCode: number | null } } = {
        error: mapTwilioSmsErrorMessage(message),
      };

      if (process.env.NODE_ENV !== "production") {
        responseBody.debug = {
          twilioCode: parseTwilioErrorCode(message),
        };
      }

      return NextResponse.json(
        responseBody,
        { status: 502 },
      );
    }

    console.error("Mobile OTP request failed", error);
    return NextResponse.json({ error: "Could not send OTP" }, { status: 500 });
  }
}
