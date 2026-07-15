import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateAnalyticsSessionId,
  generateAnalyticsVisitorId,
  serializeAttributionCookie,
  parseCampaignParams,
  parseGeoFromRequestHeaders,
  trackAnalyticsEvent,
} from "@/lib/analytics";

export const runtime = "nodejs";

const VISITOR_COOKIE = "Firaang_analytics_vid";
const SESSION_COOKIE = "Firaang_analytics_sid";
const ATTRIBUTION_COOKIE = "Firaang_analytics_attr";

const trackSchema = z.object({
  eventName: z
    .enum([
      "session_start",
      "session_end",
      "heartbeat",
      "page_view",
      "product_view",
      "add_to_cart",
      "checkout_started",
      "search",
      "order_created",
      "order_paid",
    ])
    .default("page_view"),
  visitorId: z.string().trim().max(120).optional(),
  sessionId: z.string().trim().max(120).optional(),
  pageUrl: z.string().trim().max(2000).optional(),
  pagePath: z.string().trim().max(2000).optional(),
  pageType: z.string().trim().max(80).optional(),
  referrerUrl: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(120).optional(),
  campaign: z.string().trim().max(200).optional(),
  medium: z.string().trim().max(120).optional(),
  term: z.string().trim().max(200).optional(),
  content: z.string().trim().max(200).optional(),
  gclid: z.string().trim().max(250).optional(),
  fbclid: z.string().trim().max(250).optional(),
  msclkid: z.string().trim().max(250).optional(),
  ttclid: z.string().trim().max(250).optional(),
  deviceType: z.string().trim().max(40).optional(),
  browser: z.string().trim().max(80).optional(),
  os: z.string().trim().max(80).optional(),
  country: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  screenSize: z.string().trim().max(30).optional(),
  durationSec: z.number().nonnegative().max(86400).optional(),
  productId: z.string().trim().max(120).optional(),
  productHandle: z.string().trim().max(160).optional(),
  productName: z.string().trim().max(240).optional(),
  searchTerm: z.string().trim().max(200).optional(),
  orderId: z.string().trim().max(200).optional(),
  orderAmount: z.number().nonnegative().max(50000000).optional(),
  currencyCode: z.string().trim().max(10).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function POST(request: Request) {
  try {
    const dntHeader = request.headers.get("dnt") ?? "";

    if (dntHeader === "1") {
      return NextResponse.json({ ok: true, ignored: "dnt" });
    }

    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsed = trackSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const payload = parsed.data;
    const cookieHeader = request.headers.get("cookie") ?? "";
    const visitorFromCookie = cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${VISITOR_COOKIE}=`))
      ?.split("=")[1];
    const sessionFromCookie = cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${SESSION_COOKIE}=`))
      ?.split("=")[1];

    const visitorId = payload.visitorId || visitorFromCookie || generateAnalyticsVisitorId();
    const sessionId = payload.sessionId || sessionFromCookie || generateAnalyticsSessionId();

    const pageForCampaign = payload.pageUrl || payload.pagePath || "/";
    const campaignParams = parseCampaignParams(pageForCampaign);
    const geo = parseGeoFromRequestHeaders(request.headers);

    await trackAnalyticsEvent({
      eventName: payload.eventName,
      visitorId,
      sessionId,
      pagePath: payload.pagePath || campaignParams.pagePath,
      pageType: payload.pageType,
      referrerUrl: payload.referrerUrl,
      source: payload.source || campaignParams.source,
      campaign: payload.campaign || campaignParams.campaign,
      medium: payload.medium || campaignParams.medium,
      term: payload.term || campaignParams.term,
      content: payload.content || campaignParams.content,
      gclid: payload.gclid || campaignParams.gclid,
      fbclid: payload.fbclid || campaignParams.fbclid,
      msclkid: payload.msclkid || campaignParams.msclkid,
      ttclid: payload.ttclid || campaignParams.ttclid,
      deviceType: payload.deviceType,
      browser: payload.browser,
      os: payload.os,
      country: payload.country || geo.country,
      region: payload.region || geo.region,
      city: payload.city || geo.city,
      userAgent: request.headers.get("user-agent") ?? "",
      screenSize: payload.screenSize,
      durationSec: payload.durationSec,
      productId: payload.productId,
      productHandle: payload.productHandle,
      productName: payload.productName,
      searchTerm: payload.searchTerm,
      orderId: payload.orderId,
      orderAmount: payload.orderAmount,
      currencyCode: payload.currencyCode,
      metadata: payload.metadata,
    });

    const response = NextResponse.json({ ok: true, visitorId, sessionId });

    response.cookies.set({
      name: VISITOR_COOKIE,
      value: visitorId,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionId,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    response.cookies.set({
      name: ATTRIBUTION_COOKIE,
      value: serializeAttributionCookie({
        source: payload.source || campaignParams.source,
        medium: payload.medium || campaignParams.medium,
        campaign: payload.campaign || campaignParams.campaign,
        term: payload.term || campaignParams.term,
        content: payload.content || campaignParams.content,
        gclid: payload.gclid || campaignParams.gclid,
        fbclid: payload.fbclid || campaignParams.fbclid,
        msclkid: payload.msclkid || campaignParams.msclkid,
        ttclid: payload.ttclid || campaignParams.ttclid,
      }),
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Analytics track failed", error);
    return NextResponse.json({ error: "Could not track analytics event" }, { status: 500 });
  }
}
