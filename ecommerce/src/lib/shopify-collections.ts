import { cache } from "react";
import { humanizeHandle, toTitleCase } from "@/lib/text";

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const DEFAULT_REVALIDATE_SECONDS = 300;

const FEATURED_KEYWORDS = [
  "rakhi",
  "independence",
  "diwali",
  "holi",
  "christmas",
  "eid",
  "valentine",
  "new year",
  "summer sale",
  "winter",
];

const PERMANENT_COLLECTION_SLUGS = new Set(["men", "women", "genz", "gen-z"]);

type ShopifyCollectionNode = {
  id: string;
  handle: string;
  title: string;
  description: string;
  updatedAt: string;
  image: { url: string; altText: string | null } | null;
  products?: {
    nodes?: Array<{
      featuredImage: {
        url: string;
        altText: string | null;
      } | null;
    }>;
  };
  featuredMetafield?: { value: string } | null;
  launchMetafield?: { value: string } | null;
  launchTitleMetafield?: { value: string } | null;
  launchSubtitleMetafield?: { value: string } | null;
  badgeMetafield?: { value: string } | null;
  priorityMetafield?: { value: string } | null;
  bannerImageMetafield?: {
    value: string | null;
    reference?:
      | {
          __typename: "MediaImage";
          image?: { url: string; altText: string | null } | null;
        }
      | {
          __typename: "GenericFile";
          url?: string | null;
        }
      | null;
  } | null;
};

type ShopifyCollectionsResponse = {
  data?: {
    collections?: {
      pageInfo?: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      edges?: Array<{
        node: ShopifyCollectionNode;
      }>;
    };
  };
};

export type ShopifyCollectionLaunch = {
  id: string;
  handle: string;
  title: string;
  description: string;
  href: string;
  updatedAt: string;
  imageUrl: string;
  badge: string | null;
  launchTitle: string | null;
  launchSubtitle: string | null;
  isFeatured: boolean;
  priority: number;
};

export type ShopifyCollectionsContent = {
  collections: ShopifyCollectionLaunch[];
  featuredCollection: ShopifyCollectionLaunch | null;
  featuredCollections: ShopifyCollectionLaunch[];
  primaryNavCollection: ShopifyCollectionLaunch | null;
};

