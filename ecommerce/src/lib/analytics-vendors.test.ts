import { afterEach, describe, expect, it, vi } from "vitest";
import {
  trackGoogleAdsConversion,
  trackVendorPageView,
  trackVendorPurchase,
} from "./analytics-vendors";
import { normalizeGoogleAdsConversionId } from "./google-ads-config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("trackVendorPageView", () => {
  it("skips sending when Do Not Track is enabled", () => {
    const originalWindow = globalThis.window;
    const originalNavigator = globalThis.navigator;
    const gtag = vi.fn();
    const fbq = vi.fn();

    Object.defineProperty(globalThis, "window", {
      value: {
        doNotTrack: "1",
        gtag,
        fbq,
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "1" },
      configurable: true,
      writable: true,
    });

    try {
      trackVendorPageView({ pagePath: "/test" });
      expect(gtag).not.toHaveBeenCalled();
      expect(fbq).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });
});

describe("normalizeGoogleAdsConversionId", () => {
  it("accepts numeric and AW-prefixed conversion IDs", () => {
    expect(normalizeGoogleAdsConversionId("18514353008")).toBe("AW-18514353008");
    expect(normalizeGoogleAdsConversionId(" AW-18514353008 ")).toBe("AW-18514353008");
    expect(normalizeGoogleAdsConversionId("invalid")).toBeUndefined();
  });
});

describe("trackVendorPurchase", () => {
  it("preserves purchase events and prevents the conversion page from duplicating Ads tracking", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID", "18514353008");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL", "conversion-label");
    const originalWindow = globalThis.window;
    const originalNavigator = globalThis.navigator;
    const storedEvents = new Map<string, string>();
    const gtag = vi.fn();
    const fbq = vi.fn();

    Object.defineProperty(globalThis, "window", {
      value: {
        gtag,
        fbq,
        localStorage: {
          getItem: (key: string) => storedEvents.get(key) ?? null,
          setItem: (key: string, value: string) => storedEvents.set(key, value),
        },
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "0", globalPrivacyControl: false },
      configurable: true,
      writable: true,
    });

    try {
      trackVendorPurchase({
        transactionId: "order-123",
        currencyCode: "INR",
        value: 2500,
        items: [{ item_id: "tee-1", item_name: "Classic Tee", price: 2500, quantity: 1 }],
      });

      expect(gtag).toHaveBeenCalledTimes(2);
      expect(gtag).toHaveBeenCalledWith("event", "purchase", {
        transaction_id: "order-123",
        currency: "INR",
        value: 2500,
        coupon: undefined,
        shipping: undefined,
        tax: undefined,
        items: [{ item_id: "tee-1", item_name: "Classic Tee", price: 2500, quantity: 1 }],
      });
      expect(gtag).toHaveBeenCalledWith("event", "conversion", {
        send_to: "AW-18514353008/conversion-label",
        transaction_id: "order-123",
        currency: "INR",
        value: 2500,
      });
      expect(
        trackGoogleAdsConversion({
          transactionId: "order-123",
          currencyCode: "INR",
          value: 2500,
        }),
      ).toBe(false);
      expect(gtag).toHaveBeenCalledTimes(2);
      expect(fbq).toHaveBeenCalledTimes(1);
      expect(fbq).toHaveBeenCalledWith(
        "track",
        "Purchase",
        expect.objectContaining({ value: 2500, currency: "INR" }),
        { eventID: "order-123" },
      );
    } finally {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });
});
