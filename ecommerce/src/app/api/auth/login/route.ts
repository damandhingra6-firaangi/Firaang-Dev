import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatePasswordAccount, createAccountSession, getAccountSnapshotBySessionToken } from "@/lib/account-data";
import { ACCOUNT_SESSION_COOKIE_NAME } from "@/lib/account-session";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone is required.").max(200),
  password: z.string().min(1, "Password is required.").max(72),
});

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid login payload" }, { status: 400 });
  }

  try {
    const account = await authenticatePasswordAccount(parsed.data);

    if (!account) {
      return NextResponse.json({ error: "Invalid email/phone or password" }, { status: 401 });
    }

    const session = await createAccountSession(account.userId);
    const snapshot = await getAccountSnapshotBySessionToken(session.token);

    if (!snapshot) {
      return NextResponse.json({ error: "Could not create account session" }, { status: 500 });
    }

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
    console.error("Password login failed", error);
    return NextResponse.json({ error: "Could not log in" }, { status: 500 });
  }
}