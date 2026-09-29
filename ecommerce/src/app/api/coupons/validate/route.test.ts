import { beforeEach, describe, expect, it, vi } from "vitest";

const getActiveCouponByCode = vi.fn();
const computeCouponDiscount = vi.fn();
const getAccountSessionTokenFromCookies = vi.fn();
const getAccountSessionIdentityByToken = vi.fn();
const hasSuccessfullyUsedCouponForSessionToken = vi.fn();
const validateCampaignCouponForCheckout = vi.fn();
const getCampaignCouponValidationErrorDetails = vi.fn();

vi.mock("@/lib/coupon-store", () => ({
  getActiveCouponByCode,
}));

vi.mock("@/lib/checkout-config", () => ({
  computeCouponDiscount,
}));

vi.mock("@/lib/account-session", () => ({
  getAccountSessionTokenFromCookies,
}));

vi.mock("@/lib/account-data", () => ({
  getAccountSessionIdentityByToken,
  hasSuccessfullyUsedCouponForSessionToken,
}));

vi.mock("@/lib/campaigns", () => ({
  validateCampaignCouponForCheckout,
  getCampaignCouponValidationErrorDetails,
}));

describe("coupon validate route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    computeCouponDiscount.mockReturnValue({ eligible: true, discountAmount: 250 });
    getAccountSessionTokenFromCookies.mockResolvedValue("session-token");
    getAccountSessionIdentityByToken.mockResolvedValue({ userId: "507f1f77bcf86cd799439011", email: "owner@example.com" });
    hasSuccessfullyUsedCouponForSessionToken.mockResolvedValue(false);
    validateCampaignCouponForCheckout.mockReset();
    getCampaignCouponValidationErrorDetails.mockReset();
  });

  it("rejects WELCOME5 for customers who already used it", async () => {
    getActiveCouponByCode.mockResolvedValue({
      code: "WELCOME5",
      label: "Welcome",
      description: "5% off",
      minSubtotal: 0,
      type: "percentage",
      value: 5,
      isActive: true,
      id: "coupon-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    hasSuccessfullyUsedCouponForSessionToken.mockResolvedValue(true);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "WELCOME5", subtotalAmount: 2000 }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      valid: false,
      message: "WELCOME5 can only be used once per customer.",
    });
    expect(computeCouponDiscount).not.toHaveBeenCalled();
  });

  it("continues to validate other coupons normally", async () => {
    getActiveCouponByCode.mockResolvedValue({
      code: "SPECIAL10",
      label: "Special",
      description: "10% off",
      minSubtotal: 1500,
      type: "percentage",
      value: 10,
      isActive: true,
      id: "coupon-2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "SPECIAL10", subtotalAmount: 2000 }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      valid: true,
      coupon: {
        code: "SPECIAL10",
        label: "Special",
        description: "10% off",
        discountAmount: 250,
      },
      message: "SPECIAL10 applied — you save ₹250",
    });
    expect(hasSuccessfullyUsedCouponForSessionToken).not.toHaveBeenCalled();
  });

  it("surfaces campaign-specific inactive messages instead of a generic invalid error", async () => {
    getActiveCouponByCode.mockResolvedValue(null);
    validateCampaignCouponForCheckout.mockResolvedValue({
      valid: false,
      reason: "campaign_inactive",
      campaign: {
        minimumOrderValue: 0,
        startDate: "2026-10-04T00:00:00.000Z",
      },
    });
    getCampaignCouponValidationErrorDetails.mockReturnValue({
      code: "campaign_inactive",
      message: "This campaign coupon is not active yet. It becomes valid on 4 Oct 2026.",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "ROCK-DC2CYQ", subtotalAmount: 2000, checkoutEmail: "owner@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      valid: false,
      code: "campaign_inactive",
      message: "This campaign coupon is not active yet. It becomes valid on 4 Oct 2026.",
    });
    expect(validateCampaignCouponForCheckout).toHaveBeenCalledWith({
      code: "ROCK-DC2CYQ",
      subtotalAmount: 2000,
      userId: "507f1f77bcf86cd799439011",
      sessionEmail: "owner@example.com",
      checkoutEmail: "owner@example.com",
    });
  });
});