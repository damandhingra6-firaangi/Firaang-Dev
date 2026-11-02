import { beforeEach, describe, expect, it, vi } from "vitest";

const findOrderWithCustomerByOrderIdMock = vi.fn();

vi.mock("@/lib/account-data", () => ({
  findOrderWithCustomerByOrderId: findOrderWithCustomerByOrderIdMock,
  normalizePhoneNumber: (phone: string) => {
    const raw = (phone ?? "").trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    if (raw.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
    return "";
  },
  updateInventorySyncStatusByOrderId: vi.fn(),
}));

describe("syncPaidOrderToShopify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHOPIFY_STORE_DOMAIN = "example.myshopify.com";
    process.env.SHOPIFY_ADMIN_API_VERSION = "2025-01";
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = "token";
  });

  it("reuses an existing Shopify customer when the create call hits a duplicate email error", async () => {
    findOrderWithCustomerByOrderIdMock.mockResolvedValue({
      order: {
        id: "order_123",
        paymentMethod: "online",
        currencyCode: "INR",
        shippingFee: 0,
        taxAmount: 0,
        discountAmount: 0,
        shippingLabel: "Shipping",
        shippingMethod: "surface",
        couponCode: undefined,
        shopifyOrderId: undefined,
        shopifySyncStatus: "pending",
        shippingName: "Test Customer",
        shippingEmail: "test@example.com",
        shippingPhone: "+91 9876543210",
        shippingAddress: "12 Rosewood Apartment",
        shippingCity: "Mumbai",
        shippingState: "Maharashtra",
        shippingPinCode: "400001",
        shippingCountry: "India",
        items: [{ name: "Ring", quantity: 1, unitPrice: 4999, lineTotal: 4999, image: "", productId: "gid://shopify/ProductVariant/1" }],
        subtotalAmount: 4999,
        totalAmount: 4999,
      },
      customer: null,
    });

    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/customers/search.json")) {
        const query = new URL(url).searchParams.get("query") ?? "";
        if (query.includes("test@example.com") || query.includes("email:test@example.com")) {
          return new Response(JSON.stringify({ customers: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (query.includes("+919876543210") || query.includes("phone:+919876543210")) {
          return new Response(JSON.stringify({ customers: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      }

      if (url.includes("/customers.json") && url.includes("limit=250")) {
        return new Response(JSON.stringify({ customers: [{ id: 987, email: "test@example.com", phone: "+919876543210" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/customers.json")) {
        return new Response(JSON.stringify({ errors: { customer: { email_address: ["has already been taken"] } } }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/orders.json")) {
        return new Response(JSON.stringify({ order: { id: 9001, admin_graphql_api_id: "gid://shopify/Order/9001" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { syncPaidOrderToShopify } = await import("./shopify-admin");
    const result = await syncPaidOrderToShopify("order_123");

    expect(result.status).toBe("synced");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.myshopify.com/admin/api/2025-01/customers/search.json?query=email%3Atest%40example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Shopify-Access-Token": "token",
        }),
      }),
    );

    const orderCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/orders.json"));
    expect(orderCall).toBeDefined();
    const orderBody = JSON.parse(String(orderCall?.[1]?.body));
    expect(orderBody.order.customer).toEqual({ id: 987 });
  });
});
