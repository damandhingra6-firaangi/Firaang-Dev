import { describe, expect, it, vi } from "vitest";

const mockProducts = [
  {
    id: "p-1",
    handle: "signature-tee",
    name: "Signature Tee",
    publishedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "p-2",
    handle: "jewellery-ring",
    name: "Jewellery Ring",
    publishedAt: "2026-01-02T00:00:00Z",
  },
];

vi.mock("@/lib/shopify", () => ({
  getStorefrontProducts: vi.fn(async () => mockProducts),
}));

vi.mock("@/lib/product-taxonomy", () => ({
  buildCategoryTree: vi.fn(() => [
    {
      slug: "jewellery",
      name: "Jewellery",
      subCategories: [{ slug: "rings", name: "Rings" }],
    },
    {
      slug: "menswear",
      name: "Menswear",
      subCategories: [{ slug: "tees", name: "Tees" }],
    },
  ]),
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

  it("omits noindex category routes and only includes canonical product/category URLs", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://www.firaang.com/products");
    expect(urls).not.toContain("https://www.firaang.com/product");
    expect(urls).not.toContain("https://www.firaang.com/shop/jewellery");
    expect(urls).not.toContain("https://www.firaang.com/shop/jewellery/rings");
    expect(urls).toContain("https://www.firaang.com/shop/menswear");
    expect(urls).toContain("https://www.firaang.com/shop/menswear/tees");
    expect(urls).toContain("https://www.firaang.com/products/signature-tee");
    expect(urls).not.toContain("https://www.firaang.com/products/jewellery-ring");
    expect(urls.some((url) => new URL(url).pathname.startsWith("/product/"))).toBe(false);
  });
});
