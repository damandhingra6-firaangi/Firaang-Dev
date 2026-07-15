import { createHash, randomUUID } from "crypto";
import { type Document, type Filter, type ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

const EVENTS_COLLECTION = process.env.MONGODB_ANALYTICS_EVENTS_COLLECTION ?? "analytics_events";
const SESSIONS_COLLECTION = process.env.MONGODB_ANALYTICS_SESSIONS_COLLECTION ?? "analytics_sessions";

const ACTIVE_USER_WINDOW_MS = 5 * 60 * 1000;

let ensureIndexesPromise: Promise<void> | null = null;

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

export type DeviceType = "mobile" | "tablet" | "desktop" | "bot" | "unknown";

export type TrafficChannel =
  | "google_search"
  | "google_ads"
  | "facebook"
  | "instagram"
  | "youtube"
  | "twitter"
  | "linkedin"
  | "direct"
  | "referral"
  | "email"
  | "other";

type AnalyticsEventDocument = {
  _id?: ObjectId;
  eventName: AnalyticsEventName;
  eventAt: Date;
  visitorId: string;
  sessionId: string;
  pagePath: string;
  pageType: string;
  referrerHost: string;
  referrerUrl?: string;
  source: TrafficChannel;
  sourceLabel: string;
  campaign: string;
  medium: string;
  term: string;
  content: string;
  gclid: string;
  fbclid: string;
  msclkid: string;
  ttclid: string;
  deviceType: DeviceType;
  browser: string;
  os: string;
  country: string;
  region: string;
  city: string;
  isNewVisitor: boolean;
  userAgentHash: string;
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

type AnalyticsSessionDocument = {
  _id?: ObjectId;
  sessionId: string;
  visitorId: string;
  startedAt: Date;
  lastSeenAt: Date;
  pageViews: number;
  eventCount: number;
  source: TrafficChannel;
  sourceLabel: string;
  campaign: string;
  medium: string;
  referrerHost: string;
  country: string;
  region: string;
  city: string;
  deviceType: DeviceType;
  browser: string;
  os: string;
};

export type TrackAnalyticsEventInput = {
  eventName: AnalyticsEventName;
  eventAt?: Date;
  visitorId: string;
  sessionId: string;
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
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  city?: string;
  userAgent?: string;
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

export type AnalyticsSummaryQuery = {
  from: Date;
  to: Date;
};

export type AnalyticsSummary = {
  totals: {
    totalVisitors: number;
    uniqueVisitors: number;
    pageViews: number;
    activeUsers: number;
    todayVisitors: number;
    weekVisitors: number;
    monthVisitors: number;
    avgSessionDurationSec: number;
    bounceRate: number;
    conversionRate: number;
  };
  newVsReturning: {
    newVisitors: number;
    returningVisitors: number;
  };
  topPages: Array<{ key: string; count: number }>;
  topProducts: Array<{ key: string; count: number }>;
  trafficSources: Array<{ key: string; count: number }>;
  locations: Array<{ country: string; region: string; city: string; count: number }>;
  deviceBreakdown: Array<{ key: string; count: number }>;
  browserBreakdown: Array<{ key: string; count: number }>;
  osBreakdown: Array<{ key: string; count: number }>;
  searchedKeywords: Array<{ key: string; count: number }>;
  funnel: {
    home: number;
    product: number;
    cart: number;
    checkout: number;
    payment: number;
  };
  salesBySource: Array<{ key: string; orders: number; revenue: number }>;
  visitorTimeline: Array<{ day: string; visitors: number }>;
  pageViewTimeline: Array<{ day: string; pageViews: number }>;
};

export type AnalyticsAttribution = {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  gclid: string;
  fbclid: string;
  msclkid: string;
  ttclid: string;
};

function normalizeText(value: unknown, fallback = "unknown") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeLower(value: unknown, fallback = "unknown") {
  return normalizeText(value, fallback).toLowerCase();
}

function normalizePath(value: string | undefined) {
  if (!value) {
    return "/";
  }

  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      return `${url.pathname || "/"}${url.search || ""}`;
    }

    if (!value.startsWith("/")) {
      return `/${value}`;
    }

    return value;
  } catch {
    return "/";
  }
}

function derivePageType(pagePath: string) {
  const pathOnly = pagePath.split("?")[0] ?? "/";

  if (pathOnly === "/") return "home";
  if (pathOnly.startsWith("/product/")) return "product";
  if (pathOnly.startsWith("/shop")) return "collection";
  if (pathOnly.startsWith("/checkout")) return "checkout";
  if (pathOnly.startsWith("/account")) return "account";
  if (pathOnly.startsWith("/admin")) return "admin";

  return "page";
}

function classifyTrafficSource(input: {
  source: string;
  medium: string;
  referrerHost: string;
  gclid: string;
  fbclid: string;
  msclkid: string;
  ttclid: string;
}) {
  const source = input.source;
  const medium = input.medium;
  const referrerHost = input.referrerHost;

  if (input.gclid !== "none" || input.msclkid !== "none") {
    return { channel: "google_ads" as const, label: "Google Ads" };
  }

  if (source.includes("google") || referrerHost.includes("google.")) {
    if (medium.includes("cpc") || medium.includes("ppc") || medium.includes("paid")) {
      return { channel: "google_ads" as const, label: "Google Ads" };
    }
    return { channel: "google_search" as const, label: "Google Search" };
  }

  if (source.includes("facebook") || referrerHost.includes("facebook.")) {
    return { channel: "facebook" as const, label: "Facebook" };
  }

  if (source.includes("instagram") || referrerHost.includes("instagram.")) {
    return { channel: "instagram" as const, label: "Instagram" };
  }

  if (source.includes("youtube") || referrerHost.includes("youtube.")) {
    return { channel: "youtube" as const, label: "YouTube" };
  }

  if (source.includes("twitter") || source.includes("x") || referrerHost.includes("t.co")) {
    return { channel: "twitter" as const, label: "Twitter/X" };
  }

  if (source.includes("linkedin") || referrerHost.includes("linkedin.")) {
    return { channel: "linkedin" as const, label: "LinkedIn" };
  }

  if (input.fbclid !== "none") {
    return { channel: "facebook" as const, label: "Facebook" };
  }

  if (input.ttclid !== "none") {
    return { channel: "other" as const, label: "TikTok" };
  }

  if (medium.includes("email")) {
    return { channel: "email" as const, label: "Email" };
  }

  if (referrerHost !== "direct") {
    return { channel: "referral" as const, label: `Referral (${referrerHost})` };
  }

  if (source === "direct" || medium === "none") {
    return { channel: "direct" as const, label: "Direct" };
  }

  return { channel: "other" as const, label: source };
}

function deriveDeviceType(userAgent: string, inputDeviceType?: string): DeviceType {
  const explicit = normalizeLower(inputDeviceType, "");
  if (explicit === "mobile" || explicit === "tablet" || explicit === "desktop" || explicit === "bot") {
    return explicit;
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes("bot") || ua.includes("spider") || ua.includes("crawler")) {
    return "bot";
  }

  if (ua.includes("ipad") || ua.includes("tablet")) {
    return "tablet";
  }

  if (
    ua.includes("mobi") ||
    ua.includes("android") ||
    ua.includes("iphone") ||
    ua.includes("windows phone") ||
    ua.includes("opera mini")
  ) {
    return "mobile";
  }

  if (ua.length === 0) {
    return "unknown";
  }

  return "desktop";
}

function deriveBrowser(userAgent: string, browserHint?: string) {
  const explicit = normalizeText(browserHint ?? "", "");
  if (explicit) {
    return explicit;
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("chrome/")) return "Chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  if (ua.includes("firefox/")) return "Firefox";

  return ua.length > 0 ? "Other" : "Unknown";
}

function deriveOs(userAgent: string, osHint?: string) {
  const explicit = normalizeText(osHint ?? "", "");
  if (explicit) {
    return explicit;
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes("windows")) return "Windows";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("linux")) return "Linux";

  return ua.length > 0 ? "Other" : "Unknown";
}

