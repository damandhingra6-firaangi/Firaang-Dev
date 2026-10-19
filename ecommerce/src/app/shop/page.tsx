import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import ShopListing from "@/components/ShopListing";
import JewelleryComingSoonGate from "@/components/JewelleryComingSoonGate";
import { normalizeShopPromoSection } from "@/lib/shop-promo-banners";
import { createPageMetadata } from "@/lib/seo";
import { getStorefrontProducts, getStorefrontProductsByCollection } from "@/lib/shopify";
import { humanizeHandle } from "@/lib/text";
import { getCollectionDisplayTitle } from "@/lib/shopify-collections";
import { isJewellerySlug } from "@/lib/jewellery";

type ShopSearchParams = {
  q?: string;
  category?: string;
  subCategory?: string;
  audience?: string;
  collection?: string;
  section?: string;
};

type ShopPageProps = {
  searchParams?: Promise<ShopSearchParams>;
};

type ShopProductsProps = {
  collection: string;
  query: string;
  category: string;
  subCategory: string;
  audience: string;
  section: ReturnType<typeof normalizeShopPromoSection>;
};

function buildShopTitle(params: ShopSearchParams) {
  const collection = params.collection?.trim();
  const category = params.category?.trim();
  const subCategory = params.subCategory?.trim();
  const section = normalizeShopPromoSection(params.section);

  if (collection) {
    return `${getCollectionDisplayTitle(collection) ?? humanizeHandle(collection)} | Shop`;
  }

  if (category && subCategory) {
    return `${humanizeHandle(subCategory)} | ${humanizeHandle(category)}`;
  }

  if (category) {
    return `${humanizeHandle(category)} | Shop`;
  }

  if (section !== "shop") {
    return `${humanizeHandle(section)} | Shop`;
  }

  return "Shop";
}

function buildShopCanonicalPath(params: ShopSearchParams) {
  const collection = params.collection?.trim();
  const category = params.category?.trim();
  const subCategory = params.subCategory?.trim();

  if (collection) {
    return `/shop?section=collections&collection=${encodeURIComponent(collection)}`;
  }

  if (category && subCategory) {
    return `/shop/${encodeURIComponent(category)}/${encodeURIComponent(subCategory)}`;
  }

  if (category) {
    return `/shop/${encodeURIComponent(category)}`;
  }

  return "/shop";
}

function shouldNoIndexShopPage(params: ShopSearchParams) {
  if (isJewellerySlug(params.category) || isJewellerySlug(params.subCategory)) {
    return true;
  }

  if (params.collection?.trim()) {
    return false;
  }

  if (params.category?.trim() || params.subCategory?.trim()) {
    return Boolean(params.q?.trim()) || normalizeShopPromoSection(params.section) !== "shop";
  }

  return Boolean(params.q?.trim()) || normalizeShopPromoSection(params.section) !== "shop";
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const params = searchParams ? await searchParams : undefined;
  const search = params ?? {};

  return createPageMetadata({
    title: buildShopTitle(search),
    description: "Browse Firaang collections, signature pieces, and new seasonal launches.",
    path: buildShopCanonicalPath(search),
    noIndex: shouldNoIndexShopPage(search),
  });
}

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
async function ShopProducts({ collection, query, category, subCategory, audience, section }: ShopProductsProps) {
  const storefrontProducts = await (
    collection
      ? getStorefrontProductsByCollection(collection, 250, { detailLevel: "summary" })
      : getStorefrontProducts(250, { detailLevel: "summary" })
  );

  const collectionTitle = collection
    ? (getCollectionDisplayTitle(collection) ?? humanizeHandle(collection))
    : "";

  const products = storefrontProducts;

  return (
    <>
      <nav aria-label="SEO shop product links" className="sr-only">
        <ul>
          {products
            .filter((product) => Boolean(product.handle?.trim()))
            .slice(0, 300)
            .map((product) => (
              <li key={`seo-shop-product-${product.id}`}>
                <a href={`/product/${encodeURIComponent(product.handle!.trim())}`}>{product.name}</a>
              </li>
            ))}
        </ul>
      </nav>
      <ShopListing
        products={products}
        initialQuery={query}
        initialCategory={category}
        initialSubCategory={subCategory}
        initialAudience={audience}
        initialCollection={collection}
        initialCollectionTitle={collectionTitle}
        initialSection={section}
      />
    </>
  );
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q ?? "";
  const category = params?.category ?? "";
  const subCategory = params?.subCategory ?? "";
  const audience = params?.audience ?? "";
  const collection = params?.collection ?? "";
  const section = normalizeShopPromoSection(params?.section);
  const effectiveSection = collection ? "collections" : section;

  if (isJewellerySlug(category) || isJewellerySlug(subCategory)) {
    return (
      <main className="min-h-screen bg-[var(--page-bg)]">
        <Navbar activeSection={effectiveSection} />
        <div className="h-24 md:h-28" />
        <JewelleryComingSoonGate backHref="/shop" />
      </main>
    );
  }

  return (
    <main>
      <Navbar activeSection={effectiveSection} />
      <div className="h-[68px] md:h-[72px]" />
      {/*
        Suspense boundary: the Navbar and page chrome above stream to the
        browser immediately. ShopProducts awaits the Shopify API and streams
        the product grid as soon as data is available. This eliminates the
        blank/zero-product flash on mobile and social media in-app browsers.
      */}
      <Suspense fallback={<ShopProductsSkeleton />}>
        <ShopProducts
          key={`${effectiveSection}::${collection}`}
          collection={collection}
          query={query}
          category={category}
          subCategory={subCategory}
          audience={audience}
          section={effectiveSection}
        />
      </Suspense>
      <Newsletter />
    </main>
  );
}
