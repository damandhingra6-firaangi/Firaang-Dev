import { fetchUpstream, getUpstreamErrorCode } from "@/lib/upstream-fetch";
import {
  MAX_INSTAGRAM_REELS,
  type InstagramShowcaseBadge,
  type InstagramShowcaseItem,
  type InstagramViewMetric,
} from "@/lib/instagram-showcase";

const DEFAULT_GRAPH_API_VERSION = "v27.0";
const INSTAGRAM_MEDIA_LIMIT = 50;
const INSTAGRAM_FEED_REVALIDATE_SECONDS = 900;
const INSIGHTS_CONCURRENCY = 5;
const INSIGHTS_PERMISSION_RECHECK_MS = 30 * 60 * 1000;
const INSIGHTS_NETWORK_RECHECK_MS = 60 * 1000;
const NEW_MEDIA_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const INSTAGRAM_INSIGHTS_METRICS = ["views", "total_views", "reach"] as const;
const INSTAGRAM_VIEW_METRIC_PRIORITY: InstagramViewMetric[] = [
  "views",
  "total_views",
  "plays",
  "video_views",
  "reach",
];
const INSTAGRAM_MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "like_count",
  "comments_count",
  "total_views_count",
  "children{media_type,media_url,thumbnail_url}",
].join(",");

type InstagramGraphMedia = {
  id?: string;
  caption?: string | null;
  media_type?: string;
  media_product_type?: string;
  media_url?: string | null;
  thumbnail_url?: string | null;
  permalink?: string | null;
  timestamp?: string | null;
  view_count?: number | null;
  total_views_count?: number | null;
  like_count?: number | null;
  comments_count?: number | null;
  view_metric?: InstagramViewMetric;
  children?: {
    data?: Array<{
      media_type?: string;
      media_url?: string | null;
      thumbnail_url?: string | null;
    }>;
  };
};

type InstagramGraphResponse = {
  data?: InstagramGraphMedia[];
  error?: InstagramGraphError;
  paging?: {
    next?: string;
    cursors?: {
      after?: string;
    };
  };
};

type InstagramGraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type InstagramInsightsResponse = {
  data?: Array<{
    name?: string;
    values?: Array<{ value?: number | null }>;
  }>;
  error?: InstagramGraphError;
};

type InstagramMetricSample = {
  name: string;
  value: number | null;
};

type InstagramInsightsResult = {
  metrics: InstagramMetricSample[];
};

type InstagramFeedResult = {
  configured: boolean;
  items: InstagramShowcaseItem[];
};

type NormalizedMedia = {
  id: string;
  href: string;
  image: string;
  title: string;
  timestamp: number;
  isReel: boolean;
  videoUrl?: string;
  viewCount?: number;
  viewMetric?: InstagramViewMetric;
};

let lastSuccessfulFeed: { accountId: string; items: InstagramShowcaseItem[] } | null = null;
const disabledInsightsUntil = new Map<string, number>();

class InstagramInsightsPermissionError extends Error {}

function toInstagramMediaUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isInstagramCdn =
      hostname.endsWith(".cdninstagram.com") ||
      hostname.endsWith(".fbcdn.net") ||
      hostname === "lookaside.fbsbx.com";
    return url.protocol === "https:" && isInstagramCdn ? value : null;
  } catch {
    return null;
  }
}

function toInstagramPermalink(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && (hostname === "instagram.com" || hostname.endsWith(".instagram.com"))
      ? value
      : null;
  } catch {
    return null;
  }
}

function toCount(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined;
}

function redactUrlQuery(value?: string | null) {
  if (!value) {
    return value;
  }

  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "[invalid URL]";
  }
}

