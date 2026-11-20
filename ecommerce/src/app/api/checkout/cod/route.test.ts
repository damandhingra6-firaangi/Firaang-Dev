import { beforeEach, describe, expect, it, vi } from "vitest";

const getAccountSessionTokenFromCookiesMock = vi.fn();
const createGuestOrderMock = vi.fn();
const createPendingOrderForSessionTokenMock = vi.fn();
const parseAttributionCookieMock = vi.fn();
const parseGeoFromRequestHeadersMock = vi.fn();
const trackAnalyticsEventMock = vi.fn();
const calculateCheckoutPricingMock = vi.fn();
const estimateOrderWeightKgMock = vi.fn();
const resolveCheckoutItemsMock = vi.fn();
const getDisplayPricingMock = vi.fn(({ priceAmount }: { priceAmount: number }) => ({ priceAmount: priceAmount + 100 }));
const isInclusiveDisplayPricingEnabledMock = vi.fn(() => true);
const syncShopifyInventoryForOrderMock = vi.fn();

vi.mock("@/lib/account-session", () => ({
  getAccountSessionTokenFromCookies: getAccountSessionTokenFromCookiesMock,
}));

vi.mock("@/lib/account-data", () => ({
  createGuestOrder: createGuestOrderMock,
  createPendingOrderForSessionToken: createPendingOrderForSessionTokenMock,
}));

vi.mock("@/lib/analytics", () => ({
  parseAttributionCookie: parseAttributionCookieMock,
  parseGeoFromRequestHeaders: parseGeoFromRequestHeadersMock,
  trackAnalyticsEvent: trackAnalyticsEventMock,
}));

vi.mock("@/lib/checkout-config", () => ({
  calculateCheckoutPricing: calculateCheckoutPricingMock,
  estimateOrderWeightKg: estimateOrderWeightKgMock,
}));

vi.mock("@/lib/pricing-display", () => ({
  getDisplayPricing: getDisplayPricingMock,
  isInclusiveDisplayPricingEnabled: isInclusiveDisplayPricingEnabledMock,
}));

vi.mock("@/lib/products", () => ({
  resolveCheckoutItems: resolveCheckoutItemsMock,
}));

vi.mock("@/lib/shopify-admin", () => ({
  syncShopifyInventoryForOrder: syncShopifyInventoryForOrderMock,
}));

describe("COD checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountSessionTokenFromCookiesMock.mockResolvedValue(null);
    parseAttributionCookieMock.mockReturnValue({
      source: "direct",
      campaign: "none",
      medium: "none",
      term: "none",
      content: "none",
      gclid: "none",
      fbclid: "none",
      msclkid: "none",
      ttclid: "none",
    });
    parseGeoFromRequestHeadersMock.mockReturnValue({ country: "IN", region: "MH", city: "Mumbai" });
    trackAnalyticsEventMock.mockResolvedValue(undefined);
    estimateOrderWeightKgMock.mockReturnValue(0.5);
    calculateCheckoutPricingMock.mockImplementation(({ subtotalAmount }: { subtotalAmount: number }) => ({
      subtotalAmount,
      shippingFee: 0,
      discountAmount: 0,
      totalAmount: subtotalAmount,
      shippingStatus: "resolved",
      shippingLabel: "Standard",
      shippingMethod: "surface",
      codFee: 0,
    }));
    resolveCheckoutItemsMock.mockResolvedValue({
      items: [
        {
          product: {
            id: "prod_1",
            name: "Classic Tee",
            priceAmount: 1199,
            oldPrice: "",
            tags: [],
            img: "https://example.com/tee.jpg",
          },
          quantity: 2,
        },
      ],
      totalPaise: 239800,
      currencyCode: "INR",
    });
    createGuestOrderMock.mockResolvedValue({ id: "guest_order_1" });
    createPendingOrderForSessionTokenMock.mockResolvedValue({ id: "session_order_1" });
    syncShopifyInventoryForOrderMock.mockResolvedValue(undefined);
  });

  it("uses the inclusive display price for COD totals and persisted order items", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/checkout/cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "prod_1", quantity: 2 }],
          shippingState: "Maharashtra",
          shippingMethod: "surface",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      subtotalAmount: 2598,
      amount: 2598,
    });
    expect(createGuestOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotalAmount: 2598,
        totalAmount: 2598,
        items: [expect.objectContaining({ unitPrice: 1299, quantity: 2, lineTotal: 2598 })],
      }),
    );
  });
});
