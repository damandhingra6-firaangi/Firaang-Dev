import { NextResponse } from "next/server";
import { newsletterSchema } from "@/lib/newsletter";
import {
  listNewsletterSubscriptionsByDateRange,
  listNewsletterSubscriptionsForExport,
  type NewsletterDateRange,
  saveNewsletterSubscription,
} from "@/lib/newsletter-store";

export const runtime = "nodejs";

function getPositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function escapeCsvValue(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function parseDateParam(value: string | null, isEndBound: boolean) {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
    if (!year || !month || !day) {
      return null;
    }

    if (isEndBound) {
      return new Date(Date.UTC(year, month - 1, day + 1));
    }

    return new Date(Date.UTC(year, month - 1, day));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function GET(request: Request) {
  const adminKey = process.env.FEEDBACK_ADMIN_KEY;
  const requestKey = request.headers.get("x-admin-key");

  if (!adminKey) {
    return NextResponse.json({ error: "FEEDBACK_ADMIN_KEY is not configured" }, { status: 503 });
  }

  if (requestKey !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = getPositiveInt(searchParams.get("page"), 1);
  const requestedPageSize = getPositiveInt(searchParams.get("pageSize"), 20);
  const pageSize = Math.min(requestedPageSize, 100);
  const format = searchParams.get("format");
  const exportLimit = getPositiveInt(searchParams.get("limit"), 5000);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const from = parseDateParam(fromRaw, false);
  const to = parseDateParam(toRaw, true);

  if (fromRaw && !from) {
    return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  }

  if (toRaw && !to) {
    return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
  }

  if (from && to && from.getTime() >= to.getTime()) {
    return NextResponse.json({ error: "The from date must be earlier than the to date" }, { status: 400 });
  }

  const dateRange: NewsletterDateRange = {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  try {
    if (format === "csv") {
      const subscribers = await listNewsletterSubscriptionsForExport(exportLimit, dateRange);
      const header = ["email", "subscribedAt"];
      const rows = subscribers.map((item) => [escapeCsvValue(item.email), escapeCsvValue(item.subscribedAt)].join(","));
      const csv = [header.join(","), ...rows].join("\n");

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const result = await listNewsletterSubscriptionsByDateRange(page, pageSize, dateRange);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to read newsletter subscriptions", error);
    return NextResponse.json({ error: "Could not load subscriptions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = newsletterSchema.safeParse(payload);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid newsletter payload";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  try {
    const result = await saveNewsletterSubscription(parsed.data);

    if (!result.created) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    return NextResponse.json({ ok: true, duplicate: false });
  } catch (error) {
    console.error("Failed to save newsletter subscription", error);
    return NextResponse.json({ error: "Could not subscribe right now" }, { status: 500 });
  }
}
