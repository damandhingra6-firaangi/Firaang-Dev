import { describe, expect, it, vi } from "vitest";
import { trackVendorPageView } from "./analytics-vendors";

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
