import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ShopListing from "@/components/ShopListing";
import { fallbackProducts } from "@/lib/catalog";
import { getStorefrontProducts } from "@/lib/shopify";
import { buildCategoryTree } from "@/lib/product-taxonomy";

type CategoryPageProps = {
  params: Promise<{ category: string; subCategory: string }>;
  searchParams?: Promise<{ q?: string }>;
};

// Helper function to normalize slugs for comparison
function normalizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/-/g, " ");
}

export default async function CategorySubCategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { category: categorySlug, subCategory: subCategorySlug } = await params;
  const searchParamsResolved = searchParams ? await searchParams : undefined;
  const query = searchParamsResolved?.q ?? "";

  // Fetch products
  const storefrontProducts = await getStorefrontProducts(40);
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;

  // Build category tree to validate the requested category and sub-category exist
  const categoryTree = buildCategoryTree(products);

  // Find the category by slug
  const normalizedCategorySlug = normalizeSlug(categorySlug);
  const categoryNode = categoryTree.find(
    (cat) => cat.slug.toLowerCase() === normalizedCategorySlug
  );

  if (!categoryNode) {
    notFound();
  }

  // Find the sub-category by slug
  const normalizedSubCategorySlug = normalizeSlug(subCategorySlug);
  const subCategoryNode = categoryNode.subCategories.find(
    (subCat) => subCat.slug.toLowerCase() === normalizedSubCategorySlug
  );

  if (!subCategoryNode) {
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
        initialSubCategory={subCategoryNode.name}
      />
    </main>
  );
}
