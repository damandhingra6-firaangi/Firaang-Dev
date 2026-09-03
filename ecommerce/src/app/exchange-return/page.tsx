import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Exchange and Return",
  description: "Exchange and return policy redirection page.",
  path: "/exchange-return",
  noIndex: true,
});

export default function ExchangeReturnRedirectPage() {
  redirect("/pod-policy");
}
