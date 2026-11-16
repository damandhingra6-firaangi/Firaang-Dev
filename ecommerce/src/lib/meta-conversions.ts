import { createHash } from "node:crypto";
import {
  claimMetaCapiPurchaseEvent,
  completeMetaCapiPurchaseEvent,
  type MetaPurchaseConversion,
} from "@/lib/account-data";
import { getSiteUrl } from "@/lib/site";

type MetaCapiContext = {
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() || "";
}

function normalizePhone(value?: string) {
  return value?.replace(/\D/g, "") || "";
}

export function buildMetaPurchaseEvent(
  order: MetaPurchaseConversion,
  context: MetaCapiContext = {},
  eventTime = Math.floor(Date.now() / 1000),
) {
  const email = normalizeEmail(order.customerEmail);
  const phone = normalizePhone(order.customerPhone);

  return {
    event_name: "Purchase",
    event_time: eventTime,
    event_id: order.eventId,
    action_source: "website",
    event_source_url: `${getSiteUrl()}/order-success/${encodeURIComponent(order.orderId)}`,
    user_data: {
      ...(email ? { em: [hash(email)] } : {}),
      ...(phone ? { ph: [hash(phone)] } : {}),
      ...(context.clientIpAddress ? { client_ip_address: context.clientIpAddress } : {}),
      ...(context.clientUserAgent ? { client_user_agent: context.clientUserAgent } : {}),
      ...(context.fbc ? { fbc: context.fbc } : {}),
      ...(context.fbp ? { fbp: context.fbp } : {}),
    },
    custom_data: {
      value: order.value,
      currency: order.currencyCode,
      content_type: "product",
      content_ids: order.items.map((item) => item.productId),
      contents: order.items.map((item) => ({
        id: item.productId,
        quantity: item.quantity,
        item_price: item.unitPrice,
      })),
      num_items: order.items.reduce((total, item) => total + item.quantity, 0),
      ...(order.couponCode ? { coupon: order.couponCode } : {}),
    },
  };
}

function cookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function sendMetaPurchaseConversion(orderId: string, context: MetaCapiContext = {}) {
  const accessToken = process.env.META_ACCESS_TOKEN?.trim();
  const pixelId = process.env.META_PIXEL_ID?.trim() || "1144832497900793";
  const version = process.env.META_GRAPH_API_VERSION?.trim() || "v27.0";

  if (!accessToken) {
    return { status: "not_configured" as const };
  }

  if (!/^\d+$/.test(pixelId)) {
    throw new Error("META_PIXEL_ID must contain only digits");
  }

  if (!/^v\d+\.\d+$/.test(version)) {
    throw new Error("META_GRAPH_API_VERSION must use the format vNN.N");
  }

  const order = await claimMetaCapiPurchaseEvent(orderId);
  if (!order) {
    return { status: "not_claimed" as const };
  }

  const testEventCode = process.env.META_TEST_EVENT_CODE?.trim();
  const event = buildMetaPurchaseEvent(order, context);

  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [event],
          ...(testEventCode ? { test_event_code: testEventCode } : {}),
        }),
        cache: "no-store",
      },
    );

    const responseBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      events_received?: number;
    };

    if (!response.ok || responseBody.error || (responseBody.events_received !== undefined && responseBody.events_received < 1)) {
      throw new Error(responseBody.error?.message ?? `Meta Conversions API request failed (${response.status})`);
    }

    await completeMetaCapiPurchaseEvent(orderId, true);
    return { status: "sent" as const, eventsReceived: responseBody.events_received ?? 0 };
  } catch (error) {
    await completeMetaCapiPurchaseEvent(orderId, false);
    throw error;
  }
}

export function getMetaCapiRequestContext(request: Request): MetaCapiContext {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return {
    clientIpAddress: forwardedIp || realIp || undefined,
    clientUserAgent: request.headers.get("user-agent") || undefined,
    fbc: cookieValue(cookieHeader, "_fbc"),
    fbp: cookieValue(cookieHeader, "_fbp"),
  };
}
