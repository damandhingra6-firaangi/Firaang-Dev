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

function normalizeProductImages(product: GridProduct) {
  const images = [
    product.img,
    ...(product.galleryImages ?? []),
    ...(product.productMedia ?? [])
      .filter((media) => media.type === "image")
      .map((media) => media.src),
  ]
    .map((image) => image.trim())
    .filter(Boolean);

  return Array.from(new Set(images));
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
  const candidateProducts = newestFirst.slice(0, Math.max(maxItems * 8, 36));

  const scoredCandidates = candidateProducts.flatMap((product, productIndex) => {
    const images = normalizeProductImages(product);
    if (images.length === 0) {
      return [];
    }

    const isNew = now.getTime() - toUnixMs(product.publishedAt) <= NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const recencyScore = (candidateProducts.length - productIndex) / candidateProducts.length;
    const href = toProductHref(product);

    return images.slice(0, 3).map((image, imageIndex) => {
      const tiebreaker = hashToUnitInterval(`${rotationBucket}:${product.id}:${image}`);
      return {
        id: `${product.id}:${imageIndex}`,
        productKey: product.id,
        href,
        image,
        alt: product.name,
        title: product.name,
        isNew,
        score: recencyScore * 0.72 + (imageIndex === 0 ? 0.08 : 0) + tiebreaker * 0.2,
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
    const image = images[0];
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
