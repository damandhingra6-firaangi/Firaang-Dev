export const META_MARKETING_CONSENT_COOKIE = "Firaang_meta_marketing_consent";
export const META_MARKETING_CONSENT_EVENT = "firaang:meta-marketing-consent-change";
export const META_PIXEL_READY_EVENT = "firaang:meta-pixel-ready";

export type MetaMarketingConsent = "granted" | "denied";

export function readMetaMarketingConsent(cookieHeader: string): MetaMarketingConsent | null {
  const consentCookie = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${META_MARKETING_CONSENT_COOKIE}=`));

  const consent = consentCookie?.slice(consentCookie.indexOf("=") + 1);
  return consent === "granted" || consent === "denied" ? consent : null;
}

export function isMetaTrackingOptedOut(headers: Headers) {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

export function hasMetaMarketingConsent() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const navigatorWithPrivacySignals = navigator as Navigator & { globalPrivacyControl?: boolean };
  const windowWithPrivacySignals = window as Window & { doNotTrack?: string };
  const consent = readMetaMarketingConsent(document.cookie);

  return (
    consent === "granted" &&
    navigator.doNotTrack !== "1" &&
    windowWithPrivacySignals.doNotTrack !== "1" &&
    navigatorWithPrivacySignals.globalPrivacyControl !== true
  );
}
