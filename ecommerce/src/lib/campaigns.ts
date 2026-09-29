import crypto from "node:crypto";
import { ObjectId, type Collection } from "mongodb";
import { renderCampaignMessageTemplate } from "./campaign-message";
import { getMongoDb } from "./mongodb";

const CAMPAIGNS_COLLECTION_NAME = process.env.MONGODB_CAMPAIGNS_COLLECTION ?? "campaigns";
const CAMPAIGN_FAN_REQUESTS_COLLECTION_NAME = process.env.MONGODB_CAMPAIGN_FAN_REQUESTS_COLLECTION ?? "campaign_fan_requests";
const CAMPAIGN_PARTICIPANTS_COLLECTION_NAME = process.env.MONGODB_CAMPAIGN_PARTICIPANTS_COLLECTION ?? "campaign_participants";
const CAMPAIGN_COUPONS_COLLECTION_NAME = process.env.MONGODB_CAMPAIGN_COUPONS_COLLECTION ?? "campaign_coupons";
const CAMPAIGN_REFERRALS_COLLECTION_NAME = process.env.MONGODB_CAMPAIGN_REFERRALS_COLLECTION ?? "campaign_referrals";
const CAMPAIGN_REDEMPTIONS_COLLECTION_NAME = process.env.MONGODB_CAMPAIGN_REDEMPTIONS_COLLECTION ?? "campaign_redemptions";

export type CampaignStatus = "draft" | "active" | "paused" | "archived" | "expired";
export type CampaignVerificationStatus = "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED";
export type CampaignReferralStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type CampaignCouponStatus = "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
export type CampaignDiscountType = "percentage";
export type CampaignFriendVerificationMode = "fallback_to_base" | "require_both_for_approval";

