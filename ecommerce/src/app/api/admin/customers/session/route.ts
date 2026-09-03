import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccountSession, getAccountSnapshotByUserId } from "@/lib/account-data";
import { ACCOUNT_SESSION_COOKIE_NAME } from "@/lib/account-session";

export const runtime = "nodejs";

const customerSessionSchema = z.object({
  userId: z.string().trim().min(1).max(64),
});

function isAdminAuthorized(request: Request) {
  const adminKey = process.env.FEEDBACK_ADMIN_KEY;
  const requestKey = request.headers.get("x-admin-key");

  if (!adminKey) {
    return { ok: false as const, response: NextResponse.json({ error: "FEEDBACK_ADMIN_KEY is not configured" }, { status: 503 }) };
  }

  if (requestKey !== adminKey) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { ok: true as const };
}

export async function POST(request: Request) {
  const auth = isAdminAuthorized(request);

  if (!auth.ok) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = customerSessionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid customer session payload" }, { status: 400 });
  }

  try {
    const snapshot = await getAccountSnapshotByUserId(parsed.data.userId);

    if (!snapshot) {
      return NextResponse.json({ error: "Customer account not found" }, { status: 404 });
    }

    const session = await createAccountSession(parsed.data.userId);
    const response = NextResponse.json({
      ok: true,
      authenticated: true,
      profile: snapshot.profile,
      orders: snapshot.orders,
    });

    response.cookies.set({
      name: ACCOUNT_SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: session.expiresAt,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Failed to switch to customer session", error);
    return NextResponse.json({ error: "Could not switch to customer account" }, { status: 500 });
  }
}