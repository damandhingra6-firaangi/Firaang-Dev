import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { applyShopifyFulfillmentWebhook } from "@/lib/account-data";

export const runtime = "nodejs";

type ShopifyFulfillmentWebhookPayload = {
  id?: number | string;
  order_id?: number | string;
  status?: string;
  shipment_status?: string;
  tracking_company?: string;
  tracking_number?: string;
  tracking_url?: string;
  tracking_numbers?: Array<string | null>;
  tracking_urls?: Array<string | null>;
  updated_at?: string;
  created_at?: string;
};

function verifyShopifyWebhookSignature(rawBody: string, hmacHeader: string, secret: string) {
  if (!hmacHeader || !secret) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const headerBuffer = Buffer.from(hmacHeader, "utf8");
  const digestBuffer = Buffer.from(digest, "utf8");

  if (headerBuffer.length !== digestBuffer.length) {
    return false;
  }

  return timingSafeEqual(headerBuffer, digestBuffer);
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = (value ?? "").trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const secret = (process.env.SHOPIFY_WEBHOOK_SECRET ?? "").trim();
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256") ?? "";
    const topic = (request.headers.get("x-shopify-topic") ?? "").trim().toLowerCase();

    if (!secret) {
      return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
    }

    if (!verifyShopifyWebhookSignature(rawBody, hmacHeader, secret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    if (!["fulfillments/create", "fulfillments/update", "fulfillments/cancelled"].includes(topic)) {
      return NextResponse.json({ ok: true, ignored: true, reason: "unsupported_topic", topic });
    }

    const payload = JSON.parse(rawBody) as ShopifyFulfillmentWebhookPayload;
    const shopifyOrderId = String(payload.order_id ?? "").trim();

    if (!shopifyOrderId) {
      return NextResponse.json({ ok: true, ignored: true, reason: "missing_order_id", topic });
    }

    const result = await applyShopifyFulfillmentWebhook({
      shopifyOrderId,
      fulfillmentId: payload.id ? String(payload.id) : undefined,
      status: payload.status,
      shipmentStatus: payload.shipment_status,
      trackingCompany: payload.tracking_company,
      trackingNumber: firstNonEmpty([payload.tracking_number, ...(payload.tracking_numbers ?? [])]),
      trackingUrl: firstNonEmpty([payload.tracking_url, ...(payload.tracking_urls ?? [])]),
      eventAt: payload.updated_at ?? payload.created_at,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: true, ignored: true, reason: result.reason, topic, shopifyOrderId });
    }

    return NextResponse.json({ ok: true, topic, orderId: result.orderId });
  } catch (error) {
    console.error("Shopify webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
