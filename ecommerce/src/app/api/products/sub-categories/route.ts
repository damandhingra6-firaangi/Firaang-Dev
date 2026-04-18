import { NextResponse } from "next/server";
import { fallbackProducts } from "@/lib/catalog";
import { buildCategoryTree } from "@/lib/product-taxonomy";
import { getStorefrontProducts } from "@/lib/shopify";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") ?? "").trim();

  if (!category) {
    return NextResponse.json({ error: "category query param is required" }, { status: 400 });
  }

  const storefrontProducts = await getStorefrontProducts(40);
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;
  const categories = buildCategoryTree(products);

  const categoryNode = categories.find(
    (item) => item.slug.toLowerCase() === category.toLowerCase() || item.name.toLowerCase() === category.toLowerCase()
  );

  return NextResponse.json({
    category,
    subCategories: categoryNode?.subCategories ?? [],
  });
}
