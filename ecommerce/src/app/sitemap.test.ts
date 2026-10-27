import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/shopify", () => ({
  getStorefrontProducts: vi.fn(async () => []),
}));

vi.mock("@/lib/product-taxonomy", () => ({
  buildCategoryTree: vi.fn(() => []),
}));

import sitemap from "./sitemap";

describe("site sitemap", () => {
  it("includes the shipping policy route in the static routes list", async () => {
    const entries = await sitemap();
    const shippingPolicyEntry = entries.find((entry) => entry.url.endsWith("/shipping-policy"));

    expect(shippingPolicyEntry).toBeDefined();
    expect(shippingPolicyEntry).toMatchObject({
      url: "https://www.firaang.com/shipping-policy",
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });
});
