import { NextResponse } from "next/server";
import { fallbackProducts } from "@/lib/catalog";
import { getStorefrontProducts } from "@/lib/shopify";

export async function GET() {
  const storefrontProducts = await getStorefrontProducts(40);
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;

  return NextResponse.json({ products });
}
