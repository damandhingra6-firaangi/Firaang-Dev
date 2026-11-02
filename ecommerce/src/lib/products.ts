import { GridProduct } from "@/lib/catalog";
import { getStorefrontProducts } from "@/lib/shopify";

export type CheckoutLineItem = {
  productId: string;
  quantity: number;
};

type CatalogFetchOptions = {
  cacheMode?: RequestCache;
};

export async function getCatalogProducts(limit = 250, options: CatalogFetchOptions = {}): Promise<GridProduct[]> {
  const storefrontProducts = await getStorefrontProducts(limit, options);
  return storefrontProducts;
}

export async function resolveCheckoutItems(items: CheckoutLineItem[]) {
  const catalogLimit = Math.max(250, items.length * 2 + 50);
  const catalog = await getCatalogProducts(catalogLimit);
  const byId = new Map<string, GridProduct>();

  for (const product of catalog) {
    byId.set(product.id, product);

    for (const variant of product.variants ?? []) {
      byId.set(variant.id, {
        ...product,
        id: variant.id,
        parentId: product.id,
        name:
          variant.name && variant.name !== "Default Title"
            ? `${product.name} - ${variant.name}`
            : product.name,
        img: variant.img,
        price: variant.price,
        priceAmount: variant.priceAmount,
        currencyCode: variant.currencyCode,
        oldPrice: variant.oldPrice,
      });
    }
  }

  const staleProductIds = new Set<string>();
  const normalizedItems = items
    .map((item) => {
      const product = byId.get(item.productId);

      if (!product) {
        staleProductIds.add(item.productId);
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
    staleProductIds: Array.from(staleProductIds),
  };
}
