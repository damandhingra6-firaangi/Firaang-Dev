import { fallbackProducts, GridProduct } from "@/lib/catalog";
import { getStorefrontProducts } from "@/lib/shopify";

export type CheckoutLineItem = {
  productId: string;
  quantity: number;
};

export async function getCatalogProducts(limit = 80): Promise<GridProduct[]> {
  const storefrontProducts = await getStorefrontProducts(limit);
  return storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;
}

export async function resolveCheckoutItems(items: CheckoutLineItem[]) {
  const catalog = await getCatalogProducts();
  const byId = new Map(catalog.map((product) => [product.id, product]));

  const normalizedItems = items
    .map((item) => {
      const product = byId.get(item.productId);

      if (!product) {
        return null;
      }

      const quantity = Math.max(1, Math.min(10, Math.floor(item.quantity)));

      return { product, quantity };
    })
    .filter((item): item is { product: GridProduct; quantity: number } => item !== null);

  const currencyCode = normalizedItems[0]?.product.currencyCode ?? "INR";

  const totalPaise = normalizedItems.reduce((sum, item) => {
    return sum + Math.round(item.product.priceAmount * 100) * item.quantity;
  }, 0);

  return {
    items: normalizedItems,
    currencyCode,
    totalPaise,
  };
}
