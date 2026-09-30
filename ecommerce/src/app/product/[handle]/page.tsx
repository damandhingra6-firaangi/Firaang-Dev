import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import ProductDetailsPage, { type ProductCardLite } from "@/components/ProductDetailsPage";
import type { GridProduct } from "@/lib/catalog";
import { getCatalogProducts } from "@/lib/products";
import { SITE_NAME, getSiteUrl } from "@/lib/site";
import { buildBreadcrumbSchema, buildProductSchema } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ handle: string }>;
};

function toProductCardLite(product: GridProduct): ProductCardLite {
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
  const products = await getCatalogProducts(250, { cacheMode: "no-store" });
  const decodedHandle = decodeURIComponent(handle);

  const product = products.find((item) => item.handle?.toLowerCase() === decodedHandle.toLowerCase() || item.id === decodedHandle) ?? null;

  return { product, products };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  const { product } = await resolveProduct(handle);

  if (!product) {
    return {
      title: `Product not found | ${SITE_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalHandle = product.handle?.trim();
  const canonicalPath = canonicalHandle
    ? `/product/${encodeURIComponent(canonicalHandle)}`
    : `/product/${encodeURIComponent(handle)}`;

  const normalizedDescription = product.description?.trim() || `Shop ${product.name} from ${SITE_NAME}.`;
  const description = normalizedDescription.slice(0, 160);
  const isIndexableProduct = Boolean(canonicalHandle);

  return {
    title: product.name,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: product.name,
      description,
      url: canonicalPath,
      type: "website",
      images: [{ url: product.img, width: 1200, height: 1600, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [product.img],
    },
    robots: isIndexableProduct
      ? undefined
      : {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;
  const { product, products } = await resolveProduct(handle);

  if (!product) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const canonicalHandle = product.handle?.trim() || handle;
  const productPath = `/product/${encodeURIComponent(canonicalHandle)}`;
  const productUrl = `${siteUrl}${productPath}`;
  const categoryPath = product.categorySlug ? `/shop/${encodeURIComponent(product.categorySlug)}` : "/shop";
  const subCategoryPath =
    product.categorySlug && product.subCategorySlug
      ? `/shop/${encodeURIComponent(product.categorySlug)}/${encodeURIComponent(product.subCategorySlug)}`
      : null;

  const breadcrumbItems = [
    { name: "Home", url: `${siteUrl}/` },
    { name: "Shop", url: `${siteUrl}/shop` },
    subCategoryPath
      ? {
          name: product.subCategory || "Category",
          url: `${siteUrl}${subCategoryPath}`,
        }
      : {
          name: product.category || "Shop",
          url: `${siteUrl}${categoryPath}`,
        },
    { name: product.name, url: productUrl },
  ];

  const productSchema = buildProductSchema(product, productUrl);
  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbItems);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Navbar />
      <div className="h-24 md:h-28" />
      <ProductDetailsPage product={product} catalogProducts={products.map(toProductCardLite)} />
      <Newsletter />
    </main>
  );
}