async function ensureAnalyticsIndexes() {
  if (ensureIndexesPromise) {
    return ensureIndexesPromise;
  }

  ensureIndexesPromise = (async () => {
    const db = await getMongoDb();
    const events = db.collection<AnalyticsEventDocument>(EVENTS_COLLECTION);
    const sessions = db.collection<AnalyticsSessionDocument>(SESSIONS_COLLECTION);

    await Promise.all([
      events.createIndex({ eventAt: -1 }, { name: "event_at_desc" }),
      events.createIndex({ eventName: 1, eventAt: -1 }, { name: "event_name_date" }),
      events.createIndex({ visitorId: 1, eventAt: -1 }, { name: "visitor_date" }),
      events.createIndex({ sessionId: 1, eventAt: -1 }, { name: "session_date" }),
      events.createIndex({ pagePath: 1, eventAt: -1 }, { name: "page_date" }),
      events.createIndex({ productId: 1, eventAt: -1 }, { name: "product_date", sparse: true }),
      events.createIndex({ source: 1, eventAt: -1 }, { name: "source_date" }),
      events.createIndex({ orderId: 1 }, { name: "order_id_sparse", sparse: true }),
      sessions.createIndex({ sessionId: 1 }, { name: "session_id_unique", unique: true }),
      sessions.createIndex({ lastSeenAt: -1 }, { name: "session_last_seen" }),
      sessions.createIndex({ visitorId: 1, startedAt: -1 }, { name: "session_visitor_started" }),
    ]);
  })().catch((error) => {
    ensureIndexesPromise = null;
    throw error;
  });

  return ensureIndexesPromise;
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function aggregateCountByKey(
  match: Filter<AnalyticsEventDocument>,
  options: { field?: string; expression?: Document; limit?: number },
) {
  const db = await getMongoDb();
  const events = db.collection<AnalyticsEventDocument>(EVENTS_COLLECTION);
  const groupKey = options.expression ? options.expression : `$${options.field ?? "source"}`;

  const rows = await events
    .aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: groupKey, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      ...(options.limit ? [{ $limit: options.limit }] : []),
    ])
    .toArray();

  return rows.map((row) => ({ key: normalizeText(row._id, "unknown"), count: row.count }));
}

