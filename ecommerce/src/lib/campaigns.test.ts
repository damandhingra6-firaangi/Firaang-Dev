import { describe, expect, it } from "vitest";
import {
  computeApprovedDiscount,
  getCampaignCouponGenerationEligibility,
  renderCampaignCouponMessage,
  resolveCampaignFanRequestStatus,
  type CampaignRecord,
} from "./campaigns";

function createCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    id: "campaign-1",
    name: "Fan Drop",
    slug: "fan-drop",
    partnerName: "Creator",
    editionName: "Edition 01",
    campaignKeyword: "FANDROP",
    couponPrefix: "FD",
    baseDiscountPercent: 25,
    referralBonusPercent: 5,
    referralEnabled: true,
    friendVerificationMode: "fallback_to_base",
    status: "active",
    redemptionRequiresActiveCampaign: true,
    termsAndConditions: "Terms",
    messageTemplate: "Hi {{customerName}}, use {{couponCode}} for {{discountPercent}}% off on {{campaignName}} until {{expiryDate}}.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeApprovedDiscount", () => {
  it("returns the base discount for a verified solo follower", () => {
    const campaign = createCampaign();

    expect(
      computeApprovedDiscount(campaign, {
        hasFriend: false,
        customerFollowVerified: true,
        friendFollowVerified: false,
      }),
    ).toBe(25);
  });

  it("returns the combined discount when both referral followers are verified", () => {
    const campaign = createCampaign();

    expect(
      computeApprovedDiscount(campaign, {
        hasFriend: true,
        customerFollowVerified: true,
        friendFollowVerified: true,
      }),
    ).toBe(30);
  });

  it("blocks approval when the campaign requires both followers and the friend is still pending", () => {
    const campaign = createCampaign({ friendVerificationMode: "require_both_for_approval" });

    expect(
      computeApprovedDiscount(campaign, {
        hasFriend: true,
        customerFollowVerified: true,
        friendFollowVerified: false,
      }),
    ).toBe(0);
  });
});

describe("resolveCampaignFanRequestStatus", () => {
  it("prevents direct VERIFIED status when the request is not yet eligible", () => {
    const campaign = createCampaign({ friendVerificationMode: "require_both_for_approval" });

    expect(
      resolveCampaignFanRequestStatus({
        campaign,
        existingStatus: "PENDING",
        requestedStatus: "VERIFIED",
        hasFriend: true,
        customerFollowVerified: true,
        friendFollowVerified: false,
        approvedDiscountPercent: 0,
      }),
    ).toBe("UNDER_REVIEW");
  });

  it("marks the request VERIFIED once the underlying verification rules are satisfied", () => {
    const campaign = createCampaign({ friendVerificationMode: "require_both_for_approval" });

    expect(
      resolveCampaignFanRequestStatus({
        campaign,
        existingStatus: "UNDER_REVIEW",
        requestedStatus: "VERIFIED",
        hasFriend: true,
        customerFollowVerified: true,
        friendFollowVerified: true,
        approvedDiscountPercent: 30,
      }),
    ).toBe("VERIFIED");
  });
});

describe("getCampaignCouponGenerationEligibility", () => {
  it("allows base coupon generation in fallback mode before friend verification", () => {
    const campaign = createCampaign({ friendVerificationMode: "fallback_to_base" });

    expect(
      getCampaignCouponGenerationEligibility({
        campaign,
        hasFriend: true,
        customerFollowVerified: true,
        friendFollowVerified: false,
      }),
    ).toEqual({ ok: true });
  });

  it("blocks generation until both followers are verified when the campaign requires it", () => {
    const campaign = createCampaign({ friendVerificationMode: "require_both_for_approval" });

    expect(
      getCampaignCouponGenerationEligibility({
        campaign,
        hasFriend: true,
        customerFollowVerified: true,
        friendFollowVerified: false,
      }),
    ).toEqual({ ok: false, reason: "FRIEND_NOT_VERIFIED" });
  });
});

describe("renderCampaignCouponMessage", () => {
  it("renders the message template placeholders with campaign data", () => {
    const campaign = createCampaign();

    expect(
      renderCampaignCouponMessage({
        campaign,
        customerName: "Rhea",
        couponCode: "FD-ABC123",
        discountPercent: 30,
        expiryDate: "2026-02-15T00:00:00.000Z",
      }),
    ).toBe("Hi Rhea, use FD-ABC123 for 30% off on Fan Drop Edition 01 until 15 Feb 2026.");
  });

  it("falls back to the campaign terms text when no expiry date is provided", () => {
    const campaign = createCampaign({ messageTemplate: "{{couponCode}} valid {{expiryDate}}" });

    expect(
      renderCampaignCouponMessage({
        campaign,
        customerName: "Rhea",
        couponCode: "FD-ABC123",
        discountPercent: 25,
      }),
    ).toBe("FD-ABC123 valid as per campaign terms");
  });
});