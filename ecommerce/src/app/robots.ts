import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/favicon.ico", "/favicon-16x16.png", "/favicon-32x32.png", "/favicon-48x48.png", "/apple-touch-icon.png", "/android-chrome-192x192.png", "/android-chrome-512x512.png", "/site.webmanifest"],
        disallow: ["/admin/", "/api/", "/account", "/checkout", "/profile"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
