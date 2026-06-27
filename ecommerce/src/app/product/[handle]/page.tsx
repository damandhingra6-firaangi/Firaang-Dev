import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import ProductDetailsPage, { type ProductCardLite } from "@/components/ProductDetailsPage";
import { fallbackProducts } from "@/lib/catalog";
import { getCatalogProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ handle: string }>;
};

function toProductCardLite(product: (typeof fallbackProducts)[number]): ProductCardLite {
  return {
    id: product.id,
    handle: product.handle,
    name: product.name,
    price: product.price,
    priceAmount: product.priceAmount,
    currencyCode: product.currencyCode,
    oldPrice: product.oldPrice,
    img: product.img,
    category: product.category,
    categorySlug: product.categorySlug,
    subCategory: product.subCategory,
    subCategorySlug: product.subCategorySlug,
    audience: product.audience,
    audienceSlug: product.audienceSlug,
  };
}

async function resolveProduct(handle: string) {
  const products = await getCatalogProducts(250);
  const decodedHandle = decodeURIComponent(handle);

  const product = products.find((item) => item.handle?.toLowerCase() === decodedHandle.toLowerCase() || item.id === decodedHandle) ?? null;

  return { product, products };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  const { product } = await resolveProduct(handle);

  if (!product) {
    return {
      title: "Product not found | Firaang",
    };
  }

  return {
    title: `${product.name} | Firaang`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: [{ url: product.img, width: 1200, height: 1600, alt: product.name }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;
  const { product, products } = await resolveProduct(handle);

  if (!product) {
    notFound();
  }

  return (
    <main>
      <Navbar />
      <div className="h-24 md:h-28" />
      <ProductDetailsPage product={product} catalogProducts={(products.length > 0 ? products : fallbackProducts).map(toProductCardLite)} />
      <Newsletter />
    </main>
  );
}
