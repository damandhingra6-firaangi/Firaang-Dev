import type { MetadataRoute } from "next";
import { fallbackProducts } from "@/lib/catalog";
import { getCatalogProducts } from "@/lib/products";
import { buildCategoryTree } from "@/lib/product-taxonomy";
import { getSiteUrl } from "@/lib/site";

const STATIC_ROUTES = ["/", "/about", "/contact", "/shop", "/privacy-policy", "/pod-policy", "/size-guide", "/track-order"];
type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const catalogProducts = await getCatalogProducts(250);
  const products = catalogProducts.length > 0 ? catalogProducts : fallbackProducts;
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

  const productEntries: SitemapEntry[] = products
    .filter((product) => Boolean(product.handle?.trim()))
    .map((product) => ({
      url: `${siteUrl}/product/${encodeURIComponent(product.handle!.trim())}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.64,
    }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
