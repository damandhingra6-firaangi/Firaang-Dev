const DISPLAY_PRICE_INCREMENT_INR = 100;

export function isInclusiveDisplayPricingEnabled() {
  // Always apply display uplift: customer-facing price = Shopify price + 100.
  return true;
}

export function getIncludedShippingContributionInr() {
  return DISPLAY_PRICE_INCREMENT_INR;
}

export function isRetailPriceRoundingEnabled() {
  // Display price must be an exact +100 delta from Shopify price.
  return false;
}

export function parsePriceNumber(input: string | number | null | undefined) {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }

  if (typeof input !== "string") {
    return null;
  }

  const parsed = Number.parseFloat(input.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function getDisplayPricing(input: {
  priceAmount: number;
  compareAt?: string | number | null;
}) {
  const includeShipping = isInclusiveDisplayPricingEnabled();
  const shippingContribution = includeShipping ? getIncludedShippingContributionInr() : 0;
  const safeBasePrice = Number.isFinite(input.priceAmount) ? Math.max(0, input.priceAmount) : 0;
  const displayPriceAmount = safeBasePrice + shippingContribution;

  const compareAtRaw = parsePriceNumber(input.compareAt);
  const rawDisplayCompareAtAmount =
    compareAtRaw && compareAtRaw > safeBasePrice
      ? compareAtRaw + shippingContribution
      : null;

  const displayCompareAtAmount = rawDisplayCompareAtAmount;

  const discountPercent =
    displayCompareAtAmount && displayCompareAtAmount > displayPriceAmount
      ? Math.max(0, Math.round(((displayCompareAtAmount - displayPriceAmount) / displayCompareAtAmount) * 100))
      : 0;

  return {
    priceAmount: displayPriceAmount,
    compareAtAmount: displayCompareAtAmount,
    discountPercent,
    shippingContribution,
    includeShipping,
  };
}
