import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import ShopListing from "@/components/ShopListing";
import JewelleryComingSoonGate from "@/components/JewelleryComingSoonGate";
import { fallbackProducts } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";
import { getStorefrontProducts, getStorefrontProductsByCollection } from "@/lib/shopify";
import { humanizeHandle } from "@/lib/text";
import { isJewellerySlug } from "@/lib/jewellery";

export const metadata: Metadata = createPageMetadata({
  title: "Shop",
  description: "Browse Firaang collections, signature pieces, and new seasonal launches.",
  path: "/shop",
});

type ShopPageProps = {
  searchParams?: Promise<{ q?: string; category?: string; subCategory?: string; audience?: string; collection?: string }>;
};

type ShopProductsProps = {
  collection: string;
  query: string;
  category: string;
  subCategory: string;
  audience: string;
};

/**
 * Skeleton shown instantly while the Shopify API request is in-flight.
 * This prevents a blank/zero-product screen on mobile — the page shell
 * streams to the browser immediately while products load in the background.
 */
function ShopProductsSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-6 md:py-10 lg:px-8">
      <div className="mb-6 h-9 w-48 animate-pulse rounded-md bg-gray-200" />
      <div className="mb-4 h-8 w-44 animate-pulse rounded-md bg-gray-100" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-3">
            <div className="aspect-[3/4] rounded-lg bg-gray-200" />
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Async server component that fetches products and renders the listing.
 * Wrapped in <Suspense> so its parent page shell streams without waiting
 * for the Shopify response.
 */
async function ShopProducts({ collection, query, category, subCategory, audience }: ShopProductsProps) {
  const storefrontProducts = await (
    collection ? getStorefrontProductsByCollection(collection, 250) : getStorefrontProducts(250)
  );

  const collectionTitle = collection ? humanizeHandle(collection) : "";

  // Apply fallback for both collection and general pages so users always see
  // products rather than an empty grid when the Shopify API is temporarily slow
  // or returning an error.
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;

  return (
    <ShopListing
      products={products}
      initialQuery={query}
      initialCategory={category}
      initialSubCategory={subCategory}
      initialAudience={audience}
      initialCollection={collection}
      initialCollectionTitle={collectionTitle}
    />
  );
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q ?? "";
  const category = params?.category ?? "";
  const subCategory = params?.subCategory ?? "";
  const audience = params?.audience ?? "";
  const collection = params?.collection ?? "";

  if (isJewellerySlug(category) || isJewellerySlug(subCategory)) {
    return (
      <main className="min-h-screen bg-[var(--page-bg)]">
        <Navbar />
        <div className="h-24 md:h-28" />
        <JewelleryComingSoonGate backHref="/shop" />
      </main>
    );
  }

  return (
    <main>
      <Navbar />
      <div className="h-24 md:h-28" />
      {/*
        Suspense boundary: the Navbar and page chrome above stream to the
        browser immediately. ShopProducts awaits the Shopify API and streams
        the product grid as soon as data is available. This eliminates the
        blank/zero-product flash on mobile and social media in-app browsers.
      */}
      <Suspense fallback={<ShopProductsSkeleton />}>
        <ShopProducts
          collection={collection}
          query={query}
          category={category}
          subCategory={subCategory}
          audience={audience}
        />
      </Suspense>
      <Newsletter />
    </main>
  );
}
