// app/page.tsx

import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Category from "@/components/Category";
import RedRibbon from "@/components/RedRibbon";
import ProductGrid from "@/components/ProductGrid";
import NewLaunchSection from "@/components/NewLaunchSection";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import { fallbackProducts, GridProduct } from "@/lib/catalog";
import { slugify } from "@/lib/product-taxonomy";
import { createPageMetadata } from "@/lib/seo";
import { SITE_TITLE_DEFAULT } from "@/lib/site";
import { getStorefrontProducts } from "@/lib/shopify";
import { getShopifyCollectionsContent } from "@/lib/shopify-collections";

export const revalidate = 300;

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
        href: `/shop?category=${categorySlug}`,
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
    getStorefrontProducts(HOME_PRODUCT_FETCH_LIMIT),
    getShopifyCollectionsContent(),
  ]);

  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;
  const homeCategories = buildHomeCategories(products);
  const featuredCollections = collectionsContent.featuredCollections;
  const featuredCollection = featuredCollections[0] ?? null;

  return (
    <main>
      <Navbar />
      <Hero featuredCollections={featuredCollections} />
      {featuredCollection ? <NewLaunchSection collection={featuredCollection} /> : null}
      <RedRibbon />
      <Category categories={homeCategories} />
      <ProductGrid products={products} />
      <Newsletter />
      <FeedbackPill />
    </main>
  );
}