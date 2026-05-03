import { GridProduct } from "@/lib/catalog";
import { convertAmount, formatCurrency, toSupportedCurrency } from "@/lib/currency";
import { deriveProductTaxonomy } from "@/lib/product-taxonomy";

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
          handle: string;
          title: string;
          productType: string;
          tags: string[];
          description: string;
          featuredImage: { url: string; altText: string | null } | null;
          priceRange: {
            minVariantPrice: MoneyV2;
          };
          compareAtPriceRange: {
            minVariantPrice: MoneyV2;
          };
          options?: Array<{
            name: string;
            values: string[];
          }>;
          variants?: {
            edges?: Array<{
              node: {
                id: string;
                title: string;
                availableForSale: boolean;
                image: { url: string; altText: string | null } | null;
                price: {
                  amount: string;
                  currencyCode: string;
                };
                compareAtPrice?: {
                  amount: string;
                  currencyCode: string;
                } | null;
                selectedOptions: Array<{
                  name: string;
                  value: string;
                }>;
              };
            }>;
          };
          sizeChartJson?: {
            value: string;
          } | null;
          sizeChart?: {
            value: string;
          } | null;
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
          handle
          title
          productType
          tags
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
          options {
            name
            values
          }
          sizeChartJson: metafield(namespace: "custom", key: "size_chart_json") {
            value
          }
          sizeChart: metafield(namespace: "custom", key: "size_chart") {
            value
          }
          variants(first: 250) {
            edges {
              node {
                id
                title
                availableForSale
                image {
                  url
                  altText
                }
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
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

function prettifyHeaderLabel(input: string) {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) => {
      if (!part) {
        return part;
      }

      const upper = part.toUpperCase();
      if (upper === "CM" || upper === "MM" || upper === "IN" || upper === "INCH") {
        return upper;
      }

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

const SIZE_CHART_HEADER_ALIASES: Record<string, string> = {
  size: "Size",
  sizes: "Size",
  fit_size: "Size",
  uk_size: "Size",
  us_size: "Size",
  eu_size: "Size",
  bust: "Chest",
  chest: "Chest",
  chest_cm: "Chest",
  chest_in: "Chest",
  chest_width: "Chest",
  body_chest: "Chest",
  fit_chest: "To Fit Chest",
  to_fit_chest: "To Fit Chest",
  chest_fit: "To Fit Chest",
  body_fit_chest: "To Fit Chest",
  waist: "Waist",
  waist_cm: "Waist",
  waist_in: "Waist",
  body_waist: "Waist",
  hip: "Hip",
  hips: "Hip",
  hip_cm: "Hip",
  hip_in: "Hip",
  body_hip: "Hip",
  length: "Length",
  length_cm: "Length",
  garment_length: "Length",
  top_length: "Length",
  kurta_length: "Length",
  dress_length: "Length",
  inseam_length: "Inseam",
  outseam_length: "Outseam",
  rise: "Rise",
  front_rise: "Rise",
  back_rise: "Rise",
  shoulder: "Shoulder",
  shoulder_width: "Shoulder",
  shoulder_to_shoulder: "Shoulder",
  sleeve: "Sleeve",
  sleeve_cm: "Sleeve",
  sleeve_in: "Sleeve",
  sleeve_width: "Sleeve",
  sleeve_opening: "Sleeve",
  sleeve_length: "Sleeve",
  armhole: "Armhole",
  bicep: "Bicep",
  thigh: "Thigh",
  calf: "Calf",
  bottom_opening: "Hem",
  hem: "Hem",
  sweep: "Hem",
  neck: "Neck",
  neck_opening: "Neck",
  around: "Around",
  across_front: "Across Front",
  across_back: "Across Back",
  inseam: "Inseam",
  recommended_height: "Recommended Height",
  recommended_weight: "Recommended Weight",
  weight: "Recommended Weight",
};

function normalizeHeaderKey(input: string) {
  return input.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getCanonicalHeaderLabel(input: string) {
  const normalized = normalizeHeaderKey(input);
  return SIZE_CHART_HEADER_ALIASES[normalized] ?? prettifyHeaderLabel(input);
}

function parseSizeChart(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (typeof parsed !== "object" || parsed === null || !("rows" in parsed)) {
      return undefined;
    }

    const maybeHeaders = (parsed as { headers?: unknown }).headers;
    const maybeRows = (parsed as { rows?: unknown }).rows;
    const maybeNote = (parsed as { note?: unknown }).note;

    // Format A: { headers: string[], rows: string[][] }
    if (
      Array.isArray(maybeHeaders) &&
      maybeHeaders.every((item) => typeof item === "string") &&
      Array.isArray(maybeRows) &&
      maybeRows.every(
        (row) => Array.isArray(row) && row.every((item) => typeof item === "string")
      )
    ) {
      return {
        headers: maybeHeaders,
        rows: maybeRows,
        note: typeof maybeNote === "string" ? maybeNote : undefined,
      };
    }

    // Format B: { headers?: string[], rows: Array<Record<string, string | number>> }
    if (
      Array.isArray(maybeRows) &&
      maybeRows.length > 0 &&
      maybeRows.every(
        (row) =>
          typeof row === "object" &&
          row !== null &&
          !Array.isArray(row) &&
          Object.values(row as Record<string, unknown>).every(
            (cell) => typeof cell === "string" || typeof cell === "number"
          )
      )
    ) {
      const objectRows = maybeRows as Array<Record<string, string | number>>;

      const dataKeys = Array.from(
        new Set(objectRows.flatMap((row) => Object.keys(row)))
      );

      const headerKeys =
        Array.isArray(maybeHeaders) && maybeHeaders.every((item) => typeof item === "string")
          ? maybeHeaders
          : dataKeys;

      const canonicalHeaderOrder: string[] = [];
      for (const key of headerKeys) {
        const canonical = getCanonicalHeaderLabel(key);

        if (!canonicalHeaderOrder.includes(canonical)) {
          canonicalHeaderOrder.push(canonical);
        }
      }

      const canonicalToSourceKeys = new Map<string, string[]>();
      for (const key of dataKeys) {
        const canonical = getCanonicalHeaderLabel(key);
        const existing = canonicalToSourceKeys.get(canonical) ?? [];

        if (!existing.includes(key)) {
          existing.push(key);
          canonicalToSourceKeys.set(canonical, existing);
        }
      }

      const headers = canonicalHeaderOrder;

      const rows = objectRows.map((row) =>
        canonicalHeaderOrder.map((canonicalHeader) => {
          const sourceKeys = canonicalToSourceKeys.get(canonicalHeader) ?? [canonicalHeader];
          const rawValue = sourceKeys
            .map((sourceKey) => {
              const normalizedKey = normalizeHeaderKey(sourceKey);

              return (
                row[sourceKey] ??
                row[sourceKey.toLowerCase()] ??
                row[normalizedKey]
              );
            })
            .find((value) => value !== undefined && value !== null);

          const value = rawValue;
          return value === undefined || value === null ? "-" : String(value);
        })
      );

      return {
        headers,
        rows,
        note: typeof maybeNote === "string" ? maybeNote : undefined,
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function getStorefrontProducts(limit = 10): Promise<GridProduct[]> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!storeDomain || !storefrontAccessToken) {
    return [];
  }

  const endpoint = `https://${normalizeStoreDomain(storeDomain)}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  try {
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

    return productEdges.map(({ node }) => {
      const imageUrl = node.featuredImage?.url ?? "/cat1.jpg";
      const sizeChart = parseSizeChart(node.sizeChartJson?.value) ?? parseSizeChart(node.sizeChart?.value);
      const taxonomy = deriveProductTaxonomy({
        title: node.title,
        productType: node.productType,
        tags: node.tags,
      });

      return {
        id: node.id,
        handle: node.handle,
        category: taxonomy.category,
        categorySlug: taxonomy.categorySlug,
        subCategory: taxonomy.subCategory,
        subCategorySlug: taxonomy.subCategorySlug,
        name: node.title,
        price: formatCurrency(
          convertAmount(
            Number.parseFloat(node.priceRange.minVariantPrice.amount),
            toSupportedCurrency(node.priceRange.minVariantPrice.currencyCode),
            "INR",
          ),
          "INR",
        ),
        priceAmount: convertAmount(
          Number.parseFloat(node.priceRange.minVariantPrice.amount),
          toSupportedCurrency(node.priceRange.minVariantPrice.currencyCode),
          "INR",
        ),
        currencyCode: "INR",
        oldPrice: formatCurrency(
          convertAmount(
            Number.parseFloat(node.compareAtPriceRange.minVariantPrice.amount),
            toSupportedCurrency(node.compareAtPriceRange.minVariantPrice.currencyCode),
            "INR",
          ),
          "INR",
        ),
        img: imageUrl,
        description:
          node.description?.trim() ||
          "Discover premium craftsmanship and modern elegance in this signature piece.",
        optionGroups: (node.options ?? []).map((option) => ({
          name: option.name,
          values: option.values,
        })),
        sizeChart,
        variants: (node.variants?.edges ?? [])
          .map(({ node: variantNode }) => {
            const variantImage = variantNode.image?.url ?? imageUrl;

            if (!variantImage) {
              return null;
            }

            return {
              id: variantNode.id,
              name: variantNode.title,
              availableForSale: variantNode.availableForSale,
              img: variantImage,
              price: formatCurrency(
                convertAmount(
                  Number.parseFloat(variantNode.price.amount),
                  toSupportedCurrency(variantNode.price.currencyCode),
                  "INR",
                ),
                "INR",
              ),
              priceAmount: convertAmount(
                Number.parseFloat(variantNode.price.amount),
                toSupportedCurrency(variantNode.price.currencyCode),
                "INR",
              ),
              currencyCode: "INR",
              oldPrice: variantNode.compareAtPrice
                ? formatCurrency(
                    convertAmount(
                      Number.parseFloat(variantNode.compareAtPrice.amount),
                      toSupportedCurrency(variantNode.compareAtPrice.currencyCode),
                      "INR",
                    ),
                    "INR",
                  )
                : "",
              options: variantNode.selectedOptions,
            };
          })
          .filter((variant): variant is NonNullable<typeof variant> => variant !== null),
      } satisfies GridProduct;
      });
  } catch (error) {
    console.error("Shopify fetch failed", error);
    return [];
  }
}