export type CampaignRecord = {
  id: string;
  name: string;
  slug: string;
  partnerName: string;
  editionName: string;
  campaignKeyword: string;
  couponPrefix: string;
  baseDiscountPercent: number;
  referralBonusPercent: number;
  referralEnabled: boolean;
  friendVerificationMode: CampaignFriendVerificationMode;
  startDate?: string;
  endDate?: string;
  couponExpiresAt?: string;
  minimumOrderValue?: number;
  maxRedemptions?: number;
  redemptionRequiresActiveCampaign: boolean;
  status: CampaignStatus;
  termsAndConditions: string;
  messageTemplate: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignFanRequestRecord = {
  id: string;
  campaignId: string;
  campaignKeyword: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  instagramUsername: string;
  friendName?: string;
  friendInstagramUsername?: string;
  friendEmail?: string;
  friendPhone?: string;
  hasFriend: boolean;
  customerFollowVerified: boolean;
  friendFollowVerified: boolean;
  verificationStatus: CampaignVerificationStatus;
  requestedDiscountPercent: number;
  approvedDiscountPercent?: number;
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  customerParticipantId?: string;
  friendParticipantId?: string;
  customerCouponId?: string;
  friendCouponId?: string;
  customerCouponCode?: string;
  friendCouponCode?: string;
  customerCouponStatus?: CampaignCouponStatus;
  friendCouponStatus?: CampaignCouponStatus;
  customerCouponDiscountPercent?: number;
  friendCouponDiscountPercent?: number;
  duplicateWarnings: string[];
};

export type CampaignParticipantRecord = {
  id: string;
  campaignId: string;
  name: string;
  email?: string;
  phone?: string;
  instagramUsername: string;
  userId?: string;
  fanRequestId?: string;
  isFollowVerified: boolean;
  isEligible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CampaignCouponRecord = {
  id: string;
  campaignId: string;
  participantId: string;
  fanRequestId?: string;
  code: string;
  discountType: CampaignDiscountType;
  discountValue: number;
  maxUses: number;
  usedCount: number;
  status: CampaignCouponStatus;
  expiresAt?: string;
  redeemedAt?: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  reservedOrderId?: string;
  reservedAt?: string;
  reservationExpiresAt?: string;
  participant?: CampaignParticipantRecord | null;
};

export type CampaignReferralRecord = {
  id: string;
  campaignId: string;
  fanRequestId: string;
  referrerParticipantId: string;
  referredParticipantId: string;
  status: CampaignReferralStatus;
  bonusPercent: number;
  createdAt: string;
  verifiedAt?: string;
};

export type CampaignRedemptionRecord = {
  id: string;
  campaignId: string;
  couponId: string;
  participantId: string;
  orderId: string;
  discountAmount: number;
  orderTotal: number;
  redeemedAt: string;
  createdAt: string;
  couponCode?: string;
  participant?: CampaignParticipantRecord | null;
};

export type CampaignStats = {
  totalRequests: number;
  pendingRequests: number;
  verifiedRequests: number;
  rejectedRequests: number;
  totalParticipants: number;
  referralParticipants: number;
  couponsGenerated: number;
  activeCoupons: number;
  redeemedCoupons: number;
  expiredCoupons: number;
  totalOrders: number;
  totalDiscountGiven: number;
  referralCouponsGenerated: number;
  referralCouponsRedeemed: number;
};

type CampaignDocument = Omit<CampaignRecord, "id" | "createdAt" | "updatedAt" | "startDate" | "endDate" | "couponExpiresAt"> & {
  _id: ObjectId;
  startDate?: Date;
  endDate?: Date;
  couponExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type CampaignFanRequestDocument = {
  _id: ObjectId;
  campaignId: ObjectId;
  campaignKeyword: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerEmailNormalized?: string;
  customerPhoneNormalized?: string;
  instagramUsername: string;
  instagramUsernameNormalized: string;
  friendName?: string;
  friendInstagramUsername?: string;
  friendInstagramUsernameNormalized?: string;
  friendEmail?: string;
  friendPhone?: string;
  friendEmailNormalized?: string;
  friendPhoneNormalized?: string;
  hasFriend: boolean;
  customerFollowVerified: boolean;
  friendFollowVerified: boolean;
  verificationStatus: CampaignVerificationStatus;
  requestedDiscountPercent: number;
  approvedDiscountPercent?: number;
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  customerParticipantId?: ObjectId;
  friendParticipantId?: ObjectId;
  customerCouponId?: ObjectId;
  friendCouponId?: ObjectId;
};

type CampaignParticipantDocument = {
  _id: ObjectId;
  campaignId: ObjectId;
  name: string;
  email?: string;
  phone?: string;
  emailNormalized?: string;
  phoneNormalized?: string;
  instagramUsername: string;
  instagramUsernameNormalized: string;
  userId?: ObjectId;
  fanRequestId?: ObjectId;
  isFollowVerified: boolean;
  isEligible: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CampaignCouponDocument = {
  _id: ObjectId;
  campaignId: ObjectId;
  participantId: ObjectId;
  fanRequestId?: ObjectId;
  code: string;
  discountType: CampaignDiscountType;
  discountValue: number;
  maxUses: number;
  usedCount: number;
  status: CampaignCouponStatus;
  expiresAt?: Date;
  redeemedAt?: Date;
  orderId?: string;
  createdAt: Date;
  updatedAt: Date;
  reservedOrderId?: string;
  reservedAt?: Date;
  reservationExpiresAt?: Date;
};

type CampaignReferralDocument = {
  _id: ObjectId;
  campaignId: ObjectId;
  fanRequestId: ObjectId;
  referrerParticipantId: ObjectId;
  referredParticipantId: ObjectId;
  status: CampaignReferralStatus;
  bonusPercent: number;
  createdAt: Date;
  verifiedAt?: Date;
};

type CampaignRedemptionDocument = {
  _id: ObjectId;
  campaignId: ObjectId;
  couponId: ObjectId;
  participantId: ObjectId;
  orderId: string;
  discountAmount: number;
  orderTotal: number;
  redeemedAt: Date;
  createdAt: Date;
};

type CampaignCollections = {
  campaigns: Collection<CampaignDocument>;
  fanRequests: Collection<CampaignFanRequestDocument>;
  participants: Collection<CampaignParticipantDocument>;
  coupons: Collection<CampaignCouponDocument>;
  referrals: Collection<CampaignReferralDocument>;
  redemptions: Collection<CampaignRedemptionDocument>;
};

export type CreateCampaignInput = Omit<CampaignRecord, "id" | "createdAt" | "updatedAt">;

export type CreateCampaignFanRequestInput = {
  campaignId?: string;
  campaignKeyword?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  instagramUsername: string;
  friendName?: string;
  friendInstagramUsername?: string;
  friendEmail?: string;
  friendPhone?: string;
  notes?: string;
};

export type UpdateCampaignFanRequestInput = {
  customerFollowVerified?: boolean;
  friendFollowVerified?: boolean;
  verificationStatus?: CampaignVerificationStatus;
  approvedDiscountPercent?: number;
  notes?: string;
  verifiedBy?: string;
};

export type CampaignFanRequestFilters = {
  q?: string;
  status?: CampaignVerificationStatus | "COUPON_GENERATED";
  referral?: "all" | "referral" | "non-referral";
  couponStatus?: "all" | "generated" | "used";
};

export type CampaignCouponFilters = {
  q?: string;
  status?: CampaignCouponStatus | "all";
};

type ResolvedCampaignCoupon = {
  coupon: CampaignCouponRecord;
  campaign: CampaignRecord;
};

type CampaignServiceError = Error & {
  code?: string | number;
  status?: number;
  field?: string;
  value?: string;
};

type CampaignDatabaseSetupError = Error & {
  code?: string;
  status?: number;
  stage?: string;
  indexName?: string;
};

export type ValidatedCampaignCheckoutCoupon = {
  code: string;
  label: string;
  description: string;
  discountAmount: number;
  discountPercent: number;
  campaignId: string;
  couponId: string;
  participantId: string;
  expiresAt?: string;
};

export type CampaignCouponValidationFailureReason =
  | "not_found"
  | "campaign_inactive"
  | "status_invalid"
  | "cancelled"
  | "expired"
  | "min_order"
  | "already_used"
  | "reserved"
  | "already_reserved"
  | "ownership_required"
  | "wrong_customer"
  | "participant_ineligible";

let ensureCampaignIndexesPromise: Promise<void> | null = null;

const DEFAULT_CAMPAIGN_MESSAGE_TEMPLATE = [
  "Hi {{customerName}}!",
  "",
  "Your {{campaignName}} exclusive discount is approved.",
  "",
  "Your unique coupon code is:",
  "",
  "{{couponCode}}",
  "",
  "You can use this coupon once to get {{discountPercent}}% OFF on your Firaang order.",
  "",
  "Terms:",
  "• One-time use only",
  "• Valid until {{expiryDate}}",
  "• Applicable according to campaign terms",
  "",
  "Thank you,",
  "Firaang",
].join("\n");

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toIsoString(value?: Date | string | null) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value?: string) {
  const normalized = normalizeText(value ?? "").toLowerCase();
  return normalized || undefined;
}

function normalizeObjectIdString(value?: string) {
  if (!value || !ObjectId.isValid(value)) {
    return undefined;
  }

  return new ObjectId(value).toHexString();
}

function normalizePhone(value?: string) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits || undefined;
}

function normalizeInstagram(value?: string) {
  const normalized = normalizeText(value ?? "").replace(/^@+/, "").toLowerCase();
  return normalized || "";
}

function slugify(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toDateOrUndefined(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function deriveCouponPrefix(input: { couponPrefix?: string; campaignKeyword: string; slug: string }) {
  const explicit = normalizeText(input.couponPrefix ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  if (explicit.length >= 3) {
    return explicit.slice(0, 10);
  }

  const keywordPrefix = normalizeText(input.campaignKeyword).replace(/[^A-Za-z0-9]/g, "").toUpperCase().replace(/\d+$/g, "");
  if (keywordPrefix.length >= 3) {
    return keywordPrefix.slice(0, 10);
  }

  return input.slug.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 10) || "CAMP";
}

function createCampaignServiceError(input: { code: string; status: number; message: string; field?: string; value?: string }) {
  const error = new Error(input.message) as CampaignServiceError;
  error.name = "CampaignServiceError";
  error.code = input.code;
  error.status = input.status;
  error.field = input.field;
  error.value = input.value;
  return error;
}

function createCampaignDatabaseSetupError(input: { stage: string; message: string; indexName?: string; status?: number }) {
  const error = new Error(input.message) as CampaignDatabaseSetupError;
  error.name = "CampaignDatabaseSetupError";
  error.code = "CAMPAIGN_DATABASE_SETUP_FAILED";
  error.status = input.status ?? 500;
  error.stage = input.stage;
  error.indexName = input.indexName;
  return error;
}

function mapCampaign(doc: CampaignDocument): CampaignRecord {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    slug: doc.slug,
    partnerName: doc.partnerName,
    editionName: doc.editionName,
    campaignKeyword: doc.campaignKeyword,
    couponPrefix: doc.couponPrefix,
    baseDiscountPercent: doc.baseDiscountPercent,
    referralBonusPercent: doc.referralBonusPercent,
    referralEnabled: doc.referralEnabled,
    friendVerificationMode: doc.friendVerificationMode,
    startDate: toIsoString(doc.startDate),
    endDate: toIsoString(doc.endDate),
    couponExpiresAt: toIsoString(doc.couponExpiresAt),
    minimumOrderValue: doc.minimumOrderValue,
    maxRedemptions: doc.maxRedemptions,
    redemptionRequiresActiveCampaign: doc.redemptionRequiresActiveCampaign,
    status: doc.status,
    termsAndConditions: doc.termsAndConditions,
    messageTemplate: doc.messageTemplate,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function mapParticipant(doc: CampaignParticipantDocument): CampaignParticipantRecord {
  return {
    id: doc._id.toHexString(),
    campaignId: doc.campaignId.toHexString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    instagramUsername: doc.instagramUsername,
    userId: doc.userId?.toHexString(),
    fanRequestId: doc.fanRequestId?.toHexString(),
    isFollowVerified: doc.isFollowVerified,
    isEligible: doc.isEligible,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function mapCampaignCoupon(doc: CampaignCouponDocument, participant?: CampaignParticipantDocument | null): CampaignCouponRecord {
  return {
    id: doc._id.toHexString(),
    campaignId: doc.campaignId.toHexString(),
    participantId: doc.participantId.toHexString(),
    fanRequestId: doc.fanRequestId?.toHexString(),
    code: doc.code,
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    maxUses: doc.maxUses,
    usedCount: doc.usedCount,
    status: doc.status,
    expiresAt: toIsoString(doc.expiresAt),
    redeemedAt: toIsoString(doc.redeemedAt),
    orderId: doc.orderId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    reservedOrderId: doc.reservedOrderId,
    reservedAt: toIsoString(doc.reservedAt),
    reservationExpiresAt: toIsoString(doc.reservationExpiresAt),
    participant: participant ? mapParticipant(participant) : null,
  };
}

export function computeApprovedDiscount(campaign: CampaignRecord, input: { hasFriend: boolean; customerFollowVerified: boolean; friendFollowVerified: boolean }) {
  if (!input.customerFollowVerified) {
    return 0;
  }

  const base = campaign.baseDiscountPercent;
  const canApplyReferral =
    campaign.referralEnabled &&
    input.hasFriend &&
    input.customerFollowVerified &&
    input.friendFollowVerified;

  if (canApplyReferral) {
    return base + campaign.referralBonusPercent;
  }

  if (campaign.friendVerificationMode === "require_both_for_approval" && input.hasFriend) {
    return 0;
  }

  return base;
}

export function resolveCampaignFanRequestStatus(input: {
  campaign: CampaignRecord;
  existingStatus: CampaignVerificationStatus;
  requestedStatus?: CampaignVerificationStatus;
  hasFriend: boolean;
  customerFollowVerified: boolean;
  friendFollowVerified: boolean;
  approvedDiscountPercent?: number;
}) {
  const canMarkVerified =
    input.customerFollowVerified &&
    (input.approvedDiscountPercent ?? 0) > 0 &&
    (!input.hasFriend || input.campaign.friendVerificationMode !== "require_both_for_approval" || input.friendFollowVerified);

  const derivedStatus = canMarkVerified
    ? "VERIFIED"
    : input.customerFollowVerified || input.friendFollowVerified
      ? "UNDER_REVIEW"
      : input.existingStatus === "REJECTED" || input.existingStatus === "EXPIRED"
        ? input.existingStatus
        : "PENDING";

  if (input.requestedStatus === "VERIFIED") {
    return canMarkVerified ? "VERIFIED" : derivedStatus;
  }

  return input.requestedStatus ?? derivedStatus;
}

export function getCampaignCouponGenerationEligibility(input: {
  campaign: CampaignRecord;
  hasFriend: boolean;
  customerFollowVerified: boolean;
  friendFollowVerified: boolean;
}) {
  if (!input.customerFollowVerified) {
    return { ok: false as const, reason: "CUSTOMER_NOT_VERIFIED" as const };
  }

  if (input.hasFriend && input.campaign.friendVerificationMode === "require_both_for_approval" && !input.friendFollowVerified) {
    return { ok: false as const, reason: "FRIEND_NOT_VERIFIED" as const };
  }

  return { ok: true as const };
}

async function getCollections(): Promise<CampaignCollections> {
  const db = await getMongoDb();
  const collections: CampaignCollections = {
    campaigns: db.collection<CampaignDocument>(CAMPAIGNS_COLLECTION_NAME),
    fanRequests: db.collection<CampaignFanRequestDocument>(CAMPAIGN_FAN_REQUESTS_COLLECTION_NAME),
    participants: db.collection<CampaignParticipantDocument>(CAMPAIGN_PARTICIPANTS_COLLECTION_NAME),
    coupons: db.collection<CampaignCouponDocument>(CAMPAIGN_COUPONS_COLLECTION_NAME),
    referrals: db.collection<CampaignReferralDocument>(CAMPAIGN_REFERRALS_COLLECTION_NAME),
    redemptions: db.collection<CampaignRedemptionDocument>(CAMPAIGN_REDEMPTIONS_COLLECTION_NAME),
  };

  if (!ensureCampaignIndexesPromise) {
    ensureCampaignIndexesPromise = (async () => {
      const indexJobs: Array<{ collection: string; indexName: string; required: boolean; run: () => Promise<unknown> }> = [
        { collection: "campaigns", indexName: "campaign_slug_unique", required: true, run: () => collections.campaigns.createIndex({ slug: 1 }, { name: "campaign_slug_unique", unique: true }) },
        { collection: "campaigns", indexName: "campaign_keyword_unique", required: true, run: () => collections.campaigns.createIndex({ campaignKeyword: 1 }, { name: "campaign_keyword_unique", unique: true }) },
        { collection: "fanRequests", indexName: "campaign_requests_by_campaign", required: false, run: () => collections.fanRequests.createIndex({ campaignId: 1, createdAt: -1 }, { name: "campaign_requests_by_campaign" }) },
        { collection: "fanRequests", indexName: "campaign_request_customer_ig", required: false, run: () => collections.fanRequests.createIndex({ campaignId: 1, instagramUsernameNormalized: 1 }, { name: "campaign_request_customer_ig" }) },
        { collection: "participants", indexName: "campaign_participant_instagram_lookup", required: false, run: () => collections.participants.createIndex({ campaignId: 1, instagramUsernameNormalized: 1 }, { name: "campaign_participant_instagram_lookup" }) },
        { collection: "participants", indexName: "campaign_participant_email_lookup", required: false, run: () => collections.participants.createIndex({ campaignId: 1, emailNormalized: 1 }, { name: "campaign_participant_email_lookup" }) },
        { collection: "coupons", indexName: "campaign_coupon_code_unique", required: false, run: () => collections.coupons.createIndex({ code: 1 }, { name: "campaign_coupon_code_unique", unique: true }) },
        { collection: "coupons", indexName: "campaign_coupon_participant", required: false, run: () => collections.coupons.createIndex({ participantId: 1, campaignId: 1 }, { name: "campaign_coupon_participant" }) },
        { collection: "coupons", indexName: "campaign_coupon_status_expiry", required: false, run: () => collections.coupons.createIndex({ status: 1, expiresAt: 1 }, { name: "campaign_coupon_status_expiry" }) },
        { collection: "referrals", indexName: "campaign_referral_unique", required: false, run: () => collections.referrals.createIndex({ campaignId: 1, referrerParticipantId: 1, referredParticipantId: 1 }, { name: "campaign_referral_unique", unique: true }) },
        { collection: "redemptions", indexName: "campaign_redemption_coupon_unique", required: false, run: () => collections.redemptions.createIndex({ couponId: 1 }, { name: "campaign_redemption_coupon_unique", unique: true }) },
        { collection: "redemptions", indexName: "campaign_redemption_by_campaign", required: false, run: () => collections.redemptions.createIndex({ campaignId: 1, redeemedAt: -1 }, { name: "campaign_redemption_by_campaign" }) },
      ];

      for (const job of indexJobs) {
        try {
          console.info("[Campaign DB] Ensuring index", { collection: job.collection, indexName: job.indexName });
          await job.run();
        } catch (error) {
          console.error("[Campaign DB] Index setup failed", {
            collection: job.collection,
            indexName: job.indexName,
            required: job.required,
            message: error instanceof Error ? error.message : String(error),
          });

          if (!job.required) {
            continue;
          }

          throw createCampaignDatabaseSetupError({
            stage: "ensure_indexes",
            indexName: job.indexName,
            status: 500,
            message: `Campaign database index setup failed for ${job.indexName}`,
          });
        }
      }
    })().catch((error) => {
      ensureCampaignIndexesPromise = null;
      throw error;
    });
  }

  await ensureCampaignIndexesPromise;
  return collections;
}

async function requireCampaignObjectId(campaignId: string) {
  try {
    return new ObjectId(campaignId);
  } catch {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }
}

async function findCampaignDocumentById(campaignId: string) {
  const { campaigns } = await getCollections();
  const oid = await requireCampaignObjectId(campaignId);
  return campaigns.findOne({ _id: oid });
}

export async function listCampaigns() {
  const { campaigns } = await getCollections();
  const docs = await campaigns.find({}, { sort: { createdAt: -1 } }).toArray();
  return docs.map(mapCampaign);
}

export async function getCampaignById(campaignId: string) {
  const doc = await findCampaignDocumentById(campaignId);
  return doc ? mapCampaign(doc) : null;
}

export async function findCampaignByKeyword(keyword: string) {
  const { campaigns } = await getCollections();
  const normalized = normalizeText(keyword).toUpperCase();
  if (!normalized) {
    return null;
  }

  const doc = await campaigns.findOne({ campaignKeyword: normalized });
  return doc ? mapCampaign(doc) : null;
}

export async function createCampaign(input: CreateCampaignInput) {
  const { campaigns } = await getCollections();
  const now = new Date();
  const slug = slugify(input.slug || input.name);
  const normalizedKeyword = normalizeText(input.campaignKeyword).toUpperCase();

  const [existingSlug, existingKeyword] = await Promise.all([
    campaigns.findOne({ slug }),
    campaigns.findOne({ campaignKeyword: normalizedKeyword }),
  ]);

  if (existingSlug) {
    throw createCampaignServiceError({
      code: "CAMPAIGN_SLUG_EXISTS",
      status: 409,
      field: "slug",
      value: slug,
      message: `A campaign with slug \"${slug}\" already exists.`,
    });
  }

  if (existingKeyword) {
    throw createCampaignServiceError({
      code: "CAMPAIGN_KEYWORD_EXISTS",
      status: 409,
      field: "campaignKeyword",
      value: normalizedKeyword,
      message: `Campaign keyword \"${normalizedKeyword}\" already exists.`,
    });
  }

  console.info("[Campaign DB] Insert payload prepared", {
    name: input.name,
    slug,
    campaignKeyword: normalizedKeyword,
    status: input.status,
  });

  const doc: CampaignDocument = {
    _id: new ObjectId(),
    name: normalizeText(input.name),
    slug,
    partnerName: normalizeText(input.partnerName),
    editionName: normalizeText(input.editionName),
    campaignKeyword: normalizedKeyword,
    couponPrefix: deriveCouponPrefix({ couponPrefix: input.couponPrefix, campaignKeyword: input.campaignKeyword, slug }),
    baseDiscountPercent: Math.max(0, Math.min(100, Math.round(input.baseDiscountPercent))),
    referralBonusPercent: Math.max(0, Math.min(100, Math.round(input.referralBonusPercent))),
    referralEnabled: Boolean(input.referralEnabled),
    friendVerificationMode: input.friendVerificationMode ?? "fallback_to_base",
    startDate: toDateOrUndefined(input.startDate),
    endDate: toDateOrUndefined(input.endDate),
    couponExpiresAt: toDateOrUndefined(input.couponExpiresAt),
    minimumOrderValue: typeof input.minimumOrderValue === "number" ? Math.max(0, Math.round(input.minimumOrderValue)) : undefined,
    maxRedemptions: typeof input.maxRedemptions === "number" ? Math.max(1, Math.round(input.maxRedemptions)) : undefined,
    redemptionRequiresActiveCampaign: input.redemptionRequiresActiveCampaign ?? true,
    status: input.status,
    termsAndConditions: input.termsAndConditions.trim(),
    messageTemplate: input.messageTemplate.trim() || DEFAULT_CAMPAIGN_MESSAGE_TEMPLATE,
    createdAt: now,
    updatedAt: now,
  };

  await campaigns.insertOne(doc);
  return mapCampaign(doc);
}

export async function updateCampaign(campaignId: string, input: Partial<CreateCampaignInput>) {
  const { campaigns } = await getCollections();
  const oid = await requireCampaignObjectId(campaignId);
  const existing = await campaigns.findOne({ _id: oid });
  if (!existing) {
    return null;
  }

  const nextSlug = input.slug ? slugify(input.slug) : input.name ? slugify(input.name) : existing.slug;
  const updateFields: Partial<CampaignDocument> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateFields.name = normalizeText(input.name);
  if (input.partnerName !== undefined) updateFields.partnerName = normalizeText(input.partnerName);
  if (input.editionName !== undefined) updateFields.editionName = normalizeText(input.editionName);
  if (input.campaignKeyword !== undefined) updateFields.campaignKeyword = normalizeText(input.campaignKeyword).toUpperCase();
  if (input.slug !== undefined || input.name !== undefined) updateFields.slug = nextSlug;
  if (input.couponPrefix !== undefined || input.campaignKeyword !== undefined || input.slug !== undefined || input.name !== undefined) {
    updateFields.couponPrefix = deriveCouponPrefix({ couponPrefix: input.couponPrefix ?? existing.couponPrefix, campaignKeyword: input.campaignKeyword ?? existing.campaignKeyword, slug: nextSlug });
  }
  if (input.baseDiscountPercent !== undefined) updateFields.baseDiscountPercent = Math.max(0, Math.min(100, Math.round(input.baseDiscountPercent)));
  if (input.referralBonusPercent !== undefined) updateFields.referralBonusPercent = Math.max(0, Math.min(100, Math.round(input.referralBonusPercent)));
  if (input.referralEnabled !== undefined) updateFields.referralEnabled = input.referralEnabled;
  if (input.friendVerificationMode !== undefined) updateFields.friendVerificationMode = input.friendVerificationMode;
  if (input.startDate !== undefined) updateFields.startDate = toDateOrUndefined(input.startDate);
  if (input.endDate !== undefined) updateFields.endDate = toDateOrUndefined(input.endDate);
  if (input.couponExpiresAt !== undefined) updateFields.couponExpiresAt = toDateOrUndefined(input.couponExpiresAt);
  if (input.minimumOrderValue !== undefined) updateFields.minimumOrderValue = Math.max(0, Math.round(input.minimumOrderValue));
  if (input.maxRedemptions !== undefined) updateFields.maxRedemptions = Math.max(1, Math.round(input.maxRedemptions));
  if (input.redemptionRequiresActiveCampaign !== undefined) updateFields.redemptionRequiresActiveCampaign = input.redemptionRequiresActiveCampaign;
  if (input.status !== undefined) updateFields.status = input.status;
  if (input.termsAndConditions !== undefined) updateFields.termsAndConditions = input.termsAndConditions.trim();
  if (input.messageTemplate !== undefined) updateFields.messageTemplate = input.messageTemplate.trim() || DEFAULT_CAMPAIGN_MESSAGE_TEMPLATE;

  await campaigns.updateOne({ _id: oid }, { $set: updateFields });
  const updated = await campaigns.findOne({ _id: oid });
  return updated ? mapCampaign(updated) : null;
}

async function buildDuplicateWarnings(campaignId: ObjectId, input: { instagramUsername: string; friendInstagramUsername?: string }) {
  const { participants, coupons } = await getCollections();
  const warnings: string[] = [];

  const usernames = [input.instagramUsername, input.friendInstagramUsername]
    .map((value) => normalizeInstagram(value))
    .filter(Boolean);

  for (const username of usernames) {
    const participant = await participants.findOne({ campaignId, instagramUsernameNormalized: username });

    if (participant) {
      const coupon = await coupons.findOne({ participantId: participant._id, status: { $in: ["ACTIVE", "USED"] } });
      warnings.push(
        coupon
          ? `Instagram @${participant.instagramUsername} already has a ${coupon.status.toLowerCase()} coupon for this campaign.`
          : `Instagram @${participant.instagramUsername} already exists as a participant in this campaign.`,
      );
    }
  }

  return warnings;
}

export async function createCampaignFanRequest(input: CreateCampaignFanRequestInput) {
  const { fanRequests } = await getCollections();
  const campaign = input.campaignId ? await getCampaignById(input.campaignId) : await findCampaignByKeyword(input.campaignKeyword ?? "");

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  const now = new Date();
  const requestedDiscountPercent = computeApprovedDiscount(campaign, {
    hasFriend: Boolean(input.friendInstagramUsername || input.friendName),
    customerFollowVerified: false,
    friendFollowVerified: false,
  }) || campaign.baseDiscountPercent;

  const campaignObjectId = new ObjectId(campaign.id);
  const duplicateWarnings = await buildDuplicateWarnings(campaignObjectId, {
    instagramUsername: input.instagramUsername,
    friendInstagramUsername: input.friendInstagramUsername,
  });

  const doc: CampaignFanRequestDocument = {
    _id: new ObjectId(),
    campaignId: campaignObjectId,
    campaignKeyword: campaign.campaignKeyword,
    customerName: normalizeText(input.customerName),
    customerEmail: normalizeText(input.customerEmail ?? "") || undefined,
    customerPhone: normalizeText(input.customerPhone ?? "") || undefined,
    customerEmailNormalized: normalizeEmail(input.customerEmail),
    customerPhoneNormalized: normalizePhone(input.customerPhone),
    instagramUsername: normalizeText(input.instagramUsername).replace(/^@+/, "@"),
    instagramUsernameNormalized: normalizeInstagram(input.instagramUsername),
    friendName: normalizeText(input.friendName ?? "") || undefined,
    friendInstagramUsername: normalizeText(input.friendInstagramUsername ?? "").replace(/^@+/, "@") || undefined,
    friendInstagramUsernameNormalized: normalizeInstagram(input.friendInstagramUsername),
    friendEmail: normalizeText(input.friendEmail ?? "") || undefined,
    friendPhone: normalizeText(input.friendPhone ?? "") || undefined,
    friendEmailNormalized: normalizeEmail(input.friendEmail),
    friendPhoneNormalized: normalizePhone(input.friendPhone),
    hasFriend: Boolean(input.friendInstagramUsername || input.friendName || input.friendEmail || input.friendPhone),
    customerFollowVerified: false,
    friendFollowVerified: false,
    verificationStatus: duplicateWarnings.length > 0 ? "UNDER_REVIEW" : "PENDING",
    requestedDiscountPercent,
    notes: normalizeText(input.notes ?? "") || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await fanRequests.insertOne(doc);
  return mapFanRequest(doc, undefined, undefined, undefined, undefined, duplicateWarnings);
}

function mapFanRequest(
  doc: CampaignFanRequestDocument,
  customerParticipant?: CampaignParticipantDocument | null,
  friendParticipant?: CampaignParticipantDocument | null,
  customerCoupon?: CampaignCouponDocument | null,
  friendCoupon?: CampaignCouponDocument | null,
  duplicateWarnings: string[] = [],
): CampaignFanRequestRecord {
  return {
    id: doc._id.toHexString(),
    campaignId: doc.campaignId.toHexString(),
    campaignKeyword: doc.campaignKeyword,
    customerName: doc.customerName,
    customerEmail: doc.customerEmail,
    customerPhone: doc.customerPhone,
    instagramUsername: doc.instagramUsername,
    friendName: doc.friendName,
    friendInstagramUsername: doc.friendInstagramUsername,
    friendEmail: doc.friendEmail,
    friendPhone: doc.friendPhone,
    hasFriend: doc.hasFriend,
    customerFollowVerified: doc.customerFollowVerified,
    friendFollowVerified: doc.friendFollowVerified,
    verificationStatus: doc.verificationStatus,
    requestedDiscountPercent: doc.requestedDiscountPercent,
    approvedDiscountPercent: doc.approvedDiscountPercent,
    notes: doc.notes,
    verifiedBy: doc.verifiedBy,
    verifiedAt: toIsoString(doc.verifiedAt),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    customerParticipantId: customerParticipant?._id.toHexString() ?? doc.customerParticipantId?.toHexString(),
    friendParticipantId: friendParticipant?._id.toHexString() ?? doc.friendParticipantId?.toHexString(),
    customerCouponId: customerCoupon?._id.toHexString() ?? doc.customerCouponId?.toHexString(),
    friendCouponId: friendCoupon?._id.toHexString() ?? doc.friendCouponId?.toHexString(),
    customerCouponCode: customerCoupon?.code,
    friendCouponCode: friendCoupon?.code,
    customerCouponStatus: customerCoupon?.status,
    friendCouponStatus: friendCoupon?.status,
    customerCouponDiscountPercent: customerCoupon?.discountValue,
    friendCouponDiscountPercent: friendCoupon?.discountValue,
    duplicateWarnings,
  };
}

async function loadFanRequestDependencies(doc: CampaignFanRequestDocument) {
  const { participants, coupons } = await getCollections();
  const [customerParticipant, friendParticipant, customerCoupon, friendCoupon, duplicateWarnings] = await Promise.all([
    doc.customerParticipantId ? participants.findOne({ _id: doc.customerParticipantId }) : Promise.resolve(null),
    doc.friendParticipantId ? participants.findOne({ _id: doc.friendParticipantId }) : Promise.resolve(null),
    doc.customerCouponId ? coupons.findOne({ _id: doc.customerCouponId }) : Promise.resolve(null),
    doc.friendCouponId ? coupons.findOne({ _id: doc.friendCouponId }) : Promise.resolve(null),
    buildDuplicateWarnings(doc.campaignId, { instagramUsername: doc.instagramUsername, friendInstagramUsername: doc.friendInstagramUsername }),
  ]);

  return { customerParticipant, friendParticipant, customerCoupon, friendCoupon, duplicateWarnings };
}

export async function listCampaignFanRequests(campaignId: string, filters: CampaignFanRequestFilters = {}) {
  const { fanRequests, coupons } = await getCollections();
  const oid = await requireCampaignObjectId(campaignId);
  const query: Record<string, unknown> = { campaignId: oid };

  if (filters.status && filters.status !== "COUPON_GENERATED") {
    query.verificationStatus = filters.status;
  }

  if (filters.referral === "referral") {
    query.hasFriend = true;
  }

  if (filters.referral === "non-referral") {
    query.hasFriend = false;
  }

  if (filters.q) {
    const q = escapeRegex(filters.q.trim());
    query.$or = [
      { customerName: { $regex: q, $options: "i" } },
      { customerEmail: { $regex: q, $options: "i" } },
      { customerPhone: { $regex: q, $options: "i" } },
      { instagramUsername: { $regex: q, $options: "i" } },
      { friendInstagramUsername: { $regex: q, $options: "i" } },
    ];
  }

  const docs = await fanRequests.find(query, { sort: { createdAt: -1 } }).toArray();
  const records = await Promise.all(
    docs.map(async (doc) => {
      const deps = await loadFanRequestDependencies(doc);
      const mapped = mapFanRequest(doc, deps.customerParticipant, deps.friendParticipant, deps.customerCoupon, deps.friendCoupon, deps.duplicateWarnings);

      if (filters.status === "COUPON_GENERATED" && !mapped.customerCouponCode && !mapped.friendCouponCode) {
        return null;
      }

      if (filters.couponStatus === "generated" && !mapped.customerCouponCode && !mapped.friendCouponCode) {
        return null;
      }

      if (filters.couponStatus === "used") {
        const codes = [mapped.customerCouponCode, mapped.friendCouponCode].filter(Boolean) as string[];
        if (codes.length === 0) {
          return null;
        }
        const usedCount = await coupons.countDocuments({ code: { $in: codes }, status: "USED" });
        if (usedCount === 0) {
          return null;
        }
      }

      if (filters.q) {
        const q = filters.q.trim().toLowerCase();
        const couponMatches = [mapped.customerCouponCode, mapped.friendCouponCode].some((value) => value?.toLowerCase().includes(q));
        if (!couponMatches) {
          return null;
        }
      }

      return mapped;
    }),
  );

  return records.filter((record): record is CampaignFanRequestRecord => Boolean(record));
}

export async function getCampaignFanRequestById(requestId: string) {
  const { fanRequests } = await getCollections();
  let oid: ObjectId;
  try {
    oid = new ObjectId(requestId);
  } catch {
    return null;
  }

  const doc = await fanRequests.findOne({ _id: oid });
  if (!doc) {
    return null;
  }

  const deps = await loadFanRequestDependencies(doc);
  return mapFanRequest(doc, deps.customerParticipant, deps.friendParticipant, deps.customerCoupon, deps.friendCoupon, deps.duplicateWarnings);
}

export async function updateCampaignFanRequest(requestId: string, input: UpdateCampaignFanRequestInput) {
  const { fanRequests } = await getCollections();
  let oid: ObjectId;
  try {
    oid = new ObjectId(requestId);
  } catch {
    return null;
  }

  const existing = await fanRequests.findOne({ _id: oid });
  if (!existing) {
    return null;
  }

  const campaign = await getCampaignById(existing.campaignId.toHexString());
  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  const nextCustomerVerified = input.customerFollowVerified ?? existing.customerFollowVerified;
  const nextFriendVerified = input.friendFollowVerified ?? existing.friendFollowVerified;
  const computedApprovedDiscount = computeApprovedDiscount(campaign, {
    hasFriend: existing.hasFriend,
    customerFollowVerified: nextCustomerVerified,
    friendFollowVerified: nextFriendVerified,
  });

  const approvedDiscountPercent = input.approvedDiscountPercent ?? (computedApprovedDiscount > 0 ? computedApprovedDiscount : undefined);

  const verificationStatus = resolveCampaignFanRequestStatus({
    campaign,
    existingStatus: existing.verificationStatus,
    requestedStatus: input.verificationStatus,
    hasFriend: existing.hasFriend,
    customerFollowVerified: nextCustomerVerified,
    friendFollowVerified: nextFriendVerified,
    approvedDiscountPercent,
  });

  await fanRequests.updateOne(
    { _id: oid },
    {
      $set: {
        customerFollowVerified: nextCustomerVerified,
        friendFollowVerified: nextFriendVerified,
        verificationStatus,
        approvedDiscountPercent,
        notes: input.notes !== undefined ? normalizeText(input.notes) || undefined : existing.notes,
        verifiedBy: input.verifiedBy ?? existing.verifiedBy,
        verifiedAt: verificationStatus === "VERIFIED" ? new Date() : existing.verifiedAt,
        updatedAt: new Date(),
      },
    },
  );

  return getCampaignFanRequestById(requestId);
}

async function upsertParticipantForRequest(input: {
  campaignId: ObjectId;
  name: string;
  email?: string;
  phone?: string;
  instagramUsername: string;
  fanRequestId: ObjectId;
  isFollowVerified: boolean;
  isEligible: boolean;
}) {
  const { participants } = await getCollections();
  const now = new Date();
  const normalizedInstagram = normalizeInstagram(input.instagramUsername);

  const update = {
    $set: {
      name: normalizeText(input.name),
      email: normalizeText(input.email ?? "") || undefined,
      phone: normalizeText(input.phone ?? "") || undefined,
      emailNormalized: normalizeEmail(input.email),
      phoneNormalized: normalizePhone(input.phone),
      instagramUsername: input.instagramUsername.startsWith("@") ? input.instagramUsername : `@${input.instagramUsername}`,
      instagramUsernameNormalized: normalizedInstagram,
      fanRequestId: input.fanRequestId,
      isFollowVerified: input.isFollowVerified,
      isEligible: input.isEligible,
      updatedAt: now,
    },
    $setOnInsert: {
      createdAt: now,
      campaignId: input.campaignId,
    },
  };

  const result = await participants.findOneAndUpdate(
    { campaignId: input.campaignId, instagramUsernameNormalized: normalizedInstagram },
    update,
    { upsert: true, returnDocument: "after" },
  );

  if (!result) {
    throw new Error("PARTICIPANT_UPSERT_FAILED");
  }

  return result;
}

async function generateUniqueCampaignCouponCode(campaign: CampaignRecord) {
  const { coupons } = await getCollections();
  for (let index = 0; index < 12; index += 1) {
    const suffix = crypto.randomBytes(4).toString("base64url").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
    const code = `${campaign.couponPrefix}-${suffix}`;
    const existing = await coupons.findOne({ code });
    if (!existing) {
      return code;
    }
  }

  throw new Error("COUPON_CODE_GENERATION_FAILED");
}

async function createCampaignCouponDoc(input: {
  campaign: CampaignRecord;
  participantId: ObjectId;
  fanRequestId: ObjectId;
  discountValue: number;
}) {
  const { coupons } = await getCollections();
  const campaignId = new ObjectId(input.campaign.id);
  const now = new Date();
  const existingCoupons = await coupons.find({ participantId: input.participantId, campaignId }).sort({ createdAt: -1 }).toArray();
  const usedCoupon = existingCoupons.find((coupon) => coupon.status === "USED");

  if (usedCoupon) {
    return usedCoupon;
  }

  const activeCoupon = existingCoupons.find((coupon) => coupon.status === "ACTIVE");

  if (activeCoupon?.expiresAt && activeCoupon.expiresAt.getTime() < now.getTime()) {
    await coupons.updateOne(
      { _id: activeCoupon._id, status: "ACTIVE" },
      { $set: { status: "EXPIRED", updatedAt: now } },
    );
  } else if (activeCoupon) {
    const reservationActive =
      activeCoupon.reservedOrderId &&
      activeCoupon.reservationExpiresAt &&
      activeCoupon.reservationExpiresAt.getTime() > now.getTime();

    if (reservationActive && activeCoupon.discountValue !== input.discountValue) {
      throw new Error("COUPON_CURRENTLY_RESERVED");
    }

    if (activeCoupon.discountValue === input.discountValue) {
      return activeCoupon;
    }

    await coupons.updateOne(
      { _id: activeCoupon._id, status: "ACTIVE" },
      {
        $set: { status: "CANCELLED", updatedAt: now },
        $unset: {
          reservedOrderId: "",
          reservedAt: "",
          reservationExpiresAt: "",
        },
      },
    );
  }

  const doc: CampaignCouponDocument = {
    _id: new ObjectId(),
    campaignId,
    participantId: input.participantId,
    fanRequestId: input.fanRequestId,
    code: await generateUniqueCampaignCouponCode(input.campaign),
    discountType: "percentage",
    discountValue: input.discountValue,
    maxUses: 1,
    usedCount: 0,
    status: "ACTIVE",
    expiresAt: toDateOrUndefined(input.campaign.couponExpiresAt),
    createdAt: now,
    updatedAt: now,
  };

  await coupons.insertOne(doc);
  return doc;
}

export async function generateCouponsForFanRequest(requestId: string, adminIdentity: string) {
  const { fanRequests, referrals } = await getCollections();
  let requestObjectId: ObjectId;
  try {
    requestObjectId = new ObjectId(requestId);
  } catch {
    throw new Error("REQUEST_NOT_FOUND");
  }

  const request = await fanRequests.findOne({ _id: requestObjectId });
  if (!request) {
    throw new Error("REQUEST_NOT_FOUND");
  }

  const campaign = await getCampaignById(request.campaignId.toHexString());
  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  const approvedDiscount = computeApprovedDiscount(campaign, {
    hasFriend: request.hasFriend,
    customerFollowVerified: request.customerFollowVerified,
    friendFollowVerified: request.friendFollowVerified,
  });

  const eligibility = getCampaignCouponGenerationEligibility({
    campaign,
    hasFriend: request.hasFriend,
    customerFollowVerified: request.customerFollowVerified,
    friendFollowVerified: request.friendFollowVerified,
  });

  if (!eligibility.ok) {
    throw new Error(eligibility.reason);
  }

  const customerParticipant = await upsertParticipantForRequest({
    campaignId: request.campaignId,
    name: request.customerName,
    email: request.customerEmail,
    phone: request.customerPhone,
    instagramUsername: request.instagramUsername,
    fanRequestId: requestObjectId,
    isFollowVerified: request.customerFollowVerified,
    isEligible: approvedDiscount > 0,
  });

  let friendParticipant: CampaignParticipantDocument | null = null;
  if (request.hasFriend && request.friendName && request.friendInstagramUsername && request.friendFollowVerified) {
    friendParticipant = await upsertParticipantForRequest({
      campaignId: request.campaignId,
      name: request.friendName,
      email: request.friendEmail,
      phone: request.friendPhone,
      instagramUsername: request.friendInstagramUsername,
      fanRequestId: requestObjectId,
      isFollowVerified: request.friendFollowVerified,
      isEligible: approvedDiscount > 0,
    });
  }

  const customerCoupon = await createCampaignCouponDoc({
    campaign,
    participantId: customerParticipant._id,
    fanRequestId: requestObjectId,
    discountValue: approvedDiscount || campaign.baseDiscountPercent,
  });

  let friendCoupon: CampaignCouponDocument | null = null;

  if (friendParticipant && request.friendFollowVerified && campaign.referralEnabled) {
    friendCoupon = await createCampaignCouponDoc({
      campaign,
      participantId: friendParticipant._id,
      fanRequestId: requestObjectId,
      discountValue: approvedDiscount || campaign.baseDiscountPercent,
    });

    await referrals.updateOne(
      {
        campaignId: request.campaignId,
        referrerParticipantId: customerParticipant._id,
        referredParticipantId: friendParticipant._id,
      },
      {
        $set: {
          fanRequestId: requestObjectId,
          status: "VERIFIED",
          bonusPercent: campaign.referralBonusPercent,
          verifiedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  await fanRequests.updateOne(
    { _id: requestObjectId },
    {
      $set: {
        customerParticipantId: customerParticipant._id,
        friendParticipantId: friendParticipant?._id,
        customerCouponId: customerCoupon._id,
        friendCouponId: friendCoupon?._id,
        verificationStatus: "VERIFIED",
        approvedDiscountPercent: approvedDiscount || campaign.baseDiscountPercent,
        verifiedBy: adminIdentity,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return {
    request: await getCampaignFanRequestById(requestId),
    coupons: [customerCoupon, friendCoupon].filter((coupon): coupon is CampaignCouponDocument => Boolean(coupon)).map((coupon) => mapCampaignCoupon(coupon)),
  };
}

export async function listCampaignCoupons(campaignId: string, filters: CampaignCouponFilters = {}) {
  const { coupons, participants } = await getCollections();
  const oid = await requireCampaignObjectId(campaignId);
  const query: Record<string, unknown> = { campaignId: oid };

  if (filters.status && filters.status !== "all") {
    query.status = filters.status;
  }

  const docs = await coupons.find(query, { sort: { createdAt: -1 } }).toArray();
  const participantIds = docs.map((doc) => doc.participantId);
  const participantDocs = participantIds.length > 0 ? await participants.find({ _id: { $in: participantIds } }).toArray() : [];
  const participantMap = new Map(participantDocs.map((doc) => [doc._id.toHexString(), doc]));

  const mapped = docs.map((doc) => mapCampaignCoupon(doc, participantMap.get(doc.participantId.toHexString()) ?? null));

  if (!filters.q) {
    return mapped;
  }

  const q = filters.q.trim().toLowerCase();
  return mapped.filter((coupon) => {
    const participant = coupon.participant;
    return [
      coupon.code,
      participant?.name,
      participant?.email,
      participant?.phone,
      participant?.instagramUsername,
    ].some((value) => value?.toLowerCase().includes(q));
  });
}

export async function getCampaignCouponByCode(code: string): Promise<ResolvedCampaignCoupon | null> {
  const { coupons, campaigns, participants } = await getCollections();
  const normalized = normalizeText(code).toUpperCase();
  if (!normalized) {
    return null;
  }

  const doc = await coupons.findOne({ code: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" } });
  if (!doc) {
    return null;
  }

  const [campaign, participant] = await Promise.all([
    campaigns.findOne({ _id: doc.campaignId }),
    participants.findOne({ _id: doc.participantId }),
  ]);

  if (!campaign) {
    return null;
  }

  return {
    coupon: mapCampaignCoupon(doc, participant),
    campaign: mapCampaign(campaign),
  };
}

export async function validateCampaignCouponForCheckout(input: {
  code: string;
  subtotalAmount: number;
  userId?: string;
  sessionEmail?: string;
  checkoutEmail?: string;
}) {
  const resolved = await getCampaignCouponByCode(input.code);
  if (!resolved) {
    return { valid: false as const, reason: "not_found" as const };
  }

  const now = new Date();
  const { coupon, campaign } = resolved;

  if (campaign.redemptionRequiresActiveCampaign) {
    const starts = campaign.startDate ? new Date(campaign.startDate) : null;
    const ends = campaign.endDate ? new Date(campaign.endDate) : null;
    const inWindow = (!starts || starts.getTime() <= now.getTime()) && (!ends || ends.getTime() >= now.getTime());
    if (campaign.status !== "active" || !inWindow) {
      return { valid: false as const, reason: "campaign_inactive" as const, coupon, campaign };
    }
  }

  if (coupon.status === "USED" || coupon.usedCount >= coupon.maxUses) {
    return { valid: false as const, reason: "already_used" as const, coupon, campaign };
  }

  if (coupon.status === "CANCELLED") {
    return { valid: false as const, reason: "cancelled" as const, coupon, campaign };
  }

  if (coupon.status !== "ACTIVE") {
    return { valid: false as const, reason: "status_invalid" as const, coupon, campaign };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now.getTime()) {
    return { valid: false as const, reason: "expired" as const, coupon, campaign };
  }

  if (typeof campaign.minimumOrderValue === "number" && input.subtotalAmount < campaign.minimumOrderValue) {
    return { valid: false as const, reason: "min_order" as const, coupon, campaign };
  }

  const reservationActive =
    coupon.reservedOrderId &&
    coupon.reservationExpiresAt &&
    new Date(coupon.reservationExpiresAt).getTime() > now.getTime();

  if (reservationActive) {
    return { valid: false as const, reason: "reserved" as const, coupon, campaign };
  }

  const participant = coupon.participant;
  if (!participant || !participant.isEligible) {
    return { valid: false as const, reason: "participant_ineligible" as const, coupon, campaign };
  }

  const normalizedUserId = normalizeObjectIdString(input.userId);
  const normalizedParticipantUserId = normalizeObjectIdString(participant.userId);
  const normalizedSessionEmail = normalizeEmail(input.sessionEmail);
  const normalizedCheckoutEmail = normalizeEmail(input.checkoutEmail);
  const normalizedParticipantEmail = normalizeEmail(participant.email);
  const candidateEmails = [normalizedSessionEmail, normalizedCheckoutEmail].filter((value): value is string => Boolean(value));

  if (!normalizedUserId && candidateEmails.length === 0) {
    return { valid: false as const, reason: "ownership_required" as const, coupon, campaign };
  }

  let ownershipMatches = false;

  if (normalizedParticipantUserId) {
    if (normalizedUserId && normalizedParticipantUserId === normalizedUserId) {
      ownershipMatches = true;
    } else if (normalizedUserId) {
      return { valid: false as const, reason: "wrong_customer" as const, coupon, campaign };
    }
  }

  if (!ownershipMatches && normalizedParticipantEmail && candidateEmails.includes(normalizedParticipantEmail)) {
    ownershipMatches = true;
  }

  if (!ownershipMatches) {
    return { valid: false as const, reason: "wrong_customer" as const, coupon, campaign };
  }

  if (normalizedUserId && !normalizedParticipantUserId && normalizedParticipantEmail && candidateEmails.includes(normalizedParticipantEmail)) {
    const { participants } = await getCollections();
    await participants.updateOne(
      { _id: new ObjectId(participant.id), userId: { $exists: false } },
      { $set: { userId: new ObjectId(normalizedUserId), updatedAt: new Date() } },
    );
  }

  const discountAmount = Math.round((input.subtotalAmount * coupon.discountValue) / 100);
  return {
    valid: true as const,
    coupon,
    campaign,
    checkoutCoupon: {
      code: coupon.code,
      label: `${campaign.name} ${campaign.editionName}`.trim(),
      description: `${coupon.discountValue}% OFF collaboration coupon`,
      discountAmount,
      discountPercent: coupon.discountValue,
      campaignId: campaign.id,
      couponId: coupon.id,
      participantId: coupon.participantId,
      expiresAt: coupon.expiresAt,
    } satisfies ValidatedCampaignCheckoutCoupon,
  };
}

export function getCampaignCouponValidationErrorDetails(input: {
  reason: CampaignCouponValidationFailureReason;
  campaign?: CampaignRecord;
}) {
  switch (input.reason) {
    case "campaign_inactive": {
      const startDate = input.campaign?.startDate ? new Date(input.campaign.startDate) : null;
      const endDate = input.campaign?.endDate ? new Date(input.campaign.endDate) : null;

      if (startDate && startDate.getTime() > Date.now()) {
        return {
          code: input.reason,
          message: `This campaign coupon is not active yet. It becomes valid on ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(startDate)}.`,
        };
      }

      if (endDate && endDate.getTime() < Date.now()) {
        return {
          code: input.reason,
          message: "This campaign has ended and the coupon is no longer valid.",
        };
      }

      return {
        code: input.reason,
        message: "This campaign coupon is currently unavailable.",
      };
    }
    case "min_order":
      return {
        code: input.reason,
        message: `This coupon applies on orders above ₹${input.campaign?.minimumOrderValue ?? 0}`,
      };
    case "reserved":
    case "already_reserved":
      return {
        code: input.reason,
        message: "Coupon is currently reserved for another checkout attempt",
      };
    case "already_used":
      return {
        code: input.reason,
        message: "This coupon has already been used",
      };
    case "expired":
      return {
        code: input.reason,
        message: "Coupon code has expired",
      };
    case "ownership_required":
      return {
        code: input.reason,
        message: "This collaboration coupon must be used from the assigned customer account or checkout email.",
      };
    case "wrong_customer":
      return {
        code: input.reason,
        message: "This collaboration coupon is assigned to a different customer.",
      };
    case "participant_ineligible":
      return {
        code: input.reason,
        message: "This campaign participant is not eligible for redemption.",
      };
    case "cancelled":
    case "status_invalid":
    case "not_found":
    default:
      return {
        code: input.reason,
        message: "Coupon code is not valid or has expired",
      };
  }
}

export async function reserveCampaignCouponForOrder(input: { code: string; orderId: string }) {
  const { coupons, participants } = await getCollections();
  const resolved = await getCampaignCouponByCode(input.code);
  if (!resolved) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const now = new Date();
  const couponDoc = await coupons.findOne({ code: resolved.coupon.code });
  const campaign = resolved.campaign;

  if (!couponDoc) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (campaign.redemptionRequiresActiveCampaign) {
    const starts = campaign.startDate ? new Date(campaign.startDate) : null;
    const ends = campaign.endDate ? new Date(campaign.endDate) : null;
    const isActiveWindow = (!starts || starts.getTime() <= now.getTime()) && (!ends || ends.getTime() >= now.getTime());
    if (campaign.status !== "active" || !isActiveWindow) {
      return { ok: false as const, reason: "campaign_inactive" as const };
    }
  }

  if (couponDoc.status !== "ACTIVE") {
    return { ok: false as const, reason: "status_invalid" as const };
  }

  if (couponDoc.expiresAt && couponDoc.expiresAt.getTime() < now.getTime()) {
    await coupons.updateOne({ _id: couponDoc._id }, { $set: { status: "EXPIRED", updatedAt: now } });
    return { ok: false as const, reason: "expired" as const };
  }

  const reservationExpiry = new Date(now.getTime() + 1000 * 60 * 30);
  const reservedDoc = await coupons.findOneAndUpdate(
    {
      _id: couponDoc._id,
      status: "ACTIVE",
      usedCount: { $lt: couponDoc.maxUses },
      $or: [
        { reservedOrderId: { $exists: false } },
        { reservedOrderId: input.orderId },
        { reservationExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        reservedOrderId: input.orderId,
        reservedAt: now,
        reservationExpiresAt: reservationExpiry,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  if (!reservedDoc) {
    return { ok: false as const, reason: "already_reserved" as const };
  }

  const participant = await participants.findOne({ _id: reservedDoc.participantId });
  return {
    ok: true as const,
    coupon: mapCampaignCoupon(reservedDoc, participant),
    campaign,
  };
}

export async function releaseCampaignCouponReservationByOrderId(orderId: string) {
  const { coupons } = await getCollections();
  await coupons.updateMany(
    { reservedOrderId: orderId, status: "ACTIVE" },
    {
      $unset: {
        reservedOrderId: "",
        reservedAt: "",
        reservationExpiresAt: "",
      },
      $set: { updatedAt: new Date() },
    },
  );
}

export async function redeemCampaignCouponByOrder(input: {
  orderId: string;
  couponCode: string;
  participantId?: string;
  campaignId?: string;
  orderTotal: number;
  discountAmount: number;
}) {
  const { coupons, redemptions } = await getCollections();
  const now = new Date();
  const reservedDoc = await coupons.findOneAndUpdate(
    {
      code: input.couponCode.trim().toUpperCase(),
      status: "ACTIVE",
      usedCount: { $lt: 1 },
      reservedOrderId: input.orderId,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
    },
    {
      $set: {
        status: "USED",
        usedCount: 1,
        redeemedAt: now,
        orderId: input.orderId,
        updatedAt: now,
      },
      $unset: {
        reservedOrderId: "",
        reservedAt: "",
        reservationExpiresAt: "",
      },
    },
    { returnDocument: "after" },
  );

  if (!reservedDoc) {
    return null;
  }

  await redemptions.updateOne(
    { couponId: reservedDoc._id },
    {
      $set: {
        campaignId: reservedDoc.campaignId,
        couponId: reservedDoc._id,
        participantId: reservedDoc.participantId,
        orderId: input.orderId,
        discountAmount: input.discountAmount,
        orderTotal: input.orderTotal,
        redeemedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return mapCampaignCoupon(reservedDoc);
}

export async function cancelCampaignCoupon(couponId: string) {
  const { coupons } = await getCollections();
  let oid: ObjectId;
  try {
    oid = new ObjectId(couponId);
  } catch {
    return null;
  }

  await coupons.updateOne({ _id: oid, status: { $ne: "USED" } }, { $set: { status: "CANCELLED", updatedAt: new Date() } });
  const updated = await coupons.findOne({ _id: oid });
  return updated ? mapCampaignCoupon(updated) : null;
}

export async function listCampaignRedemptions(campaignId: string) {
  const { redemptions, participants, coupons } = await getCollections();
  const oid = await requireCampaignObjectId(campaignId);
  const docs = await redemptions.find({ campaignId: oid }, { sort: { redeemedAt: -1 } }).toArray();
  const participantIds = docs.map((doc) => doc.participantId);
  const couponIds = docs.map((doc) => doc.couponId);
  const [participantDocs, couponDocs] = await Promise.all([
    participantIds.length > 0 ? participants.find({ _id: { $in: participantIds } }).toArray() : Promise.resolve([]),
    couponIds.length > 0 ? coupons.find({ _id: { $in: couponIds } }).toArray() : Promise.resolve([]),
  ]);
  const participantMap = new Map(participantDocs.map((doc) => [doc._id.toHexString(), doc]));
  const couponMap = new Map(couponDocs.map((doc) => [doc._id.toHexString(), doc]));

  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    campaignId: doc.campaignId.toHexString(),
    couponId: doc.couponId.toHexString(),
    participantId: doc.participantId.toHexString(),
    orderId: doc.orderId,
    discountAmount: doc.discountAmount,
    orderTotal: doc.orderTotal,
    redeemedAt: doc.redeemedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    couponCode: couponMap.get(doc.couponId.toHexString())?.code,
    participant: participantMap.get(doc.participantId.toHexString()) ? mapParticipant(participantMap.get(doc.participantId.toHexString())!) : null,
  }));
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const { fanRequests, participants, coupons, redemptions, referrals } = await getCollections();
  const oid = await requireCampaignObjectId(campaignId);
  const [
    totalRequests,
    pendingRequests,
    verifiedRequests,
    rejectedRequests,
    totalParticipants,
    referralParticipants,
    couponsGenerated,
    activeCoupons,
    redeemedCoupons,
    expiredCoupons,
    totalOrders,
    redemptionTotals,
    referralCouponsGenerated,
    referralCouponsRedeemed,
  ] = await Promise.all([
    fanRequests.countDocuments({ campaignId: oid }),
    fanRequests.countDocuments({ campaignId: oid, verificationStatus: { $in: ["PENDING", "UNDER_REVIEW"] } }),
    fanRequests.countDocuments({ campaignId: oid, verificationStatus: "VERIFIED" }),
    fanRequests.countDocuments({ campaignId: oid, verificationStatus: "REJECTED" }),
    participants.countDocuments({ campaignId: oid }),
    referrals.countDocuments({ campaignId: oid, status: "VERIFIED" }),
    coupons.countDocuments({ campaignId: oid }),
    coupons.countDocuments({ campaignId: oid, status: "ACTIVE" }),
    coupons.countDocuments({ campaignId: oid, status: "USED" }),
    coupons.countDocuments({ campaignId: oid, status: "EXPIRED" }),
    redemptions.countDocuments({ campaignId: oid }),
    redemptions.aggregate([{ $match: { campaignId: oid } }, { $group: { _id: null, total: { $sum: "$discountAmount" } } }]).toArray(),
    coupons.countDocuments({ campaignId: oid, discountValue: { $gt: 0 } }),
    redemptions.aggregate([{ $match: { campaignId: oid } }, { $lookup: { from: CAMPAIGN_COUPONS_COLLECTION_NAME, localField: "couponId", foreignField: "_id", as: "coupon" } }, { $unwind: "$coupon" }, { $match: { "coupon.discountValue": { $gt: 0 } } }, { $count: "count" }]).toArray(),
  ]);

  return {
    totalRequests,
    pendingRequests,
    verifiedRequests,
    rejectedRequests,
    totalParticipants,
    referralParticipants,
    couponsGenerated,
    activeCoupons,
    redeemedCoupons,
    expiredCoupons,
    totalOrders,
    totalDiscountGiven: Number(redemptionTotals[0]?.total ?? 0),
    referralCouponsGenerated,
    referralCouponsRedeemed: Number(referralCouponsRedeemed[0]?.count ?? 0),
  };
}

export function renderCampaignCouponMessage(input: {
  campaign: CampaignRecord;
  customerName: string;
  couponCode: string;
  discountPercent: number;
  expiryDate?: string;
}) {
  return renderCampaignMessageTemplate({
    template: input.campaign.messageTemplate || DEFAULT_CAMPAIGN_MESSAGE_TEMPLATE,
    customerName: input.customerName,
    campaignName: input.campaign.editionName ? `${input.campaign.name} ${input.campaign.editionName}` : input.campaign.name,
    couponCode: input.couponCode,
    discountPercent: input.discountPercent,
    expiryDate: input.expiryDate,
  });
}