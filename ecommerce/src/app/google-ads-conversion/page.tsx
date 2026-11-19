import type { Metadata } from "next";
import GoogleAdsConversionRedirect from "@/components/GoogleAdsConversionRedirect";

export const metadata: Metadata = {
  title: "Google Ads Conversion",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function GoogleAdsConversionPage() {
  return <GoogleAdsConversionRedirect />;
}
