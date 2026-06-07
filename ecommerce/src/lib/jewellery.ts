const JEWELLERY_CATEGORY_SLUGS = new Set(["jewelry", "jewellery", "hair-accessories"]);

export function isJewellerySlug(value: string | undefined | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return (
    JEWELLERY_CATEGORY_SLUGS.has(normalized) ||
    normalized.includes("jewel") ||
    normalized.includes("accessor")
  );
}