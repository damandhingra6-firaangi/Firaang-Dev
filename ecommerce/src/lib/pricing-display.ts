const DEFAULT_INCLUDED_SHIPPING_INR = 65;
const MIN_RETAIL_PRICE_INR = 99;
const RETAIL_PRICE_POINT_OFFSETS = [-1, 99, 199, 299, 499] as const;

function isTruthy(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isFalsy(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off";
}

function parseIntegerEnv(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function isInclusiveDisplayPricingEnabled() {
  const mode = (process.env.NEXT_PUBLIC_PRICE_MODE ?? "inclusive").trim().toLowerCase();
  return mode !== "base";
}

export function getIncludedShippingContributionInr() {
  return parseIntegerEnv(process.env.NEXT_PUBLIC_INCLUDED_SHIPPING_INR, DEFAULT_INCLUDED_SHIPPING_INR);
}

export function isRetailPriceRoundingEnabled() {
  const flag = process.env.NEXT_PUBLIC_RETAIL_PRICE_ROUNDING;
  if (isFalsy(flag)) {
    return false;
  }
  if (isTruthy(flag)) {
    return true;
  }
  return true;
}

function buildRetailCandidates(amount: number) {
  const anchorThousand = Math.floor(amount / 1000) * 1000;
  const candidates = new Set<number>();

  for (const thousandShift of [-1000, 0, 1000, 2000] as const) {
    const base = anchorThousand + thousandShift;
    for (const offset of RETAIL_PRICE_POINT_OFFSETS) {
      const candidate = base + offset;
      if (candidate >= MIN_RETAIL_PRICE_INR) {
        candidates.add(candidate);
      }
    }
  }

  return Array.from(candidates).sort((a, b) => a - b);
}

function roundToRetailPrice(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const candidates = buildRetailCandidates(amount);
  let nearest = candidates[0] ?? MIN_RETAIL_PRICE_INR;
  let nearestDistance = Math.abs(amount - nearest);

  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const distance = Math.abs(amount - candidate);
    if (distance < nearestDistance || (distance === nearestDistance && candidate < nearest)) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function roundUpToRetailPrice(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return MIN_RETAIL_PRICE_INR;
  }

  const candidates = buildRetailCandidates(amount);
  const next = candidates.find((candidate) => candidate >= amount);
  if (next) {
    return next;
  }

  const anchorThousand = Math.floor(amount / 1000) * 1000;
  return anchorThousand + 1999;
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
  const shouldRound = isRetailPriceRoundingEnabled();
  const shippingContribution = includeShipping ? getIncludedShippingContributionInr() : 0;
  const safeBasePrice = Number.isFinite(input.priceAmount) ? Math.max(0, input.priceAmount) : 0;
  const rawDisplayPriceAmount = safeBasePrice + shippingContribution;
  const displayPriceAmount = shouldRound ? roundToRetailPrice(rawDisplayPriceAmount) : rawDisplayPriceAmount;

  const compareAtRaw = parsePriceNumber(input.compareAt);
  const rawDisplayCompareAtAmount =
    compareAtRaw && compareAtRaw > safeBasePrice
      ? compareAtRaw + shippingContribution
      : null;

  let displayCompareAtAmount = rawDisplayCompareAtAmount;
  if (shouldRound && rawDisplayCompareAtAmount) {
    const roundedCompareAtAmount = roundToRetailPrice(rawDisplayCompareAtAmount);
    displayCompareAtAmount =
      roundedCompareAtAmount > displayPriceAmount
        ? roundedCompareAtAmount
        : roundUpToRetailPrice(displayPriceAmount + 100);
  }

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
