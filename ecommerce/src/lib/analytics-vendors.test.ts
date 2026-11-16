import { describe, expect, it, vi } from "vitest";
import { trackVendorPageView, trackVendorPurchase } from "./analytics-vendors";

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

describe("trackVendorPurchase", () => {
  it("uses the shared order event ID for Meta browser/CAPI deduplication", () => {
    const originalWindow = globalThis.window;
    const originalNavigator = globalThis.navigator;
    const fbq = vi.fn();

    Object.defineProperty(globalThis, "window", {
      value: {
        doNotTrack: "0",
        fbq,
        localStorage: {
          getItem: vi.fn(() => null),
          setItem: vi.fn(),
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
        transactionId: "order_123",
        eventId: "purchase:order_123",
        currencyCode: "INR",
        value: 1499,
        items: [{ item_id: "ring_1", item_name: "Ring", quantity: 2 }],
      });

      expect(fbq).toHaveBeenCalledWith(
        "track",
        "Purchase",
        expect.objectContaining({
          content_ids: ["ring_1"],
          value: 1499,
          currency: "INR",
          num_items: 2,
        }),
        { eventID: "purchase:order_123" },
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
