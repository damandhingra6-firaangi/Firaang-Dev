import { ReactNode } from "react";
import { Metadata } from "next";
import { fallbackProducts } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";
import { getStorefrontProducts } from "@/lib/shopify";
import { buildCategoryTree } from "@/lib/product-taxonomy";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ category: string }>;
};

// Helper function to normalize slugs for comparison
function normalizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/-/g, " ");
}

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { category: categorySlug } = await params;

  // Fetch products to get category info
  const storefrontProducts = await getStorefrontProducts(40);
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;
  const categoryTree = buildCategoryTree(products);

  // Find category
  const normalizedCategorySlug = normalizeSlug(categorySlug);
  const categoryNode = categoryTree.find(
    (cat) => cat.slug.toLowerCase() === normalizedCategorySlug
  );

  const categoryName = categoryNode?.name ?? categorySlug;
  const title = `${categoryName}`;
  const description = `Browse our collection of ${categoryName.toLowerCase()}`;

  return createPageMetadata({
    title,
    description,
    path: `/shop/${encodeURIComponent(categorySlug)}`,
  });
}

export default function CategoryLayout({ children }: LayoutProps) {
  return children;
}
