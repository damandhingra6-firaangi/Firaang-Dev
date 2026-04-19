import { NextResponse } from "next/server";
import { z } from "zod";
import { updateAccountProfileBySessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";

const accountProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  avatarUrl: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  pinCode: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const token = await getAccountSessionTokenFromCookies();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = accountProfileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile payload" }, { status: 400 });
  }

  try {
    const profile = await updateAccountProfileBySessionToken(token, parsed.data);

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error("Failed to update account profile", error);
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }
}