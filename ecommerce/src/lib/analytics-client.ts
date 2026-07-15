"use client";

import {
  generateAnalyticsSessionId,
  generateAnalyticsVisitorId,
  parseCampaignParams,
  type AnalyticsEventName,
} from "@/lib/analytics-shared";

const VISITOR_STORAGE_KEY = "Firaang-analytics-visitor-id";
const SESSION_STORAGE_KEY = "Firaang-analytics-session-id";
const SESSION_STARTED_KEY = "Firaang-analytics-session-started";

export type ClientAnalyticsPayload = {
  eventName: AnalyticsEventName;
  pagePath?: string;
  pageType?: string;
  referrerUrl?: string;
  source?: string;
  campaign?: string;
  medium?: string;
  term?: string;
  content?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  screenSize?: string;
  durationSec?: number;
  productId?: string;
  productHandle?: string;
  productName?: string;
  searchTerm?: string;
  orderId?: string;
  orderAmount?: number;
  currencyCode?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

function inferDeviceType() {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("ipad") || ua.includes("tablet")) {
    return "tablet";
  }

  if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) {
    return "mobile";
  }

  return "desktop";
}

function inferBrowser() {
  const ua = navigator.userAgent;

  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("Firefox/")) return "Firefox";

  return "Other";
}

function inferOs() {
  const ua = navigator.userAgent;

  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";

  return "Other";
}

export function getOrCreateAnalyticsVisitorId() {
  if (typeof window === "undefined") {
    return generateAnalyticsVisitorId();
  }

  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const generated = generateAnalyticsVisitorId();
  window.localStorage.setItem(VISITOR_STORAGE_KEY, generated);
  return generated;
}

export function getOrCreateAnalyticsSessionId() {
  if (typeof window === "undefined") {
    return generateAnalyticsSessionId();
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const generated = generateAnalyticsSessionId();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
}

function wasSessionStarted() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(SESSION_STARTED_KEY) === "1";
}

export function markSessionStarted() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SESSION_STARTED_KEY, "1");
}

export async function trackClientEvent(payload: ClientAnalyticsPayload, options?: { useBeacon?: boolean }) {
  if (typeof window === "undefined") {
    return;
  }

  const visitorId = getOrCreateAnalyticsVisitorId();
  const sessionId = getOrCreateAnalyticsSessionId();
  const pageUrl = `${window.location.pathname}${window.location.search}`;
  const campaign = parseCampaignParams(pageUrl);

  const body = {
    eventName: payload.eventName,
    visitorId,
    sessionId,
    pageUrl,
    pagePath: payload.pagePath ?? pageUrl,
    pageType: payload.pageType,
    referrerUrl: payload.referrerUrl ?? document.referrer,
    source: payload.source ?? campaign.source,
    campaign: payload.campaign ?? campaign.campaign,
    medium: payload.medium ?? campaign.medium,
    term: payload.term ?? campaign.term,
    content: payload.content ?? campaign.content,
    gclid: payload.gclid ?? campaign.gclid,
    fbclid: payload.fbclid ?? campaign.fbclid,
    msclkid: payload.msclkid ?? campaign.msclkid,
    ttclid: payload.ttclid ?? campaign.ttclid,
    deviceType: inferDeviceType(),
    browser: inferBrowser(),
    os: inferOs(),
    screenSize: payload.screenSize ?? `${window.screen.width}x${window.screen.height}`,
    durationSec: payload.durationSec,
    productId: payload.productId,
    productHandle: payload.productHandle,
    productName: payload.productName,
    searchTerm: payload.searchTerm,
    orderId: payload.orderId,
    orderAmount: payload.orderAmount,
    currencyCode: payload.currencyCode,
    metadata: payload.metadata,
  };

  const serialized = JSON.stringify(body);

  if (options?.useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/track", new Blob([serialized], { type: "application/json" }));
    return;
  }

  await fetch("/api/analytics/track", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: serialized,
    keepalive: options?.useBeacon ?? false,
  }).catch(() => {
    // Analytics should never break user interactions.
  });
}

export function ensureSessionStartTracked() {
  if (wasSessionStarted()) {
    return;
  }

  markSessionStarted();
  void trackClientEvent({ eventName: "session_start" });
}
