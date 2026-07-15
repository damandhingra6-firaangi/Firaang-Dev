import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getAccountSnapshotBySessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

export async function getCurrentAdminProfile() {
  const token = await getAccountSessionTokenFromCookies();

  if (!token) {
    return null;
  }

  const snapshot = await getAccountSnapshotBySessionToken(token);

  if (!snapshot?.profile?.email) {
    return null;
  }

  const adminEmails = parseAdminEmails();

  if (adminEmails.length === 0) {
    return null;
  }

  const email = snapshot.profile.email.trim().toLowerCase();

  if (!adminEmails.includes(email)) {
    return null;
  }

  return {
    email: snapshot.profile.email,
    fullName: snapshot.profile.fullName,
  };
}

export async function requireAdminPageAccess() {
  const profile = await getCurrentAdminProfile();

  if (!profile) {
    redirect("/account");
  }

  return profile;
}

export async function requireAdminApiAccess() {
  const profile = await getCurrentAdminProfile();

  if (!profile) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    ok: true as const,
    profile,
  };
}
