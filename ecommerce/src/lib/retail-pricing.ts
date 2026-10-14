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
  return isFinitePositiveAmount(priceAmount) ? priceAmount : 0;
}

export function getProtectedLaunchCompareAtAmount(compareAtAmount: number) {
  return isFinitePositiveAmount(compareAtAmount) ? getProtectedLaunchPriceAmount(compareAtAmount) : 0;
}