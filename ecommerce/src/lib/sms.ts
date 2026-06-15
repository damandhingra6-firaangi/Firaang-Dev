type SendOtpSmsInput = {
  phone: string;
  code: string;
};

type TwilioVerifyInput = {
  phone: string;
};

type TwilioVerifyCheckInput = {
  phone: string;
  code: string;
};

function maskPhone(phone: string) {
  if (phone.length <= 4) {
    return phone;
  }

  return `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}

function readEnv(key: string) {
  if (typeof process === "undefined" || !process.env) {
    return "";
  }

  const value = process.env[key];
  return typeof value === "string" ? value : "";
}

function getProvider() {
  return (readEnv("SMS_PROVIDER") || "twilio").trim().toLowerCase();
}

function getTwilioAuth() {
  const accountSid = readEnv("TWILIO_ACCOUNT_SID").trim();
  const authToken = readEnv("TWILIO_AUTH_TOKEN").trim();

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_NOT_CONFIGURED");
  }

  return { accountSid, authToken };
}

function buildTwilioEndpoint(accountSid: string, path: string) {
  return `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/${path}`;
}

function buildTwilioVerifyEndpoint(path: string) {
  return `https://verify.twilio.com/v2/${path}`;
}

async function postTwilioForm(accountSid: string, authToken: string, path: string, form: URLSearchParams) {
  const basic = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const endpoint = buildTwilioEndpoint(accountSid, path);

  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: form.toString(),
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`TWILIO_HTTP_REQUEST_FAILED:${message}`);
  }
}

async function postTwilioVerifyForm(accountSid: string, authToken: string, path: string, form: URLSearchParams) {
  const basic = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const endpoint = buildTwilioVerifyEndpoint(path);

  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: form.toString(),
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`TWILIO_VERIFY_REQUEST_FAILED:NETWORK:${message}`);
  }
}

export function shouldUseTwilioVerify() {
  const provider = getProvider();
  const verifyServiceSid = readEnv("TWILIO_VERIFY_SERVICE_SID").trim();
  return provider === "twilio-verify" || (provider === "twilio" && verifyServiceSid.length > 0);
}

async function sendViaTwilio(input: SendOtpSmsInput) {
  const { accountSid, authToken } = getTwilioAuth();
  const fromNumber = readEnv("TWILIO_FROM_NUMBER").trim();
  const messagingServiceSid = readEnv("TWILIO_MESSAGING_SERVICE_SID").trim();

  if (!fromNumber && !messagingServiceSid) {
    throw new Error("TWILIO_SENDER_MISSING");
  }

  const otpTemplate = readEnv("SMS_OTP_MESSAGE_TEMPLATE").trim();
  const bodyMessage = otpTemplate
    ? otpTemplate.replace("{{OTP}}", input.code)
    : `Your Firaang OTP is ${input.code}. It is valid for 5 minutes.`;

  const form = new URLSearchParams({
    To: input.phone,
    Body: bodyMessage,
  });

  if (messagingServiceSid) {
    form.set("MessagingServiceSid", messagingServiceSid);
  } else {
    form.set("From", fromNumber);
  }

  const response = await postTwilioForm(accountSid, authToken, "Messages.json", form);

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: number;
    };

    const message = payload.message ?? `Twilio error (${response.status})`;
    const code = payload.code ? `:${payload.code}` : "";
    throw new Error(`TWILIO_SEND_FAILED${code}:${message}`);
  }
}

export async function startTwilioVerifySms(input: TwilioVerifyInput) {
  const { accountSid, authToken } = getTwilioAuth();
  const serviceSid = readEnv("TWILIO_VERIFY_SERVICE_SID").trim();

  if (!serviceSid) {
    throw new Error("TWILIO_VERIFY_NOT_CONFIGURED");
  }

  const form = new URLSearchParams({
    To: input.phone,
    Channel: "sms",
  });

  const verifyResponse = await postTwilioVerifyForm(accountSid, authToken, `Services/${serviceSid}/Verifications`, form);

  if (!verifyResponse.ok) {
    const payload = (await verifyResponse.json().catch(() => ({}))) as {
      message?: string;
      code?: number;
    };
    const message = payload.message ?? `Twilio Verify error (${verifyResponse.status})`;
    const code = payload.code ? `:${payload.code}` : "";
    throw new Error(`TWILIO_VERIFY_REQUEST_FAILED${code}:${message}`);
  }

  return (await verifyResponse.json()) as {
    sid: string;
    status: string;
  };
}

export async function checkTwilioVerifySms(input: TwilioVerifyCheckInput) {
  const { accountSid, authToken } = getTwilioAuth();
  const serviceSid = readEnv("TWILIO_VERIFY_SERVICE_SID").trim();

  if (!serviceSid) {
    throw new Error("TWILIO_VERIFY_NOT_CONFIGURED");
  }

  const form = new URLSearchParams({
    To: input.phone,
    Code: input.code,
  });

  const response = await postTwilioVerifyForm(accountSid, authToken, `Services/${serviceSid}/VerificationCheck`, form);

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: number;
    };
    const message = payload.message ?? `Twilio Verify check error (${response.status})`;
    const code = payload.code ? `:${payload.code}` : "";
    throw new Error(`TWILIO_VERIFY_CHECK_FAILED${code}:${message}`);
  }

  const payload = (await response.json()) as {
    status?: string;
    valid?: boolean;
  };

  return {
    approved: payload.status === "approved" || payload.valid === true,
    status: payload.status ?? "pending",
  };
}

export async function sendOtpSms(input: SendOtpSmsInput) {
  const provider = getProvider();

  if (provider === "twilio") {
    await sendViaTwilio(input);
    return;
  }

  if (provider === "twilio-verify") {
    throw new Error("TWILIO_VERIFY_MODE_REQUIRES_VERIFY_ENDPOINTS");
  }

  if (provider === "mock") {
    console.info("Mock OTP SMS", {
      phone: maskPhone(input.phone),
    });
    return;
  }

  throw new Error("SMS_PROVIDER_UNSUPPORTED");
}
