import { describe, expect, it } from "vitest";
import { getDisplayPricing } from "./pricing-display";

describe("inclusive display pricing", () => {
  it("adds the fixed selling-price increment to product and compare-at prices", () => {
    expect(getDisplayPricing({ priceAmount: 1199, compareAt: 1799 })).toMatchObject({
      priceAmount: 1299,
      compareAtAmount: 1899,
    });
  });
});
