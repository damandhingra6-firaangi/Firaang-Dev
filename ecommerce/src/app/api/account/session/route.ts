import { NextResponse } from "next/server";
import { getAccountSnapshotBySessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";

export async function GET() {
  const token = await getAccountSessionTokenFromCookies();

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const snapshot = await getAccountSnapshotBySessionToken(token);

    if (!snapshot) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      profile: snapshot.profile,
      orders: snapshot.orders,
    });
  } catch (error) {
    console.error("Failed to load account session", error);
    return NextResponse.json({ error: "Could not load account session" }, { status: 500 });
  }
}