import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.fn();
const getAccountSessionTokenFromCookiesMock = vi.fn();
const getOrderForSessionOrAccessTokenMock = vi.fn();
const claimMetaPixelPurchaseEventMock = vi.fn();
const saveOrderMetaMarketingConsentMock = vi.fn();
const sendMetaPurchaseConversionMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/account-session", () => ({
  getAccountSessionTokenFromCookies: getAccountSessionTokenFromCookiesMock,
}));

vi.mock("@/lib/account-data", () => ({
  claimMetaPixelPurchaseEvent: claimMetaPixelPurchaseEventMock,
  getOrderForSessionOrAccessToken: getOrderForSessionOrAccessTokenMock,
  saveOrderMetaMarketingConsent: saveOrderMetaMarketingConsentMock,
}));

vi.mock("@/lib/meta-conversions", () => ({
  sendMetaPurchaseConversion: sendMetaPurchaseConversionMock,
}));

describe("Meta browser Purchase claim route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({ get: () => ({ value: "order_123" }) });
    getAccountSessionTokenFromCookiesMock.mockResolvedValue(null);
    getOrderForSessionOrAccessTokenMock.mockResolvedValue({
      id: "order_123",
      status: "paid",
      paymentStatus: "captured",
    });
    claimMetaPixelPurchaseEventMock.mockResolvedValue({
      orderId: "order_123",
      eventId: "purchase:order_123",
      currencyCode: "INR",
      value: 1499,
      couponCode: undefined,
      items: [{ productId: "ring_1", name: "Ring", unitPrice: 1499, quantity: 1 }],
    });
    sendMetaPurchaseConversionMock.mockResolvedValue({ status: "sent" });
    saveOrderMetaMarketingConsentMock.mockResolvedValue(undefined);
  });

  it("returns a purchase only for a captured order and claims repeated page visits once", async () => {
    claimMetaPixelPurchaseEventMock
      .mockResolvedValueOnce({
        orderId: "order_123",
        eventId: "purchase:order_123",
        currencyCode: "INR",
        value: 1499,
        items: [{ productId: "ring_1", name: "Ring", unitPrice: 1499, quantity: 1 }],
      })
      .mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const request = () =>
      new Request("https://firaang.example/api/orders/order_123/meta-purchase", {
        method: "POST",
        headers: { cookie: "Firaang_meta_marketing_consent=granted" },
      });

    const firstResponse = await POST(request(), { params: Promise.resolve({ orderId: "order_123" }) });
    const firstPayload = await firstResponse.json();
    const secondResponse = await POST(request(), { params: Promise.resolve({ orderId: "order_123" }) });
    const secondPayload = await secondResponse.json();

    expect(firstPayload).toMatchObject({
      tracked: true,
      eventId: "purchase:order_123",
      transactionId: "order_123",
      currencyCode: "INR",
      value: 1499,
      items: [{ item_id: "ring_1", item_name: "Ring", quantity: 1 }],
    });
    expect(secondPayload).toEqual({ tracked: false });
    expect(claimMetaPixelPurchaseEventMock).toHaveBeenCalledTimes(2);
    expect(sendMetaPurchaseConversionMock).toHaveBeenCalledTimes(1);
  });

  it("does not claim pending orders or track when the user opted out", async () => {
    const { POST } = await import("./route");

    getOrderForSessionOrAccessTokenMock.mockResolvedValueOnce({
      id: "order_123",
      status: "pending",
      paymentStatus: "created",
    });
    const pendingResponse = await POST(
      new Request("https://firaang.example/api/orders/order_123/meta-purchase", {
        method: "POST",
        headers: { cookie: "Firaang_meta_marketing_consent=granted" },
      }),
      { params: Promise.resolve({ orderId: "order_123" }) },
    );

    expect(await pendingResponse.json()).toEqual({ tracked: false });
    expect(claimMetaPixelPurchaseEventMock).not.toHaveBeenCalled();

    const optedOutResponse = await POST(
      new Request("https://firaang.example/api/orders/order_123/meta-purchase", {
        method: "POST",
        headers: {
          cookie: "Firaang_meta_marketing_consent=granted",
          "sec-gpc": "1",
        },
      }),
      { params: Promise.resolve({ orderId: "order_123" }) },
    );

    expect(await optedOutResponse.json()).toEqual({ tracked: false });
    expect(getOrderForSessionOrAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(claimMetaPixelPurchaseEventMock).not.toHaveBeenCalled();
  });
});
