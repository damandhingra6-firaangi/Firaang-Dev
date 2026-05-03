import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccountSession, createEmailAccount, getAccountSnapshotBySessionToken } from "@/lib/account-data";
import { ACCOUNT_SESSION_COOKIE_NAME } from "@/lib/account-session";

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid signup payload" }, { status: 400 });
  }

  try {
    const account = await createEmailAccount(parsed.data);
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
    if (error instanceof Error) {
      if (error.message === "EMAIL_EXISTS") {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }

      if (error.message === "EMAIL_EXISTS_GOOGLE") {
        return NextResponse.json({ error: "This email is already linked to Google sign-in" }, { status: 409 });
      }
    }

    console.error("Email signup failed", error);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
