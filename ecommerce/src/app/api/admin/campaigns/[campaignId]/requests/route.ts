import { NextResponse } from "next/server";
import { createCampaignFanRequest, listCampaignFanRequests } from "@/lib/campaigns";
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
    const requests = await listCampaignFanRequests(campaignId, {
      q: url.searchParams.get("q") ?? undefined,
      status: (url.searchParams.get("status") as never) ?? undefined,
      referral: (url.searchParams.get("referral") as never) ?? "all",
      couponStatus: (url.searchParams.get("couponStatus") as never) ?? "all",
    });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Failed to load campaign requests", error);
    return NextResponse.json({ error: "Failed to load campaign requests" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return auth.response;
  }

  const { campaignId } = await context.params;

  try {
    const body = await request.json();
    const fanRequest = await createCampaignFanRequest({
      campaignId,
      campaignKeyword: body.campaignKeyword,
      customerName: body.customerName ?? "",
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      instagramUsername: body.instagramUsername ?? "",
      friendName: body.friendName,
      friendInstagramUsername: body.friendInstagramUsername,
      friendEmail: body.friendEmail,
      friendPhone: body.friendPhone,
      notes: body.notes,
    });
    return NextResponse.json({ request: fanRequest }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "CAMPAIGN_NOT_FOUND") {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    console.error("Failed to create campaign request", error);
    return NextResponse.json({ error: "Failed to create campaign request" }, { status: 500 });
  }
}