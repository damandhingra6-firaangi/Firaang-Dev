import { describe, expect, it } from "vitest";
import { getProtectedLaunchPriceAmount, isTShirtTaxonomy } from "./retail-pricing";

describe("retail pricing launch helper", () => {
  it("identifies t-shirt products from taxonomy context", () => {
    expect(
      isTShirtTaxonomy({
        category: "T-Shirts",
        subCategory: "Graphic T-Shirts",
        productType: "T-Shirt",
        title: "Rockstar Graphic Tee",
      }),
    ).toBe(true);

    expect(
      isTShirtTaxonomy({
        category: "Dresses",
        subCategory: "Evening Gown",
        productType: "Dress",
        title: "Evening Gown",
      }),
    ).toBe(false);
  });

  it("keeps the Shopify base price unchanged", () => {
    expect(getProtectedLaunchPriceAmount(999)).toBe(999);
    expect(getProtectedLaunchPriceAmount(1299)).toBe(1299);
  });
});