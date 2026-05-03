import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import ShopListing from "@/components/ShopListing";
import { fallbackProducts } from "@/lib/catalog";
import { getStorefrontProducts } from "@/lib/shopify";

type ShopPageProps = {
  searchParams?: Promise<{ q?: string; category?: string; subCategory?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q ?? "";
  const category = params?.category ?? "";
  const subCategory = params?.subCategory ?? "";

  const storefrontProducts = await getStorefrontProducts(40);
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;

  return (
    <main>
      <Navbar />
      <div className="h-24 md:h-28" />
      <ShopListing
        products={products}
        initialQuery={query}
        initialCategory={category}
        initialSubCategory={subCategory}
      />
      <Newsletter />
    </main>
  );
}