export function generateAnalyticsVisitorId() {
  return `v_${randomUUID()}`;
}

export function generateAnalyticsSessionId() {
  return `s_${randomUUID()}`;
}

export async function isNewVisitor(visitorId: string) {
  const db = await getMongoDb();
  const events = db.collection<AnalyticsEventDocument>(EVENTS_COLLECTION);
  const existing = await events.findOne({ visitorId }, { projection: { _id: 1 } });
  return existing === null;
}

export async function trackAnalyticsEvent(input: TrackAnalyticsEventInput) {
  await ensureAnalyticsIndexes();

  const db = await getMongoDb();
  const events = db.collection<AnalyticsEventDocument>(EVENTS_COLLECTION);
  const sessions = db.collection<AnalyticsSessionDocument>(SESSIONS_COLLECTION);

  const eventAt = input.eventAt ?? new Date();
  const pagePath = normalizePath(input.pagePath);
  const pageType = normalizeText(input.pageType, derivePageType(pagePath));
  const referrerUrl = normalizeText(input.referrerUrl, "");
  const referrerHost = referrerUrl
    ? (() => {
        try {
          return new URL(referrerUrl).host || "direct";
        } catch {
          return "direct";
        }
      })()
    : "direct";

  const source = normalizeLower(input.source, "direct");
  const medium = normalizeLower(input.medium, "none");
  const campaign = normalizeText(input.campaign, "none");
  const term = normalizeText(input.term, "none");
  const content = normalizeText(input.content, "none");
  const gclid = normalizeText(input.gclid, "none");
  const fbclid = normalizeText(input.fbclid, "none");
  const msclkid = normalizeText(input.msclkid, "none");
  const ttclid = normalizeText(input.ttclid, "none");
  const userAgent = normalizeText(input.userAgent, "");
  const deviceType = deriveDeviceType(userAgent, input.deviceType);
  const browser = deriveBrowser(userAgent, input.browser);
  const os = deriveOs(userAgent, input.os);
  const channel = classifyTrafficSource({ source, medium, referrerHost, gclid, fbclid, msclkid, ttclid });

  const existingSession = await sessions.findOne({ sessionId: input.sessionId }, { projection: { _id: 1 } });

  const eventDoc: AnalyticsEventDocument = {
    eventName: input.eventName,
    eventAt,
    visitorId: normalizeText(input.visitorId, generateAnalyticsVisitorId()),
    sessionId: normalizeText(input.sessionId, generateAnalyticsSessionId()),
    pagePath,
    pageType,
    referrerHost,
    referrerUrl: referrerUrl || undefined,
    source: channel.channel,
    sourceLabel: channel.label,
    campaign,
    medium,
    term,
    content,
    gclid,
    fbclid,
    msclkid,
    ttclid,
    deviceType,
    browser,
    os,
    country: normalizeText(input.country, "unknown"),
    region: normalizeText(input.region, "unknown"),
    city: normalizeText(input.city, "unknown"),
    isNewVisitor: !existingSession && (await isNewVisitor(input.visitorId)),
    userAgentHash: createHash("sha256").update(userAgent).digest("hex"),
    screenSize: normalizeText(input.screenSize, "") || undefined,
    durationSec: typeof input.durationSec === "number" ? Math.max(0, Math.round(input.durationSec)) : undefined,
    productId: normalizeText(input.productId, "") || undefined,
    productHandle: normalizeText(input.productHandle, "") || undefined,
    productName: normalizeText(input.productName, "") || undefined,
    searchTerm: normalizeText(input.searchTerm, "") || undefined,
    orderId: normalizeText(input.orderId, "") || undefined,
    orderAmount: typeof input.orderAmount === "number" ? Math.max(0, Math.round(input.orderAmount)) : undefined,
    currencyCode: normalizeText(input.currencyCode, "") || undefined,
    metadata: input.metadata,
  };

  await events.insertOne(eventDoc);

  await sessions.updateOne(
    { sessionId: eventDoc.sessionId },
    {
      $setOnInsert: {
        sessionId: eventDoc.sessionId,
        visitorId: eventDoc.visitorId,
        startedAt: eventAt,
        source: eventDoc.source,
        sourceLabel: eventDoc.sourceLabel,
        campaign: eventDoc.campaign,
        medium: eventDoc.medium,
        referrerHost: eventDoc.referrerHost,
        country: eventDoc.country,
        region: eventDoc.region,
        city: eventDoc.city,
        deviceType: eventDoc.deviceType,
        browser: eventDoc.browser,
        os: eventDoc.os,
      },
      $set: {
        lastSeenAt: eventAt,
      },
      $inc: {
        eventCount: 1,
        pageViews: eventDoc.eventName === "page_view" ? 1 : 0,
      },
    },
    { upsert: true },
  );

  return { ok: true } as const;
}

