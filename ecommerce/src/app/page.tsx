// app/page.tsx

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Category from "@/components/Category";
import RedRibbon from "@/components/RedRibbon";
import ProductGrid from "@/components/ProductGrid";
import NewLaunchSection from "@/components/NewLaunchSection";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import { fallbackProducts } from "@/lib/catalog";
import { getStorefrontProducts } from "@/lib/shopify";
import { getShopifyCollectionsContent } from "@/lib/shopify-collections";

export const revalidate = 300;

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