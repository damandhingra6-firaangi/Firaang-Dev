import type { GridProduct } from "@/lib/catalog";
import { isSignatureProduct } from "@/lib/design-inquiry";

export const EXCLUDED_PRODUCT_GROUPS = ["Devotional", "Firaang Signature T-Shirts"] as const;

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function hasKeyword(value: string | null | undefined, keywords: string[]) {
  const text = normalize(value);
  if (!text) {
    return false;
  }

  return keywords.some((keyword) => text.includes(keyword));
}

export function isDevotionalProduct(product: GridProduct) {
  const tags = product.tags ?? [];
  const devotionalTagKeywords = ["devotional", "spiritual", "bhakti", "religious", "puja", "mandir"];

  if (normalize(product.subCategory) === "devotional" || normalize(product.subCategorySlug) === "devotional") {
    return true;
  }

  return tags.some((tag) => hasKeyword(tag, devotionalTagKeywords));
}

export function isFiraangSignatureProduct(product: GridProduct) {
  const tags = product.tags ?? [];

  if (isSignatureProduct(tags)) {
    return true;
  }

  return (
    hasKeyword(product.handle, ["firaang-signature", "signature"]) ||
    hasKeyword(product.productType, ["signature"]) ||
    hasKeyword(product.subCategory, ["signature"]) ||
    hasKeyword(product.subCategorySlug, ["signature"])
  );
}

export function isExcludedFromCuratedShopSections(product: GridProduct) {
  return isDevotionalProduct(product) || isFiraangSignatureProduct(product);
}

export function isOversizedContext(values: Array<string | undefined>) {
  return values.some((value) => {
    const text = normalize(value).replace(/[_\s]+/g, "-");
    return text.includes("oversized") || text.includes("boxy-fit") || text.includes("boxy");
  });
}