import { getIncludedShippingContributionInr } from "@/lib/pricing-display";

const LAUNCH_PROTECTED_COUPON_PERCENT = 30;

function isFinitePositiveAmount(amount: number) {
  return Number.isFinite(amount) && amount > 0;
}

export function isTShirtTaxonomy(input: {
  category?: string;
  subCategory?: string;
  productType?: string;
  title?: string;
  tags?: string[];
}) {
  const haystack = [input.category, input.subCategory, input.productType, input.title, ...(input.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\bt[-\s]*shirts?\b/.test(haystack) || /\btees?\b/.test(haystack);
}

export function getProtectedLaunchPriceAmount(priceAmount: number) {
  if (!isFinitePositiveAmount(priceAmount)) {
    return 0;
  }

  const displayContribution = getIncludedShippingContributionInr();
  const currentDisplayPrice = priceAmount + displayContribution;
  const protectedDisplayPrice = Math.ceil(currentDisplayPrice / (1 - LAUNCH_PROTECTED_COUPON_PERCENT / 100));

  return Math.max(0, protectedDisplayPrice - displayContribution);
}

export function getProtectedLaunchCompareAtAmount(compareAtAmount: number) {
  return isFinitePositiveAmount(compareAtAmount) ? getProtectedLaunchPriceAmount(compareAtAmount) : 0;
}