export type SupportedCurrency = "INR";

export function toSupportedCurrency(input: string | null | undefined): SupportedCurrency {
  return "INR";
}

export function convertAmount(amount: number, from: SupportedCurrency, to: SupportedCurrency) {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return amount;
}

export function formatCurrency(amount: number, currency: SupportedCurrency) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
