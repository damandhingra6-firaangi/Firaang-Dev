import type { MetadataRoute } from "next";
import { getStorefrontProducts } from "@/lib/shopify";
import { buildCategoryTree } from "@/lib/product-taxonomy";
import { isJewellerySlug } from "@/lib/jewellery";
import { getSiteUrl } from "@/lib/site";

const STATIC_ROUTES = ["/", "/about", "/contact", "/shop", "/privacy-policy", "/shipping-policy", "/terms-and-conditions", "/pod-policy", "/size-guide"];
type SitemapEntry = MetadataRoute.Sitemap[number];

function isIndexableCategorySlug(slug?: string | null) {
  return Boolean(slug && !isJewellerySlug(slug));
}

function isIndexableProduct(product: { handle?: string | null; category?: string | null; categorySlug?: string | null; subCategory?: string | null; subCategorySlug?: string | null; tags?: string[] | null }) {
  const handle = product.handle?.trim();
  const tags = product.tags ?? [];

  if (!handle || isJewellerySlug(handle)) {
    return false;
  }

  if (
    isJewellerySlug(product.category) ||
    isJewellerySlug(product.categorySlug) ||
    isJewellerySlug(product.subCategory) ||
    isJewellerySlug(product.subCategorySlug) ||
    tags.some((tag) => isJewellerySlug(tag))
  ) {
    return false;
  }

  return true;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const products = await getStorefrontProducts(1000, { detailLevel: "summary" });
  const categoryTree = buildCategoryTree(products);

  const staticEntries: SitemapEntry[] = STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
    priority: path === "/" ? 1 : path === "/shop" ? 0.9 : 0.7,
  }));

  const categoryEntries: SitemapEntry[] = categoryTree
    .filter((category) => isIndexableCategorySlug(category.slug))
    .flatMap((category) => {
      const categoryPath = `/shop/${encodeURIComponent(category.slug)}`;

      return [
        {
          url: `${siteUrl}${categoryPath}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        },
        ...category.subCategories
          .filter((subCategory) => isIndexableCategorySlug(subCategory.slug))
          .map((subCategory) => ({
            url: `${siteUrl}${categoryPath}/${encodeURIComponent(subCategory.slug)}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.75,
          })),
      ];
    });

  const seenHandles = new Set<string>();
  const productEntries: SitemapEntry[] = products
    .filter((product) => {
      const handle = product.handle?.trim().toLowerCase();
      if (!handle || seenHandles.has(handle) || !isIndexableProduct(product)) {
        return false;
      }

      seenHandles.add(handle);
      return true;
    })
    .map((product) => ({
      url: `${siteUrl}/product/${encodeURIComponent(product.handle!.trim())}`,
      lastModified: product.publishedAt ? new Date(product.publishedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.64,
    }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
