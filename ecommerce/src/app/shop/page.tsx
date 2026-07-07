import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import ShopListing from "@/components/ShopListing";
import JewelleryComingSoonGate from "@/components/JewelleryComingSoonGate";
import { fallbackProducts } from "@/lib/catalog";
import { getStorefrontProducts } from "@/lib/shopify";
import { isJewellerySlug } from "@/lib/jewellery";

type ShopPageProps = {
  searchParams?: Promise<{ q?: string; category?: string; subCategory?: string; audience?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q ?? "";
  const category = params?.category ?? "";
  const subCategory = params?.subCategory ?? "";
  const audience = params?.audience ?? "";

  if (isJewellerySlug(category) || isJewellerySlug(subCategory)) {
    return (
      <main className="min-h-screen bg-[var(--page-bg)]">
        <Navbar />
        <div className="h-24 md:h-28" />
        <JewelleryComingSoonGate backHref="/shop" />
      </main>
    );
  }

  const storefrontProducts = await getStorefrontProducts(250);
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;
  
  // DEBUG: Log category distribution
  const sweatshirtProducts = products.filter(p => p.category === 'Sweatshirts');
  console.log(`[SHOP] Total products: ${products.length}, Sweatshirts: ${sweatshirtProducts.length}`);
  if (sweatshirtProducts.length > 0) {
    sweatshirtProducts.forEach(p => {
      console.log(`  - ${p.name}`);
    });
  }

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
      />
      <Newsletter />
    </main>
  );
}
