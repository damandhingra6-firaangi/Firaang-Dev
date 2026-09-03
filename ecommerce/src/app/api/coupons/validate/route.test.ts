import { beforeEach, describe, expect, it, vi } from "vitest";

const getActiveCouponByCode = vi.fn();
const computeCouponDiscount = vi.fn();
const getAccountSessionTokenFromCookies = vi.fn();
const hasSuccessfullyUsedCouponForSessionToken = vi.fn();

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
  hasSuccessfullyUsedCouponForSessionToken,
}));

describe("coupon validate route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    computeCouponDiscount.mockReturnValue({ eligible: true, discountAmount: 250 });
    getAccountSessionTokenFromCookies.mockResolvedValue("session-token");
    hasSuccessfullyUsedCouponForSessionToken.mockResolvedValue(false);
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
});