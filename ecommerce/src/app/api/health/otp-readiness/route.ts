import { NextResponse } from "next/server";
import { shouldUseTwilioVerify } from "@/lib/sms";

export const runtime = "nodejs";

export async function GET() {
  try {
    const smsProvider = (process.env.SMS_PROVIDER ?? "twilio").trim().toLowerCase();
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim() ?? "";
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
    const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim() ?? "";
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() ?? "";

    const isVerifyMode = shouldUseTwilioVerify();

    const checks = {
      smsProvider,
      mode: isVerifyMode ? "twilio-verify" : smsProvider,
      isVerifyConfigured: verifyServiceSid.length > 0,
      isTwilioAuthConfigured: twilioAccountSid.length > 0 && twilioAuthToken.length > 0,
      hasSmsSender: fromNumber.length > 0 || messagingServiceSid.length > 0,
      ready:
        smsProvider === "mock" ||
        (smsProvider === "twilio" &&
          twilioAccountSid.length > 0 &&
          twilioAuthToken.length > 0 &&
          (isVerifyMode ? verifyServiceSid.length > 0 : fromNumber.length > 0 || messagingServiceSid.length > 0)),
    };

    if (!checks.ready) {
      return NextResponse.json(
        {
          ready: false,
          message: isVerifyMode
            ? "Twilio Verify is enabled but TWILIO_VERIFY_SERVICE_SID is not set. Add it to environment variables."
            : "Twilio SMS mode requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.",
          checks,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ready: true,
        message: `OTP provider is ready (${checks.mode} mode).`,
        checks,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown readiness error";
    console.error("OTP readiness check failed", error);
    return NextResponse.json({ ready: false, error: "OTP readiness check failed", detail: message }, { status: 500 });
  }
}
