import { GridProduct } from "@/lib/catalog";
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl, toAbsoluteUrl } from "@/lib/site";

type BreadcrumbItem = {
  name: string;
  url: string;
};

export function buildOrganizationSchema() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}#organization`,
    name: SITE_NAME,
    url: siteUrl,
    logo: toAbsoluteUrl("/android-chrome-512x512.png"),
    sameAs: [],
  };
}

export function buildWebSiteSchema() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: SITE_NAME,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildProductSchema(product: GridProduct, productUrl: string) {
  const images = Array.from(
    new Set([product.img, ...(product.galleryImages ?? [])].filter(Boolean)),
  )
    .slice(0, 10)
    .map((src) => toAbsoluteUrl(src));

  const inStock = (product.variants ?? []).length === 0
    ? true
    : (product.variants ?? []).some((variant) => variant.availableForSale);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.description,
    image: images,
    url: productUrl,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    sku: product.handle || product.id,
    offers: {
      "@type": "Offer",
      priceCurrency: product.currencyCode || "INR",
      price: Number.isFinite(product.priceAmount) ? product.priceAmount : 0,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: productUrl,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}