const collectionsQuery = `#graphql
  query DynamicCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          handle
          title
          description
          updatedAt
          image {
            url
            altText
          }
          products(first: 1) {
            nodes {
              featuredImage {
                url
                altText
              }
            }
          }
          featuredMetafield: metafield(namespace: "custom", key: "featured") {
            value
          }
          launchMetafield: metafield(namespace: "custom", key: "launch") {
            value
          }
          launchTitleMetafield: metafield(namespace: "custom", key: "launch_title") {
            value
          }
          launchSubtitleMetafield: metafield(namespace: "custom", key: "launch_subtitle") {
            value
          }
          badgeMetafield: metafield(namespace: "custom", key: "badge") {
            value
          }
          priorityMetafield: metafield(namespace: "custom", key: "priority") {
            value
          }
          bannerImageMetafield: metafield(namespace: "custom", key: "banner_image") {
            value
            reference {
              __typename
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
              ... on GenericFile {
                url
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

function parseBoolean(value: string | undefined | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function parsePriority(value: string | undefined | null) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function isSeasonalTitle(title: string) {
  const normalized = title.trim().toLowerCase();
  return FEATURED_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isPermanentCollection(title: string, handle: string) {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedHandle = handle.trim().toLowerCase();
  return PERMANENT_COLLECTION_SLUGS.has(normalizedTitle) || PERMANENT_COLLECTION_SLUGS.has(normalizedHandle);
}

function resolveBannerImage(node: ShopifyCollectionNode) {
  const metafieldReference = node.bannerImageMetafield?.reference;

  if (metafieldReference?.__typename === "MediaImage") {
    const url = metafieldReference.image?.url?.trim();
    if (url) {
      return url;
    }
  }

  if (metafieldReference?.__typename === "GenericFile") {
    const url = metafieldReference.url?.trim();
    if (url) {
      return url;
    }
  }

  const collectionImage = node.image?.url?.trim();
  if (collectionImage) {
    return collectionImage;
  }

  const firstProductImage = node.products?.nodes?.[0]?.featuredImage?.url?.trim();
  if (firstProductImage) {
    return firstProductImage;
  }

  return "/Home Page Banner.png";
}

function mapNodeToLaunch(node: ShopifyCollectionNode): ShopifyCollectionLaunch {
  const featured = parseBoolean(node.featuredMetafield?.value);
  const launchFlag = parseBoolean(node.launchMetafield?.value);
  const normalizedTitle = toTitleCase(node.title?.trim() || "") || humanizeHandle(node.handle);
  const normalizedDescription = node.description?.trim() ?? "";

  return {
    id: node.id,
    handle: node.handle,
    title: normalizedTitle,
    description: normalizedDescription,
    href: `/shop?collection=${encodeURIComponent(node.handle)}`,
    updatedAt: node.updatedAt,
    imageUrl: resolveBannerImage(node),
    badge: node.badgeMetafield?.value?.trim() || null,
    launchTitle: node.launchTitleMetafield?.value?.trim() || null,
    launchSubtitle: node.launchSubtitleMetafield?.value?.trim() || null,
    isFeatured: featured || launchFlag || isSeasonalTitle(node.title),
    priority: parsePriority(node.priorityMetafield?.value),
  };
}

async function fetchCollections(): Promise<ShopifyCollectionLaunch[]> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!storeDomain || !storefrontAccessToken) {
    return [];
  }

  const endpoint = `https://${normalizeStoreDomain(storeDomain)}/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const revalidateSeconds = Math.max(
    60,
    Number.parseInt(process.env.SHOPIFY_COLLECTIONS_REVALIDATE_SECONDS ?? `${DEFAULT_REVALIDATE_SECONDS}`, 10) ||
      DEFAULT_REVALIDATE_SECONDS,
  );

  const launches: ShopifyCollectionLaunch[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  const seenCollectionIds = new Set<string>();

  while (hasNextPage && launches.length < 500) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
      },
      body: JSON.stringify({
        query: collectionsQuery,
        variables: { first: 100, after: cursor },
      }),
      next: {
        revalidate: revalidateSeconds,
        tags: ["shopify-collections"],
      },
    });

    if (!response.ok) {
      return launches;
    }

    const json = (await response.json()) as ShopifyCollectionsResponse;
    const connection = json.data?.collections;
    const nodes = connection?.edges?.map((edge) => edge.node) ?? [];

    for (const node of nodes) {
      if (seenCollectionIds.has(node.id)) {
        continue;
      }

      seenCollectionIds.add(node.id);
      launches.push(mapNodeToLaunch(node));
    }

    hasNextPage = Boolean(connection?.pageInfo?.hasNextPage);
    cursor = connection?.pageInfo?.endCursor ?? null;
    if (!cursor) {
      break;
    }
  }

  return launches;
}

export const getShopifyCollectionsContent = cache(async (): Promise<ShopifyCollectionsContent> => {
  const launches = await fetchCollections();

  const dynamicCollections = launches
    .filter((item) => !isPermanentCollection(item.title, item.handle))
    .sort((left, right) => left.title.localeCompare(right.title, "en", { sensitivity: "base" }));

  const featuredCollections = dynamicCollections
    .filter((item) => item.isFeatured)
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });

  const featuredCollection = featuredCollections[0] ?? null;

  const primaryNavCollection = featuredCollection ?? dynamicCollections[0] ?? null;

  return {
    collections: dynamicCollections,
    featuredCollection,
    featuredCollections,
    primaryNavCollection,
  };
});
