import { beforeEach, describe, expect, it, vi } from "vitest";

const getAccountSessionTokenFromCookiesMock = vi.fn();
const markOrderPaidByOrderIdMock = vi.fn();
const findOrderWithCustomerByOrderIdMock = vi.fn();
const syncCustomerAndShippingDetailsByOrderIdMock = vi.fn();
const syncPaidOrderToShopifyMock = vi.fn();
const attachShopifySyncResultToOrderMock = vi.fn();
const claimOrderConfirmationEmailSendMock = vi.fn();
const markOrderConfirmationEmailSentMock = vi.fn();
const releaseOrderConfirmationEmailClaimMock = vi.fn();
const notifyOrderPaidMock = vi.fn();
const trackAnalyticsEventMock = vi.fn();
const parseAttributionCookieMock = vi.fn();
const parseGeoFromRequestHeadersMock = vi.fn();
const getSiteUrlMock = vi.fn();
const getRazorpayClientMock = vi.fn();
const mapRazorpayPaymentVerificationStateMock = vi.fn();

vi.mock("@/lib/account-session", () => ({
  getAccountSessionTokenFromCookies: getAccountSessionTokenFromCookiesMock,
}));

vi.mock("@/lib/account-data", () => ({
  attachShopifySyncResultToOrder: attachShopifySyncResultToOrderMock,
  claimOrderConfirmationEmailSend: claimOrderConfirmationEmailSendMock,
  findOrderWithCustomerByOrderId: findOrderWithCustomerByOrderIdMock,
  markOrderConfirmationEmailSent: markOrderConfirmationEmailSentMock,
  markOrderPaidByOrderId: markOrderPaidByOrderIdMock,
  releaseOrderConfirmationEmailClaim: releaseOrderConfirmationEmailClaimMock,
  syncCustomerAndShippingDetailsByOrderId: syncCustomerAndShippingDetailsByOrderIdMock,
}));

vi.mock("@/lib/analytics", () => ({
  parseAttributionCookie: parseAttributionCookieMock,
  parseGeoFromRequestHeaders: parseGeoFromRequestHeadersMock,
  trackAnalyticsEvent: trackAnalyticsEventMock,
}));

vi.mock("@/lib/site", () => ({
  getSiteUrl: getSiteUrlMock,
}));

vi.mock("@/lib/razorpay", () => ({
  getRazorpayClient: getRazorpayClientMock,
}));

vi.mock("@/lib/razorpay-payment-status", () => ({
  mapRazorpayPaymentVerificationState: mapRazorpayPaymentVerificationStateMock,
}));

vi.mock("@/lib/shopify-admin", () => ({
  syncPaidOrderToShopify: syncPaidOrderToShopifyMock,
  syncShopifyInventoryForOrder: vi.fn(),
}));

vi.mock("@/lib/order-notifications", () => ({
  notifyOrderPaid: notifyOrderPaidMock,
}));