function getMediaDebugSample(media: InstagramGraphMedia) {
  return {
    ...media,
    caption: media.caption ? "[redacted]" : media.caption ?? null,
    media_url: redactUrlQuery(media.media_url),
    thumbnail_url: redactUrlQuery(media.thumbnail_url),
    permalink: redactUrlQuery(media.permalink),
    children: media.children
      ? {
          ...media.children,
          data: media.children.data?.map((child) => ({
            ...child,
            media_url: redactUrlQuery(child.media_url),
            thumbnail_url: redactUrlQuery(child.thumbnail_url),
          })),
        }
      : undefined,
  };
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isReel(media: InstagramGraphMedia) {
  return media.media_product_type === "REELS" || (!media.media_product_type && media.media_type === "VIDEO");
}

function normalizeMedia(media: InstagramGraphMedia): NormalizedMedia | null {
  const id = media.id?.trim();
  const href = toInstagramPermalink(media.permalink);
  const firstChild = media.children?.data?.[0];
  const image = toInstagramMediaUrl(
    media.media_type === "VIDEO"
      ? media.thumbnail_url ?? firstChild?.thumbnail_url ?? (firstChild?.media_type === "IMAGE" ? firstChild.media_url : null)
      : media.media_url ?? media.thumbnail_url ?? firstChild?.thumbnail_url ?? firstChild?.media_url,
  );

  if (!id || !href || !image) {
    return null;
  }

  return {
    id,
    href,
    image,
    title: media.caption?.trim() || (isReel(media) ? "Instagram Reel" : "Instagram Post"),
    timestamp: toTimestamp(media.timestamp),
    isReel: isReel(media),
    videoUrl: media.media_type === "VIDEO" ? toInstagramMediaUrl(media.media_url) ?? undefined : undefined,
    viewCount: toCount(media.view_count) ?? toCount(media.total_views_count),
    viewMetric:
      media.view_metric ??
      (toCount(media.total_views_count) !== undefined
        ? "total_views"
        : toCount(media.view_count) !== undefined
          ? "views"
          : undefined),
  };
}

async function getInstagramMediaInsights(
  mediaId: string,
  apiVersion: string,
  accessToken: string,
  logResponse = false,
): Promise<InstagramInsightsResult> {
  const endpoint = new URL(
    `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(mediaId)}/insights`,
  );
  endpoint.searchParams.set("metric", INSTAGRAM_INSIGHTS_METRICS.join(","));

  const response = await fetchUpstream(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "force-cache",
    next: { revalidate: INSTAGRAM_FEED_REVALIDATE_SECONDS },
  } as RequestInit, {
    timeoutMs: 8_000,
    maxAttempts: 1,
    retrySafe: true,
    operation: "instagram-reel-insights",
    logFailures: false,
  });
  const payload = (await response.json()) as InstagramInsightsResponse;
  if (logResponse) {
    console.info("[instagram-reels] Reel Insights API response", {
      mediaId,
      status: response.status,
      payload,
    });
  }

  if (!response.ok || payload.error) {
    const apiError = payload.error;
    const message =
      `Instagram media insights failed with ${response.status}: ${apiError?.message ?? "No error message"}${
        apiError?.code !== undefined ? ` (code ${apiError.code})` : ""
      }`;
    if (apiError?.code === 10) {
      throw new InstagramInsightsPermissionError(message);
    }
    throw new Error(message);
  }

  const metrics = (payload.data ?? []).map((metric) => ({
    name: metric.name ?? "unknown",
    value: toCount(metric.values?.[0]?.value) ?? null,
  }));

  return { metrics };
}

