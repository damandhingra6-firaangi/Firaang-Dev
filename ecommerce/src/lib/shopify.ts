import { GridProduct } from "@/lib/catalog";

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

type MoneyV2 = {
  amount: string;
  currencyCode: string;
};

type ShopifyProductsResponse = {
  data?: {
    products?: {
      edges?: Array<{
        node: {
          id: string;
          title: string;
          description: string;
          featuredImage: { url: string; altText: string | null } | null;
          priceRange: {
            minVariantPrice: MoneyV2;
          };
          compareAtPriceRange: {
            minVariantPrice: MoneyV2;
          };
        };
      }>;
    };
  };
};

const productsQuery = `#graphql
  query GetHomeProducts($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          description
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

function normalizeStoreDomain(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatMoney(amount: string, currencyCode: string) {
  const numericValue = Number.parseFloat(amount);

  if (Number.isNaN(numericValue)) {
    return amount;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export async function getStorefrontProducts(limit = 10): Promise<GridProduct[]> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!storeDomain || !storefrontAccessToken) {
    return [];
  }

  const endpoint = `https://${normalizeStoreDomain(storeDomain)}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
    },
    body: JSON.stringify({
      query: productsQuery,
      variables: { first: limit },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as ShopifyProductsResponse;
  const productEdges = json.data?.products?.edges ?? [];

  return productEdges
    .map(({ node }) => {
      const imageUrl = node.featuredImage?.url;

      if (!imageUrl) {
        return null;
      }

      return {
        id: node.id,
        name: node.title,
        price: formatMoney(
          node.priceRange.minVariantPrice.amount,
          node.priceRange.minVariantPrice.currencyCode
        ),
        priceAmount: Number.parseFloat(node.priceRange.minVariantPrice.amount),
        currencyCode: node.priceRange.minVariantPrice.currencyCode,
        oldPrice: formatMoney(
          node.compareAtPriceRange.minVariantPrice.amount,
          node.compareAtPriceRange.minVariantPrice.currencyCode
        ),
        img: imageUrl,
        description:
          node.description?.trim() ||
          "Discover premium craftsmanship and modern elegance in this signature piece.",
      } satisfies GridProduct;
    })
    .filter((product): product is GridProduct => product !== null);
}
