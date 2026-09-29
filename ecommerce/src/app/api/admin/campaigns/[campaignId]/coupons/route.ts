import { NextResponse } from "next/server";
import { listCampaignCoupons } from "@/lib/campaigns";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return auth.response;
  }

  const { campaignId } = await context.params;
  const url = new URL(request.url);

  try {
    const coupons = await listCampaignCoupons(campaignId, {
      q: url.searchParams.get("q") ?? undefined,
      status: (url.searchParams.get("status") as never) ?? "all",
    });
    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("Failed to load campaign coupons", error);
    return NextResponse.json({ error: "Failed to load campaign coupons" }, { status: 500 });
  }
}