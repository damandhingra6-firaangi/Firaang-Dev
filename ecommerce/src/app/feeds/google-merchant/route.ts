import { getStorefrontProducts } from "@/lib/shopify";
import { extractNumericIdFromGid } from "@/lib/shopify-sanitizer";
import { getProductUrl, getShopifyMerchantItemId } from "@/lib/product-url";
import { SITE_NAME, getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Supplemental feed for Google Merchant Center that overrides the `link` of items
 * submitted by the Shopify Google & YouTube app (ids: shopify_{COUNTRY}_{productId}_{variantId}).
 */
export async function GET() {
  const siteUrl = getSiteUrl();
  const countryCode = (process.env.GOOGLE_MERCHANT_COUNTRY?.trim() || "IN").toUpperCase();
  const products = await getStorefrontProducts(1000, { detailLevel: "full" });

  const items: string[] = [];
  const seenIds = new Set<string>();

  for (const product of products) {
    const handle = product.handle?.trim();
    const productId = extractNumericIdFromGid(product.id);
    if (!handle || !productId) {
      continue;
    }

    const link = escapeXml(getProductUrl(siteUrl, handle));

    for (const variant of product.variants ?? []) {
      const variantId = extractNumericIdFromGid(variant.id);
      if (!variantId) {
        continue;
      }

      const itemId = getShopifyMerchantItemId(countryCode, productId, variantId);
      if (seenIds.has(itemId)) {
        continue;
      }
      seenIds.add(itemId);

      items.push(
        `<item><g:id>${escapeXml(itemId)}</g:id><g:link>${link}</g:link><g:canonical_link>${link}</g:canonical_link></item>`,
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${escapeXml(SITE_NAME)} product links</title>
<link>${escapeXml(siteUrl)}</link>
<description>Supplemental feed mapping Shopify items to ${escapeXml(SITE_NAME)} product URLs.</description>
${items.join("\n")}
</channel>
</rss>
`;

  return new Response(xml, {
    status: products.length > 0 ? 200 : 503,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
