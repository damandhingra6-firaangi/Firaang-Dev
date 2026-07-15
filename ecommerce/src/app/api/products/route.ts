import { NextResponse } from "next/server";
import { fallbackProducts } from "@/lib/catalog";
import { parseAttributionCookie, parseGeoFromRequestHeaders, trackAnalyticsEvent } from "@/lib/analytics";
import { applyProductFilters, buildCategoryTree } from "@/lib/product-taxonomy";
import { getStorefrontProducts } from "@/lib/shopify";

function parseCookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1];
}

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

  if (q && q.trim().length > 0) {
    const geo = parseGeoFromRequestHeaders(request.headers);
    const cookieHeader = request.headers.get("cookie") ?? "";
    const visitorId = parseCookieValue(cookieHeader, "Firaang_analytics_vid") ?? "server-anonymous";
    const sessionId = parseCookieValue(cookieHeader, "Firaang_analytics_sid") ?? `search-${Date.now()}`;
    const attribution = parseAttributionCookie(parseCookieValue(cookieHeader, "Firaang_analytics_attr"));

    await trackAnalyticsEvent({
      eventName: "search",
      visitorId,
      sessionId,
      pagePath: `/shop?q=${encodeURIComponent(q)}`,
      pageType: "collection",
      referrerUrl: request.headers.get("referer") ?? undefined,
      source: searchParams.get("utm_source") ?? attribution.source,
      campaign: searchParams.get("utm_campaign") ?? attribution.campaign,
      medium: searchParams.get("utm_medium") ?? attribution.medium,
      term: searchParams.get("utm_term") ?? attribution.term,
      content: searchParams.get("utm_content") ?? attribution.content,
      gclid: searchParams.get("gclid") ?? attribution.gclid,
      fbclid: searchParams.get("fbclid") ?? attribution.fbclid,
      msclkid: searchParams.get("msclkid") ?? attribution.msclkid,
      ttclid: searchParams.get("ttclid") ?? attribution.ttclid,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      userAgent: request.headers.get("user-agent") ?? "",
      searchTerm: q,
      metadata: {
        resultCount: filteredProducts.length,
      },
    }).catch(() => {
      // Search should remain available even if analytics write fails.
    });
  }

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
