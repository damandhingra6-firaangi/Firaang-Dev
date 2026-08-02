import { GridProduct } from "@/lib/catalog";

type TaxonomyResult = {
  category: string;
  categorySlug: string;
  subCategory: string;
  subCategorySlug: string;
  audience: string;
  audienceSlug: string;
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

const CANONICAL_TSHIRT_SUBCATEGORIES = [
  "Devotional",
  "Mandala Magic",
  "Animal",
  "Games & Sports",
  "Anime Art",
  "Dark Art",
  "Abstract Art",
  "Motivation",
  "Yoga & Wellness",
  "Gothic",
  "Gen Z T-Shirts",
  "Oversized T-Shirts",
  "Graphic T-Shirts",
  "Minimal T-Shirts",
] as const;

const TSHIRT_SUBCATEGORY_ORDER = new Map(
  CANONICAL_TSHIRT_SUBCATEGORIES.map((name, index) => [name.toLowerCase(), index])
);

type CategoryTagOverride = {
  category: string;
  subCategoryFallback: string;
  match: RegExp[];
};

const CATEGORY_TAG_OVERRIDES: CategoryTagOverride[] = [
  {
    category: "Half-Shirts",
    subCategoryFallback: "All Half-Shirts",
    match: [/\bhalf[-_\s]?shirts?\b/i, /\bcategory\s*[:=]\s*half[-_\s]?shirts?\b/i],
  },
  {
    category: "Hoodies",
    subCategoryFallback: "All Hoodies",
    match: [/\bhoodies?\b/i, /\bcategory\s*[:=]\s*hoodies?\b/i],
  },
  {
    category: "Full-Sleeve T-shirt",
    subCategoryFallback: "All Full-Sleeve T-shirts",
    match: [/\bsweat[-_\s]?shirts?\b/i, /\bcrew[-_\s]?necks?\b/i, /\bpullovers?\b/i, /\bcategory\s*[:=]\s*sweat[-_\s]?shirts?\b/i],
  },
  {
    category: "T-Shirts",
    subCategoryFallback: "Classic T-Shirts",
    match: [/\bt[-_\s]?shirts?\b/i, /\bcategory\s*[:=]\s*t[-_\s]?shirts?\b/i],
  },
  {
    category: "Bottomwear",
    subCategoryFallback: "All Bottomwear",
    match: [
      /\bpants?\b/i,
      /\bjoggers?\b/i,
      /\blowers?\b/i,
      /\btrousers?\b/i,
      /\bshorts\b/i,
      /\bpalazzos?\b/i,
      /\blounge[-_\s]?pants?\b/i,
      /\bbottomwear\b/i,
      /\bcargo[-_\s]?pants?\b/i,
      /\bcategory\s*[:=]\s*bottomwear\b/i,
      /\bcategory\s*[:=]\s*pants?\b/i,
      /\bcategory\s*[:=]\s*lowers?\b/i,
    ],
  },
  {
    category: "Caps",
    subCategoryFallback: "All Caps",
    match: [/\bcaps?\b/i, /\bcategory\s*[:=]\s*caps?\b/i],
  },
];

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "Half-Shirts",
    subCategoryFallback: "All Half-Shirts",
    match: [/\bhalf[-\s]?shirt\b/i, /\bshort[-\s]?sleeve[-\s]?shirt\b/i, /\bhalf[-\s]?sleeve\b/i],
  },
  {
    category: "Hoodies",
    subCategoryFallback: "All Hoodies",
    match: [/\bhoodie\b/i],
  },
  {
    category: "Sweatshirts",
    subCategoryFallback: "All Sweatshirts",
    match: [/\bsweat[-\s]?shirt\b/i, /\bcrewneck\b/i, /\bcrew[-\s]neck\b/i, /\bfleece\b/i, /\bpullover\b/i],
  },
  {
    category: "T-Shirts",
    subCategoryFallback: "Classic T-Shirts",
    match: [/\bt[-\s]?shirt\b/i, /\btee\b/i],
  },
  {
    category: "Bottomwear",
    subCategoryFallback: "All Bottomwear",
    match: [
      /\bpants?\b/i,
      /\bjoggers?\b/i,
      /\blowers?\b/i,
      /\btrousers?\b/i,
      /\bshorts\b/i,
      /\bpalazzos?\b/i,
      /\blounge[-\s]?pants?\b/i,
      /\bbottomwear\b/i,
      /\bcargo[-\s]?pants?\b/i,
    ],
  },
  {
    category: "Caps",
    subCategoryFallback: "All Caps",
    match: [/\bcap\b/i, /snapback/i, /baseball\s*cap/i, /trucker\s*cap/i],
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
    { name: "Mandala Magic", match: [/mandala/i, /mandala\s*magic/i, /mandalamagic/i] },
    {
      name: "Devotional",
      match: [
        /\bshiv\b/i,
        /\bshiva\b/i,
        /\bmahadev\b/i,
        /\bhanuman\b/i,
        /\bkrishna\b/i,
        /\bram\b/i,
        /\bom\b/i,
        /\bdevotional\b/i,
        /\bspiritual\b/i,
        /\bbhakti\b/i,
        /\bganesh\b/i,
      ],
    },
    { name: "Animal", match: [/animal/i, /cat/i, /dog/i, /tiger/i, /lion/i, /wolf/i, /eagle/i, /panther/i, /bear/i] },
    { name: "Games & Sports", match: [/game/i, /gaming/i, /esports/i, /football/i, /cricket/i, /tennis/i, /basketball/i, /sport/i] },
    { name: "Anime Art", match: [/anime/i, /manga/i, /otaku/i] },
    { name: "Dark Art", match: [/dark/i, /occult/i, /noir/i, /grim/i] },
    { name: "Abstract Art", match: [/abstract/i, /geometry/i, /pattern/i] },
    { name: "Motivation", match: [/motivat/i, /hustle/i, /mindset/i, /discipline/i, /focus/i] },
    { name: "Yoga & Wellness", match: [/yoga/i, /wellness/i, /flow/i, /zen/i, /meditat/i] },
    { name: "Gothic", match: [/gothic/i, /skull/i, /horror/i, /metal/i] },
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
  const tags = input.tags ?? [];
  // Match title alone first so a broad productType like "Hoodies & Sweatshirts" cannot
  // hijack a product whose title clearly indicates a different category
  // (e.g. "Oversize Crewneck Sweatshirt" → Sweatshirts, not Hoodies).
  const fullHaystack = [input.title, input.productType ?? "", ...tags].join(" ");

  const categoryFromTag = CATEGORY_TAG_OVERRIDES.find((override) =>
    tags.some((tag) => override.match.some((pattern) => pattern.test(tag)))
  );

  const categoryFromTitle = CATEGORY_RULES.find((rule) =>
    rule.match.some((pattern) => pattern.test(input.title))
  );

  const categoryRule =
    categoryFromTag ??
    categoryFromTitle ??
    CATEGORY_RULES.find((rule) => rule.match.some((pattern) => pattern.test(fullHaystack))) ?? {
      category: input.productType?.trim() || "Catalog",
      subCategoryFallback: "All",
      match: [],
    };

  // First, try to find a matching sub-category from explicit tags
  const subCategoryRulesForCategory = SUB_CATEGORY_RULES_BY_CATEGORY[categoryRule.category] ?? [];
  let subCategoryRule = subCategoryRulesForCategory.find((rule) =>
    tags.some((tag) => rule.match.some((pattern) => pattern.test(tag)))
  );

  // If no tag match, fall back to matching against the full haystack
  if (!subCategoryRule) {
    subCategoryRule = subCategoryRulesForCategory.find((rule) =>
      rule.match.some((pattern) => pattern.test(fullHaystack))
    );
  }

  const subCategory = subCategoryRule?.name ?? categoryRule.subCategoryFallback;
  const audience = deriveAudience(input);

  return {
    category: categoryRule.category,
    categorySlug: slugify(categoryRule.category),
    subCategory,
    subCategorySlug: slugify(subCategory),
    audience,
    audienceSlug: slugify(audience),
  };
}

