import { NextResponse } from "next/server";
import { getCampaignFanRequestById, updateCampaignFanRequest } from "@/lib/campaigns";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return auth.response;
  }

  const { requestId } = await context.params;

  try {
    const requestRecord = await getCampaignFanRequestById(requestId);
    if (!requestRecord) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    return NextResponse.json({ request: requestRecord });
  } catch (error) {
    console.error("Failed to load campaign request", error);
    return NextResponse.json({ error: "Failed to load campaign request" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return auth.response;
  }

  const { requestId } = await context.params;

  try {
    const body = await request.json();
    const updated = await updateCampaignFanRequest(requestId, {
      customerFollowVerified: body.customerFollowVerified,
      friendFollowVerified: body.friendFollowVerified,
      verificationStatus: body.verificationStatus,
      approvedDiscountPercent: body.approvedDiscountPercent,
      notes: body.notes,
      verifiedBy: auth.profile.email,
    });
    if (!updated) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error("Failed to update campaign request", error);
    return NextResponse.json({ error: "Failed to update campaign request" }, { status: 500 });
  }
}