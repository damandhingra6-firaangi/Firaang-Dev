import { GridProduct, ProductMedia, ProductSizeChart } from "@/lib/catalog";
import { convertAmount, formatCurrency, toSupportedCurrency } from "@/lib/currency";
import { deriveProductFit } from "@/lib/product-fit";
import { deriveProductTaxonomy } from "@/lib/product-taxonomy";

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const SHOPIFY_PRODUCTS_REVALIDATE_SECONDS = Math.max(
  60,
  Number.parseInt(process.env.SHOPIFY_PRODUCTS_REVALIDATE_SECONDS ?? "300", 10) || 300,
);
// Maximum time to wait for a single Shopify API page request before aborting.
const SHOPIFY_FETCH_TIMEOUT_MS = 10_000;

type MoneyV2 = {
  amount: string;
  currencyCode: string;
};

type ShopifyProductsResponse = {
  data?: {
    products?: {
      pageInfo?: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      edges?: Array<{
        cursor?: string;
        node: {
          id: string;
          handle: string;
          title: string;
          productType: string;
          tags: string[];
          /** ISO-8601 date-time when the product was first published to the storefront. */
          publishedAt: string;
          fitCustom?: {
            value: string;
          } | null;
          fitTypeCustom?: {
            value: string;
          } | null;
          styleFitCustom?: {
            value: string;
          } | null;
          fitDetails?: {
            value: string;
          } | null;
          description: string;
          featuredImage: { url: string; altText: string | null } | null;
          images?: {
            nodes?: Array<{
              url: string;
              altText: string | null;
            }>;
          };
          media?: {
            nodes?: Array<{
              __typename: string;
              image?: {
                url: string;
                altText: string | null;
              } | null;
              previewImage?: {
                url: string;
                altText: string | null;
              } | null;
              sources?: Array<{
                url: string;
                mimeType: string;
              }>;
            }>;
          };
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
          selectedOrFirstAvailableVariant?: {
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
          } | null;
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

type ShopifyProductEdge = NonNullable<
  NonNullable<NonNullable<ShopifyProductsResponse["data"]>["products"]>["edges"]
>[number];

type ShopifyProductNode = ShopifyProductEdge["node"];

type ShopifyCollectionProductsResponse = {
  data?: {
    collection?: {
      products?: {
        pageInfo?: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
        edges?: Array<{
          cursor?: string;
          node: ShopifyProductNode;
        }>;
      };
    } | null;
  };
};

const productsQuery = `#graphql
  query GetHomeProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          id
          handle
          title
          productType
          tags
          publishedAt
          fitCustom: metafield(namespace: "custom", key: "fit") {
            value
          }
          fitTypeCustom: metafield(namespace: "custom", key: "fit_type") {
            value
          }
          styleFitCustom: metafield(namespace: "custom", key: "style_fit") {
            value
          }
          fitDetails: metafield(namespace: "details", key: "fit") {
            value
          }
          description
          featuredImage {
            url
            altText
          }
          images(first: 20) {
            nodes {
              url
              altText
            }
          }
          media(first: 20) {
            nodes {
              __typename
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
              ... on Video {
                previewImage {
                  url
                  altText
                }
                sources {
                  url
                  mimeType
                }
              }
            }
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
          selectedOrFirstAvailableVariant {
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
`;

const collectionProductsQuery = `#graphql
  query GetCollectionProducts($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      products(first: $first, after: $after, sortKey: CREATED, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          cursor
          node {
            id
            handle
            title
            productType
            tags
            fitCustom: metafield(namespace: "custom", key: "fit") {
              value
            }
            fitTypeCustom: metafield(namespace: "custom", key: "fit_type") {
              value
            }
            styleFitCustom: metafield(namespace: "custom", key: "style_fit") {
              value
            }
            fitDetails: metafield(namespace: "details", key: "fit") {
              value
            }
            description
            featuredImage {
              url
              altText
            }
            images(first: 20) {
              nodes {
                url
                altText
              }
            }
            media(first: 20) {
              nodes {
                __typename
                ... on MediaImage {
                  image {
                    url
                    altText
                  }
                }
                ... on Video {
                  previewImage {
                    url
                    altText
                  }
                  sources {
                    url
                    mimeType
                  }
                }
              }
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
            selectedOrFirstAvailableVariant {
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
`;

function normalizeStoreDomain(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getStableDynamicDiscountPercent(seed: string) {
  const buckets = [10, 20, 30] as const;
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return buckets[hash % buckets.length];
}

function getDynamicCompareAtAmount(priceAmount: number, seed: string) {
  const base = Number.isFinite(priceAmount) ? priceAmount : 0;

  if (base <= 0) {
    return null;
  }

  const percent = getStableDynamicDiscountPercent(seed);
  const compare = base / (1 - percent / 100);
  const rounded = Math.ceil(compare / 10) * 10;
  return rounded > base ? rounded : base + 10;
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

function isCellValue(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

function tryBuildChartFromObjectRows(
  objectRows: Array<Record<string, string | number>>,
  headersOverride?: string[],
  note?: string,
): ProductSizeChart | undefined {
  if (objectRows.length === 0) {
    return undefined;
  }

  const dataKeys = Array.from(new Set(objectRows.flatMap((row) => Object.keys(row))));
  const headerKeys = headersOverride && headersOverride.length > 0 ? headersOverride : dataKeys;

  if (headerKeys.length === 0) {
    return undefined;
  }

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

  const rows = objectRows.map((row) =>
    canonicalHeaderOrder.map((canonicalHeader) => {
      const sourceKeys = canonicalToSourceKeys.get(canonicalHeader) ?? [canonicalHeader];
      const rawValue = sourceKeys
        .map((sourceKey) => {
          const normalizedKey = normalizeHeaderKey(sourceKey);

          return row[sourceKey] ?? row[sourceKey.toLowerCase()] ?? row[normalizedKey];
        })
        .find((value) => value !== undefined && value !== null);

      return rawValue === undefined || rawValue === null ? "-" : String(rawValue);
    })
  );

  return {
    headers: canonicalHeaderOrder,
    rows,
    note,
  };
}

function tryBuildChartFromSizeKeyedObject(
  sizeKeyedObject: Record<string, unknown>,
  note?: string,
): ProductSizeChart | undefined {
  const rows = Object.entries(sizeKeyedObject)
    .filter(([size, value]) => {
      return (
        size.trim().length > 0 &&
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      );
    })
    .map(([size, value]) => ({ Size: size, ...(value as Record<string, unknown>) }));

  if (rows.length === 0) {
    return undefined;
  }

  const normalizedRows = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row)
        .filter(([, cell]) => isCellValue(cell))
        .map(([key, cell]) => [key, cell as string | number])
    )
  );

  if (normalizedRows.some((row) => Object.keys(row).length === 0)) {
    return undefined;
  }

  return tryBuildChartFromObjectRows(normalizedRows, undefined, note);
}

function parseSizeChartContent(parsed: unknown): ProductSizeChart | undefined {
  if (!parsed) {
    return undefined;
  }

  if (typeof parsed === "string") {
    try {
      return parseSizeChartContent(JSON.parse(parsed));
    } catch {
      return undefined;
    }
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return undefined;
    }

    if (parsed.every((row) => Array.isArray(row) && row.every((cell) => isCellValue(cell)))) {
      const width = Math.max(...parsed.map((row) => (Array.isArray(row) ? row.length : 0)));

      if (width === 0) {
        return undefined;
      }

      const headers = Array.from({ length: width }, (_, index) => (index === 0 ? "Size" : `Column ${index + 1}`));
      const rows = parsed.map((row) =>
        headers.map((_, index) => {
          const cell = (row as Array<string | number>)[index];
          return cell === undefined || cell === null ? "-" : String(cell);
        })
      );

      return { headers, rows };
    }

    if (
      parsed.every(
        (row) =>
          typeof row === "object" &&
          row !== null &&
          !Array.isArray(row) &&
          Object.values(row as Record<string, unknown>).every((cell) => isCellValue(cell))
      )
    ) {
      return tryBuildChartFromObjectRows(parsed as Array<Record<string, string | number>>);
    }

    return undefined;
  }

  if (typeof parsed !== "object") {
    return undefined;
  }

  const objectValue = parsed as Record<string, unknown>;
  const note = typeof objectValue.note === "string" ? objectValue.note : undefined;

  if (Array.isArray(objectValue.headers) && Array.isArray(objectValue.rows)) {
    const headers = (objectValue.headers as unknown[]).filter((item): item is string => typeof item === "string");
    const rows = (objectValue.rows as unknown[])
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => row.map((cell) => (isCellValue(cell) ? String(cell) : "-")));

    if (headers.length > 0 && rows.length > 0) {
      return { headers, rows, note };
    }
  }

  if (Array.isArray(objectValue.rows)) {
    if (
      objectValue.rows.every(
        (row) =>
          typeof row === "object" &&
          row !== null &&
          !Array.isArray(row) &&
          Object.values(row as Record<string, unknown>).every((cell) => isCellValue(cell))
      )
    ) {
      return tryBuildChartFromObjectRows(
        objectValue.rows as Array<Record<string, string | number>>,
        Array.isArray(objectValue.headers)
          ? (objectValue.headers as unknown[]).filter((item): item is string => typeof item === "string")
          : undefined,
        note,
      );
    }
  }

  const nestedKeys = ["data", "chart", "sizeChart", "size_chart", "table", "measurements"];
  for (const key of nestedKeys) {
    if (key in objectValue) {
      const nested = parseSizeChartContent(objectValue[key]);
      if (nested) {
        return {
          ...nested,
          note: nested.note ?? note,
        };
      }
    }
  }

  return tryBuildChartFromSizeKeyedObject(objectValue, note);
}

function parseSizeChart(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return parseSizeChartContent(JSON.parse(value));
  } catch {
    return undefined;
  }
}

export async function getStorefrontProducts(limit = 10): Promise<GridProduct[]> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!storeDomain || !storefrontAccessToken) {
    return [];
  }

  const endpoint = `https://${normalizeStoreDomain(storeDomain)}/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const safeLimit = Math.max(1, Math.min(limit, 1000));
  const pageSize = Math.min(250, safeLimit);

  try {
    const productEdges: ShopifyProductEdge[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage && productEdges.length < safeLimit) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
        },
        body: JSON.stringify({
          query: productsQuery,
          variables: { first: Math.min(pageSize, safeLimit - productEdges.length), after: cursor },
        }),
        next: {
          revalidate: SHOPIFY_PRODUCTS_REVALIDATE_SECONDS,
          tags: ["shopify-products"],
        },
      });

      if (!response.ok) {
        return [];
      }

      const json = (await response.json()) as ShopifyProductsResponse;
      const pageEdges = json.data?.products?.edges ?? [];
      const pageInfo = json.data?.products?.pageInfo;

      productEdges.push(...pageEdges);
      hasNextPage = Boolean(pageInfo?.hasNextPage);
      cursor = pageInfo?.endCursor ?? null;

      if (!cursor) {
        break;
      }
    }

    return productEdges.slice(0, safeLimit).map(({ node }) => mapStorefrontProductNode(node));
  } catch (error) {
    console.error("Shopify fetch failed", error);
    return [];
  }
}

function mapStorefrontProductNode(node: ShopifyProductNode): GridProduct {
  const imageUrl = node.featuredImage?.url ?? "/cat1.jpg";
  const productMedia = (node.media?.nodes ?? []).reduce<ProductMedia[]>((acc, mediaNode) => {
    if (mediaNode.__typename === "Video") {
      const sources = mediaNode.sources ?? [];
      const selectedSource =
        sources.find((source) => source.mimeType.toLowerCase().includes("mp4")) ??
        sources[0];

      if (selectedSource?.url) {
        acc.push({
          type: "video",
          src: selectedSource.url,
          thumbnail: mediaNode.previewImage?.url ?? undefined,
          alt: mediaNode.previewImage?.altText ?? node.title,
        });
      }

      return acc;
    }

    if (mediaNode.__typename === "MediaImage" && mediaNode.image?.url) {
      acc.push({
        type: "image",
        src: mediaNode.image.url,
        alt: mediaNode.image.altText ?? node.title,
      });
    }

    return acc;
  }, []);

  const allProductImages = Array.from(
    new Set(
      [
        imageUrl,
        ...productMedia.filter((media) => media.type === "image").map((media) => media.src),
        ...(node.images?.nodes ?? []).map((image) => image.url),
        ...((node.variants?.edges ?? []).map(({ node: variantNode }) => variantNode.image?.url).filter(Boolean) as string[]),
      ].filter(Boolean)
    )
  );

  const sizeChart = parseSizeChart(node.sizeChartJson?.value) ?? parseSizeChart(node.sizeChart?.value);
  const taxonomy = deriveProductTaxonomy({
    title: node.title,
    productType: node.productType,
    tags: node.tags,
  });
  const productFit = deriveProductFit({
    fitMetafields: [node.fitCustom?.value, node.fitTypeCustom?.value, node.styleFitCustom?.value, node.fitDetails?.value],
    tags: node.tags,
    subCategory: taxonomy.subCategory,
    productType: node.productType,
    title: node.title,
  });
  const selectedVariant = node.selectedOrFirstAvailableVariant;
  const basePriceAmount = selectedVariant
    ? convertAmount(
        Number.parseFloat(selectedVariant.price.amount),
        toSupportedCurrency(selectedVariant.price.currencyCode),
        "INR",
      )
    : convertAmount(
        Number.parseFloat(node.priceRange.minVariantPrice.amount),
        toSupportedCurrency(node.priceRange.minVariantPrice.currencyCode),
        "INR",
      );
  const compareAtAmount = selectedVariant?.compareAtPrice
    ? convertAmount(
        Number.parseFloat(selectedVariant.compareAtPrice.amount),
        toSupportedCurrency(selectedVariant.compareAtPrice.currencyCode),
        "INR",
      )
    : convertAmount(
        Number.parseFloat(node.compareAtPriceRange.minVariantPrice.amount),
        toSupportedCurrency(node.compareAtPriceRange.minVariantPrice.currencyCode),
        "INR",
      );
  const resolvedCompareAtAmount =
    compareAtAmount > basePriceAmount ? compareAtAmount : getDynamicCompareAtAmount(basePriceAmount, node.id);

  return {
    id: node.id,
    handle: node.handle,
    tags: node.tags,
    publishedAt: node.publishedAt ?? undefined,
    fit: productFit,
    productType: node.productType,
    category: taxonomy.category,
    categorySlug: taxonomy.categorySlug,
    subCategory: taxonomy.subCategory,
    subCategorySlug: taxonomy.subCategorySlug,
    audience: taxonomy.audience,
    audienceSlug: taxonomy.audienceSlug,
    name: node.title,
    price: formatCurrency(basePriceAmount, "INR"),
    priceAmount: basePriceAmount,
    currencyCode: "INR",
    oldPrice: resolvedCompareAtAmount ? formatCurrency(resolvedCompareAtAmount, "INR") : "",
    img: imageUrl,
    galleryImages: allProductImages,
    productMedia,
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

        const variantPriceAmount = convertAmount(
          Number.parseFloat(variantNode.price.amount),
          toSupportedCurrency(variantNode.price.currencyCode),
          "INR",
        );
        const variantCompareAtAmount = variantNode.compareAtPrice
          ? convertAmount(
              Number.parseFloat(variantNode.compareAtPrice.amount),
              toSupportedCurrency(variantNode.compareAtPrice.currencyCode),
              "INR",
            )
          : 0;
        const resolvedVariantCompareAtAmount =
          variantCompareAtAmount > variantPriceAmount
            ? variantCompareAtAmount
            : getDynamicCompareAtAmount(variantPriceAmount, variantNode.id);

        return {
          id: variantNode.id,
          name: variantNode.title,
          availableForSale: variantNode.availableForSale,
          img: variantImage,
          price: formatCurrency(variantPriceAmount, "INR"),
          priceAmount: variantPriceAmount,
          currencyCode: "INR",
          oldPrice: resolvedVariantCompareAtAmount ? formatCurrency(resolvedVariantCompareAtAmount, "INR") : "",
          options: variantNode.selectedOptions,
        };
      })
      .filter((variant): variant is NonNullable<typeof variant> => variant !== null),
  } satisfies GridProduct;
}

export async function getStorefrontProductsByCollection(handle: string, limit = 80): Promise<GridProduct[]> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const normalizedHandle = handle.trim();

  if (!storeDomain || !storefrontAccessToken || !normalizedHandle) {
    return [];
  }

  const endpoint = `https://${normalizeStoreDomain(storeDomain)}/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const safeLimit = Math.max(1, Math.min(limit, 1000));
  const pageSize = Math.min(250, safeLimit);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SHOPIFY_FETCH_TIMEOUT_MS);

  try {
    const productNodes: ShopifyProductNode[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage && productNodes.length < safeLimit) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
        },
        body: JSON.stringify({
          query: collectionProductsQuery,
          variables: {
            handle: normalizedHandle,
            first: Math.min(pageSize, safeLimit - productNodes.length),
            after: cursor,
          },
        }),
        signal: controller.signal,
        next: {
          revalidate: SHOPIFY_PRODUCTS_REVALIDATE_SECONDS,
          tags: [`shopify-collection-${normalizedHandle.toLowerCase()}`],
        },
      });

      if (!response.ok) {
        return productNodes.length > 0
          ? productNodes.slice(0, safeLimit).map((node) => mapStorefrontProductNode(node))
          : [];
      }

      const json = (await response.json()) as ShopifyCollectionProductsResponse;
      const pageEdges = json.data?.collection?.products?.edges ?? [];
      const pageInfo = json.data?.collection?.products?.pageInfo;

      productNodes.push(...pageEdges.map((edge) => edge.node));
      hasNextPage = Boolean(pageInfo?.hasNextPage);
      cursor = pageInfo?.endCursor ?? null;

      if (!cursor) {
        break;
      }
    }

    return productNodes.slice(0, safeLimit).map((node) => mapStorefrontProductNode(node));
  } catch (error) {
    if (controller.signal.aborted) {
      console.error(`Shopify collection fetch timed out after ${SHOPIFY_FETCH_TIMEOUT_MS}ms`, handle);
    } else {
      console.error("Shopify collection fetch failed", error);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