async function addInstagramMediaMetrics(
  accountId: string,
  media: InstagramGraphMedia[],
  apiVersion: string,
  accessToken: string,
): Promise<{
  media: InstagramGraphMedia[];
  metricsByMediaId: Map<string, InstagramMetricSample[]>;
}> {
  const mediaToMeasure = media;
  const metricsByMediaId = new Map<string, InstagramMetricSample[]>();
  for (const item of mediaToMeasure) {
    const id = item.id?.trim();
    if (!id) {
      continue;
    }

    const mediaMetrics: InstagramMetricSample[] = [];
    const totalViews = toCount(item.total_views_count);
    const views = toCount(item.view_count);
    if (totalViews !== undefined) mediaMetrics.push({ name: "total_views", value: totalViews });
    if (views !== undefined) mediaMetrics.push({ name: "views", value: views });
    metricsByMediaId.set(id, mediaMetrics);
  }

  const addInsightsMetrics = (id: string, metrics: InstagramMetricSample[]) => {
    const currentMetrics = metricsByMediaId.get(id) ?? [];
    const existingNames = new Set(currentMetrics.map((metric) => metric.name));
    metricsByMediaId.set(id, [
      ...currentMetrics,
      ...metrics.filter((metric) => !existingNames.has(metric.name)),
    ]);
  };
  const mediaWithSelectedMetric = () => {
    const selectedMetric = INSTAGRAM_VIEW_METRIC_PRIORITY
      .map((name, priority) => ({
        name,
        priority,
        count: mediaToMeasure.filter((item) => {
          const id = item.id?.trim();
          return id && metricsByMediaId.get(id)?.some(
            (metric) => metric.name === name && metric.value !== null,
          );
        }).length,
      }))
      .sort((left, right) => right.count - left.count || left.priority - right.priority)
      .find((metric) => metric.count > 0)?.name;
    const viewCounts = new Map<string, { count: number; metric: InstagramViewMetric }>();

    if (selectedMetric) {
      for (const item of mediaToMeasure) {
        const id = item.id?.trim();
        const metric = id
          ? metricsByMediaId.get(id)?.find(
              (candidate) => candidate.name === selectedMetric && candidate.value !== null,
            )
          : undefined;
        if (id && metric?.value !== null && metric?.value !== undefined) {
          viewCounts.set(id, { count: metric.value, metric: selectedMetric });
        }
      }
    }

    return mediaToMeasure.map((item) => {
      const id = item.id?.trim();
      const viewCount = id ? viewCounts.get(id) : undefined;
      return viewCount === undefined
        ? item
        : { ...item, view_count: viewCount.count, view_metric: viewCount.metric };
    });
  };
  const firstItem = mediaToMeasure[0];
  const firstId = firstItem?.id?.trim();
  const logResponse = process.env.INSTAGRAM_DEBUG_REEL_RESPONSE?.trim() === "1";
  const suppressionKey = `${apiVersion}:${accountId}`;
  const insightsDisabled = () => {
    const disabledUntil = disabledInsightsUntil.get(suppressionKey) ?? 0;
    if (disabledUntil <= Date.now()) {
      disabledInsightsUntil.delete(suppressionKey);
      return false;
    }
    return true;
  };
  const suppressInsights = (error: unknown, mediaId: string) => {
    const permissionDenied = error instanceof InstagramInsightsPermissionError;
    const errorCode = getUpstreamErrorCode(error);
    disabledInsightsUntil.set(
      suppressionKey,
      Date.now() + (permissionDenied ? INSIGHTS_PERMISSION_RECHECK_MS : INSIGHTS_NETWORK_RECHECK_MS),
    );
    console.warn(
      permissionDenied
        ? "[instagram-reels] Insights permission is unavailable; using media-edge metrics"
        : "[instagram-reels] Insights temporarily unavailable; using media-edge metrics",
      {
        accountId,
        mediaId,
        ...(permissionDenied ? { error: error instanceof Error ? error.message : String(error) } : { code: errorCode }),
      },
    );
  };

  if (insightsDisabled()) {
    return { media: mediaWithSelectedMetric(), metricsByMediaId };
  }

  if (firstItem && firstId) {
    try {
      const result = await getInstagramMediaInsights(firstId, apiVersion, accessToken, logResponse);
      addInsightsMetrics(firstId, result.metrics);
    } catch (error) {
      suppressInsights(error, firstId);
      return { media: mediaWithSelectedMetric(), metricsByMediaId };
    }
  }

  for (let index = 1; index < mediaToMeasure.length; index += INSIGHTS_CONCURRENCY) {
    const batch = mediaToMeasure.slice(index, index + INSIGHTS_CONCURRENCY);
    let batchFailed = false;
    const results = await Promise.all(
      batch.map(async (item) => {
        const id = item.id?.trim();
        if (!id) {
          return null;
        }

        try {
          const result = await getInstagramMediaInsights(id, apiVersion, accessToken);
          return { id, result };
        } catch (error) {
          if (!batchFailed) {
            batchFailed = true;
            suppressInsights(error, id);
          }
          return null;
        }
      }),
    );

    for (const result of results) {
      if (result) {
        addInsightsMetrics(result.id, result.result.metrics);
      }
    }
    if (batchFailed) {
      break;
    }
  }

  return {
    media: mediaWithSelectedMetric(),
    metricsByMediaId,
  };
}

