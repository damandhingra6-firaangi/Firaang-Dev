import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStorefrontProductsMock } = vi.hoisted(() => ({
  getStorefrontProductsMock: vi.fn(),
}));

vi.mock("@/lib/shopify", () => ({
  getStorefrontProducts: getStorefrontProductsMock,
}));

import { resolveCheckoutItems } from "./products";

describe("resolveCheckoutItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
