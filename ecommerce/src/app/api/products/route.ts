import { NextResponse } from "next/server";
import { fallbackProducts } from "@/lib/catalog";
import { applyProductFilters, buildCategoryTree } from "@/lib/product-taxonomy";
import { getStorefrontProducts } from "@/lib/shopify";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const subCategory = searchParams.get("subCategory") ?? undefined;
  const audience = searchParams.get("audience") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const storefrontProducts = await getStorefrontProducts(40);
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;
  const filteredProducts = applyProductFilters(products, { category, subCategory, audience, q });
  const categories = buildCategoryTree(products);
  const selectedCategory =
    category
      ? categories.find(
          (item) => item.slug.toLowerCase() === category.toLowerCase() || item.name.toLowerCase() === category.toLowerCase()
        )
      : null;

  return NextResponse.json({
    products: filteredProducts,
    filters: {
      category: category ?? null,
      subCategory: subCategory ?? null,
      audience: audience ?? null,
      q: q ?? null,
    },
    categories,
    subCategories: selectedCategory?.subCategories ?? [],
    total: filteredProducts.length,
  });
}
