# SMS OTP Setup (Twilio)

This project supports production OTP delivery using Twilio SMS.

It supports two OTP modes:

- Twilio Verify API (recommended for production OTP).
- Local OTP store + Twilio SMS send (fallback/default).

## 1) What To Purchase

For India OTP use cases, buy/activate these in Twilio:

1. A Twilio account with paid balance (pay-as-you-go is enough).
2. One sender option:
- Twilio phone number with SMS capability, or
- Messaging Service (recommended for scaling).
3. If sending to India at scale, complete any local regulatory setup Twilio requires for your account category.

## 2) Required Environment Variables

Set these in your deployment environment:

- SMS_PROVIDER=twilio
- TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- TWILIO_AUTH_TOKEN=your-auth-token
- TWILIO_FROM_NUMBER=+1xxxxxxxxxx (for local OTP + Twilio SMS mode)

Optional:

- TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- SMS_OTP_MESSAGE_TEMPLATE=Your Firaangi OTP is {{OTP}}. Valid for 5 minutes.

Note:

- If TWILIO_MESSAGING_SERVICE_SID is set, it is used instead of TWILIO_FROM_NUMBER.
- If TWILIO_VERIFY_SERVICE_SID is set (with SMS_PROVIDER=twilio), Twilio Verify mode is used.
- You can force Verify mode with SMS_PROVIDER=twilio-verify.

## 3) Runtime Behavior

- Twilio Verify mode:
- OTP lifecycle and checks are managed by Twilio Verify.
- Local fallback mode:
- OTP validity: 5 minutes.
- OTP resend cooldown: 45 seconds.
- Max OTP verification attempts per issued OTP: 5.
- In development, the API also returns debugOtp for easier testing (fallback mode only).

## 4) Endpoints

- POST /api/auth/mobile/request-otp
- POST /api/auth/mobile/verify-otp

## 5) Quick Test

1. Open account modal.
2. Choose Login with Mobile OTP.
3. Request OTP for a valid Indian number.
4. Enter OTP from SMS and verify.

## 6) Suggested Hardening

- Add IP-based rate limiting at the API gateway/reverse proxy.
- Add per-phone daily OTP cap.
- Add bot protection (captcha) on request-otp.
- Monitor failed OTP attempts and abuse patterns.
