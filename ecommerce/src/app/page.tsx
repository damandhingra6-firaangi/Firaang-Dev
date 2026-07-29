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
import { fallbackProducts } from "@/lib/catalog";
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

export default async function Home() {
  const [storefrontProducts, collectionsContent] = await Promise.all([
    getStorefrontProducts(HOME_PRODUCT_FETCH_LIMIT),
    getShopifyCollectionsContent(),
  ]);

  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;
  const featuredCollections = collectionsContent.featuredCollections;
  const featuredCollection = featuredCollections[0] ?? null;

  return (
    <main>
      <Navbar />
      <Hero featuredCollections={featuredCollections} />
      {featuredCollection ? <NewLaunchSection collection={featuredCollection} /> : null}
      <RedRibbon />
      <Category />
      <ProductGrid products={products} />
      <Newsletter />
      <FeedbackPill />
    </main>
  );
}