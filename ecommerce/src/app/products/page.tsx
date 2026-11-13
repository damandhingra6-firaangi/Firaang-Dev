import type { Metadata } from "next";
import { generateMetadata as generateShopMetadata } from "../shop/page";

export { default } from "../shop/page";

export async function generateMetadata(
  props: Parameters<typeof generateShopMetadata>[0],
): Promise<Metadata> {
  const metadata = await generateShopMetadata(props);

  return {
    ...metadata,
    alternates: { ...metadata.alternates, canonical: "/products" },
    openGraph: { ...metadata.openGraph, url: "/products" },
  };
}