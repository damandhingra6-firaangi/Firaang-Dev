import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import ProductDetailsPage from "@/components/ProductDetailsPage";
import { fallbackProducts } from "@/lib/catalog";
import { getStorefrontProducts } from "@/lib/shopify";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);

  const storefrontProducts = await getStorefrontProducts(250);
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;

  const product = products.find((item) => {
    return item.handle?.toLowerCase() === decodedHandle.toLowerCase() || item.id === decodedHandle;
  });

  if (!product) {
    notFound();
  }

  return (
    <main>
      <Navbar />
      <div className="h-24 md:h-28" />
      <ProductDetailsPage product={product} />
      <Newsletter />
    </main>
  );
}
