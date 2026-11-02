import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectionProductsSummaryQuery,
  fetchShopifyGraphQL,
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
});
