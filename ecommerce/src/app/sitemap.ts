import type { MetadataRoute } from "next";
import { getStorefrontProducts } from "@/lib/shopify";
import { buildCategoryTree } from "@/lib/product-taxonomy";
import { getSiteUrl } from "@/lib/site";

const STATIC_ROUTES = ["/", "/about", "/contact", "/shop", "/privacy-policy", "/pod-policy", "/size-guide", "/track-order"];
type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const products = await getStorefrontProducts(1000);
  const categoryTree = buildCategoryTree(products);

  const staticEntries: SitemapEntry[] = STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
    priority: path === "/" ? 1 : path === "/shop" ? 0.9 : 0.7,
  }));

  const categoryEntries: SitemapEntry[] = categoryTree.flatMap((category) => {
    const categoryPath = `/shop/${encodeURIComponent(category.slug)}`;

    return [
      {
        url: `${siteUrl}${categoryPath}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      ...category.subCategories.map((subCategory) => ({
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
      if (!handle || seenHandles.has(handle)) {
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
