import { describe, expect, it } from "vitest";
import { isOptionAvailableForSelection } from "./variant-options";

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
});
