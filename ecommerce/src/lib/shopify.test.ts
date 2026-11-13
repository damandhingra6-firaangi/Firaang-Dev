import { afterEach, describe, expect, it, vi } from "vitest";
import { isShopifyCdnImage, shopifyImageLoader } from "./shopify-image-loader";
import {
  collectionProductsSummaryQuery,
  fetchShopifyGraphQL,
  getProductByHandle,
  getStorefrontProductsForMetadata,
  normalizeCollectionLookupKey,
  resolveCollectionHandleFromList,
} from "./shopify";

describe("collection lookup normalization", () => {
  it("resizes Shopify images at the CDN without using the server optimizer", () => {
    const src = "https://cdn.shopify.com/s/files/example.jpg?v=123";
    const resized = new URL(shopifyImageLoader({ src, width: 640 }));
    expect(resized.hostname).toBe("cdn.shopify.com");
    expect(resized.searchParams.get("v")).toBe("123");
    expect(resized.searchParams.get("width")).toBe("640");
    expect(isShopifyCdnImage("https://cdn.shopify.com.attacker.test/image.jpg")).toBe(false);
    expect(shopifyImageLoader({ src: "/local.jpg", width: 640 })).toBe("/local.jpg");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes titles and handles into a stable key", () => {
    expect(normalizeCollectionLookupKey("Pants")).toBe("pants");
    expect(normalizeCollectionLookupKey("Firaang Original")).toBe("firaang original");
    expect(normalizeCollectionLookupKey("firaang-original")).toBe("firaang original");
  });

  it("matches a collection by title or handle across common naming differences", () => {
    const collections = [
      { handle: "pants", title: "Pants" },
      { handle: "bottomwear", title: "Bottomwear" },
      { handle: "firaang-original", title: "Firaang Original" },
      { handle: "rockstar", title: "Rockstar" },
    ];

    expect(resolveCollectionHandleFromList(collections, "Pants")).toBe("pants");
    expect(resolveCollectionHandleFromList(collections, "bottomwear")).toBe("bottomwear");
    expect(resolveCollectionHandleFromList(collections, "Firaang Original")).toBe("firaang-original");
    expect(resolveCollectionHandleFromList(collections, "rockstar")).toBe("rockstar");
  });

  it("handles invalid or empty collection inputs gracefully", () => {
    const collections = [{ handle: "pants", title: "Pants" }];

    expect(resolveCollectionHandleFromList(collections, "")).toBeNull();
    expect(resolveCollectionHandleFromList(collections, "unknown collection")).toBeNull();
  });

  it("uses a valid Shopify collection sort key for the collection summary query", () => {
    expect(collectionProductsSummaryQuery).toContain("sortKey: CREATED");
    expect(collectionProductsSummaryQuery).not.toContain("sortKey: CREATED_AT");
  });

  it("coalesces and caches repeated public collection metadata requests", async () => {
    process.env.SHOPIFY_STORE_DOMAIN = "collections-test.myshopify.com";
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = "token";
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({
      data: { collections: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getShopifyCollectionsContent } = await import("./shopify-collections");
    await Promise.all([getShopifyCollectionsContent(), getShopifyCollectionsContent()]);
    await getShopifyCollectionsContent();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches one product by handle instead of a catalog-wide query", async () => {
    process.env.SHOPIFY_STORE_DOMAIN = "example-store.myshopify.com";
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = "token";

    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return Response.json({
          data: {
            product: {
              id: "gid://shopify/Product/123",
              handle: "classic-tee",
              title: "Classic Tee",
              productType: "Apparel",
              tags: ["new"],
              publishedAt: "2025-01-01T00:00:00Z",
              description: "A simple tee.",
              featuredImage: { url: "https://cdn.example.com/1.jpg", altText: "Classic Tee" },
              images: { nodes: [{ url: "https://cdn.example.com/1.jpg", altText: "Classic Tee" }] },
              media: { nodes: [] },
              priceRange: { minVariantPrice: { amount: "1000", currencyCode: "INR" } },
              compareAtPriceRange: { minVariantPrice: { amount: "1500", currencyCode: "INR" } },
              options: [{ name: "Size", values: ["S", "M"] }],
              sizeChartJson: null,
              sizeChart: null,
              variants: {
                edges: [
                  {
                    node: {
                      id: "gid://shopify/ProductVariant/1",
                      title: "S",
                      availableForSale: true,
                      image: { url: "https://cdn.example.com/1.jpg", altText: "Classic Tee" },
                      price: { amount: "1000", currencyCode: "INR" },
                      compareAtPrice: { amount: "1500", currencyCode: "INR" },
                      selectedOptions: [{ name: "Size", value: "S" }],
                    },
                  },
                ],
              },
              selectedOrFirstAvailableVariant: {
                id: "gid://shopify/ProductVariant/1",
                title: "S",
                availableForSale: true,
                image: { url: "https://cdn.example.com/1.jpg", altText: "Classic Tee" },
                price: { amount: "1000", currencyCode: "INR" },
                compareAtPrice: { amount: "1500", currencyCode: "INR" },
                selectedOptions: [{ name: "Size", value: "S" }],
              },
            },
          },
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const product = await getProductByHandle("classic-tee");

    expect(product?.handle).toBe("classic-tee");
    expect(product?.name).toBe("Classic Tee");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        "Content-Type": "application/json",
      }),
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.query).toContain("product(handle: $handle)");
  });

  it("surfaces Shopify GraphQL timeout failures without masking the underlying error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed", { cause: Object.assign(new Error(), { code: "ETIMEDOUT" }) });
      }),
    );

    await expect(
      fetchShopifyGraphQL({
        endpoint: "https://example-store.myshopify.com/api/2026-04/graphql.json",
        storefrontAccessToken: "token",
        query: "query { shop { name } }",
        variables: {},
      }),
    ).rejects.toThrow(/ETIMEDOUT|fetch failed|timed out/i);
  });

  it("falls back to local catalog data when metadata Shopify requests time out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed", { cause: Object.assign(new Error(), { code: "ETIMEDOUT" }) });
      }),
    );

    const products = await getStorefrontProductsForMetadata(40, { detailLevel: "summary" });

    expect(products.length).toBeGreaterThan(0);
    expect(products[0]?.name).toBeTruthy();
  });
});
