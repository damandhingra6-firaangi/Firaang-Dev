import { describe, expect, it } from "vitest";
import {
  getSelectedOptionValue,
  isOptionAvailableForSelection,
  isProductSelectionComplete,
  isSizeOption,
  optionMatchesSelection,
} from "./variant-options";

describe("isOptionAvailableForSelection", () => {
  it("keeps fallback size options enabled when the product has no variants", () => {
    const variants: Array<{ availableForSale: boolean; options: Array<{ name: string; value: string }> }> = [];

    expect(isOptionAvailableForSelection({
      variants,
      selectedOptions: {},
      optionName: "Size",
      optionValue: "M",
    })).toBe(true);
  });

  it("disables unavailable variant combinations while allowing a valid matching selection", () => {
    const variants = [
      {
        availableForSale: true,
        options: [
          { name: "Color", value: "Black" },
          { name: "Size", value: "S" },
        ],
      },
      {
        availableForSale: true,
        options: [
          { name: "Color", value: "White" },
          { name: "Size", value: "M" },
        ],
      },
    ];

    expect(isOptionAvailableForSelection({
      variants,
      selectedOptions: { Color: "Black" },
      optionName: "Size",
      optionValue: "S",
    })).toBe(true);

    expect(isOptionAvailableForSelection({
      variants,
      selectedOptions: { Color: "Black" },
      optionName: "Size",
      optionValue: "M",
    })).toBe(false);
  });

  it("recognizes size-like option names and resolves the current selection even when the storefront label is not exactly 'Size'", () => {
    expect(isSizeOption("Size / Fit")).toBe(true);
    expect(isSizeOption(" Sizes ")).toBe(true);

    expect(getSelectedOptionValue({ "Size / Fit": "M" }, "Size / Fit", "Size", "Sizes")).toBe("M");
    expect(getSelectedOptionValue({ "sizes": "S" }, "Size / Fit", "Size", "Sizes")).toBe("S");
  });

  it("matches Shopify option names by normalized label so size selections work across aliases like 'Size / Fit' and 'sizes'", () => {
    const variants = [
      {
        availableForSale: true,
        options: [
          { name: "Size / Fit", value: "M" },
          { name: "Color", value: "Black" },
        ],
      },
      {
        availableForSale: true,
        options: [
          { name: "sizes", value: "L" },
          { name: "Colour", value: "White" },
        ],
      },
    ];

    expect(optionMatchesSelection({
      variantOptions: variants[0].options,
      selectedOptions: { "sizes": "M", "Colour": "Black" },
    })).toBe(true);

    expect(isOptionAvailableForSelection({
      variants,
      selectedOptions: { "Size / Fit": "M" },
      optionName: "sizes",
      optionValue: "L",
    })).toBe(true);
  });

  it("requires a selected size before a product can be added from a quick-add drawer", () => {
    const product = {
      optionGroups: [{ name: "Size", values: ["S", "M", "L"] }],
    };

    expect(isProductSelectionComplete(product, {})).toBe(false);
    expect(isProductSelectionComplete(product, { Size: "M" })).toBe(true);
  });
});
