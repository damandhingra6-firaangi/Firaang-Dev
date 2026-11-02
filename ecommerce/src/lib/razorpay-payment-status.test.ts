import { describe, expect, it } from "vitest";
import { mapRazorpayPaymentVerificationState } from "@/lib/razorpay-payment-status";

describe("mapRazorpayPaymentVerificationState", () => {
  it("treats captured and authorized as successful", () => {
    expect(mapRazorpayPaymentVerificationState("captured")).toBe("paid");
    expect(mapRazorpayPaymentVerificationState("authorized")).toBe("paid");
  });

  it("treats pending payments as pending and never as success", () => {
    expect(mapRazorpayPaymentVerificationState("pending")).toBe("pending");
  });

  it("treats failed and cancelled payment states as failed", () => {
    expect(mapRazorpayPaymentVerificationState("failed")).toBe("failed");
    expect(mapRazorpayPaymentVerificationState("cancelled")).toBe("failed");
  });
});
