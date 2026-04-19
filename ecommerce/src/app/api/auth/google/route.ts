import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";
import { createAccountSession, getAccountSnapshotBySessionToken, upsertGoogleAccount } from "@/lib/account-data";
import { ACCOUNT_SESSION_COOKIE_NAME } from "@/lib/account-session";

type GoogleAuthRequest = {
  credential?: string;
};

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as GoogleAuthRequest | null;
  const credential = body?.credential?.trim() ?? "";
  const googleClientId = getGoogleClientId();

  if (!googleClientId) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 503 });
  }

  if (!credential) {
    return NextResponse.json({ error: "Missing Google credential" }, { status: 400 });
  }

  try {
    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub || !payload.email_verified) {
      return NextResponse.json({ error: "Google account is missing required profile information" }, { status: 400 });
    }

    const account = await upsertGoogleAccount({
      email: payload.email,
      fullName: payload.name ?? payload.email.split("@")[0] ?? "Firaangi Shopper",
      avatarUrl: payload.picture,
      googleSub: payload.sub,
    });

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
    console.error("Google sign-in failed", error);
    return NextResponse.json({ error: "Google sign-in failed" }, { status: 500 });
  }
}