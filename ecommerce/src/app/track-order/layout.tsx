import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Track Order",
  description: "Track your Firaang order status using order ID and email.",
  path: "/track-order",
  noIndex: true,
});

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
