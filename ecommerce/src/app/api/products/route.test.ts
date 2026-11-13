import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { getProducts } = vi.hoisted(() => ({ getProducts: vi.fn() }));
vi.mock("@/lib/shopify", () => ({ getStorefrontProducts: getProducts }));
vi.mock("@/lib/analytics", () => ({
  parseAttributionCookie: vi.fn(),
  parseGeoFromRequestHeaders: vi.fn(),
  trackAnalyticsEvent: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

describe("catalog upstream failures", () => {
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