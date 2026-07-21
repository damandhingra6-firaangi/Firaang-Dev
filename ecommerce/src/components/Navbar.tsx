import NavbarClient from "@/components/NavbarClient";
import { getShopifyCollectionsContent } from "@/lib/shopify-collections";

export default async function Navbar() {
  const { collections, primaryNavCollection } = await getShopifyCollectionsContent();

  return (
    <NavbarClient
      collections={collections.map((item) => ({
        id: item.id,
        handle: item.handle,
        title: item.title,
        href: item.href,
        badge: item.badge,
        isFeatured: item.isFeatured,
      }))}
      primaryCollection={
        primaryNavCollection
          ? {
              id: primaryNavCollection.id,
              handle: primaryNavCollection.handle,
              title: primaryNavCollection.title,
              href: primaryNavCollection.href,
              badge: primaryNavCollection.badge,
              isFeatured: primaryNavCollection.isFeatured,
            }
          : null
      }
    />
  );
}
