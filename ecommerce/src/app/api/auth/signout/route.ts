import { NextResponse } from "next/server";
import { deleteAccountSession } from "@/lib/account-data";
import { ACCOUNT_SESSION_COOKIE_NAME, getAccountSessionTokenFromCookies } from "@/lib/account-session";

export async function POST() {
  const token = await getAccountSessionTokenFromCookies();

  if (token) {
    await deleteAccountSession(token).catch((error) => {
      console.error("Failed to delete account session", error);
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCOUNT_SESSION_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}