function deriveAudience(input: { title: string; productType?: string | null; tags?: string[] }) {
  const haystack = [input.title, input.productType ?? "", ...(input.tags ?? [])].join(" ");

  if (/\b(unisex|all\s*gender|all\s*genders)\b/i.test(haystack)) {
    return "Unisex";
  }

  if (/\b(girl|girls|women|womens|women's|ladies|female)\b/i.test(haystack)) {
    return "Girls";
  }

  if (/\b(boy|boys|men|mens|men's|male)\b/i.test(haystack)) {
    return "Boys";
  }

  return "Unisex";
}

export function matchesAudienceFilter(productAudience: string | undefined, selectedAudience: string | undefined) {
  const normalizedSelected = (selectedAudience ?? "").trim().toLowerCase();

  if (!normalizedSelected) {
    return true;
  }

  const normalizedProductAudience = (productAudience ?? "").trim().toLowerCase();

  return normalizedProductAudience === normalizedSelected;
}

export function applyProductFilters(
  products: GridProduct[],
  filters: { category?: string; subCategory?: string; audience?: string; q?: string }
) {
  const normalizedCategory = (filters.category ?? "").trim().toLowerCase();
  const normalizedSubCategory = (filters.subCategory ?? "").trim().toLowerCase();
  const normalizedSubCategorySlug = slugify(filters.subCategory ?? "");
  const normalizedAudience = (filters.audience ?? "").trim().toLowerCase();
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

    const audienceMatch =
      matchesAudienceFilter(product.audienceSlug ?? product.audience, normalizedAudience);

    const queryMatch =
      !normalizedQuery ||
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.description.toLowerCase().includes(normalizedQuery);

    return categoryMatch && subCategoryMatch && audienceMatch && queryMatch;
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

    if (subCategorySlug !== "all") {
      tree.get(category)?.subCategories.set(subCategory, subCategorySlug);
    }
  }

  // Keep core T-Shirt collections visible in filters even when current data has no matches.
  const tShirtNode = tree.get("T-Shirts");
  if (tShirtNode) {
    for (const subCategory of CANONICAL_TSHIRT_SUBCATEGORIES) {
      if (!tShirtNode.subCategories.has(subCategory)) {
        tShirtNode.subCategories.set(subCategory, slugify(subCategory));
      }
    }
  }

  return Array.from(tree.entries())
    .map(([name, value]) => ({
      name,
      slug: value.slug,
      subCategories: Array.from(value.subCategories.entries())
        .map(([subName, subSlug]) => ({
          name: subName,
          slug: subSlug,
        }))
        .sort((a, b) => {
          if (name === "T-Shirts") {
            const aOrder = TSHIRT_SUBCATEGORY_ORDER.get(a.name.toLowerCase());
            const bOrder = TSHIRT_SUBCATEGORY_ORDER.get(b.name.toLowerCase());

            if (typeof aOrder === "number" || typeof bOrder === "number") {
              return (aOrder ?? Number.MAX_SAFE_INTEGER) - (bOrder ?? Number.MAX_SAFE_INTEGER);
            }
          }

          return a.name.localeCompare(b.name);
        }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
