import { describe, expect, it } from "vitest";
import type { GridProduct } from "./catalog";
import { applyProductFilters, deriveProductTaxonomy, isCanonicalProductCategory } from "./product-taxonomy";

const ganpati: GridProduct = {
  id: "ganpati",
  handle: "ganpati-black-oversized-t-shirt",
  name: "Ganpati Black Oversized T-shirt",
  description: "<p>Premium cotton devotional print.</p>",
  tags: ["ganesh", "streetwear"],
  category: "T-Shirts",
  subCategory: "Devotional",
  price: "1099",
  priceAmount: 1099,
  currencyCode: "INR",
  oldPrice: "1210",
  img: "https://cdn.shopify.com/test.jpg",
  optionGroups: [{ name: "Size", values: ["S", "XL"] }],
};

describe("catalog search matching", () => {
  it.each([
    "Ganpati Black Oversized T-shirt",
    "Ganpati", "Black", "Oversized",
    "GANPATI BLACK", "black ganpati", "Oversized Ganpati",
    "ganpati-black-oversized-t-shirt", "ganesh", "cotton", "Ganpati XL",
  ])("matches %s", (q) => {
    expect(applyProductFilters([ganpati], { q })).toEqual([ganpati]);
  });

  it("requires every keyword, keeps category filters, and prioritizes exact titles", () => {
    const descriptionMatch = { ...ganpati, id: "other", name: "Other Tee", description: ganpati.name };
    expect(applyProductFilters([ganpati], { q: "Ganpati nonexistent" })).toEqual([]);
    expect(applyProductFilters([ganpati], { q: "Ganpati", category: "Hoodies" })).toEqual([]);
    expect(applyProductFilters([descriptionMatch, ganpati], { q: ganpati.name })[0]).toBe(ganpati);
  });
});

describe("homepage merchandising categories", () => {
  it.each(["Hoodies", "Full-Sleeve T-shirt", "Bottomwear", "Half-Shirts", "T-Shirts", "Dresses", "Ethnic Wear", "Jewelry", "Caps", "Sweatshirts"])("keeps the existing canonical category %s", (category) => {
    expect(isCanonicalProductCategory(category)).toBe(true);
  });

  it("does not promote raw fallback product types into carousel categories", () => {
    expect(isCanonicalProductCategory("clothing")).toBe(false);
    expect(isCanonicalProductCategory("Catalog")).toBe(false);
    expect(isCanonicalProductCategory("t-shirts")).toBe(true);
    const taxonomy = deriveProductTaxonomy({
      title: "Firaang Signature Black Crop Top",
      productType: "clothing",
      tags: ["BabyTeeTrend", "Cotton", "Crop Top", "CropTop", "CropTopTrend", "Firaang", "plain", "Signature"],
    });
    expect(taxonomy.category).toBe("clothing");
    expect(taxonomy.categorySlug).toBe("clothing");
  });
});