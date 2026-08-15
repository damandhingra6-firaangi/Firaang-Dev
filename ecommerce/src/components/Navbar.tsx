import NavbarClient from "@/components/NavbarClient";
import { fallbackProducts } from "@/lib/catalog";
import { buildCategoryTree } from "@/lib/product-taxonomy";
import { getShopifyCollectionsContent } from "@/lib/shopify-collections";
import { getStorefrontProducts } from "@/lib/shopify";

type NavLink = {
  label: string;
  href: string;
};

export type NavSectionKey =
  | "just-dropped"
  | "shop"
  | "collections"
  | "bestsellers"
  | "sale"
  | "about";

type NavbarProps = {
  activeSection?: NavSectionKey | null;
};

function buildShopSectionHref(section: Exclude<NavSectionKey, "about">) {
  const params = new URLSearchParams({ section });
  return `/shop?${params.toString()}`;
}

function appendSectionToHref(href: string, section: Exclude<NavSectionKey, "about">) {
  const [path, rawQuery] = href.split("?");
  const params = new URLSearchParams(rawQuery ?? "");
  params.set("section", section);
  return `${path}?${params.toString()}`;
}

function toShopSubCategoryHref(categorySlug: string, subCategorySlug: string) {
  const params = new URLSearchParams({
    section: "shop",
    category: categorySlug,
    subCategory: subCategorySlug,
  });
  return `/shop?${params.toString()}`;
}

function findCollectionHrefByKeywords(
  links: Array<{ title: string; handle: string; href: string }>,
  keywords: string[],
) {
  const loweredKeywords = keywords.map((keyword) => keyword.toLowerCase());

  const match = links.find((item) => {
    const haystack = `${item.title} ${item.handle}`.toLowerCase();
    return loweredKeywords.some((keyword) => haystack.includes(keyword));
  });

  return match?.href ?? buildShopSectionHref("shop");
}

function buildShopCategoryLinks(
  categoryTree: Array<{ name: string; slug: string; subCategories: Array<{ name: string; slug: string }> }>,
): NavLink[] {
  const flattened = categoryTree.flatMap((category) =>
    category.subCategories.map((subCategory) => ({
      categoryName: category.name,
      categorySlug: category.slug,
      subCategoryName: subCategory.name,
      subCategorySlug: subCategory.slug,
    })),
  );

  const preferredSpecs: Array<{ label: string; patterns: RegExp[] }> = [
    { label: "Oversized T-Shirts", patterns: [/oversized/i] },
    { label: "Regular Fit T-Shirts", patterns: [/regular\s*fit/i, /classic/i] },
    { label: "Baby Tees", patterns: [/baby\s*tee/i] },
    { label: "Boxy Fit", patterns: [/boxy/i] },
    { label: "Acid Wash", patterns: [/acid\s*wash/i] },
  ];

  const selected: NavLink[] = [];
  const used = new Set<string>();

  for (const spec of preferredSpecs) {
    const match = flattened.find((item) => {
      const key = `${item.categorySlug}:${item.subCategorySlug}`;
      if (used.has(key)) {
        return false;
      }

      const name = item.subCategoryName.toLowerCase();
      return spec.patterns.some((pattern) => pattern.test(name));
    });

    if (!match) {
      continue;
    }

    const key = `${match.categorySlug}:${match.subCategorySlug}`;
    used.add(key);
    selected.push({
      label: spec.label,
      href: toShopSubCategoryHref(match.categorySlug, match.subCategorySlug),
    });
  }

  if (selected.length >= 5) {
    return selected;
  }

  for (const item of flattened) {
    const key = `${item.categorySlug}:${item.subCategorySlug}`;
    if (used.has(key)) {
      continue;
    }

    used.add(key);
    selected.push({
      label: item.subCategoryName,
      href: toShopSubCategoryHref(item.categorySlug, item.subCategorySlug),
    });

    if (selected.length >= 6) {
      break;
    }
  }

  return selected;
}

export default async function Navbar({ activeSection = null }: NavbarProps) {
  const products = await getStorefrontProducts(250);
  const { collections, primaryNavCollection } = await getShopifyCollectionsContent();
  const catalogForMenu = products.length > 0 ? products : fallbackProducts;
  const categoryTree = buildCategoryTree(catalogForMenu);

  const shopCategoryLinks = buildShopCategoryLinks(categoryTree);

  const collectionLinks = collections.map((collection) => ({
    title: collection.title,
    handle: collection.handle,
    href: collection.href,
  }));

  // Just Dropped always fetches the full catalog (newest-first from Shopify),
  // never filtered to a specific collection.
  const justDroppedHref = buildShopSectionHref("just-dropped");

  // Bestsellers and Sale intentionally share the same product listing page.
  const bestsellersHref = buildShopSectionHref("bestsellers");
  const saleHref = buildShopSectionHref("sale");

  const shopSectionLinks: NavLink[] = [
    { label: "All Products", href: buildShopSectionHref("shop") },
    { label: "Just Dropped", href: justDroppedHref },
    { label: "Bestsellers", href: bestsellersHref },
    { label: "Sale", href: saleHref },
  ];

  return (
    <NavbarClient
      collections={collections.map((item) => ({
        id: item.id,
        handle: item.handle,
        title: item.title,
        href: appendSectionToHref(item.href, "collections"),
        badge: item.badge,
        badgeType: item.badgeType,
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
              badgeType: primaryNavCollection.badgeType,
              isFeatured: primaryNavCollection.isFeatured,
            }
          : null
      }
      shopSectionLinks={shopSectionLinks}
      shopCategoryLinks={shopCategoryLinks}
      justDroppedHref={justDroppedHref}
      bestsellersHref={bestsellersHref}
      saleHref={saleHref}
      activeSection={activeSection}
    />
  );
}
