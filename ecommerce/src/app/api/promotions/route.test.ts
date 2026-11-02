import { describe, expect, it, vi, beforeEach } from "vitest";

const { listCouponsMock } = vi.hoisted(() => ({
  listCouponsMock: vi.fn(),
}));

vi.mock("@/lib/coupon-store", () => ({
  listCoupons: listCouponsMock,
}));

import { POST } from "./route";

describe("promotions route", () => {
  beforeEach(() => {
    listCouponsMock.mockReset();
  });

  it("returns public promotions from active coupons", async () => {
    listCouponsMock.mockResolvedValue([
      {
        id: "1",
        code: "WELCOME5",
        label: "Welcome Offer",
        description: "Get 5% off on your order",
        type: "percentage",
        value: 5,
        minSubtotal: 500,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: "ord_123",
          contact: "+919000090000",
          email: "customer@example.com",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.promotions).toEqual([
      expect.objectContaining({
        code: "WELCOME5",
        summary: expect.stringContaining("Welcome Offer"),
        description: expect.stringContaining("5% off"),
      }),
    ]);
  });
});
