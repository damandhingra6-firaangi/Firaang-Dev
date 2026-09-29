import { NextResponse } from "next/server";
import { getCampaignById, getCampaignStats, updateCampaign } from "@/lib/campaigns";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return auth.response;
  }

  const { campaignId } = await context.params;

  try {
    const [campaign, stats] = await Promise.all([getCampaignById(campaignId), getCampaignStats(campaignId)]);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign, stats });
  } catch (error) {
    console.error("Failed to load campaign", error);
    return NextResponse.json({ error: "Failed to load campaign" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return auth.response;
  }

  const { campaignId } = await context.params;

  try {
    const body = await request.json();
    const campaign = await updateCampaign(campaignId, body);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000) {
      return NextResponse.json({ error: "Campaign slug or keyword already exists" }, { status: 409 });
    }
    console.error("Failed to update campaign", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}