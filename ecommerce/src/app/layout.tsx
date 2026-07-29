import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Playfair_Display, Poppins } from "next/font/google";
import AccountSessionBootstrap from "@/components/AccountSessionBootstrap";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import ToastViewport from "@/components/ToastViewport";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_LOCALE,
  SITE_NAME,
  SITE_THEME_COLOR,
  SITE_TITLE_DEFAULT,
  getSiteUrl,
  toAbsoluteUrl,
} from "@/lib/site";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  style: "normal",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-playfair",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  manifest: "/site.webmanifest",
  category: "fashion",
  keywords: [
    "Firaang",
    "premium clothing",
    "streetwear India",
    "designer t-shirts",
    "fashion jewellery",
    "modern Indian fashion",
  ],
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: toAbsoluteUrl(DEFAULT_OG_IMAGE),
        width: 1200,
        height: 630,
        alt: DEFAULT_OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [toAbsoluteUrl(DEFAULT_OG_IMAGE)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: SITE_THEME_COLOR,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={SITE_LANGUAGE}
      className={`${poppins.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AccountSessionBootstrap />
        <Suspense>
          <AnalyticsTracker />
        </Suspense>
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}