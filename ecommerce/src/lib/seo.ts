import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  toAbsoluteUrl,
} from "@/lib/site";

type PageMetadataInput = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

export function createPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  imageAlt = DEFAULT_OG_IMAGE_ALT,
  type = "website",
  noIndex = false,
}: PageMetadataInput): Metadata {
  const canonical = path === "/" ? "/" : path.replace(/\/$/, "") || "/";
  const absoluteImage = toAbsoluteUrl(image);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type,
      images: [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteImage],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : undefined,
  };
}
