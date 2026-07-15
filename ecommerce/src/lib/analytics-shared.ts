export type AnalyticsEventName =
  | "session_start"
  | "session_end"
  | "heartbeat"
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "checkout_started"
  | "search"
  | "order_created"
  | "order_paid";

function generateId(prefix: "v" | "s") {
  const fromCrypto = globalThis.crypto?.randomUUID?.();

  if (fromCrypto) {
    return `${prefix}_${fromCrypto}`;
  }

  const randomPart = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${randomPart}`;
}

export function generateAnalyticsVisitorId() {
  return generateId("v");
}

export function generateAnalyticsSessionId() {
  return generateId("s");
}

function normalizeText(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeLower(value: string | null, fallback: string) {
  return normalizeText(value, fallback).toLowerCase();
}

export function parseCampaignParams(urlValue: string) {
  try {
    const url = new URL(urlValue, "https://firaang.local");

    return {
      source: normalizeLower(url.searchParams.get("utm_source"), "direct"),
      medium: normalizeLower(url.searchParams.get("utm_medium"), "none"),
      campaign: normalizeText(url.searchParams.get("utm_campaign"), "none"),
      term: normalizeText(url.searchParams.get("utm_term"), "none"),
      content: normalizeText(url.searchParams.get("utm_content"), "none"),
      gclid: normalizeText(url.searchParams.get("gclid"), "none"),
      fbclid: normalizeText(url.searchParams.get("fbclid"), "none"),
      msclkid: normalizeText(url.searchParams.get("msclkid"), "none"),
      ttclid: normalizeText(url.searchParams.get("ttclid"), "none"),
      pagePath: `${url.pathname || "/"}${url.search || ""}`,
    };
  } catch {
    return {
      source: "direct",
      medium: "none",
      campaign: "none",
      term: "none",
      content: "none",
      gclid: "none",
      fbclid: "none",
      msclkid: "none",
      ttclid: "none",
      pagePath: "/",
    };
  }
}
