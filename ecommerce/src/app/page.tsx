// app/page.tsx

import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HomeCollectionDiscovery from "@/components/HomeCollectionDiscovery";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import { GridProduct } from "@/lib/catalog";
import { buildInstagramShowcaseItems, buildStoryBannerItems } from "@/lib/instagram-showcase";
import { slugify } from "@/lib/product-taxonomy";
import { createPageMetadata } from "@/lib/seo";
import { SITE_TITLE_DEFAULT } from "@/lib/site";
import { getStorefrontProducts, getStorefrontProductsByCollection } from "@/lib/shopify";
import { getShopifyCollectionsContent } from "@/lib/shopify-collections";
import type { HomeCollectionDiscoveryCollection } from "@/components/HomeCollectionDiscovery";
import { isHomeDiscoveryCollection } from "@/lib/home-collection-keys";

export const revalidate = 1800;

export const metadata: Metadata = {
  ...createPageMetadata({
    title: SITE_TITLE_DEFAULT,
    description:
      "Shop premium Firaang clothing and jewellery with expressive seasonal launches, curated collections, and signature wardrobe essentials.",
    path: "/",
  }),
  title: {
    absolute: SITE_TITLE_DEFAULT,
  },
};

const HOME_PRODUCT_FETCH_LIMIT = 250;
const HOME_COLLECTION_FETCH_CONCURRENCY = 4;

type HomeCategoryCard = {
  name: string;
  href: string;
  img: string;
  count: number;
};

function buildHomeCategories(products: GridProduct[]): HomeCategoryCard[] {
  const byCategory = new Map<string, HomeCategoryCard>();

  for (const product of products) {
    const categoryName = (product.category ?? "").trim();
    if (!categoryName) {
      continue;
    }

    const categorySlug = (product.categorySlug ?? slugify(categoryName)).trim().toLowerCase();
    if (!categorySlug) {
      continue;
    }

    const existing = byCategory.get(categorySlug);
    if (!existing) {
      byCategory.set(categorySlug, {
        name: categoryName,
        href: `/shop/${encodeURIComponent(categorySlug)}`,
        img: product.img,
        count: 1,
      });
      continue;
    }

    existing.count += 1;
    if (!existing.img && product.img) {
      existing.img = product.img;
    }
  }

  return Array.from(byCategory.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.name.localeCompare(right.name);
  });
}

export default async function Home() {
  const [storefrontProducts, collectionsContent] = await Promise.all([
    getStorefrontProducts(HOME_PRODUCT_FETCH_LIMIT, { detailLevel: "full" }),
    getShopifyCollectionsContent(),
  ]);

  const products = storefrontProducts;
  const homeCategories = buildHomeCategories(products);
  const instagramShowcaseItems = buildInstagramShowcaseItems(products, 5);
  const storyBannerItems = buildStoryBannerItems(products, 4);
  const featuredCollections = collectionsContent.featuredCollections;
  const discoveryCollections = collectionsContent.collections.filter(isHomeDiscoveryCollection);
  const homepageCollections: HomeCollectionDiscoveryCollection[] = [];

  for (let index = 0; index < discoveryCollections.length; index += HOME_COLLECTION_FETCH_CONCURRENCY) {
    const collectionBatch = await Promise.all(
      discoveryCollections.slice(index, index + HOME_COLLECTION_FETCH_CONCURRENCY).map(async (collection) => ({
        id: collection.id,
        handle: collection.handle,
        title: collection.title,
        href: collection.href,
        imageUrl: collection.imageUrl,
        isSeasonallyVisible: collection.isSeasonallyVisible,
        products: collection.isSeasonallyVisible
          ? await getStorefrontProductsByCollection(collection.handle, 250, { detailLevel: "summary" })
          : [],
      })),
    );
    homepageCollections.push(...collectionBatch);
  }

  return (
    <main>
      <nav aria-label="SEO discovery links" className="sr-only">
        <ul>
          {products
            .filter((product) => Boolean(product.handle?.trim()))
            .slice(0, 200)
            .map((product) => (
              <li key={`seo-product-${product.id}`}>
                <a href={`/products/${encodeURIComponent(product.handle!.trim())}`}>{product.name}</a>
              </li>
            ))}
          {homeCategories.slice(0, 30).map((category) => (
            <li key={`seo-category-${category.href}`}>
              <a href={category.href}>{category.name}</a>
            </li>
          ))}
        </ul>
      </nav>
      <Navbar />
      <Hero featuredCollections={featuredCollections} storyBannerItems={storyBannerItems} />
      <HomeCollectionDiscovery products={products} collections={homepageCollections} />
      <Newsletter instagramShowcaseItems={instagramShowcaseItems} />
      <FeedbackPill />
    </main>
  );
}