import { beforeEach, describe, expect, it, vi } from "vitest";

const getAccountSessionTokenFromCookiesMock = vi.fn();
const createPendingOrderForSessionTokenMock = vi.fn();
const createGuestOrderMock = vi.fn();
const getAccountSessionIdentityByTokenMock = vi.fn();
const hasSuccessfullyUsedCouponForSessionTokenMock = vi.fn();
const saveShippingAddressForSessionTokenMock = vi.fn();
const parseAttributionCookieMock = vi.fn();
const parseGeoFromRequestHeadersMock = vi.fn();
const trackAnalyticsEventMock = vi.fn();
const calculateCheckoutPricingMock = vi.fn();
const computeCouponDiscountMock = vi.fn();
const estimateOrderWeightKgMock = vi.fn();
const getRazorpayClientMock = vi.fn();
const resolveCheckoutItemsMock = vi.fn();
const getActiveCouponByCodeMock = vi.fn();
const syncShopifyInventoryForOrderMock = vi.fn();
const validateCampaignCouponForCheckoutMock = vi.fn();
const getCampaignCouponValidationErrorDetailsMock = vi.fn();
const releaseCampaignCouponReservationByOrderIdMock = vi.fn();
const reserveCampaignCouponForOrderMock = vi.fn();

vi.mock("@/lib/account-session", () => ({
  getAccountSessionTokenFromCookies: getAccountSessionTokenFromCookiesMock,
}));

vi.mock("@/lib/account-data", () => ({
  createPendingOrderForSessionToken: createPendingOrderForSessionTokenMock,
  createGuestOrder: createGuestOrderMock,
  getAccountSessionIdentityByToken: getAccountSessionIdentityByTokenMock,
  hasSuccessfullyUsedCouponForSessionToken: hasSuccessfullyUsedCouponForSessionTokenMock,
  saveShippingAddressForSessionToken: saveShippingAddressForSessionTokenMock,
}));

vi.mock("@/lib/analytics", () => ({
  parseAttributionCookie: parseAttributionCookieMock,
  parseGeoFromRequestHeaders: parseGeoFromRequestHeadersMock,
  trackAnalyticsEvent: trackAnalyticsEventMock,
}));

vi.mock("@/lib/checkout-config", () => ({
  calculateCheckoutPricing: calculateCheckoutPricingMock,
  computeCouponDiscount: computeCouponDiscountMock,
  estimateOrderWeightKg: estimateOrderWeightKgMock,
}));

vi.mock("@/lib/catalog", () => ({
  CUSTOM_DESIGN_SURCHARGE_INR: 0,
}));

vi.mock("@/lib/campaigns", () => ({
  getCampaignCouponValidationErrorDetails: getCampaignCouponValidationErrorDetailsMock,
  releaseCampaignCouponReservationByOrderId: releaseCampaignCouponReservationByOrderIdMock,
  reserveCampaignCouponForOrder: reserveCampaignCouponForOrderMock,
  validateCampaignCouponForCheckout: validateCampaignCouponForCheckoutMock,
}));

vi.mock("@/lib/pricing-display", () => ({
  getDisplayPricing: ({ priceAmount }: { priceAmount: number }) => ({ priceAmount }),
  isInclusiveDisplayPricingEnabled: () => false,
}));

vi.mock("@/lib/razorpay", () => ({
  getRazorpayClient: getRazorpayClientMock,
}));

vi.mock("@/lib/products", () => ({
  resolveCheckoutItems: resolveCheckoutItemsMock,
}));

vi.mock("@/lib/coupon-store", () => ({
  getActiveCouponByCode: getActiveCouponByCodeMock,
}));

vi.mock("@/lib/shopify-admin", () => ({
  syncShopifyInventoryForOrder: syncShopifyInventoryForOrderMock,
}));

