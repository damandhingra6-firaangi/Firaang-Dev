const LEGACY_PRODUCT_PATH_PATTERN = /^\/product\/([^/]+)\/?$/;
const SHOPIFY_PRODUCT_PATH_PATTERN = /^\/collections\/[^/]+\/products\/([^/]+)\/?$/i;

// Shopify-only query params that have no meaning on the Next.js storefront.
const SHOPIFY_ONLY_PARAMS = ["variant", "country", "currency", "_pos", "_sid", "_ss", "_psq", "_v"];

export function getProductPath(handle: string) {
  return `/products/${encodeURIComponent(handle.trim())}`;
}

export function getProductUrl(siteUrl: string, handle: string) {
  return `${siteUrl.replace(/\/+$/, "")}${getProductPath(handle)}`;
}

/**
 * Resolve legacy and collection-scoped product paths without redirecting canonical URLs.
 */
export function resolveShopifyProductUrl(url: URL): URL | null {
  const legacyMatch = url.pathname.match(LEGACY_PRODUCT_PATH_PATTERN);
  const match = legacyMatch ?? url.pathname.match(SHOPIFY_PRODUCT_PATH_PATTERN);
  if (!match) {
    return null;
  }

  let handle: string;
  try {
    handle = decodeURIComponent(match[1]).trim();
  } catch {
    return null;
  }

  if (!handle) {
    return null;
  }

  const target = new URL(url.toString());
  target.pathname = `/products/${match[1]}`;
  if (!legacyMatch) {
    for (const param of SHOPIFY_ONLY_PARAMS) {
      target.searchParams.delete(param);
    }
  }

  return target;
}

export function getShopifyMerchantItemId(countryCode: string, productId: string, variantId: string) {
  return `shopify_${countryCode.toUpperCase()}_${productId}_${variantId}`;
}
