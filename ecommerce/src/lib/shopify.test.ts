import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectionProductsSummaryQuery,
  fetchShopifyGraphQL,
  getProductByHandle,
  getStorefrontProductsForMetadata,
  normalizeCollectionLookupKey,
  resolveCollectionHandleFromList,
} from "./shopify";

describe("collection lookup normalization", () => {
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

  it("fetches one product by handle instead of a catalog-wide query", async () => {
    process.env.SHOPIFY_STORE_DOMAIN = "example-store.myshopify.com";
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = "token";

    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return {
        ok: true,
        json: async () => ({
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
        }),
      };
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
        throw new Error("fetch failed [cause]: AggregateError: ETIMEDOUT");
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
        throw new Error("fetch failed [cause]: AggregateError: ETIMEDOUT");
      }),
    );

    const products = await getStorefrontProductsForMetadata(40, { detailLevel: "summary" });

    expect(products.length).toBeGreaterThan(0);
    expect(products[0]?.name).toBeTruthy();
  });
});
