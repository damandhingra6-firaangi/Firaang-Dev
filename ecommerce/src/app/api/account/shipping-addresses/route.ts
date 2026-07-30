import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountSnapshotBySessionToken, saveShippingAddressForSessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";

const shippingAddressSchema = z.object({
  fullName: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().min(3).max(300),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().min(2).max(80),
  pinCode: z.string().trim().regex(/^\d{6}$/).optional().or(z.literal("")),
});

export async function GET() {
  const token = await getAccountSessionTokenFromCookies();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await getAccountSnapshotBySessionToken(token);

    if (!snapshot) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      addresses: snapshot.profile.savedAddresses ?? [],
    });
  } catch (error) {
    console.error("Failed to fetch shipping addresses", error);
    return NextResponse.json({ error: "Could not fetch saved addresses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const token = await getAccountSessionTokenFromCookies();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = shippingAddressSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid shipping address" }, { status: 400 });
  }

  try {
    const profile = await saveShippingAddressForSessionToken(token, {
      fullName: parsed.data.fullName || undefined,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
      address: parsed.data.address,
      city: parsed.data.city || undefined,
      state: parsed.data.state,
      pinCode: parsed.data.pinCode || undefined,
    });

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, addresses: profile.savedAddresses ?? [], profile });
  } catch (error) {
    console.error("Failed to save shipping address", error);
    return NextResponse.json({ error: "Could not save shipping address" }, { status: 500 });
  }
}
