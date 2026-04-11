import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

const FEEDBACK_COLLECTION_NAME = process.env.MONGODB_FEEDBACK_COLLECTION ?? "feedback";
const SUBMITTED_AT_INDEX_NAME = "feedback_submittedAt_desc";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const adminKey = process.env.FEEDBACK_ADMIN_KEY;
  const requestKey = request.headers.get("x-admin-key");

  if (!adminKey) {
    return NextResponse.json({ error: "FEEDBACK_ADMIN_KEY is not configured" }, { status: 503 });
  }

  if (requestKey !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getMongoDb();
    await db.command({ ping: 1 });

    const indexes = await db.collection(FEEDBACK_COLLECTION_NAME).indexes();
    const hasSubmittedAtIndex = indexes.some((index) => index.name === SUBMITTED_AT_INDEX_NAME);

    return NextResponse.json({
      ok: true,
      storage: "mongodb",
      database: db.databaseName,
      collection: FEEDBACK_COLLECTION_NAME,
      index: {
        name: SUBMITTED_AT_INDEX_NAME,
        exists: hasSubmittedAtIndex,
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Feedback health check failed", error);
    return NextResponse.json(
      {
        ok: false,
        storage: "mongodb",
        error: "MongoDB health check failed",
      },
      { status: 500 },
    );
  }
}
