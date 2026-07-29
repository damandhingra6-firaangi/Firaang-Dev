import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import ShopListing from "@/components/ShopListing";
import JewelleryComingSoonGate from "@/components/JewelleryComingSoonGate";
import { fallbackProducts } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";
import { getShopifyCollectionsContent } from "@/lib/shopify-collections";
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

  const [storefrontProducts, collectionsContent] = await Promise.all([
    collection ? getStorefrontProductsByCollection(collection, 250) : getStorefrontProducts(250),
    collection ? getShopifyCollectionsContent() : Promise.resolve(null),
  ]);

  const collectionTitle = collection
    ? collectionsContent?.collections.find((item) => item.handle.toLowerCase() === collection.toLowerCase())?.title ??
      humanizeHandle(collection)
    : "";

  const products = collection
    ? storefrontProducts
    : storefrontProducts.length > 0
      ? storefrontProducts
      : fallbackProducts;

  return (
    <main>
      <Navbar />
      <div className="h-24 md:h-28" />
      <ShopListing
        products={products}
        initialQuery={query}
        initialCategory={category}
        initialSubCategory={subCategory}
        initialAudience={audience}
        initialCollection={collection}
        initialCollectionTitle={collectionTitle}
      />
      <Newsletter />
    </main>
  );
}
