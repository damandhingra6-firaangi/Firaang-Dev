import { describe, expect, it } from "vitest";
import { buildShippingOptions } from "./route";

describe("razorpay shipping info endpoint helper", () => {
  it("returns a valid domestic shipping option for a serviceable address", () => {
    const result = buildShippingOptions([
      {
        name: "Aman Sharma",
        address: "12 Market Road",
        city: "Delhi",
        state: "Delhi",
        pincode: "110001",
        country: "IN",
      },
    ], 1499);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      address_index: 0,
      serviceable: true,
      cod_serviceable: true,
      shipping_fee: 0,
      cod_fee: 0,
      label: "Standard Delivery",
    });
  });

  it("returns an unserviceable option for incomplete or invalid addresses", () => {
    const result = buildShippingOptions([
      {
        name: "Aman Sharma",
        address: "12 Market Road",
        city: "Delhi",
        state: "Delhi",
        pincode: "99999",
        country: "IN",
      },
    ], 1499);

    expect(result).toHaveLength(1);
    expect(result[0].serviceable).toBe(false);
    expect(result[0].cod_serviceable).toBe(false);
  });

  it("marks orders above the COD limit as not COD serviceable", () => {
    const result = buildShippingOptions([
      {
        name: "Aman Sharma",
        address: "12 Market Road",
        city: "Delhi",
        state: "Delhi",
        pincode: "110001",
        country: "IN",
      },
    ], 500000);

    expect(result[0].serviceable).toBe(true);
    expect(result[0].cod_serviceable).toBe(false);
  });
});
