export const GOOGLE_ADS_CONVERSION_HANDOFF_KEY = "firaang.google-ads-conversion-handoff";

export type GoogleAdsConversionHandoff = {
  redirectTarget: string;
  transactionId: string;
  currencyCode: string;
  value: number;
};

export function parseGoogleAdsConversionHandoff(
  raw: string | null,
  origin: string,
): GoogleAdsConversionHandoff | null {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const redirectTarget = typeof value.redirectTarget === "string" ? value.redirectTarget : "";
    const transactionId = typeof value.transactionId === "string" ? value.transactionId.trim() : "";
    const currencyCode = typeof value.currencyCode === "string" ? value.currencyCode : "";
    const amount = value.value;
    const target = new URL(redirectTarget, origin);

    if (
      target.origin !== origin ||
      !/^\/order-success\/[^/]+$/.test(target.pathname) ||
      target.search ||
      target.hash ||
      !transactionId ||
      transactionId.length > 200 ||
      !/^[A-Z]{3}$/.test(currencyCode) ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return null;
    }

    return {
      redirectTarget: target.pathname,
      transactionId,
      currencyCode,
      value: amount,
    };
  } catch {
    return null;
  }
}
