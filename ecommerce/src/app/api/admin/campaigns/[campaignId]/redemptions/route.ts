import { NextResponse } from "next/server";
import { listCampaignRedemptions } from "@/lib/campaigns";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return auth.response;
  }

  const { campaignId } = await context.params;

  try {
    const redemptions = await listCampaignRedemptions(campaignId);
    return NextResponse.json({ redemptions });
  } catch (error) {
    console.error("Failed to load campaign redemptions", error);
    return NextResponse.json({ error: "Failed to load campaign redemptions" }, { status: 500 });
  }
}