import { NextResponse } from "next/server";
import { getAnalyticsSummary, getDateRangeFromPreset } from "@/lib/analytics";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: Request) {
  const auth = await requireAdminApiAccess();

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const preset = (searchParams.get("preset") ?? "30d").toLowerCase();
  const fromParam = parseDate(searchParams.get("from"));
  const toParam = parseDate(searchParams.get("to"));

  const range =
    fromParam && toParam
      ? {
          from: fromParam,
          to: toParam,
        }
      : getDateRangeFromPreset(preset);

  if (range.from.getTime() > range.to.getTime()) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  try {
    const summary = await getAnalyticsSummary(range);

    return NextResponse.json({
      summary,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      preset,
    });
  } catch (error) {
    console.error("Failed to load analytics summary", error);
    return NextResponse.json({ error: "Could not load analytics summary" }, { status: 500 });
  }
}