function getDateWindows() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(now.getDate() - 29);
  monthStart.setHours(0, 0, 0, 0);

  return { now, todayStart, weekStart, monthStart };
}

export async function getAnalyticsSummary(query: AnalyticsSummaryQuery): Promise<AnalyticsSummary> {
  await ensureAnalyticsIndexes();

  const db = await getMongoDb();
  const events = db.collection<AnalyticsEventDocument>(EVENTS_COLLECTION);
  const sessions = db.collection<AnalyticsSessionDocument>(SESSIONS_COLLECTION);

  const from = query.from;
  const to = query.to;
  const matchRange = { eventAt: { $gte: from, $lte: to } };
  const windows = getDateWindows();

  const [
    uniqueVisitors,
    totalVisitors,
    pageViews,
    activeUsers,
    todayVisitors,
    weekVisitors,
    monthVisitors,
    topPages,
    trafficSources,
    deviceBreakdown,
    browserBreakdown,
    osBreakdown,
    searchedKeywords,
    topProducts,
    locationsRaw,
    salesBySourceRaw,
    funnelRows,
    visitorTimelineRaw,
    pageViewTimelineRaw,
    sessionRange,
    firstSeenRows,
  ] = await Promise.all([
    events.distinct("visitorId", matchRange),
    events.countDocuments(matchRange),
    events.countDocuments({ ...matchRange, eventName: "page_view" }),
    sessions.distinct("sessionId", { lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_USER_WINDOW_MS) } }),
    events.distinct("visitorId", { eventAt: { $gte: windows.todayStart, $lte: windows.now } }),
    events.distinct("visitorId", { eventAt: { $gte: windows.weekStart, $lte: windows.now } }),
    events.distinct("visitorId", { eventAt: { $gte: windows.monthStart, $lte: windows.now } }),
    aggregateCountByKey({ ...matchRange, eventName: "page_view" }, { field: "pagePath", limit: 12 }),
    aggregateCountByKey(matchRange, { field: "sourceLabel", limit: 10 }),
    aggregateCountByKey(matchRange, { field: "deviceType", limit: 10 }),
    aggregateCountByKey(matchRange, { field: "browser", limit: 10 }),
    aggregateCountByKey(matchRange, { field: "os", limit: 10 }),
    aggregateCountByKey({ ...matchRange, eventName: "search", searchTerm: { $exists: true } }, { field: "searchTerm", limit: 12 }),
    events
      .aggregate<{ _id: string; count: number }>([
        { $match: { ...matchRange, eventName: "product_view" } },
        {
          $group: {
            _id: {
              $ifNull: ["$productName", { $ifNull: ["$productHandle", { $ifNull: ["$productId", "unknown"] }] }],
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    events
      .aggregate<{ _id: { country: string; region: string; city: string }; count: number }>([
        { $match: matchRange },
        {
          $group: {
            _id: {
              country: "$country",
              region: "$region",
              city: "$city",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
      .toArray(),
    events
      .aggregate<{ _id: string; orders: number; revenue: number }>([
        { $match: { ...matchRange, eventName: "order_paid" } },
        {
          $group: {
            _id: "$sourceLabel",
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$orderAmount", 0] } },
          },
        },
        { $sort: { revenue: -1 } },
      ])
      .toArray(),
    events
      .aggregate<{ _id: string; sessions: string[] }>([
        {
          $match: {
            ...matchRange,
            $or: [
              { eventName: "page_view", pagePath: "/" },
              { eventName: "product_view" },
              { eventName: "add_to_cart" },
              { eventName: "checkout_started" },
              { eventName: "order_paid" },
            ],
          },
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $and: [{ $eq: ["$eventName", "page_view"] }, { $eq: ["$pagePath", "/"] }] }, then: "home" },
                  { case: { $eq: ["$eventName", "product_view"] }, then: "product" },
                  { case: { $eq: ["$eventName", "add_to_cart"] }, then: "cart" },
                  { case: { $eq: ["$eventName", "checkout_started"] }, then: "checkout" },
                  { case: { $eq: ["$eventName", "order_paid"] }, then: "payment" },
                ],
                default: "other",
              },
            },
            sessions: { $addToSet: "$sessionId" },
          },
        },
      ])
      .toArray(),
    events
      .aggregate<{ _id: string; visitors: number }>([
        { $match: matchRange },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$eventAt" } },
            visitors: { $addToSet: "$visitorId" },
          },
        },
        { $project: { visitors: { $size: "$visitors" } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    events
      .aggregate<{ _id: string; pageViews: number }>([
        { $match: { ...matchRange, eventName: "page_view" } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$eventAt" } },
            pageViews: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    sessions.find({ startedAt: { $gte: from, $lte: to } }).toArray(),
    events
      .aggregate<{ _id: string; firstSeenAt: Date }>([
        { $match: { visitorId: { $exists: true } } },
        { $group: { _id: "$visitorId", firstSeenAt: { $min: "$eventAt" } } },
        { $match: { firstSeenAt: { $lte: to } } },
      ])
      .toArray(),
  ]);

  const uniqueVisitorSet = new Set(uniqueVisitors);

  const newVisitorSet = new Set(
    firstSeenRows.filter((row) => row.firstSeenAt >= from && row.firstSeenAt <= to).map((row) => row._id),
  );

  const returningVisitors = [...uniqueVisitorSet].filter((visitorId) => !newVisitorSet.has(visitorId)).length;

  const totalSessionDurationSec = sessionRange.reduce((sum, session) => {
    const duration = Math.max(0, (session.lastSeenAt.getTime() - session.startedAt.getTime()) / 1000);
    return sum + duration;
  }, 0);

  const avgSessionDurationSec = sessionRange.length > 0 ? Math.round(totalSessionDurationSec / sessionRange.length) : 0;
  const bouncedSessions = sessionRange.filter((session) => session.pageViews <= 1).length;
  const bounceRate = sessionRange.length > 0 ? Number(((bouncedSessions / sessionRange.length) * 100).toFixed(2)) : 0;

  const funnelCounts = {
    home: 0,
    product: 0,
    cart: 0,
    checkout: 0,
    payment: 0,
  };

  for (const row of funnelRows) {
    if (row._id in funnelCounts) {
      funnelCounts[row._id as keyof typeof funnelCounts] = row.sessions.length;
    }
  }

  const conversionRate = funnelCounts.home > 0 ? Number(((funnelCounts.payment / funnelCounts.home) * 100).toFixed(2)) : 0;

  return {
    totals: {
      totalVisitors,
      uniqueVisitors: uniqueVisitorSet.size,
      pageViews,
      activeUsers: activeUsers.length,
      todayVisitors: todayVisitors.length,
      weekVisitors: weekVisitors.length,
      monthVisitors: monthVisitors.length,
      avgSessionDurationSec,
      bounceRate,
      conversionRate,
    },
    newVsReturning: {
      newVisitors: newVisitorSet.size,
      returningVisitors,
    },
    topPages,
    topProducts: topProducts.map((row) => ({ key: normalizeText(row._id, "unknown"), count: row.count })),
    trafficSources,
    locations: locationsRaw.map((row) => ({
      country: normalizeText(row._id.country, "unknown"),
      region: normalizeText(row._id.region, "unknown"),
      city: normalizeText(row._id.city, "unknown"),
      count: row.count,
    })),
    deviceBreakdown,
    browserBreakdown,
    osBreakdown,
    searchedKeywords,
    funnel: funnelCounts,
    salesBySource: salesBySourceRaw.map((row) => ({ key: normalizeText(row._id, "unknown"), orders: row.orders, revenue: row.revenue })),
    visitorTimeline: visitorTimelineRaw.map((row) => ({ day: row._id, visitors: row.visitors })),
    pageViewTimeline: pageViewTimelineRaw.map((row) => ({ day: row._id, pageViews: row.pageViews })),
  };
}

export function serializeAttributionCookie(attribution: AnalyticsAttribution) {
  return Buffer.from(JSON.stringify(attribution)).toString("base64url");
}

export function parseAttributionCookie(raw: string | null | undefined): AnalyticsAttribution {
  if (!raw) {
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
    };
  }

  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<AnalyticsAttribution>;

    return {
      source: normalizeLower(parsed.source, "direct"),
      medium: normalizeLower(parsed.medium, "none"),
      campaign: normalizeText(parsed.campaign, "none"),
      term: normalizeText(parsed.term, "none"),
      content: normalizeText(parsed.content, "none"),
      gclid: normalizeText(parsed.gclid, "none"),
      fbclid: normalizeText(parsed.fbclid, "none"),
      msclkid: normalizeText(parsed.msclkid, "none"),
      ttclid: normalizeText(parsed.ttclid, "none"),
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
    };
  }
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

export function parseGeoFromRequestHeaders(headers: Headers) {
  const country = normalizeText(headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry"), "unknown");
  const region = normalizeText(headers.get("x-vercel-ip-country-region") ?? headers.get("x-appengine-region"), "unknown");
  const city = normalizeText(headers.get("x-vercel-ip-city") ?? headers.get("x-appengine-city"), "unknown");

  return { country, region, city };
}

export function getDateRangeFromPreset(preset: string) {
  const now = new Date();
  const from = new Date(now);

  if (preset === "7d") {
    from.setDate(now.getDate() - 6);
  } else if (preset === "90d") {
    from.setDate(now.getDate() - 89);
  } else {
    from.setDate(now.getDate() - 29);
  }

  from.setHours(0, 0, 0, 0);
  return { from, to: now };
}
