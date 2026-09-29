import { NextResponse } from "next/server";
import { generateCouponsForFanRequest } from "@/lib/campaigns";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return auth.response;
  }

  const { requestId } = await context.params;

  try {
    const payload = await generateCouponsForFanRequest(requestId, auth.profile.email);
    return NextResponse.json(payload);
  } catch (error: unknown) {
    if (error instanceof Error) {
      const status = ["REQUEST_NOT_FOUND", "CAMPAIGN_NOT_FOUND"].includes(error.message) ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error("Failed to generate campaign coupons", error);
    return NextResponse.json({ error: "Failed to generate campaign coupons" }, { status: 500 });
  }
}