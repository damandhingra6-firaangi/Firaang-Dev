import { describe, expect, it } from "vitest";
import {
  DEFAULT_ITEM_WEIGHT_KG,
  HIGH_LOGISTICS_SURCHARGE_INR,
  calculateAirShippingFee,
  calculateCheckoutPricing,
  calculateCodFee,
  calculateShippingFee,
  calculateSurfaceShippingFee,
  estimateOrderWeightKg,
  isHighLogisticsState,
  resolveLineItemWeightKg,
} from "./checkout-config";

describe("surface shipping tiers", () => {
  it("calculates boundary slabs correctly", () => {
    expect(calculateSurfaceShippingFee(0.5)).toBe(65);
    expect(calculateSurfaceShippingFee(1)).toBe(95);
    expect(calculateSurfaceShippingFee(2)).toBe(126);
    expect(calculateSurfaceShippingFee(3)).toBe(170);
    expect(calculateSurfaceShippingFee(4)).toBe(214);
    expect(calculateSurfaceShippingFee(5)).toBe(223);
    expect(calculateSurfaceShippingFee(9)).toBe(356);
    expect(calculateSurfaceShippingFee(10)).toBe(356);
    expect(calculateSurfaceShippingFee(19)).toBe(652);
    expect(calculateSurfaceShippingFee(20)).toBe(652);
  });

  it("applies incremental pricing for decimal weights", () => {
    expect(calculateSurfaceShippingFee(5.01)).toBe(267);
    expect(calculateSurfaceShippingFee(8.2)).toBe(399);
    expect(calculateSurfaceShippingFee(10.01)).toBe(394);
    expect(calculateSurfaceShippingFee(18.4)).toBe(698);
    expect(calculateSurfaceShippingFee(20.2)).toBe(686);
  });
});

describe("air shipping", () => {
  it("calculates base and additional-kilo pricing", () => {
    expect(calculateAirShippingFee(0.5)).toBe(75);
    expect(calculateAirShippingFee(0.51)).toBe(140);
    expect(calculateAirShippingFee(1.5)).toBe(140);
    expect(calculateAirShippingFee(1.51)).toBe(205);
  });
});

describe("cod fee", () => {
  it("keeps cash-on-delivery fee at zero for the free-shipping contract", () => {
    expect(calculateCodFee(0)).toBe(0);
    expect(calculateCodFee(2000)).toBe(0);
    expect(calculateCodFee(2001)).toBe(0);
    expect(calculateCodFee(4000)).toBe(0);
  });
});

describe("high logistics surcharge", () => {
  it("does not add any surcharge under the free standard shipping contract", () => {
    expect(isHighLogisticsState("Sikkim")).toBe(true);
    expect(isHighLogisticsState("Jammu and Kashmir")).toBe(true);
    expect(isHighLogisticsState("Maharashtra")).toBe(false);

    const withSurcharge = calculateShippingFee({
      orderWeightKg: 0.5,
      shippingMethod: "surface",
      shippingState: "Sikkim",
    });
    expect(withSurcharge.baseShippingFee).toBe(0);
    expect(withSurcharge.regionSurchargeFee).toBe(0);
    expect(withSurcharge.shippingFee).toBe(0);
    expect(withSurcharge.shippingLabel).toBe("Standard Delivery");
  });
});

describe("weight estimation", () => {
  it("uses explicit weight when present", () => {
    expect(resolveLineItemWeightKg({ weightKg: 0.8 })).toBe(0.8);
  });

  it("extracts weight from tags", () => {
    expect(resolveLineItemWeightKg({ tags: ["weight:0.75kg"] })).toBe(0.75);
    expect(resolveLineItemWeightKg({ tags: ["shipping_weight_450g"] })).toBe(0.45);
  });

  it("falls back to default weight", () => {
    expect(resolveLineItemWeightKg({ tags: [] })).toBe(DEFAULT_ITEM_WEIGHT_KG);
  });

  it("sums weighted quantities", () => {
    const total = estimateOrderWeightKg([
      { quantity: 2, weightKg: 0.5 },
      { quantity: 3, tags: ["weight:250g"] },
    ]);

    expect(total).toBe(1.75);
  });
});

describe("checkout pricing", () => {
  it("forces free standard delivery and zero cod fee", () => {
    const pricing = calculateCheckoutPricing({
      subtotalAmount: 2100,
      shippingState: "Sikkim",
      shippingMethod: "surface",
      lineItems: [{ quantity: 1, weightKg: 0.5 }],
      paymentMethod: "cod",
      validatedCoupon: {
        code: "TEST100",
        label: "Test",
        description: "test",
        discountAmount: 100,
      },
    });

    expect(pricing.baseShippingFee).toBe(0);
    expect(pricing.regionSurchargeFee).toBe(0);
    expect(pricing.shippingFee).toBe(0);
    expect(pricing.shippingLabel).toBe("Standard Delivery");
    expect(pricing.codFee).toBe(0);
    expect(pricing.totalAmount).toBe(2000);
  });

  it("keeps shipping pending without state", () => {
    const pricing = calculateCheckoutPricing({
      subtotalAmount: 1000,
      lineItems: [{ quantity: 1 }],
    });

    expect(pricing.shippingStatus).toBe("pending");
    expect(pricing.shippingFee).toBe(0);
    expect(pricing.totalAmount).toBe(1000);
  });

  it("uses the free standard delivery label when shipping is resolved", () => {
    const pricing = calculateCheckoutPricing({
      subtotalAmount: 1500,
      shippingState: "Maharashtra",
      shippingMethod: "air",
      lineItems: [{ quantity: 1, weightKg: 1.2 }],
    });

    expect(pricing.shippingMethod).toBe("air");
    expect(pricing.shippingFee).toBe(0);
    expect(pricing.shippingLabel).toBe("Standard Delivery");
    expect(pricing.totalAmount).toBe(1500);
  });
});
