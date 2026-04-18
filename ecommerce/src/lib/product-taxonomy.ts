import { GridProduct } from "@/lib/catalog";

type TaxonomyResult = {
  category: string;
  categorySlug: string;
  subCategory: string;
  subCategorySlug: string;
};

type CategoryRule = {
  category: string;
  subCategoryFallback: string;
  match: RegExp[];
};

type SubCategoryRule = {
  name: string;
  match: RegExp[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "T-Shirts",
    subCategoryFallback: "Classic T-Shirts",
    match: [/t[-\s]?shirt/i, /tee/i],
  },
  {
    category: "Dresses",
    subCategoryFallback: "Everyday Dresses",
    match: [/dress/i, /gown/i],
  },
  {
    category: "Ethnic Wear",
    subCategoryFallback: "Ethnic Sets",
    match: [/kurta/i, /palazzo/i, /anarkali/i, /lehenga/i],
  },
  {
    category: "Jewelry",
    subCategoryFallback: "Accessories",
    match: [/jewel/i, /pendant/i, /kundan/i, /necklace/i, /gem/i],
  },
];

const SUB_CATEGORY_RULES_BY_CATEGORY: Record<string, SubCategoryRule[]> = {
  "T-Shirts": [
    { name: "Gen Z T-Shirts", match: [/gen\s*z/i, /street/i, /y2k/i] },
    { name: "Oversized T-Shirts", match: [/oversized/i, /boxy/i, /relaxed/i] },
    { name: "Graphic T-Shirts", match: [/graphic/i, /print/i, /art/i, /logo/i] },
    { name: "Minimal T-Shirts", match: [/minimal/i, /solid/i, /plain/i, /essential/i] },
  ],
};

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function deriveProductTaxonomy(input: {
  title: string;
  productType?: string | null;
  tags?: string[];
}): TaxonomyResult {
  const haystack = [input.title, input.productType ?? "", ...(input.tags ?? [])].join(" ");

  const categoryRule =
    CATEGORY_RULES.find((rule) => rule.match.some((pattern) => pattern.test(haystack))) ?? {
      category: input.productType?.trim() || "Catalog",
      subCategoryFallback: "All",
      match: [],
    };

  const subCategoryRule = (SUB_CATEGORY_RULES_BY_CATEGORY[categoryRule.category] ?? []).find((rule) =>
    rule.match.some((pattern) => pattern.test(haystack))
  );

  const subCategory = subCategoryRule?.name ?? categoryRule.subCategoryFallback;

  return {
    category: categoryRule.category,
    categorySlug: slugify(categoryRule.category),
    subCategory,
    subCategorySlug: slugify(subCategory),
  };
}

export function applyProductFilters(
  products: GridProduct[],
  filters: { category?: string; subCategory?: string; q?: string }
) {
  const normalizedCategory = (filters.category ?? "").trim().toLowerCase();
  const normalizedSubCategory = (filters.subCategory ?? "").trim().toLowerCase();
  const normalizedQuery = (filters.q ?? "").trim().toLowerCase();

  return products.filter((product) => {
    const categoryMatch =
      !normalizedCategory ||
      product.categorySlug?.toLowerCase() === normalizedCategory ||
      product.category?.toLowerCase() === normalizedCategory;

    const subCategoryMatch =
      !normalizedSubCategory ||
      product.subCategorySlug?.toLowerCase() === normalizedSubCategory ||
      product.subCategory?.toLowerCase() === normalizedSubCategory;

    const queryMatch =
      !normalizedQuery ||
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.description.toLowerCase().includes(normalizedQuery);

    return categoryMatch && subCategoryMatch && queryMatch;
  });
}

export function buildCategoryTree(products: GridProduct[]) {
  const tree = new Map<string, { slug: string; subCategories: Map<string, string> }>();

  for (const product of products) {
    const category = product.category ?? "Catalog";
    const categorySlug = product.categorySlug ?? slugify(category);
    const subCategory = product.subCategory ?? "All";
    const subCategorySlug = product.subCategorySlug ?? slugify(subCategory);

    if (!tree.has(category)) {
      tree.set(category, { slug: categorySlug, subCategories: new Map() });
    }

    tree.get(category)?.subCategories.set(subCategory, subCategorySlug);
  }

  return Array.from(tree.entries())
    .map(([name, value]) => ({
      name,
      slug: value.slug,
      subCategories: Array.from(value.subCategories.entries()).map(([subName, subSlug]) => ({
        name: subName,
        slug: subSlug,
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
