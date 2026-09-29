import { describe, expect, it } from "vitest";
import { CampaignPayloadValidationError, parseCampaignCreatePayload, summarizeCampaignPayload } from "./campaign-admin-payload";

describe("parseCampaignCreatePayload", () => {
  it("normalizes the exact admin campaign payload values into the backend schema", () => {
    const parsed = parseCampaignCreatePayload({
      campaignName: "FIRAANG × ROCKSTAR Academy — 1st Edition",
      slug: "firaang-rockstar-1st-edition",
      partnerName: "Rockstar Academy",
      editionName: "1st Edition",
      campaignKeyword: "ROCK25",
      couponPrefix: "ROCK",
      baseDiscountPercent: "25",
      referralBonusPercent: "5",
      referralEnabled: true,
      friendVerificationMode: "fallback-to-base-discount",
      requireActiveCampaignDuringRedemption: true,
      campaignStatus: "DRAFT",
      minimumOrderValue: "",
      maxRedemptions: "",
      couponExpiry: "",
      termsAndConditions: "Exclusive offer.",
      messageTemplate: "",
    });

    expect(parsed).toMatchObject({
      name: "FIRAANG × ROCKSTAR Academy — 1st Edition",
      slug: "firaang-rockstar-1st-edition",
      partnerName: "Rockstar Academy",
      editionName: "1st Edition",
      campaignKeyword: "ROCK25",
      couponPrefix: "ROCK",
      baseDiscountPercent: 25,
      referralBonusPercent: 5,
      referralEnabled: true,
      friendVerificationMode: "fallback_to_base",
      redemptionRequiresActiveCampaign: true,
      status: "draft",
      minimumOrderValue: undefined,
      maxRedemptions: undefined,
      couponExpiresAt: undefined,
    });
  });

  it("rejects invalid dates and reversed ranges before database insert", () => {
    expect(() =>
      parseCampaignCreatePayload({
        name: "Fan Campaign",
        slug: "fan-campaign",
        partnerName: "Creator",
        editionName: "Edition 1",
        campaignKeyword: "FAN25",
        couponPrefix: "FAN",
        baseDiscountPercent: 25,
        referralBonusPercent: 5,
        status: "draft",
        friendVerificationMode: "fallback_to_base",
        startDate: "2026-10-01",
        endDate: "2026-09-30",
      }),
    ).toThrow(CampaignPayloadValidationError);
  });

  it("summarizes payloads without echoing long text fields", () => {
    const parsed = parseCampaignCreatePayload({
      name: "Fan Campaign",
      slug: "fan-campaign",
      partnerName: "Creator",
      editionName: "Edition 1",
      campaignKeyword: "FAN25",
      couponPrefix: "FAN",
      baseDiscountPercent: 25,
      referralBonusPercent: 5,
      status: "draft",
      friendVerificationMode: "fallback_to_base",
      termsAndConditions: "Terms present",
      messageTemplate: "Template present",
    });

    expect(summarizeCampaignPayload(parsed)).toMatchObject({
      hasTermsAndConditions: true,
      hasMessageTemplate: true,
      campaignKeyword: "FAN25",
    });
  });
});