export function buildInstagramShowcaseItemsFromMedia(
  media: InstagramGraphMedia[],
  now = new Date(),
  maxItems = MAX_INSTAGRAM_REELS,
): InstagramShowcaseItem[] {
  if (maxItems <= 0) {
    return [];
  }

  const normalizedMedia = media
    .map(normalizeMedia)
    .filter((item): item is NormalizedMedia => item !== null)
    .sort((left, right) => right.timestamp - left.timestamp);
  const reels = normalizedMedia.filter((item) => item.isReel);
  const candidates = reels.length > 0 ? reels : normalizedMedia;

  if (candidates.length === 0) {
    return [];
  }

  const nowMs = now.getTime();
  const newest = candidates[0];
  return [...candidates]
    .sort(
      (left, right) =>
        (right.viewCount ?? -1) - (left.viewCount ?? -1) || right.timestamp - left.timestamp,
    )
    .slice(0, maxItems)
    .map((item, index) => {
      const age = nowMs - item.timestamp;
      const badges: InstagramShowcaseBadge[] = [];

      if (index === 0 && item.viewCount !== undefined && item.viewMetric !== "reach") {
        badges.push("Most Viewed");
      }
      if (item.id === newest.id && age >= 0 && age <= NEW_MEDIA_WINDOW_MS) badges.push("New");

      return {
        id: item.id,
        href: item.href,
        image: item.image,
        alt: item.title,
        title: item.title,
        isNew: badges.includes("New"),
        videoUrl: item.videoUrl,
        viewCount: item.viewCount,
        viewMetric: item.viewMetric,
        badges,
        isInstagramMedia: true,
        isReel: item.isReel,
      };
    });
}

