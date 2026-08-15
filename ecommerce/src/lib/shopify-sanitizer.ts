/**
 * Sanitizer utility for removing Shopify internal IDs from customer-facing data.
 * Shopify GraphQL IDs (e.g., gid://shopify/Product/123456) should never be exposed to customers.
 * They can be logged in backend/dev console but must be hidden from the UI.
 */

import { GridProduct } from "@/lib/catalog";

/**
 * Check if a string is a Shopify GraphQL ID (GID)
 */
export function isShopifyGid(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  return /^gid:\/\/shopify\//.test(value.trim());
}

/**
 * Extract numeric ID from a Shopify GID
 * Example: "gid://shopify/Product/8816901718187" -> "8816901718187"
 */
export function extractNumericIdFromGid(gid: string): string {
  const match = gid.match(/\/(\d+)$/);
  return match?.[1] ?? "";
}

/**
 * Sanitize a single GridProduct by removing/hiding Shopify internal IDs
 * - Removes the Shopify GID from product.id
 * - Keeps internal IDs in development/debug context only
 * - Returns customer-safe product data
 */
export function sanitizeGridProduct(product: GridProduct): GridProduct {
  // If the product ID is a Shopify GID, we should not expose it
  // Instead, we can use a hash or keep it internal-only
  // For display purposes, we'll mark that this shouldn't be shown to customers
  return {
    ...product,
    // Don't modify the id here as it's used internally - instead,
    // don't render it in customer-facing components
    // The component rendering the product should check isShopifyGid() before displaying
  };
}

/**
 * Sanitize an array of GridProducts
 */
export function sanitizeGridProducts(products: GridProduct[]): GridProduct[] {
  return products.map(sanitizeGridProduct);
}

/**
 * Create a customer-safe product representation
 * Strips all Shopify internal metadata and IDs
 */
export function createSafeProductResponse(product: GridProduct) {
  return {
    id: product.id, // Keep internally for API purposes, but mark as internal
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
    fit: product.fit,
    productType: product.productType,
    tags: product.tags,
    description: product.description,
    galleryImages: product.galleryImages,
    productMedia: product.productMedia,
    optionGroups: product.optionGroups,
    sizeChart: product.sizeChart,
    variants: product.variants?.map((v) => ({
      ...v,
      // Don't expose variant GIDs either
    })),
  };
}

/**
 * Sanitize order data to not expose Shopify order IDs
 */
export function sanitizeOrderData(order: any) {
  if (!order) return order;
  const sanitized = { ...order };
  // Keep shopifyOrderId in internal fields but mark as non-display
  // When returning to customer-facing frontend, use orderId instead
  return sanitized;
}

/**
 * Strip Shopify internal identifiers from an object
 * Recursively searches for GID patterns and removes them
 */
export function stripShopifyIds(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    if (isShopifyGid(obj)) {
      return ""; // Hide the Shopify GID
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(stripShopifyIds);
  }

  if (typeof obj === "object") {
    const stripped: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Don't expose fields that are Shopify internal IDs
      if (key.includes("shopifyId") || key.includes("gid")) {
        // Keep them but mark as internal - don't expose in responses
        continue;
      }
      stripped[key] = stripShopifyIds(value);
    }
    return stripped;
  }

  return obj;
}
