import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/campaigns";
import { CampaignPayloadValidationError, parseCampaignCreatePayload, summarizeCampaignPayload } from "@/lib/campaign-admin-payload";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return (error as { code?: string | number }).code;
  }

  return undefined;
}

function getErrorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    return (error as { status?: number }).status;
  }

  return undefined;
}

function getErrorField(error: unknown) {
  if (typeof error === "object" && error !== null && "field" in error) {
    return (error as { field?: string }).field;
  }

  return undefined;
}

function getErrorStage(error: unknown) {
  if (typeof error === "object" && error !== null && "stage" in error) {
    return (error as { stage?: string }).stage;
  }

  return undefined;
}

function getErrorIndexName(error: unknown) {
  if (typeof error === "object" && error !== null && "indexName" in error) {
    return (error as { indexName?: string }).indexName;
  }

  return undefined;
}

function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown campaign API error";
}

function parseDuplicateConflictMessage(error: unknown) {
  const message = getSafeErrorMessage(error);

  if (/campaign_keyword_unique|campaignKeyword/i.test(message)) {
    const match = message.match(/dup key: \{ campaignKeyword: "([^"]+)" \}/i);
    const keyword = match?.[1];
    return keyword ? `Campaign keyword \"${keyword}\" already exists.` : "A campaign with this keyword already exists.";
  }

  if (/campaign_slug_unique|slug/i.test(message)) {
    const match = message.match(/dup key: \{ slug: "([^"]+)" \}/i);
    const slug = match?.[1];
    return slug ? `A campaign with slug \"${slug}\" already exists.` : "A campaign with this slug already exists.";
  }

  return "A campaign with this slug or keyword already exists.";
}

export async function GET() {
  try {
    const auth = await requireAdminApiAccess();
    if (!auth.ok) {
      return auth.response;
    }

    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Failed to list campaigns", error);
    return NextResponse.json({ success: false, error: "Failed to load campaigns", message: "Unable to load campaigns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  console.info("[Campaign API] Request received", { requestId, method: "POST", url: request.url });

  try {
    const auth = await requireAdminApiAccess();
    if (!auth.ok) {
      console.warn("[Campaign API] Authorization failed", { requestId });
      return auth.response;
    }

    console.info("[Campaign API] Authenticated user", {
      requestId,
      email: auth.profile.email,
    });
    console.info("[Campaign API] Authorization passed", { requestId });

    const body = await request.json();
    console.info("[Campaign API] Parsed payload", { requestId, bodyKeys: Object.keys(typeof body === "object" && body !== null ? body : {}) });

    const payload = parseCampaignCreatePayload(body);
    console.info("[Campaign API] Validation passed", { requestId, payload: summarizeCampaignPayload(payload) });

    console.info("[Campaign API] Creating campaign", {
      requestId,
      slug: payload.slug,
      campaignKeyword: payload.campaignKeyword,
      status: payload.status,
    });

    const campaign = await createCampaign(payload);

    console.info("[Campaign API] Database insert successful", {
      requestId,
      campaignId: campaign.id,
      slug: campaign.slug,
      campaignKeyword: campaign.campaignKeyword,
    });

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error: unknown) {
    console.error("[Campaign API] Create failed", {
      requestId,
      code: getErrorCode(error),
      status: getErrorStatus(error),
      field: getErrorField(error),
      stage: getErrorStage(error),
      indexName: getErrorIndexName(error),
      message: getSafeErrorMessage(error),
    });

    if (error instanceof CampaignPayloadValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to create campaign",
          message: getSafeErrorMessage(error),
          fieldErrors: error.fieldErrors,
        },
        { status: 400 },
      );
    }

    if (getErrorStatus(error) === 409) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to create campaign",
          message: getSafeErrorMessage(error),
          field: getErrorField(error),
        },
        { status: 409 },
      );
    }

    if (getErrorStage(error) === "ensure_indexes") {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to create campaign",
          message: getSafeErrorMessage(error),
          stage: getErrorStage(error),
          indexName: getErrorIndexName(error),
        },
        { status: 500 },
      );
    }

    if (getErrorCode(error) === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to create campaign",
          message: parseDuplicateConflictMessage(error),
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create campaign",
        message: "The campaign could not be created. Check the server logs for the exact failing stage.",
      },
      { status: 500 },
    );
  }
}