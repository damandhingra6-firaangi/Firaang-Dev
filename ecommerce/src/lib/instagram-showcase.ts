import type { GridProduct } from "@/lib/catalog";

export type InstagramShowcaseItem = {
  id: string;
  href: string;
  image: string;
  alt: string;
  title: string;
  isNew: boolean;
};

export type StoryBannerItem = {
  id: string;
  href: string;
  image: string;
  alt: string;
  title: string;
};

const ROTATION_WINDOW_DAYS = 5;
const NEW_PRODUCT_WINDOW_DAYS = 21;

const SIZE_CHART_IMAGE_PATTERN =
  /size\s*chart|size[-_\s]*guide|measurement|measurements|bust|waist|length|sleeve|shoulder|inches?|\bcm\b|xs[-_/\s]*s|\bxxl\b/i;
const TSHIRT_PATTERN =
  /t[-\s]*shirt|tee\b|oversized\s*tee|drop\s*shoulder|graphic\s*tee|printed\s*tee|streetwear\s*tee/i;
const DESIGN_FOCUSED_PATTERN =
  /graphic|print|printed|art|artwork|illustration|back\s*print|front\s*print|statement|devotional|typography|vintage|anime|retro|acid\s*wash|embroider|pattern/i;
const PLAIN_PRODUCT_PATTERN =
  /\bplain\b|\bbasic\b|\bsolid\b|\bblank\b|minimal|minimalist|essential|essentials|core|classic|simple/i;
const NON_PROMOTIONAL_IMAGE_PATTERN =
  /size[-_\s]*chart|chart|table|measurement|template|guide|mockup|flat[-_\s]*lay|spec|dimension|care[-_\s]*label/i;
const MODEL_LIFESTYLE_IMAGE_PATTERN =
  /model|lifestyle|on[-_\s]*body|wearing|lookbook|studio\s*shoot|campaign/i;
// Back-view images that don't mention a visible print/design (e.g. plain back of a shirt).
// Matched against searchText which combines product text, alt text, and image URL.
const BACK_VIEW_IMAGE_PATTERN =
  /\bback\s*view\b|\bback[-_\s]*of\b|\bback[-_\s]*image\b|[-_]back[-_.]|[/_]back[._-]/i;

type ShowcaseImageCandidate = {
  src: string;
  searchText: string;
  sourceRank: number;
  imageIndex: number;
};

