import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStorefrontProductsMock } = vi.hoisted(() => ({
  getStorefrontProductsMock: vi.fn(),
}));

vi.mock("@/lib/shopify", () => ({
  getStorefrontProducts: getStorefrontProductsMock,
}));

import { getCatalogProducts, resolveCheckoutItems } from "./products";

describe("getCatalogProducts and resolveCheckoutItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests full product data for product detail pages so variants and gallery media are available", async () => {
    getStorefrontProductsMock.mockResolvedValue([]);

    await getCatalogProducts(250, { cacheMode: "no-store", detailLevel: "full" });

    expect(getStorefrontProductsMock).toHaveBeenCalledWith(250, {
      cacheMode: "no-store",
      detailLevel: "full",
    });
  });

  it("uses a full catalog lookup when validating variant-based cart items", async () => {
    const productId = "gid://shopify/Product/8965703598251";
    const variantId = "gid://shopify/ProductVariant/48483609018539";
    const catalog = [
      {
        id: productId,
        handle: "gold-ring",
        name: "Gold Ring",
        price: "₹4,999",
        priceAmount: 4999,
        currencyCode: "INR",
        oldPrice: "₹5,999",
        img: "https://example.com/ring.jpg",
        category: "jewellery",
        categorySlug: "jewellery",
        subCategory: "rings",
        subCategorySlug: "rings",
        audience: "women",
        audienceSlug: "women",
        fit: "classic",
        productType: "Ring",
        tags: ["gold"],
        description: "A classic ring",
        galleryImages: [],
        productMedia: [],
        optionGroups: [],
        sizeChart: undefined,
        variants: [{ id: variantId, name: "M", availableForSale: true, img: "https://example.com/ring-m.jpg", price: "₹4,999", priceAmount: 4999, currencyCode: "INR", oldPrice: "₹5,999", options: [{ name: "Size", value: "M" }] }],
      },
    ] as unknown as Awaited<ReturnType<typeof getStorefrontProductsMock>>;

    getStorefrontProductsMock.mockResolvedValue(catalog);

    const result = await resolveCheckoutItems([{ productId: variantId, quantity: 1 }]);

    expect(getStorefrontProductsMock).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ detailLevel: "full" }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.product.id).toBe(variantId);
    expect(result.staleProductIds).toEqual([]);
  });

  it("treats old numeric Shopify IDs and current GIDs as the same cart item", async () => {
    const productId = "gid://shopify/Product/8965703598251";
    const legacyNumericId = "8965703598251";
    const catalog = [
      {
        id: productId,
        handle: "gold-ring",
        name: "Gold Ring",
        price: "₹4,999",
        priceAmount: 4999,
        currencyCode: "INR",
        oldPrice: "₹5,999",
        img: "https://example.com/ring.jpg",
        category: "jewellery",
        categorySlug: "jewellery",
        subCategory: "rings",
        subCategorySlug: "rings",
        audience: "women",
        audienceSlug: "women",
        fit: "classic",
        productType: "Ring",
        tags: ["gold"],
        description: "A classic ring",
        galleryImages: [],
        productMedia: [],
        optionGroups: [],
        sizeChart: undefined,
        variants: [],
      },
    ] as unknown as Awaited<ReturnType<typeof getStorefrontProductsMock>>;

    getStorefrontProductsMock.mockResolvedValue(catalog);

    const result = await resolveCheckoutItems([{ productId: legacyNumericId, quantity: 1 }]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.product.id).toBe(productId);
    expect(result.staleProductIds).toEqual([]);
  });

  it("fetches enough products to avoid false stale-cart rejections for valid catalog items beyond the first page", async () => {
    const productId = "gid://shopify/Product/8965703598251";
    const catalog = [
      {
        id: productId,
        handle: "gold-ring",
        name: "Gold Ring",
        price: "₹4,999",
        priceAmount: 4999,
        currencyCode: "INR",
        oldPrice: "₹5,999",
        img: "https://example.com/ring.jpg",
        category: "jewellery",
        categorySlug: "jewellery",
        subCategory: "rings",
        subCategorySlug: "rings",
        audience: "women",
        audienceSlug: "women",
        fit: "classic",
        productType: "Ring",
        tags: ["gold"],
        description: "A classic ring",
        galleryImages: [],
        productMedia: [],
        optionGroups: [],
        sizeChart: undefined,
        variants: [],
      },
    ] as unknown as Awaited<ReturnType<typeof getStorefrontProductsMock>>;

    getStorefrontProductsMock.mockResolvedValue(catalog);

    const result = await resolveCheckoutItems([{ productId, quantity: 1 }]);

    expect(getStorefrontProductsMock).toHaveBeenCalledWith(expect.any(Number), expect.any(Object));
    expect(getStorefrontProductsMock.mock.calls[0][0]).toBeGreaterThanOrEqual(250);
    expect(result.items).toHaveLength(1);
    expect(result.staleProductIds).toEqual([]);
  });
});
