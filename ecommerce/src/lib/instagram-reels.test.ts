import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUpstream } from "@/lib/upstream-fetch";
import { buildInstagramShowcaseItemsFromMedia, getInstagramReelFeed } from "./instagram-reels";

vi.mock("@/lib/upstream-fetch", () => ({
  fetchUpstream: vi.fn(),
}));

describe("Instagram Graph media showcase", () => {
  const now = new Date("2026-11-18T12:00:00Z");

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns at most five reels in descending view-count order with their original URLs", () => {
    const items = buildInstagramShowcaseItemsFromMedia(
      [
        {
          id: "latest",
          media_type: "VIDEO",
          media_product_type: "REELS",
          media_url: "https://scontent.cdninstagram.com/latest.mp4",
          thumbnail_url: "https://scontent.cdninstagram.com/latest.jpg",
          permalink: "https://www.instagram.com/reel/latest/?igsh=tracking",
          timestamp: "2026-11-18T10:00:00Z",
          view_count: 100,
          caption: "Latest reel",
        },
        {
          id: "most-viewed",
          media_type: "VIDEO",
          media_product_type: "REELS",
          media_url: "https://scontent.cdninstagram.com/most-viewed.mp4",
          thumbnail_url: "https://scontent.cdninstagram.com/most-viewed.jpg",
          permalink: "https://www.instagram.com/reel/most-viewed/",
          timestamp: "2026-11-10T10:00:00Z",
          view_count: 12000,
          caption: "Most viewed reel",
        },
        {
          id: "second-most-viewed",
          media_type: "VIDEO",
          media_product_type: "REELS",
          media_url: "https://scontent.cdninstagram.com/second-most-viewed.mp4",
          thumbnail_url: "https://scontent.cdninstagram.com/second-most-viewed.jpg",
          permalink: "https://www.instagram.com/reel/second-most-viewed/",
          timestamp: "2026-11-15T10:00:00Z",
          view_count: 3000,
          caption: "Second most viewed reel",
        },
        {
          id: "popular",
          media_type: "VIDEO",
          media_product_type: "REELS",
          media_url: "https://scontent.cdninstagram.com/popular.mp4",
          thumbnail_url: "https://scontent.cdninstagram.com/popular.jpg",
          permalink: "https://www.instagram.com/reel/popular/",
          timestamp: "2026-11-17T10:00:00Z",
          view_count: 600,
          caption: "Most liked reel",
        },
        {
          id: "fifth",
          media_type: "VIDEO",
          media_product_type: "REELS",
          media_url: "https://scontent.cdninstagram.com/fifth.mp4",
          thumbnail_url: "https://scontent.cdninstagram.com/fifth.jpg",
          permalink: "https://www.instagram.com/reel/fifth/",
          timestamp: "2026-11-12T10:00:00Z",
          view_count: 80,
        },
        {
          id: "sixth",
          media_type: "VIDEO",
          media_product_type: "REELS",
          media_url: "https://scontent.cdninstagram.com/sixth.mp4",
          thumbnail_url: "https://scontent.cdninstagram.com/sixth.jpg",
          permalink: "https://www.instagram.com/reel/sixth/",
          timestamp: "2026-11-11T10:00:00Z",
          view_count: 12,
        },
      ],
      now,
    );

    expect(items.map((item) => item.id)).toEqual([
      "most-viewed",
      "second-most-viewed",
      "popular",
      "latest",
      "fifth",
    ]);
    expect(items.map((item) => item.viewCount)).toEqual([12000, 3000, 600, 100, 80]);
    expect(items.find((item) => item.id === "latest")?.badges).toContain("New");
    expect(items.find((item) => item.id === "most-viewed")?.badges).toContain("Most Viewed");
    expect(items.find((item) => item.id === "latest")?.href).toBe(
      "https://www.instagram.com/reel/latest/?igsh=tracking",
    );
    expect(items.every((item) => item.isInstagramMedia && item.isReel)).toBe(true);
  });

  it("falls back to the latest Instagram posts when the account has no reels", () => {
    const items = buildInstagramShowcaseItemsFromMedia(
      [
        {
          id: "older-post",
          media_type: "IMAGE",
          media_url: "https://scontent.cdninstagram.com/older.jpg",
          permalink: "https://www.instagram.com/p/older/",
          timestamp: "2026-11-10T10:00:00Z",
          caption: "Older post",
        },
        {
          id: "latest-post",
          media_type: "IMAGE",
          media_url: "https://scontent.cdninstagram.com/latest.jpg",
          permalink: "https://www.instagram.com/p/latest/",
          timestamp: "2026-11-17T10:00:00Z",
          caption: "Latest post",
        },
      ],
      now,
    );

    expect(items.map((item) => item.id)).toEqual(["latest-post", "older-post"]);
    expect(items[0]).toMatchObject({
      title: "Latest post",
      isInstagramMedia: true,
      isReel: false,
    });
    expect(items[0]?.videoUrl).toBeUndefined();
  });

  it("ignores unsupported URLs rather than rendering untrusted media", () => {
    expect(
      buildInstagramShowcaseItemsFromMedia([
        {
          id: "invalid",
          media_type: "IMAGE",
          media_url: "https://example.com/image.jpg",
          permalink: "javascript:alert(1)",
        },
      ]),
    ).toEqual([]);
  });

  it("paginates all media and uses the Insights endpoint instead of the restricted view_count field", async () => {
    vi.stubEnv("INSTAGRAM_USER_ID", "17841447567833593");
    vi.stubEnv("INSTAGRAM_GRAPH_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_GRAPH_API_VERSION", "v27.0");

    vi.mocked(fetchUpstream).mockImplementation(async (input) => {
      const url = new URL(input.toString());

      if (url.pathname.endsWith("/media")) {
        const fields = url.searchParams.get("fields") ?? "";
        expect(fields).not.toContain("view_count");
        expect(fields).toContain("like_count");
        expect(fields).toContain("comments_count");
        expect(fields).toContain("total_views_count");
        if (url.searchParams.get("after")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "reel-2",
                  media_type: "VIDEO",
                  media_product_type: "REELS",
                  media_url: "https://scontent.cdninstagram.com/reel-2.mp4",
                  thumbnail_url: "https://scontent.cdninstagram.com/reel-2.jpg",
                  permalink: "https://www.instagram.com/reel/reel-2/",
                  timestamp: "2026-11-17T10:00:00Z",
                },
              ],
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            data: [
              {
                id: "reel-1",
                media_type: "VIDEO",
                media_product_type: "REELS",
                media_url: "https://scontent.cdninstagram.com/reel-1.mp4",
                thumbnail_url: "https://scontent.cdninstagram.com/reel-1.jpg",
                permalink: "https://www.instagram.com/reel/reel-1/",
                timestamp: "2026-11-18T10:00:00Z",
              },
            ],
            paging: {
              next: "https://graph.facebook.com/v27.0/17841447567833593/media?after=cursor-1",
              cursors: { after: "cursor-1" },
            },
          }),
          { status: 200 },
        );
      }

      if (url.pathname.endsWith("/insights")) {
        expect(url.searchParams.get("metric")).toBe("views,total_views,reach");
        return new Response(
          JSON.stringify({
            data: [{ name: "views", values: [{ value: url.pathname.endsWith("reel-2/insights") ? 4200 : 13 }] }],
          }),
          { status: 200 },
        );
      }

      return new Response(null, { status: 404 });
    });

    const result = await getInstagramReelFeed();

    expect(result.items.map((item) => [item.id, item.viewCount])).toEqual([
      ["reel-2", 4200],
      ["reel-1", 13],
    ]);
    expect(result.items.map((item) => item.viewMetric)).toEqual(["views", "views"]);
    expect(result.items[0]?.badges).toContain("Most Viewed");
    expect(fetchUpstream).toHaveBeenCalledTimes(4);
  });

  it("uses one available metric consistently when Reel Insights are incomplete", async () => {
    vi.stubEnv("INSTAGRAM_USER_ID", "17841447567833593");
    vi.stubEnv("INSTAGRAM_GRAPH_ACCESS_TOKEN", "test-token");

    vi.mocked(fetchUpstream).mockImplementation(async (input) => {
      const url = new URL(input.toString());

      if (url.pathname.endsWith("/media")) {
        return new Response(
          JSON.stringify({
            data: ["measured", "unavailable"].map((id) => ({
              id,
              media_type: "VIDEO",
              media_product_type: "REELS",
              media_url: `https://scontent.cdninstagram.com/${id}.mp4`,
              thumbnail_url: `https://scontent.cdninstagram.com/${id}.jpg`,
              permalink: `https://www.instagram.com/reel/${id}/`,
              timestamp: "2026-11-18T10:00:00Z",
            })),
          }),
          { status: 200 },
        );
      }

      if (url.pathname.endsWith("/insights")) {
        expect(url.searchParams.get("metric")).toBe("views,total_views,reach");
        return new Response(
          JSON.stringify(
            url.pathname.includes("/measured/")
              ? {
                  data: [
                    { name: "views", values: [{ value: 2358 }] },
                    { name: "reach", values: [{ value: 2000 }] },
                  ],
                }
              : { data: [{ name: "reach", values: [{ value: 4000 }] }] },
          ),
          { status: 200 },
        );
      }

      return new Response(null, { status: 404 });
    });

    const result = await getInstagramReelFeed();

    expect(result.items.map((item) => [item.id, item.viewCount, item.viewMetric])).toEqual([
      ["unavailable", 4000, "reach"],
      ["measured", 2000, "reach"],
    ]);
    expect(result.items[0]?.badges).not.toContain("Most Viewed");
  });

  it("uses the Facebook Login total_views_count media field when Insights is denied", async () => {
    vi.stubEnv("INSTAGRAM_USER_ID", "17841447567833593");
    vi.stubEnv("INSTAGRAM_GRAPH_ACCESS_TOKEN", "test-token");

    vi.mocked(fetchUpstream).mockImplementation(async (input) => {
      const url = new URL(input.toString());

      if (url.pathname.endsWith("/media")) {
        expect(url.searchParams.get("fields")).toContain("total_views_count");
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "direct-total-views",
                media_type: "VIDEO",
                media_product_type: "REELS",
                media_url: "https://scontent.cdninstagram.com/direct-total-views.mp4",
                thumbnail_url: "https://scontent.cdninstagram.com/direct-total-views.jpg",
                permalink: "https://www.instagram.com/reel/direct-total-views/",
                timestamp: "2026-11-18T10:00:00Z",
                total_views_count: 6432,
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.pathname.endsWith("/insights")) {
        return new Response(
          JSON.stringify({
            error: {
              message: "(#10) Application does not have permission for this action",
              type: "OAuthException",
              code: 10,
            },
          }),
          { status: 400 },
        );
      }

      return new Response(null, { status: 404 });
    });

    const result = await getInstagramReelFeed();

    expect(result.items.map((item) => [item.id, item.viewCount, item.viewMetric])).toEqual([
      ["direct-total-views", 6432, "total_views"],
    ]);
  });
});
