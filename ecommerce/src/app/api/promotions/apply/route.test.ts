import { describe, expect, it, vi, beforeEach } from "vitest";

const { getActiveCouponByCodeMock } = vi.hoisted(() => ({
  getActiveCouponByCodeMock: vi.fn(),
}));

vi.mock("@/lib/coupon-store", () => ({
  getActiveCouponByCode: getActiveCouponByCodeMock,
}));

import { POST } from "./route";

describe("promotions apply route", () => {
  beforeEach(() => {
    getActiveCouponByCodeMock.mockReset();
  });

  it("applies a valid public promotion and returns the Razorpay-style payload", async () => {
    getActiveCouponByCodeMock.mockResolvedValue({
      id: "1",
      code: "500OFF",
      label: "Flat ₹500 Off",
      description: "Get ₹500 off on your order",
      type: "fixed",
      value: 500,
      minSubtotal: 1000,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost/api/promotions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: "ord_123",
          contact: "+919000090000",
          email: "customer@example.com",
          code: "500OFF",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      promotion: {
        reference_id: expect.any(String),
        type: "offer",
        code: "500OFF",
        value: expect.any(Number),
        value_type: "fixed_amount",
        description: expect.any(String),
      },
    });
  });
});