describe("checkout order route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountSessionTokenFromCookiesMock.mockResolvedValue(null);
    parseAttributionCookieMock.mockReturnValue({ source: "direct", campaign: "none", medium: "none", term: "none", content: "none", gclid: "none", fbclid: "none", msclkid: "none", ttclid: "none" });
    parseGeoFromRequestHeadersMock.mockReturnValue({ country: "IN", region: "MH", city: "Mumbai" });
    trackAnalyticsEventMock.mockResolvedValue(undefined);
    estimateOrderWeightKgMock.mockReturnValue(0.5);
    calculateCheckoutPricingMock.mockReturnValue({
      subtotalAmount: 4999,
      shippingFee: 0,
      discountAmount: 0,
      totalAmount: 4999,
      shippingStatus: "resolved",
      shippingLabel: "Standard",
      shippingMethod: "surface",
      codFee: 0,
    });
    getActiveCouponByCodeMock.mockResolvedValue(null);
    validateCampaignCouponForCheckoutMock.mockResolvedValue({ valid: true, checkoutCoupon: { code: "WELCOME5", label: "Welcome", description: "Get 5% off", discountAmount: 250 } });
    resolveCheckoutItemsMock.mockResolvedValue({
      items: [
        {
          product: {
            id: "prod_1",
            name: "Gold Ring",
            priceAmount: 4999,
            oldPrice: 5999,
            tags: ["gold"],
            img: "https://example.com/ring.jpg",
          },
          quantity: 1,
        },
      ],
      currencyCode: "INR",
    });
    getRazorpayClientMock.mockReturnValue({
      orders: { create: vi.fn().mockResolvedValue({ id: "order_123", amount: 499900, currency: "INR" }) },
    });
    createGuestOrderMock.mockResolvedValue({ id: "guest_order_123" });
    createPendingOrderForSessionTokenMock.mockResolvedValue({ id: "session_order_123" });
    saveShippingAddressForSessionTokenMock.mockResolvedValue({});
    syncShopifyInventoryForOrderMock.mockResolvedValue(undefined);
  });

  it("allows guest checkout without forcing a session", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "prod_1", quantity: 1 }],
          shippingName: "Guest User",
          shippingEmail: "guest@example.com",
          shippingAddress: "45 Market Road",
          shippingCity: "Mumbai",
          shippingState: "Maharashtra",
          shippingPinCode: "400001",
          shippingMethod: "surface",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.orderId).toBe("order_123");
    expect(createGuestOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order_123",
        currencyCode: "INR",
        shippingEmail: "guest@example.com",
      }),
    );
  });

  it("persists the selected size and variant data with each order item", async () => {
    const { POST } = await import("./route");

    await POST(
      new Request("http://localhost/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "prod_1", quantity: 1, selectedSize: "M", selectedVariantId: "variant_m" }],
          shippingName: "Guest User",
          shippingEmail: "guest@example.com",
          shippingPhone: "+91 9876543210",
          shippingAddress: "45 Market Road",
          shippingCity: "Mumbai",
          shippingState: "Maharashtra",
          shippingPinCode: "400001",
          shippingMethod: "surface",
        }),
      }),
    );

    expect(createGuestOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order_123",
        items: [
          expect.objectContaining({
            productId: "prod_1",
            selectedSize: "M",
            selectedVariantId: "variant_m",
          }),
        ],
      }),
    );
  });

  it("persists the shipping phone for guest orders", async () => {
    const { POST } = await import("./route");

    await POST(
      new Request("http://localhost/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "prod_1", quantity: 1 }],
          shippingName: "Guest User",
          shippingEmail: "guest@example.com",
          shippingPhone: "+91 9876543210",
          shippingAddress: "45 Market Road",
          shippingCity: "Mumbai",
          shippingState: "Maharashtra",
          shippingPinCode: "400001",
          shippingMethod: "surface",
        }),
      }),
    );

    expect(createGuestOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order_123",
        shippingPhone: "+91 9876543210",
      }),
    );
  });

  it("allows direct guest checkout before local shipping details are entered", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "prod_1", quantity: 1 }],
          shippingName: "Guest User",
          shippingEmail: "guest@example.com",
          shippingMethod: "surface",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.orderId).toBe("order_123");
    expect(createGuestOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order_123",
        currencyCode: "INR",
        shippingEmail: "guest@example.com",
      }),
    );
  });

  it("rejects outdated cart items that resolve to no valid products", async () => {
    resolveCheckoutItemsMock.mockResolvedValueOnce({ items: [], currencyCode: "INR", staleProductIds: ["stale_product_id"] });
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: "stale_product_id", quantity: 1 }],
          shippingName: "Guest User",
          shippingEmail: "guest@example.com",
          shippingAddress: "45 Market Road",
          shippingCity: "Mumbai",
          shippingState: "Maharashtra",
          shippingPinCode: "400001",
          shippingMethod: "surface",
        }),
      }),
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toContain("stale or invalid");
    expect(payload.staleProductIds).toEqual(["stale_product_id"]);
  });

  it("returns stale product ids when valid items are mixed with outdated cart entries", async () => {
    resolveCheckoutItemsMock.mockResolvedValueOnce({
      items: [{ product: { id: "prod_1", name: "Gold Ring", priceAmount: 4999, oldPrice: 5999, tags: ["gold"], img: "https://example.com/ring.jpg" }, quantity: 1 }],
      currencyCode: "INR",
      staleProductIds: ["stale_product_id"],
    });
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { productId: "prod_1", quantity: 1 },
            { productId: "stale_product_id", quantity: 1 },
          ],
          shippingName: "Guest User",
          shippingEmail: "guest@example.com",
          shippingAddress: "45 Market Road",
          shippingCity: "Mumbai",
          shippingState: "Maharashtra",
          shippingPinCode: "400001",
          shippingMethod: "surface",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.orderId).toBe("order_123");
    expect(payload.staleProductIds).toEqual(["stale_product_id"]);
  });
});
