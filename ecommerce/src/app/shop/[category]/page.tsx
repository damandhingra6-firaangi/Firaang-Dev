import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ShopListing from "@/components/ShopListing";
import { fallbackProducts } from "@/lib/catalog";
import { getStorefrontProducts } from "@/lib/shopify";
import { buildCategoryTree, slugify } from "@/lib/product-taxonomy";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
  searchParams?: Promise<{ q?: string; subCategory?: string }>;
};

// Helper function to normalize slugs for comparison
function normalizeSlug(slug: string): string {
  return slugify(slug);
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const searchParamsResolved = searchParams ? await searchParams : undefined;
  const query = searchParamsResolved?.q ?? "";
  const subCategory = searchParamsResolved?.subCategory ?? "";

  // Fetch products
  const storefrontProducts = await getStorefrontProducts(40);
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;

  // Build category tree to validate the requested category exists
  const categoryTree = buildCategoryTree(products);

  // Find the category by slug
  const normalizedCategorySlug = normalizeSlug(categorySlug);
  const categoryNode = categoryTree.find(
    (cat) => normalizeSlug(cat.slug) === normalizedCategorySlug
  );

  if (!categoryNode) {
    notFound();
  }

  return (
    <main>
      <Navbar />
      <div className="h-24 md:h-28" />
      <ShopListing
        products={products}
        initialQuery={query}
        initialCategory={categoryNode.name}
        initialSubCategory={subCategory}
      />
    </main>
  );
}