describe("checkout verification route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_SECRET = "secret";
    getAccountSessionTokenFromCookiesMock.mockResolvedValue(null);
    getSiteUrlMock.mockReturnValue("https://example.com");
    parseAttributionCookieMock.mockReturnValue({ source: "direct", campaign: "none", medium: "none", term: "none", content: "none", gclid: "none", fbclid: "none", msclkid: "none", ttclid: "none" });
    parseGeoFromRequestHeadersMock.mockReturnValue({ country: "IN", region: "MH", city: "Mumbai" });
    trackAnalyticsEventMock.mockResolvedValue(undefined);
    mapRazorpayPaymentVerificationStateMock.mockReturnValue("paid");
    getRazorpayClientMock.mockReturnValue({
      orders: { fetch: vi.fn().mockResolvedValue({
        id: "order_123",
        currency: "INR",
        notes: {
          shippingName: "Test Customer",
          shippingEmail: "checkout@example.com",
          shippingPhone: "+91 9876543210",
          shippingAddress: "12 Rosewood Apartment",
          shippingCity: "Mumbai",
          shippingState: "Maharashtra",
          shippingPinCode: "400001",
          shippingCountry: "India",
          shippingMethod: "surface",
          shippingLabel: "Standard Delivery",
        },
      }) },
      payments: { fetch: vi.fn().mockResolvedValue({
        id: "pay_123",
        order_id: "order_123",
        status: "captured",
        email: "checkout@example.com",
        contact: "+91 9876543210",
      }) },
    });
    findOrderWithCustomerByOrderIdMock.mockResolvedValue({
      order: {
        id: "order_123",
        totalAmount: 4999,
        currencyCode: "INR",
        paymentMethod: "online",
        shippingName: "Customer",
        shippingEmail: "customer@example.com",
        shippingAddress: "45 Market Road",
        shippingCity: "Mumbai",
        shippingState: "Maharashtra",
        shippingPinCode: "400001",
        items: [{ name: "Ring", quantity: 1, unitPrice: 4999, lineTotal: 4999, image: "" }],
        shopifySyncStatus: "pending",
        inventorySyncStatus: "pending",
        createdAt: new Date(),
      },
      customer: null,
    });
    markOrderPaidByOrderIdMock.mockResolvedValue({ id: "order_123", totalAmount: 4999, currencyCode: "INR", paymentMethod: "online", paymentStatus: "captured", shopifySyncStatus: "pending", inventorySyncStatus: "pending", shippingName: "Customer", shippingEmail: "customer@example.com", shippingAddress: "45 Market Road", shippingCity: "Mumbai", shippingState: "Maharashtra", shippingPinCode: "400001", items: [{ name: "Ring", quantity: 1, unitPrice: 4999, lineTotal: 4999, image: "" }], createdAt: new Date() });
    syncCustomerAndShippingDetailsByOrderIdMock.mockResolvedValue({ id: "order_123", totalAmount: 4999, currencyCode: "INR", paymentMethod: "online", paymentStatus: "captured", shopifySyncStatus: "pending", inventorySyncStatus: "pending", shippingName: "Test Customer", shippingEmail: "checkout@example.com", shippingAddress: "12 Rosewood Apartment", shippingCity: "Mumbai", shippingState: "Maharashtra", shippingPinCode: "400001", shippingCountry: "India", items: [{ name: "Ring", quantity: 1, unitPrice: 4999, lineTotal: 4999, image: "" }], createdAt: new Date() });
    syncPaidOrderToShopifyMock.mockResolvedValue({ status: "synced", shopifyOrderId: "shopify_123" });
    attachShopifySyncResultToOrderMock.mockResolvedValue(undefined);
    claimOrderConfirmationEmailSendMock.mockResolvedValue(true);
    markOrderConfirmationEmailSentMock.mockResolvedValue(undefined);
    notifyOrderPaidMock.mockResolvedValue(undefined);
  });

  it("updates guest orders to paid and enriches customer/shipping details from Razorpay before Shopify sync", async () => {
    const { POST } = await import("./route");
    const crypto = await import("node:crypto");
    const expectedSignature = crypto
      .createHmac("sha256", "secret")
      .update("order_123|pay_123")
      .digest("hex");

    const response = await POST(
      new Request("http://localhost/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: "order_123",
          razorpay_payment_id: "pay_123",
          razorpay_signature: expectedSignature,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.verified).toBe(true);
    expect(markOrderPaidByOrderIdMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order_123",
        paymentId: "pay_123",
        paymentStatus: "captured",
      }),
    );
    expect(notifyOrderPaidMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: "Test Customer",
        customerEmail: "checkout@example.com",
        shippingAddress: expect.objectContaining({
          name: "Test Customer",
          email: "checkout@example.com",
          line1: "12 Rosewood Apartment",
          city: "Mumbai",
          state: "Maharashtra",
          pinCode: "400001",
        }),
      }),
    );
    expect(syncPaidOrderToShopifyMock).toHaveBeenCalledWith("order_123");
    expect(payload.status).toBe("paid");
  });
});