function toUnixMs(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hashToUnitInterval(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const positive = hash >>> 0;
  return positive / 4294967295;
}

function toProductSearchableText(product: GridProduct) {
  return [product.name, product.category, product.subCategory, product.productType, ...(product.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeProductImages(product: GridProduct) {
  const productText = toProductSearchableText(product);
  const candidates: ShowcaseImageCandidate[] = [];

  if (product.img?.trim()) {
    candidates.push({
      src: product.img.trim(),
      searchText: `${productText} ${product.img}`.toLowerCase(),
      sourceRank: 3,
      imageIndex: 0,
    });
  }

  (product.galleryImages ?? []).forEach((image, index) => {
    const normalized = image.trim();
    if (!normalized) {
      return;
    }

    candidates.push({
      src: normalized,
      searchText: `${productText} ${normalized}`.toLowerCase(),
      sourceRank: 2,
      imageIndex: index + 1,
    });
  });

  (product.productMedia ?? [])
    .filter((media) => media.type === "image")
    .forEach((media, index) => {
      const normalized = media.src.trim();
      if (!normalized) {
        return;
      }

      candidates.push({
        src: normalized,
        searchText: `${productText} ${media.alt ?? ""} ${normalized}`.toLowerCase(),
        sourceRank: 4,
        imageIndex: index,
      });
    });

  const dedupedBySrc = new Map<string, ShowcaseImageCandidate>();

  for (const candidate of candidates) {
    const existing = dedupedBySrc.get(candidate.src);
    if (!existing) {
      dedupedBySrc.set(candidate.src, candidate);
      continue;
    }

    const merged: ShowcaseImageCandidate = {
      src: candidate.src,
      searchText: `${existing.searchText} ${candidate.searchText}`,
      sourceRank: Math.max(existing.sourceRank, candidate.sourceRank),
      imageIndex: Math.min(existing.imageIndex, candidate.imageIndex),
    };

    dedupedBySrc.set(candidate.src, merged);
  }

  return Array.from(dedupedBySrc.values());
}

function isLikelyTShirt(productText: string) {
  return TSHIRT_PATTERN.test(productText);
}

function isLikelyDesignFocusedProduct(productText: string) {
  return DESIGN_FOCUSED_PATTERN.test(productText);
}

function isLikelyPlainProduct(productText: string) {
  return PLAIN_PRODUCT_PATTERN.test(productText);
}

function isFiraangSignatureProduct(productText: string) {
  return /firaang\s*signature/.test(productText);
}

function isDisallowedInstagramImage(imageText: string) {
  if (SIZE_CHART_IMAGE_PATTERN.test(imageText)) {
    return true;
  }

  if (NON_PROMOTIONAL_IMAGE_PATTERN.test(imageText)) {
    return true;
  }

  // Exclude back-view images unless the product/image explicitly features a back-print design.
  // This prevents plain shirt-back shots from appearing in the showcase.
  if (BACK_VIEW_IMAGE_PATTERN.test(imageText) && !DESIGN_FOCUSED_PATTERN.test(imageText)) {
    return true;
  }

  return false;
}

function imageQualityBoost(imageText: string) {
  let score = 0;

  if (MODEL_LIFESTYLE_IMAGE_PATTERN.test(imageText)) {
    score += 0.2;
  }

  if (DESIGN_FOCUSED_PATTERN.test(imageText)) {
    score += 0.18;
  }

  if (PLAIN_PRODUCT_PATTERN.test(imageText)) {
    score -= 0.26;
  }

  // Penalise back-view images that lack an explicit design/print signal.
  if (BACK_VIEW_IMAGE_PATTERN.test(imageText) && !DESIGN_FOCUSED_PATTERN.test(imageText)) {
    score -= 0.28;
  }

  return score;
}

function toProductHref(product: GridProduct) {
  const routeKey = product.handle || product.parentId || product.id;
  return `/product/${encodeURIComponent(routeKey)}`;
}

function scoreStoryProduct(product: GridProduct, index: number, total: number) {
  const searchable = [product.name, product.category, product.subCategory, product.productType, ...(product.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = (total - index) / Math.max(1, total);

  if (/मैं\s*ही\s*कारण|main\s*hi\s*karan|karan\s*h?u?n?/i.test(searchable)) {
    score += 4;
  }

  if (/मैं\s*ही\s*हल|main\s*hi\s*hal|hal\s*h?u?n?/i.test(searchable)) {
    score += 3.8;
  }

  if (/krishna|कृष्ण|shiva|shiv|radha|janmashtami|devotional|bhakti|mandir|puja|spiritual/i.test(searchable)) {
    score += 3.2;
  }

  if (/signature|statement|graphic|typography|art|cultural|streetwear/i.test(searchable)) {
    score += 1.2;
  }

  score += hashToUnitInterval(`${product.id}:${product.name}`) * 0.25;
  return score;
}

/**
 * Builds the Instagram / "Latest Drops" showcase items from the live product catalog.
 *
 * Selection rules (in order):
 *  1. Sort all products newest-first by publishedAt.
 *  2. Prefer T-shirt products; fall back to all products only if there are fewer than
 *     `maxItems` qualifying T-shirts after filtering.
 *  3. Exclude the entire Firaang Signature collection.
 *  4. Exclude products whose images are all disallowed (size charts, flat-lay mockups,
 *     back-view plain shots, etc.).
 *  5. Quality gate — the product must pass at least one of:
 *       a. Its name OR description contains a specific design keyword (graphic, print,
 *          artwork, illustration, statement, devotional, typography, vintage, anime,
 *          retro, etc.). Checking name/description rather than broad category tags
 *          prevents plain solid T-shirts tagged "streetwear" or "printed" from qualifying.
 *       b. At least one of its images is flagged as a model/lifestyle shot.
 *  6. Pick the single highest-quality image for the product (model shots > design shots >
 *     neutral > penalised).
 *  7. Return up to `maxItems` results. When a new product is published it automatically
 *     displaces the oldest qualifying product.
 */
export function buildInstagramShowcaseItems(
  products: GridProduct[],
  maxItems = 5,
  now = new Date(),
): InstagramShowcaseItem[] {
  if (products.length === 0 || maxItems <= 0) {
    return [];
  }

  // ── 1. Sort newest-first ────────────────────────────────────────────────────
  const newestFirst = [...products].sort((l, r) => toUnixMs(r.publishedAt) - toUnixMs(l.publishedAt));

  // ── 2. Prefer T-shirt products ──────────────────────────────────────────────
  const tShirtPool = newestFirst.filter((p) => isLikelyTShirt(toProductSearchableText(p)));
  // Use the T-shirt pool only when it's large enough to fill all slots; otherwise
  // fall back to the full catalog so the section is never under-populated.
  const productPool = tShirtPool.length >= maxItems ? tShirtPool : newestFirst;

  const newWindow = NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const selected: InstagramShowcaseItem[] = [];

  for (const product of productPool) {
    if (selected.length >= maxItems) break;

    const productText = toProductSearchableText(product);

    // ── 3. Exclude Firaang Signature entirely ───────────────────────────────
    if (isFiraangSignatureProduct(productText)) continue;

    // ── 4. Filter images ────────────────────────────────────────────────────
    const images = normalizeProductImages(product).filter(
      (img) => !isDisallowedInstagramImage(img.searchText),
    );
    if (images.length === 0) continue;

    // ── 5. Quality gate ─────────────────────────────────────────────────────
    // Check the product's NAME and DESCRIPTION specifically — not the full tag
    // set — because tags like "printed", "streetwear", or "graphic tee" are
    // often applied to entire collections including plain-colour products.
    const nameAndDesc = `${product.name ?? ""} ${product.description ?? ""}`.toLowerCase();
    const hasDesignSignal = DESIGN_FOCUSED_PATTERN.test(nameAndDesc);
    const hasModelImage = images.some((img) => MODEL_LIFESTYLE_IMAGE_PATTERN.test(img.searchText));
    if (!hasDesignSignal && !hasModelImage) continue;

    // ── 6. Best image ───────────────────────────────────────────────────────
    const bestImage = [...images].sort((l, r) => {
      const boostDelta = imageQualityBoost(r.searchText) - imageQualityBoost(l.searchText);
      if (boostDelta !== 0) return boostDelta;
      if (r.sourceRank !== l.sourceRank) return r.sourceRank - l.sourceRank;
      return l.imageIndex - r.imageIndex;
    })[0];
    if (!bestImage) continue;

    const isNew = now.getTime() - toUnixMs(product.publishedAt) <= newWindow;

    selected.push({
      id: `${product.id}:showcase`,
      href: toProductHref(product),
      image: bestImage.src,
      alt: product.name,
      title: product.name,
      isNew,
    });
  }

  return selected;
}

export function buildStoryBannerItems(products: GridProduct[], maxItems = 4): StoryBannerItem[] {
  if (products.length === 0 || maxItems <= 0) {
    return [];
  }

  const rankedProducts = [...products]
    .map((product, index) => ({ product, index, score: scoreStoryProduct(product, index, products.length) }))
    .sort((left, right) => right.score - left.score);

  const selected: StoryBannerItem[] = [];
  const seenProducts = new Set<string>();

  for (const entry of rankedProducts) {
    if (seenProducts.has(entry.product.id)) {
      continue;
    }

    const images = normalizeProductImages(entry.product);
    const image = images[0]?.src;
    if (!image) {
      continue;
    }

    selected.push({
      id: `${entry.product.id}:story`,
      href: toProductHref(entry.product),
      image,
      alt: entry.product.name,
      title: entry.product.name,
    });
    seenProducts.add(entry.product.id);

    if (selected.length >= maxItems) {
      break;
    }
  }

  return selected;
}
