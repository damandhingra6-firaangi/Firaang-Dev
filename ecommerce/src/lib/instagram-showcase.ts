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
  /graphic|print|printed|art|artwork|illustration|back\s*print|front\s*print|statement|devotional|typography|streetwear|vintage|anime|retro|acid\s*wash|embroider|pattern/i;
const PLAIN_PRODUCT_PATTERN =
  /\bplain\b|\bbasic\b|\bsolid\b|\bblank\b|minimal|minimalist|essential|essentials|core|classic|simple/i;
const NON_PROMOTIONAL_IMAGE_PATTERN =
  /size[-_\s]*chart|chart|table|measurement|template|guide|mockup|flat[-_\s]*lay|spec|dimension|care[-_\s]*label/i;
const MODEL_LIFESTYLE_IMAGE_PATTERN =
  /model|lifestyle|on[-_\s]*body|wearing|lookbook|studio\s*shoot|campaign/i;

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

export function buildInstagramShowcaseItems(
  products: GridProduct[],
  maxItems = 5,
  now = new Date(),
): InstagramShowcaseItem[] {
  if (products.length === 0 || maxItems <= 0) {
    return [];
  }

  const windowMs = ROTATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const rotationBucket = Math.floor(now.getTime() / windowMs);
  const newestFirst = [...products].sort((left, right) => toUnixMs(right.publishedAt) - toUnixMs(left.publishedAt));
  const tShirtProducts = newestFirst.filter((product) => isLikelyTShirt(toProductSearchableText(product)));
  const productPool = tShirtProducts.length > 0 ? tShirtProducts : newestFirst;
  const candidateProducts = productPool.slice(0, Math.max(maxItems * 10, 48));

  const scoredCandidates = candidateProducts.flatMap((product, productIndex) => {
    const productText = toProductSearchableText(product);
    const hasDesignSignal = isLikelyDesignFocusedProduct(productText);
    const isPlainProduct = isLikelyPlainProduct(productText);

    // Exclude plain items from Firaang Signature, and generally deprioritize plain/basic products.
    if (isFiraangSignatureProduct(productText) && isPlainProduct) {
      return [];
    }

    const images = normalizeProductImages(product).filter((image) => !isDisallowedInstagramImage(image.searchText));
    if (images.length === 0) {
      return [];
    }

    const isNew = now.getTime() - toUnixMs(product.publishedAt) <= NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const recencyScore = (candidateProducts.length - productIndex) / candidateProducts.length;
    const href = toProductHref(product);
    const productDesignBoost = hasDesignSignal ? 0.42 : isPlainProduct ? -0.38 : 0;

    // Keep plain/basic items out unless we run out of stronger promotional options.
    const imageLimit = hasDesignSignal ? 4 : 2;
    const topImages = images
      .sort((left, right) => {
        const qualityDelta = imageQualityBoost(right.searchText) - imageQualityBoost(left.searchText);
        if (qualityDelta !== 0) {
          return qualityDelta;
        }

        if (right.sourceRank !== left.sourceRank) {
          return right.sourceRank - left.sourceRank;
        }

        return left.imageIndex - right.imageIndex;
      })
      .slice(0, imageLimit);

    return topImages.map((image, imageIndex) => {
      const tiebreaker = hashToUnitInterval(`${rotationBucket}:${product.id}:${image.src}`);
      const imageBoost = imageQualityBoost(image.searchText);
      return {
        id: `${product.id}:${imageIndex}`,
        productKey: product.id,
        href,
        image: image.src,
        alt: product.name,
        title: product.name,
        isNew,
        score:
          recencyScore * 0.64 +
          (image.sourceRank >= 4 ? 0.08 : 0) +
          (imageIndex === 0 ? 0.06 : 0) +
          productDesignBoost +
          imageBoost +
          tiebreaker * 0.2,
      };
    });
  });

  scoredCandidates.sort((left, right) => right.score - left.score);

  const selected: InstagramShowcaseItem[] = [];
  const seenProducts = new Set<string>();

  for (const candidate of scoredCandidates) {
    if (seenProducts.has(candidate.productKey)) {
      continue;
    }

    selected.push({
      id: candidate.id,
      href: candidate.href,
      image: candidate.image,
      alt: candidate.alt,
      title: candidate.title,
      isNew: candidate.isNew,
    });
    seenProducts.add(candidate.productKey);

    if (selected.length >= maxItems) {
      break;
    }
  }

  if (selected.length >= maxItems) {
    return selected;
  }

  for (const candidate of scoredCandidates) {
    if (selected.some((item) => item.id === candidate.id)) {
      continue;
    }

    selected.push({
      id: candidate.id,
      href: candidate.href,
      image: candidate.image,
      alt: candidate.alt,
      title: candidate.title,
      isNew: candidate.isNew,
    });

    if (selected.length >= maxItems) {
      break;
    }
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