export async function getInstagramReelFeed(): Promise<InstagramFeedResult> {
  const accountId = process.env.INSTAGRAM_USER_ID?.trim();
  const accessToken = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN?.trim();

  if (!accountId || !accessToken) {
    return { configured: false, items: [] };
  }

  const configuredVersion = process.env.INSTAGRAM_GRAPH_API_VERSION?.trim();
  const apiVersion = configuredVersion && /^v\d+\.\d+$/.test(configuredVersion)
    ? configuredVersion
    : DEFAULT_GRAPH_API_VERSION;
  const endpoint = new URL(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(accountId)}/media`);
  endpoint.searchParams.set("fields", INSTAGRAM_MEDIA_FIELDS);
  endpoint.searchParams.set("limit", String(INSTAGRAM_MEDIA_LIMIT));

  let graphErrorDetails: InstagramGraphError | undefined;

  try {
    const requestInit = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "force-cache",
      next: { revalidate: INSTAGRAM_FEED_REVALIDATE_SECONDS },
    } as RequestInit;
    const requestOptions = {
      timeoutMs: 8_000,
      maxAttempts: 2,
      retrySafe: true,
      operation: "instagram-reels",
      logFailures: false,
    };
    const mediaById = new Map<string, InstagramGraphMedia>();
    const seenCursors = new Set<string>();
    let cursor: string | undefined;

    while (true) {
      const pageEndpoint = new URL(endpoint);
      if (cursor) {
        pageEndpoint.searchParams.set("after", cursor);
      }

      const response = await fetchUpstream(pageEndpoint, requestInit, requestOptions);
      const payload = (await response.json()) as InstagramGraphResponse;
      graphErrorDetails = payload.error;

      if (!response.ok) {
        throw new Error(`Instagram Graph API request failed with ${response.status}`);
      }

      if (payload.error) {
        throw new Error(payload.error.message || "Instagram Graph API returned an error");
      }

      for (const media of payload.data ?? []) {
        if (media.id) {
          mediaById.set(media.id, media);
        }
      }

      if (!payload.paging?.next) {
        break;
      }

      const nextCursor = payload.paging.cursors?.after;
      if (!nextCursor || seenCursors.has(nextCursor)) {
        throw new Error("Instagram Graph API returned an invalid pagination cursor");
      }
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }

    const allMedia = Array.from(mediaById.values());
    const reels = allMedia.filter(isReel);
    const insightsResult = reels.length > 0
      ? await addInstagramMediaMetrics(accountId, reels, apiVersion, accessToken)
      : null;
    const mediaWithMetrics = insightsResult?.media ?? allMedia;
    const reelsWithMetrics = mediaWithMetrics.filter((media) => toCount(media.view_count) !== undefined);
    const rankingMedia = reelsWithMetrics.length > 0 ? reelsWithMetrics : mediaWithMetrics;
    const items = buildInstagramShowcaseItemsFromMedia(rankingMedia);
    if (reels.length > 0) {
      const rawMediaById = new Map(reels.map((media) => [media.id, media]));
      if (process.env.INSTAGRAM_DEBUG_REEL_RESPONSE?.trim() === "1" && reels[0]) {
        console.info("[instagram-reels] Reel media API response sample", {
          media: getMediaDebugSample(reels[0]),
        });
      }
      console.info("[instagram-reels] Reel engagement metrics", {
        accountId,
        mediaFieldsRequested: INSTAGRAM_MEDIA_FIELDS,
        mediaEdgeViewCountFieldRequested: INSTAGRAM_MEDIA_FIELDS.split(",").includes("view_count"),
        mediaLikeCountFieldRequested: INSTAGRAM_MEDIA_FIELDS.split(",").includes("like_count"),
        mediaCommentsCountFieldRequested: INSTAGRAM_MEDIA_FIELDS.split(",").includes("comments_count"),
        mediaTotalViewsCountFieldRequested: INSTAGRAM_MEDIA_FIELDS.split(",").includes("total_views_count"),
        mediaEdgeViewCountFieldReturned: reels.filter((media) =>
          Object.prototype.hasOwnProperty.call(media, "view_count"),
        ).length,
        mediaTotalViewsCountFieldReturned: reels.filter((media) =>
          Object.prototype.hasOwnProperty.call(media, "total_views_count"),
        ).length,
        insightsMetricsRequested: INSTAGRAM_INSIGHTS_METRICS,
        reelsWithSelectedMetric: reelsWithMetrics.length,
        samples: items.filter((item) => item.isReel).map((item) => {
          const rawMedia = rawMediaById.get(item.id);
          const insightsMetrics = insightsResult?.metricsByMediaId.get(item.id) ?? [];
          return {
            mediaId: item.id,
            mediaEdgeViewCountFieldPresent: rawMedia
              ? Object.prototype.hasOwnProperty.call(rawMedia, "view_count")
              : false,
            mediaEdgeViewCount: rawMedia?.view_count ?? null,
            mediaTotalViewsCountFieldPresent: rawMedia
              ? Object.prototype.hasOwnProperty.call(rawMedia, "total_views_count")
              : false,
            mediaTotalViewsCount: rawMedia?.total_views_count ?? null,
            likeCount: rawMedia?.like_count ?? null,
            commentsCount: rawMedia?.comments_count ?? null,
            insightsMetricNames: insightsMetrics.map((metric) => metric.name).join(",") || null,
            insightsMetricValues: insightsMetrics
              .map((metric) => `${metric.name}=${metric.value ?? "unavailable"}`)
              .join(",") || null,
            displayedMetric: item.viewMetric ?? null,
            displayedCount: item.viewCount ?? null,
          };
        }),
      });
    }
    if (items.length > 0) {
      lastSuccessfulFeed = { accountId, items };
    }

    return { configured: true, items };
  } catch (error) {
    console.warn("[instagram-reels] Graph API request failed", {
      accountId,
      error: error instanceof Error ? error.message : String(error),
      ...(graphErrorDetails
        ? {
            graphError: {
              message: graphErrorDetails.message,
              type: graphErrorDetails.type,
              code: graphErrorDetails.code,
              error_subcode: graphErrorDetails.error_subcode,
              fbtrace_id: graphErrorDetails.fbtrace_id,
            },
          }
        : {}),
    });

    return {
      configured: true,
      items: lastSuccessfulFeed?.accountId === accountId ? lastSuccessfulFeed.items : [],
    };
  }
}
