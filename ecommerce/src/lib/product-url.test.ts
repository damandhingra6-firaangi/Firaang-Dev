import { describe, expect, it } from "vitest";
import { getProductUrl, getShopifyMerchantItemId, resolveShopifyProductUrl } from "./product-url";

describe("resolveShopifyProductUrl", () => {
  it("redirects legacy detail URLs while preserving variants and tracking", () => {
    const result = resolveShopifyProductUrl(
      new URL(
        "https://www.firaang.com/product/ganesh-coffee-oversized-t-shirt?variant=47751340982443&utm_source=google",
      ),
    );

    expect(result?.toString()).toBe(
      "https://www.firaang.com/products/ganesh-coffee-oversized-t-shirt?variant=47751340982443&utm_source=google",
    );
  });

  it("handles collection-scoped product paths and bare URLs", () => {
    expect(resolveShopifyProductUrl(new URL("https://www.firaang.com/collections/tees/products/signature-tee/"))?.toString()).toBe(
      "https://www.firaang.com/products/signature-tee",
    );
  });

  it("ignores non-Shopify product paths", () => {
    expect(resolveShopifyProductUrl(new URL("https://www.firaang.com/products/signature-tee?variant=123"))).toBeNull();
    expect(resolveShopifyProductUrl(new URL("https://www.firaang.com/products"))).toBeNull();
  });

  it("preserves encoded slugs without renaming them", () => {
    expect(resolveShopifyProductUrl(new URL("https://www.firaang.com/product/tee-%F0%9F%8E%80/"))?.pathname).toBe(
      "/products/tee-%F0%9F%8E%80",
    );
  });

  it("generates clean canonical links for product feeds", () => {
    expect(getProductUrl("https://www.firaang.com/", "firaang-baby-black-tee")).toBe(
      "https://www.firaang.com/products/firaang-baby-black-tee",
    );
  });
});

describe("getShopifyMerchantItemId", () => {
  it("matches the Shopify Google & YouTube app item id format", () => {
    expect(getShopifyMerchantItemId("in", "8816901718187", "47751340982443")).toBe("shopify_IN_8816901718187_47751340982443");
  });
});
