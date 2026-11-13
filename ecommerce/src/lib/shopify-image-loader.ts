export function isShopifyCdnImage(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === "cdn.shopify.com";
  } catch {
    return false;
  }
}

export function shopifyImageLoader({ src, width }: { src: string; width: number }): string {
  if (!isShopifyCdnImage(src)) return src;
  const url = new URL(src);
  url.searchParams.set("width", String(width));
  return url.toString();
}