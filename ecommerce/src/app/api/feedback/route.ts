import { NextResponse } from "next/server";
import { feedbackSchema } from "@/lib/feedback";
import { listFeedback, saveFeedback } from "@/lib/feedback-store";

export const runtime = "nodejs";

function getPositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
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

  try {
    const result = await listFeedback(page, pageSize);
    return NextResponse.json({
      ...result,
      meta: {
        storage: result.storage,
      },
    });
  } catch (error) {
    console.error("Failed to read feedback", error);
    return NextResponse.json({ error: "Could not load feedback" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(payload);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid feedback payload";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  try {
    const savedFeedback = await saveFeedback(parsed.data);
    return NextResponse.json({
      ok: true,
      id: savedFeedback.record.id,
      meta: {
        storage: savedFeedback.storage,
      },
    });
  } catch (error) {
    console.error("Failed to persist feedback", error);
    return NextResponse.json({ error: "Could not store feedback at the moment" }, { status: 500 });
  }
}
