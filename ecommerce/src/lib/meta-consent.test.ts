import { describe, expect, it } from "vitest";
import { isMetaTrackingOptedOut, readMetaMarketingConsent } from "./meta-consent";

describe("Meta marketing consent", () => {
  it("requires an explicit consent cookie", () => {
    expect(readMetaMarketingConsent("")).toBeNull();
    expect(readMetaMarketingConsent("Firaang_meta_marketing_consent=denied")).toBe("denied");
    expect(readMetaMarketingConsent("Firaang_meta_marketing_consent=granted")).toBe("granted");
  });

  it("recognizes DNT and GPC request opt-outs", () => {
    expect(isMetaTrackingOptedOut(new Headers({ dnt: "1" }))).toBe(true);
    expect(isMetaTrackingOptedOut(new Headers({ "sec-gpc": "1" }))).toBe(true);
    expect(isMetaTrackingOptedOut(new Headers())).toBe(false);
  });
});
