import { describe, expect, it } from "vitest";
import { parseGoogleAdsConversionHandoff } from "./google-ads-conversion-handoff";

describe("parseGoogleAdsConversionHandoff", () => {
  it("accepts a same-origin order success destination without query parameters", () => {
    const handoff = parseGoogleAdsConversionHandoff(
      JSON.stringify({
        redirectTarget: "/order-success/order-123",
        transactionId: "order-123",
        currencyCode: "INR",
        value: 2500,
      }),
      "https://www.firaang.com",
    );

    expect(handoff).toEqual({
      redirectTarget: "/order-success/order-123",
      transactionId: "order-123",
      currencyCode: "INR",
      value: 2500,
    });
  });

  it.each([
    "https://example.com/order-success/order-123",
    "/order-success/order-123?orderId=order-123",
    "/shop",
  ])("rejects an invalid redirect destination: %s", (redirectTarget) => {
    const handoff = parseGoogleAdsConversionHandoff(
      JSON.stringify({
        redirectTarget,
        transactionId: "order-123",
        currencyCode: "INR",
        value: 2500,
      }),
      "https://www.firaang.com",
    );

    expect(handoff).toBeNull();
  });

  it("rejects a missing or malformed handoff", () => {
    expect(parseGoogleAdsConversionHandoff(null, "https://www.firaang.com")).toBeNull();
    expect(parseGoogleAdsConversionHandoff("{", "https://www.firaang.com")).toBeNull();
  });
});
