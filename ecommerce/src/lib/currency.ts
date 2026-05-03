export type SupportedCurrency = "INR" | "USD" | "AED";

function readPositiveRate(possibleKeys: string[], fallback: number) {
  for (const key of possibleKeys) {
    const raw = process.env[key];

    if (!raw) {
      continue;
    }

    const value = Number.parseFloat(raw);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return fallback;
}

const TO_INR_RATE: Record<SupportedCurrency, number> = {
  INR: 1,
  USD: readPositiveRate(["NEXT_PUBLIC_FX_USD_TO_INR", "FX_USD_TO_INR"], 83),
  AED: readPositiveRate(["NEXT_PUBLIC_FX_AED_TO_INR", "FX_AED_TO_INR"], 22.6),
};

const FORMAT_LOCALE: Record<SupportedCurrency, string> = {
  INR: "en-IN",
  USD: "en-US",
  AED: "en-AE",
};

export function toSupportedCurrency(input: string | null | undefined): SupportedCurrency {
  const code = (input ?? "").toUpperCase();
  if (code === "USD" || code === "AED") {
    return code;
  }
  return "INR";
}

export function convertAmount(amount: number, from: SupportedCurrency, to: SupportedCurrency) {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  if (from === to) {
    return amount;
  }

  const inInr = amount * TO_INR_RATE[from];
  return inInr / TO_INR_RATE[to];
}

export function formatCurrency(amount: number, currency: SupportedCurrency) {
  return new Intl.NumberFormat(FORMAT_LOCALE[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 2,
  }).format(amount);
}
