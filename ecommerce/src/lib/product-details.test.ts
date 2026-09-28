import { describe, expect, it } from "vitest";
import { GridProduct } from "./catalog";
import { buildProductDetailSpecs, resolveProductAttributeFamily } from "./product-details";

function createProduct(overrides: Partial<GridProduct>): GridProduct {
  return {
    id: "test-product",
    name: "Test Product",
    price: "₹999",
    priceAmount: 999,
    currencyCode: "INR",
    oldPrice: "",
    img: "/test.jpg",
    description: "",
    ...overrides,
  };
}

function getDetailLabels(product: GridProduct) {
  return buildProductDetailSpecs(product).map((spec) => spec.label);
}

describe("resolveProductAttributeFamily", () => {
  it("classifies core product families from existing taxonomy fields", () => {
    expect(resolveProductAttributeFamily(createProduct({ name: "Classic Tee", category: "T-Shirts" }))).toBe("topwear");
    expect(resolveProductAttributeFamily(createProduct({ name: "Urban Joggers", category: "Bottomwear" }))).toBe("bottomwear");
    expect(resolveProductAttributeFamily(createProduct({ name: "Evening Dress", category: "Dresses" }))).toBe("dresses");
  });
});

describe("buildProductDetailSpecs", () => {
  it("shows neck and sleeve details for t-shirts", () => {
    const product = createProduct({
      name: "Classic T-Shirt",
      category: "T-Shirts",
      productType: "T-Shirt",
      tags: ["material: cotton", "fit: regular fit", "pattern: solid", "sleeve type: half sleeves", "neck type: round neck"],
    });

    const specs = buildProductDetailSpecs(product);

    expect(specs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Sleeve Type", value: "half sleeves" }),
        expect.objectContaining({ label: "Neck Type", value: "round neck" }),
      ]),
    );
  });

  it("shows neck and sleeve details for shirts", () => {
    const product = createProduct({
      name: "Oxford Shirt",
      category: "Half-Shirts",
      productType: "Shirt",
      tags: ["material: linen", "fit: slim fit", "sleeve type: long sleeves", "neck type: collared neck"],
    });

    const specs = buildProductDetailSpecs(product);

    expect(specs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Sleeve Type", value: "long sleeves" }),
        expect.objectContaining({ label: "Neck Type", value: "collared neck" }),
      ]),
    );
  });

  it("shows neck and sleeve details for hoodies when tags provide them", () => {
    const product = createProduct({
      name: "Street Hoodie",
      category: "Hoodies",
      productType: "Hoodie",
      tags: ["material: fleece", "fit: oversized", "sleeve type: full sleeves", "neck type: hooded neck"],
    });

    const specs = buildProductDetailSpecs(product);

    expect(specs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Sleeve Type", value: "full sleeves" }),
        expect.objectContaining({ label: "Neck Type", value: "hooded neck" }),
      ]),
    );
  });

  it("never shows neck or sleeve details for joggers", () => {
    const product = createProduct({
      name: "Urban Joggers",
      category: "Bottomwear",
      productType: "Joggers",
      tags: ["material: cotton", "waistband: elastic waistband", "rise: mid rise", "pockets: side pockets"],
    });

    const labels = getDetailLabels(product);

    expect(labels).toContain("Waistband / Waist Type");
    expect(labels).toContain("Rise");
    expect(labels).not.toContain("Neck Type");
    expect(labels).not.toContain("Sleeve Type");
  });

  it("never shows neck or sleeve details for pants", () => {
    const product = createProduct({
      name: "Tailored Pants",
      category: "Bottomwear",
      productType: "Pants",
      tags: ["material: twill", "closure: zip closure", "length: full length", "pockets: two pockets"],
    });

    const labels = getDetailLabels(product);

    expect(labels).not.toContain("Neck Type");
    expect(labels).not.toContain("Sleeve Type");
  });

  it("never shows neck or sleeve details for shorts", () => {
    const product = createProduct({
      name: "Athletic Shorts",
      category: "Bottomwear",
      productType: "Shorts",
      tags: ["material: polyester", "waist type: drawstring waistband", "length: knee length"],
    });

    const labels = getDetailLabels(product);

    expect(labels).not.toContain("Neck Type");
    expect(labels).not.toContain("Sleeve Type");
  });

  it("never shows neck or sleeve details for cargo pants even with noisy tags", () => {
    const product = createProduct({
      name: "Utility Cargo Pants",
      category: "Bottomwear",
      productType: "Cargo Pants",
      tags: ["material: cotton twill", "pockets: six pockets", "waistband: elastic waistband", "neck type: round neck", "sleeve type: full sleeves"],
    });

    const labels = getDetailLabels(product);

    expect(labels).toContain("Pockets");
    expect(labels).toContain("Waistband / Waist Type");
    expect(labels).not.toContain("Neck Type");
    expect(labels).not.toContain("Sleeve Type");
  });
});