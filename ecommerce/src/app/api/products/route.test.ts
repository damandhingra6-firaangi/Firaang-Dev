import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import type { GridProduct } from "@/lib/catalog";

const { getProducts } = vi.hoisted(() => ({ getProducts: vi.fn() }));
vi.mock("@/lib/shopify", () => ({ getStorefrontProducts: getProducts }));
vi.mock("@/lib/analytics", () => ({
  parseAttributionCookie: vi.fn().mockReturnValue({}),
  parseGeoFromRequestHeaders: vi.fn().mockReturnValue({}),
  trackAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => vi.clearAllMocks());

describe("catalog upstream failures", () => {
  it("searches beyond the first 40 products and returns a matching existing product", async () => {
    const ganpati: GridProduct = {
      id: "ganpati", handle: "ganpati-black-oversized-t-shirt", name: "Ganpati Black Oversized T-shirt",
      description: "Cotton print", tags: ["ganesh"], img: "/test.jpg", price: "1099", priceAmount: 1099, oldPrice: "1210", currencyCode: "INR",
    };
    getProducts.mockResolvedValue([
      ...Array.from({ length: 40 }, (_, index) => ({ ...ganpati, id: `other-${index}`, name: "Other Tee", handle: `other-${index}`, tags: [] })),
      ganpati,
    ]);
    const response = await GET(new Request(`https://firaang.com/api/products?search=1&q=${encodeURIComponent(ganpati.name)}`));
    expect(response.status).toBe(200);
    expect(getProducts).toHaveBeenCalledWith(40, { throwOnError: true, allProducts: true });
    const payload = await response.json();
    expect(payload.products).toEqual([ganpati]);
    expect(payload.total).toBe(1);
  });

  it.each([
    { code: "ETIMEDOUT", status: 504 },
    { code: "ECONNRESET", status: 502 },
  ])("returns $status JSON for $code instead of throwing", async ({ code, status }) => {
    getProducts.mockRejectedValue(new TypeError("fetch failed", {
      cause: new AggregateError([Object.assign(new Error(), { code })]),
    }));
    const response = await GET(new Request("https://firaang.com/api/products"));
    expect(response.status).toBe(status);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toHaveProperty("error");
  });
});