import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";
import { createAccountSession, getAccountSnapshotBySessionToken, upsertGoogleAccount } from "@/lib/account-data";
import { ACCOUNT_SESSION_COOKIE_NAME } from "@/lib/account-session";

type GoogleAuthRequest = {
  credential?: string;
};

function getGoogleClientIds() {
  const raw = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  ]
    .flatMap((value) => (value ?? "").split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(raw));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as GoogleAuthRequest | null;
  const credential = body?.credential?.trim() ?? "";
  const googleClientIds = getGoogleClientIds();

  if (googleClientIds.length === 0) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 503 });
  }

  if (!credential) {
    return NextResponse.json({ error: "Missing Google credential" }, { status: 400 });
  }

  try {
    const client = new OAuth2Client(googleClientIds[0]);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: googleClientIds,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub || !payload.email_verified) {
      return NextResponse.json({ error: "Google account is missing required profile information" }, { status: 400 });
    }

    let account;

    try {
      account = await upsertGoogleAccount({
        email: payload.email,
        fullName: payload.name ?? payload.email.split("@")[0] ?? "Firaangi Shopper",
        avatarUrl: payload.picture,
        googleSub: payload.sub,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown account persistence error";
      console.error("Google sign-in account upsert failed", { message, email: payload.email });

      if (message.includes("MONGODB_URI")) {
        return NextResponse.json({ error: "Account database is not configured on production" }, { status: 503 });
      }

      if (
        message.toLowerCase().includes("server selection") ||
        message.toLowerCase().includes("atlas") ||
        message.toLowerCase().includes("tls") ||
        message.toLowerCase().includes("certificate") ||
        message.toLowerCase().includes("econnrefused") ||
        message.toLowerCase().includes("querysrv")
      ) {
        return NextResponse.json({ error: "Could not connect to account database" }, { status: 503 });
      }

      return NextResponse.json({ error: "Could not save Google account" }, { status: 500 });
    }

    let session;

    try {
      session = await createAccountSession(account.userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown session creation error";
      console.error("Google sign-in session creation failed", { message, userId: account.userId });
      return NextResponse.json({ error: "Could not create account session" }, { status: 500 });
    }

    let snapshot;

    try {
      snapshot = await getAccountSnapshotBySessionToken(session.token);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown snapshot loading error";
      console.error("Google sign-in snapshot load failed", { message, userId: account.userId });
      return NextResponse.json({ error: "Could not load account data after sign-in" }, { status: 500 });
    }

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
    const message = error instanceof Error ? error.message : "Unknown Google auth error";
    const code = (error as { code?: string } | null)?.code ?? "";
    console.error("Google sign-in failed", {
      message,
      code,
      configuredGoogleClientIds: googleClientIds,
    });

    if (
      message.toLowerCase().includes("token used too late") ||
      message.toLowerCase().includes("wrong number of segments") ||
      message.toLowerCase().includes("wrong recipient") ||
      message.toLowerCase().includes("invalid token")
    ) {
      return NextResponse.json({ error: "Invalid Google credential. Please retry sign-in." }, { status: 401 });
    }

    if (
      code === "ENOTFOUND" ||
      code === "ECONNREFUSED" ||
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      message.toLowerCase().includes("fetch failed") ||
      message.toLowerCase().includes("network") ||
      message.toLowerCase().includes("certificate") ||
      message.toLowerCase().includes("tls")
    ) {
      return NextResponse.json({ error: "Could not reach Google from production server" }, { status: 503 });
    }

    return NextResponse.json({ error: "Google sign-in failed" }, { status: 500 });
  }
}