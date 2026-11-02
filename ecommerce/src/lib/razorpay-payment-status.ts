export type RazorpayPaymentVerificationState = "paid" | "pending" | "failed";

const SUCCESSFUL_RAZORPAY_PAYMENT_STATUSES = new Set(["captured", "authorized"]);
const PENDING_RAZORPAY_PAYMENT_STATUSES = new Set(["pending"]);
const FAILED_RAZORPAY_PAYMENT_STATUSES = new Set(["failed", "cancelled", "rejected", "expired"]);

export function mapRazorpayPaymentVerificationState(status?: string): RazorpayPaymentVerificationState {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (!normalized) {
    return "failed";
  }

  if (SUCCESSFUL_RAZORPAY_PAYMENT_STATUSES.has(normalized)) {
    return "paid";
  }

  if (PENDING_RAZORPAY_PAYMENT_STATUSES.has(normalized)) {
    return "pending";
  }

  if (FAILED_RAZORPAY_PAYMENT_STATUSES.has(normalized)) {
    return "failed";
  }

  return "failed";
}
