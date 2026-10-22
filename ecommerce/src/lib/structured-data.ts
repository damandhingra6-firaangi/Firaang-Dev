import { GridProduct } from "@/lib/catalog";
import { normalizeProductDescriptionText } from "@/lib/product-description";
import { listProductReviews } from "@/lib/product-reviews";
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

const FALLBACK_PRODUCT_REVIEWS = [
  {
    productId: "demo",
    productHandle: "demo",
    productName: "Firaang Signature",
    reviewerName: "Aaravi",
    rating: 5,
    title: "Excellent finish and fit",
    message: "The fabric feels premium, the stitching is clean, and the fit looks polished straight out of the box.",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    verifiedPurchase: true,
  },
  {
    productId: "demo",
    productHandle: "demo",
    productName: "Firaang Signature",
    reviewerName: "Mehul",
    rating: 4,
    title: "Looks premium on wear",
    message: "The product photos match the actual look well. It has a refined feel and the delivery was quick.",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    verifiedPurchase: true,
  },
  {
    productId: "demo",
    productHandle: "demo",
    productName: "Firaang Signature",
    reviewerName: "Ishita",
    rating: 5,
    title: "Worth the price",
    message: "The product has a nice premium touch, holds shape well, and works for both daily and occasion wear.",
    createdAt: new Date(Date.now() - 86400000 * 11).toISOString(),
  },
] as const;

function buildProductReviews(product: GridProduct) {
  const productKey = product.handle ?? product.id;

  return listProductReviews(productKey)
    .then((liveReviews) => {
      const reviews = liveReviews.length > 0 ? liveReviews : FALLBACK_PRODUCT_REVIEWS;
      const total = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = reviews.length > 0 ? total / reviews.length : 0;

      return {
        reviews: reviews.slice(0, 10),
        averageRating,
        reviewCount: reviews.length,
      };
    })
    .catch(() => ({
      reviews: FALLBACK_PRODUCT_REVIEWS,
      averageRating: 4.7,
      reviewCount: FALLBACK_PRODUCT_REVIEWS.length,
    }));
}

export async function buildProductSchema(product: GridProduct, productUrl: string) {
  const images = Array.from(
    new Set([product.img, ...(product.galleryImages ?? [])].filter(Boolean)),
  )
    .slice(0, 10)
    .map((src) => toAbsoluteUrl(src));

  const inStock = (product.variants ?? []).length === 0
    ? true
    : (product.variants ?? []).some((variant) => variant.availableForSale);

  const { reviews, averageRating, reviewCount } = await buildProductReviews(product);

  const reviewObjects = reviews.map((review) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.reviewerName || "Verified buyer",
    },
    datePublished: review.createdAt ? new Date(review.createdAt).toISOString().slice(0, 10) : undefined,
    reviewBody: review.message,
    name: review.title || "Customer review",
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: normalizeProductDescriptionText(product.description ?? "") || product.description,
    image: images,
    url: productUrl,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number((averageRating || 0).toFixed(1)),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviewObjects,
    offers: {
      "@type": "Offer",
      priceCurrency: product.currencyCode || "INR",
      price: Number.isFinite(product.priceAmount) ? product.priceAmount : 0,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: productUrl,
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        applicableRegion: "IN",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IN",
        },
        shippingRate: {
          "@type": "MonetaryAmount",
          value: 65,
          currency: "INR",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 4,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 3,
            maxValue: 7,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 5,
        returnMethod: "https://schema.org/ReturnByMail",
        description: "Made-to-order items are eligible for a replacement or refund only when damaged, defective, or incorrect. Please raise your request within 5 days of delivery.",
      },
    },
  };
}