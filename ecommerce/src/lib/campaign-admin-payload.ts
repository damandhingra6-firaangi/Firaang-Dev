import { z } from "zod";
import type { CampaignFriendVerificationMode, CampaignStatus, CreateCampaignInput } from "./campaigns";

const campaignStatusMap: Record<string, CampaignStatus> = {
  draft: "draft",
  DRAFT: "draft",
  active: "active",
  ACTIVE: "active",
  paused: "paused",
  PAUSED: "paused",
  archived: "archived",
  ARCHIVED: "archived",
  expired: "expired",
  EXPIRED: "expired",
};

const friendVerificationModeMap: Record<string, CampaignFriendVerificationMode> = {
  fallback_to_base: "fallback_to_base",
  "fallback-to-base": "fallback_to_base",
  "fallback-to-base-discount": "fallback_to_base",
  require_both_for_approval: "require_both_for_approval",
  "require-both-for-approval": "require_both_for_approval",
};

const normalizedCampaignSchema = z
  .object({
    name: z.string().min(1, "Campaign name is required"),
    slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
    partnerName: z.string().min(1, "Partner name is required"),
    editionName: z.string().min(1, "Edition name is required"),
    campaignKeyword: z.string().min(1, "Campaign keyword is required").regex(/^[A-Za-z0-9_-]{2,30}$/, "Campaign keyword must be 2-30 letters, numbers, underscores, or hyphens"),
    couponPrefix: z.string().min(1, "Coupon prefix is required").regex(/^[A-Za-z0-9]{3,10}$/, "Coupon prefix must be 3-10 alphanumeric characters"),
    baseDiscountPercent: z.number().min(0, "Base discount must be at least 0").max(100, "Base discount must be at most 100"),
    referralBonusPercent: z.number().min(0, "Referral bonus must be at least 0").max(100, "Referral bonus must be at most 100"),
    referralEnabled: z.boolean(),
    friendVerificationMode: z.enum(["fallback_to_base", "require_both_for_approval"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    couponExpiresAt: z.string().optional(),
    minimumOrderValue: z.number().positive("Minimum order value must be a positive number").optional(),
    maxRedemptions: z.number().int("Max redemptions must be an integer").positive("Max redemptions must be a positive integer").optional(),
    redemptionRequiresActiveCampaign: z.boolean(),
    status: z.enum(["draft", "active", "paused", "archived", "expired"]),
    termsAndConditions: z.string(),
    messageTemplate: z.string(),
  })
  .superRefine((value, context) => {
    for (const [field, label] of [["startDate", "Start date"], ["endDate", "End date"], ["couponExpiresAt", "Coupon expiry"]] as const) {
      const raw = value[field];
      if (!raw) {
        continue;
      }

      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${label} must be a valid date`,
        });
      }
    }

    if (value.startDate && value.endDate) {
      const start = new Date(value.startDate);
      const end = new Date(value.endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: "End date must be on or after the start date",
        });
      }
    }
  });

export class CampaignPayloadValidationError extends Error {
  fieldErrors: Record<string, string[]>;

  constructor(fieldErrors: Record<string, string[]>) {
    const firstMessage = Object.values(fieldErrors).flat()[0] ?? "Invalid campaign payload";
    super(firstMessage);
    this.name = "CampaignPayloadValidationError";
    this.fieldErrors = fieldErrors;
  }
}

function readString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readFirstString(...values: unknown[]) {
  for (const value of values) {
    const normalized = readString(value);
    if (normalized !== undefined) {
      return normalized;
    }
  }

  return undefined;
}

function readBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
  }

  return fallback;
}

function readNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

function normalizeCampaignStatus(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return campaignStatusMap[value];
}

function normalizeFriendVerificationMode(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return friendVerificationModeMap[value];
}

function formatZodFieldErrors(error: z.ZodError) {
  const flattened = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flattened)
      .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0),
  );
}

export function parseCampaignCreatePayload(body: unknown): CreateCampaignInput {
  const raw = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};

  const parsed = normalizedCampaignSchema.safeParse({
    name: readFirstString(raw.name, raw.campaignName) ?? "",
    slug: readFirstString(raw.slug) ?? "",
    partnerName: readFirstString(raw.partnerName) ?? "",
    editionName: readFirstString(raw.editionName) ?? "",
    campaignKeyword: readFirstString(raw.campaignKeyword) ?? "",
    couponPrefix: readFirstString(raw.couponPrefix) ?? "",
    baseDiscountPercent: readNumber(raw.baseDiscountPercent),
    referralBonusPercent: readNumber(raw.referralBonusPercent),
    referralEnabled: readBoolean(raw.referralEnabled, true),
    friendVerificationMode: normalizeFriendVerificationMode(raw.friendVerificationMode) ?? "fallback_to_base",
    startDate: readFirstString(raw.startDate),
    endDate: readFirstString(raw.endDate),
    couponExpiresAt: readFirstString(raw.couponExpiresAt, raw.couponExpiry),
    minimumOrderValue: readNumber(raw.minimumOrderValue),
    maxRedemptions: readNumber(raw.maxRedemptions),
    redemptionRequiresActiveCampaign: readBoolean(raw.redemptionRequiresActiveCampaign ?? raw.requireActiveCampaignDuringRedemption, true),
    status: normalizeCampaignStatus(raw.status ?? raw.campaignStatus) ?? "draft",
    termsAndConditions: readFirstString(raw.termsAndConditions) ?? "",
    messageTemplate: readFirstString(raw.messageTemplate) ?? "",
  });

  if (!parsed.success) {
    throw new CampaignPayloadValidationError(formatZodFieldErrors(parsed.error));
  }

  return parsed.data;
}

export function summarizeCampaignPayload(input: CreateCampaignInput) {
  return {
    name: input.name,
    slug: input.slug,
    partnerName: input.partnerName,
    editionName: input.editionName,
    campaignKeyword: input.campaignKeyword,
    couponPrefix: input.couponPrefix,
    baseDiscountPercent: input.baseDiscountPercent,
    referralBonusPercent: input.referralBonusPercent,
    referralEnabled: input.referralEnabled,
    friendVerificationMode: input.friendVerificationMode,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    couponExpiresAt: input.couponExpiresAt ?? null,
    minimumOrderValue: input.minimumOrderValue ?? null,
    maxRedemptions: input.maxRedemptions ?? null,
    redemptionRequiresActiveCampaign: input.redemptionRequiresActiveCampaign,
    status: input.status,
    hasTermsAndConditions: input.termsAndConditions.trim().length > 0,
    hasMessageTemplate: input.messageTemplate.trim().length > 0,
  };
}