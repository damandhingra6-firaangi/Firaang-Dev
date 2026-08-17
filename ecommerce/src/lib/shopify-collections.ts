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
  campaignStartDateMetafield?: { value: string } | null;
  campaignEndDateMetafield?: { value: string } | null;
  isNewMetafield?: { value: string } | null;
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

export type CollectionBadgeType = "new" | "seasonal" | "trending" | null;

export type ShopifyCollectionLaunch = {
  id: string;
  handle: string;
  title: string;
  description: string;
  href: string;
  updatedAt: string;
  imageUrl: string;
  badge: string | null;
  badgeType: CollectionBadgeType;
  launchTitle: string | null;
  launchSubtitle: string | null;
  isFeatured: boolean;
  isCampaignActive: boolean;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
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
          campaignStartDateMetafield: metafield(namespace: "custom", key: "campaign_start_date") {
            value
          }
          campaignEndDateMetafield: metafield(namespace: "custom", key: "campaign_end_date") {
            value
          }
          isNewMetafield: metafield(namespace: "custom", key: "is_new") {
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

function parseCampaignDate(value: string | undefined | null, boundary: "start" | "end") {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  // YYYY-MM-DD from Shopify date metafields: treat as whole-day campaign window.
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return boundary === "start"
      ? new Date(`${normalized}T00:00:00.000Z`)
      : new Date(`${normalized}T23:59:59.999Z`);
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function isCampaignActiveNow(startDateRaw: string | null, endDateRaw: string | null, now = new Date()) {
  const startDate = parseCampaignDate(startDateRaw, "start");
  const explicitEndDate = parseCampaignDate(endDateRaw, "end");
  const endDate = explicitEndDate ?? (startDate ? parseCampaignDate(startDateRaw, "end") : null);

  if (!startDate && !endDate) {
    return null;
  }

  // Upcoming campaigns (future start) should remain visible as upcoming/new.
  // Only campaign end should retire a campaign from hero/new treatment.

  if (endDate && now > endDate) {
    return false;
  }

  return true;
}

function isIndependenceCampaignExpired(title: string, now = new Date()) {
  const lowered = title.toLowerCase();
  if (!lowered.includes("independence")) {
    return false;
  }

  const year = now.getUTCFullYear();
  const independenceDayEndUtc = new Date(Date.UTC(year, 7, 15, 23, 59, 59, 999));
  return now > independenceDayEndUtc;
}

const SEASONAL_KEYWORDS = new Set([
  "rakhi",
  "independence",
  "diwali",
  "holi",
  "christmas",
  "eid",
  "valentine",
  "new year",
  "republic",
  "navratri",
  "onam",
  "pongal",
  "ugadi",
  "baisakhi",
  "ganesh",
]);

function isSeasonalTitle(title: string) {
  const normalized = title.trim().toLowerCase();
  return FEATURED_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function getBadgeType(title: string, badge: string | null, isFeatured: boolean): CollectionBadgeType {
  if (!isFeatured) return null;
  const lower = title.toLowerCase();
  if ([...SEASONAL_KEYWORDS].some((k) => lower.includes(k))) return "seasonal";
  const badgeLower = (badge ?? "").toLowerCase();
  if (badgeLower === "trending") return "trending";
  return "new";
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
  const explicitNewFlag = parseBoolean(node.isNewMetafield?.value);
  const normalizedTitle = toTitleCase(node.title?.trim() || "") || humanizeHandle(node.handle);
  const normalizedDescription = node.description?.trim() ?? "";
  const seasonalByName = isSeasonalTitle(node.title);
  const startDateRaw = node.campaignStartDateMetafield?.value?.trim() || null;
  const endDateRaw = node.campaignEndDateMetafield?.value?.trim() || null;
  const campaignActiveState = isCampaignActiveNow(startDateRaw, endDateRaw);
  const hasCampaignWindow = campaignActiveState !== null;

  // Seasonal collections should not stay featured forever based only on title.
  // They must have an active campaign window to be treated as featured/new.
  const fallbackSeasonalFeatured =
    seasonalByName &&
    !hasCampaignWindow &&
    !isIndependenceCampaignExpired(normalizedTitle);

  const isFeatured =
    featured || launchFlag
      ? hasCampaignWindow
        ? campaignActiveState === true
        : true
      : seasonalByName
        ? campaignActiveState === true || fallbackSeasonalFeatured
        : false;

  const isCampaignActive = hasCampaignWindow ? campaignActiveState === true : isFeatured;

  const rawBadge = node.badgeMetafield?.value?.trim() || null;
  const shouldShowBadge =
    isFeatured ||
    (explicitNewFlag && (campaignActiveState === null || campaignActiveState === true));
  const badge = shouldShowBadge
    ? rawBadge ?? (explicitNewFlag || seasonalByName ? "NEW" : null)
    : null;

  return {
    id: node.id,
    handle: node.handle,
    title: normalizedTitle,
    description: normalizedDescription,
    href: `/shop?collection=${encodeURIComponent(node.handle)}`,
    updatedAt: node.updatedAt,
    imageUrl: resolveBannerImage(node),
    badge,
    badgeType: getBadgeType(normalizedTitle, badge, isFeatured),
    launchTitle: node.launchTitleMetafield?.value?.trim() || null,
    launchSubtitle: node.launchSubtitleMetafield?.value?.trim() || null,
    isFeatured,
    isCampaignActive,
    campaignStartDate: startDateRaw,
    campaignEndDate: endDateRaw,
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
