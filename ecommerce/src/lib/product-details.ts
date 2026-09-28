import { GridProduct } from "./catalog";
import { COMPANY_MANUFACTURER_DETAILS } from "./company";
import { deriveProductFit } from "./product-fit";

export type ProductDetailSpec = {
  label: string;
  value: string;
};

type ProductAttributeFamily = "topwear" | "bottomwear" | "dresses" | "outerwear" | "accessories" | "generic";

type ProductAttributeKey =
  | "materialFabric"
  | "fit"
  | "pattern"
  | "sleeveType"
  | "neckType"
  | "waistType"
  | "rise"
  | "closure"
  | "pockets"
  | "length"
  | "occasion"
  | "careInstructions"
  | "countryOfOrigin"
  | "manufacturerDetails";

const DEFAULT_CARE_INSTRUCTIONS = "Hand wash separately or gentle machine wash; dry in shade.";
const DEFAULT_COUNTRY_OF_ORIGIN = "India";

const ATTRIBUTE_LABELS: Record<ProductAttributeKey, string> = {
  materialFabric: "Material & Fabric",
  fit: "Fit",
  pattern: "Pattern",
  sleeveType: "Sleeve Type",
  neckType: "Neck Type",
  waistType: "Waistband / Waist Type",
  rise: "Rise",
  closure: "Closure",
  pockets: "Pockets",
  length: "Length",
  occasion: "Occasion",
  careInstructions: "Care Instructions",
  countryOfOrigin: "Country of Origin",
  manufacturerDetails: "Manufacturer Details",
};

const ATTRIBUTE_ORDER_BY_FAMILY: Record<ProductAttributeFamily, ProductAttributeKey[]> = {
  topwear: [
    "materialFabric",
    "fit",
    "pattern",
    "sleeveType",
    "neckType",
    "occasion",
    "careInstructions",
    "countryOfOrigin",
    "manufacturerDetails",
  ],
  bottomwear: [
    "materialFabric",
    "fit",
    "pattern",
    "waistType",
    "rise",
    "closure",
    "pockets",
    "length",
    "occasion",
    "careInstructions",
    "countryOfOrigin",
    "manufacturerDetails",
  ],
  dresses: [
    "materialFabric",
    "fit",
    "pattern",
    "sleeveType",
    "neckType",
    "length",
    "occasion",
    "careInstructions",
    "countryOfOrigin",
    "manufacturerDetails",
  ],
  outerwear: [
    "materialFabric",
    "fit",
    "pattern",
    "sleeveType",
    "neckType",
    "closure",
    "pockets",
    "length",
    "occasion",
    "careInstructions",
    "countryOfOrigin",
    "manufacturerDetails",
  ],
  accessories: ["materialFabric", "pattern", "occasion", "countryOfOrigin", "manufacturerDetails"],
  generic: [
    "materialFabric",
    "fit",
    "pattern",
    "occasion",
    "careInstructions",
    "countryOfOrigin",
    "manufacturerDetails",
  ],
};

const FAMILY_MATCHERS: Array<{ family: ProductAttributeFamily; patterns: RegExp[] }> = [
  {
    family: "bottomwear",
    patterns: [
      /\bbottomwear\b/i,
      /\bjoggers?\b/i,
      /\btrack\s*pants?\b/i,
      /\bcargo\s*pants?\b/i,
      /\btrousers?\b/i,
      /\bpants?\b/i,
      /\bshorts?\b/i,
      /\bjeans?\b/i,
      /\blowers?\b/i,
      /\bpalazzos?\b/i,
      /\bleggings?\b/i,
    ],
  },
  {
    family: "dresses",
    patterns: [/\bdresses?\b/i, /\bdress\b/i, /\bgowns?\b/i, /\bkaftans?\b/i],
  },
  {
    family: "outerwear",
    patterns: [/\bjackets?\b/i, /\bcoats?\b/i, /\bblazers?\b/i, /\bbombers?\b/i, /\bshackets?\b/i],
  },
  {
    family: "accessories",
    patterns: [/\bcaps?\b/i, /\bbags?\b/i, /\bjewel(?:ry|lery)\b/i, /\bpendants?\b/i, /\bnecklaces?\b/i],
  },
  {
    family: "topwear",
    patterns: [
      /\bt-?shirts?\b/i,
      /\btees?\b/i,
      /\bshirts?\b/i,
      /\bhoodies?\b/i,
      /\bsweatshirts?\b/i,
      /\btops?\b/i,
      /\bblouses?\b/i,
      /\bkurta\b/i,
      /\bupper\s*body\b/i,
    ],
  },
];

const KEYWORD_EXTRACTORS: Partial<Record<ProductAttributeKey, RegExp[]>> = {
  materialFabric: [
    /\b(?:100%\s+)?(?:organic\s+)?cotton\b/i,
    /\bdenim\b/i,
    /\blinen\b/i,
    /\bviscose\b/i,
    /\brayon\b/i,
    /\bpolyester\b/i,
    /\bfleece\b/i,
    /\bjersey\b/i,
    /\bterry\b/i,
    /\btwill\b/i,
    /\bnylon\b/i,
    /\bwool\b/i,
    /\bsilk\b/i,
    /\bsatin\b/i,
    /\bkhadi\b/i,
    /\bcorduroy\b/i,
    /\bspandex\b/i,
    /\blycra\b/i,
  ],
  pattern: [/\bsolid\b/i, /\bprinted\b/i, /\bgraphic\b/i, /\bstriped\b/i, /\bchecked\b/i, /\bembroider(?:ed|y)\b/i, /\bwashed\b/i, /\btextured\b/i, /\bplain\b/i],
  sleeveType: [/\b(?:full|half|short|long|three[-\s]?quarter|sleeveless|raglan|drop shoulder)\b[^.\n,;]*\bsleeves?\b/i, /\bsleeveless\b/i],
  neckType: [/\bround\s*neck\b/i, /\bcrew\s*neck\b/i, /\bv-?neck\b/i, /\bhooded\s*neck\b/i, /\bhooded\b/i, /\bcollar(?:ed)?\b/i, /\bpolo\s*neck\b/i, /\bmandarin\s*collar\b/i],
  waistType: [/\belastic(?:ated)?\s*waist(?:band)?\b/i, /\bdrawstring\s*waist(?:band)?\b/i, /\bmid\s*waist\b/i, /\bhigh\s*waist\b/i, /\blow\s*waist\b/i, /\bwaist(?:band)?\b/i],
  rise: [/\bmid\s*rise\b/i, /\bhigh\s*rise\b/i, /\blow\s*rise\b/i, /\brise\b/i],
  closure: [/\bzip(?:per)?\s*closure\b/i, /\bbutton\s*closure\b/i, /\bdrawstring\b/i, /\belastic(?:ated)?\b/i, /\bhook(?: and eye)?\b/i],
  pockets: [/\b(?:two|three|four|five|six)?\s*pockets?\b/i, /\bcargo\s*pockets?\b/i, /\bside\s*pockets?\b/i],
  length: [/\bfull\s*length\b/i, /\bankle\s*length\b/i, /\bknee\s*length\b/i, /\bcropped\b/i, /\bregular\s*length\b/i, /\bmini\b/i, /\bmidi\b/i, /\bmaxi\b/i],
  occasion: [/\bcasual\b/i, /\bformal\b/i, /\bparty\b/i, /\bfestive\b/i, /\btravel\b/i, /\blounge\b/i, /\bathleisure\b/i, /\beveryday\b/i],
};

const EXPLICIT_ATTRIBUTE_PATTERNS: Array<{ key: ProductAttributeKey; pattern: RegExp }> = [
  { key: "materialFabric", pattern: /^(?:material(?:\s*&\s*fabric)?|fabric|fabric type)\s*[:=-]\s*(.+)$/i },
  { key: "fit", pattern: /^(?:fit|style fit|fit type)\s*[:=-]\s*(.+)$/i },
  { key: "pattern", pattern: /^(?:pattern|print|design)\s*[:=-]\s*(.+)$/i },
  { key: "sleeveType", pattern: /^(?:sleeve(?:\s*type)?|sleeves?)\s*[:=-]\s*(.+)$/i },
  { key: "neckType", pattern: /^(?:neck(?:\s*type)?|neckline|collar)\s*[:=-]\s*(.+)$/i },
  { key: "waistType", pattern: /^(?:waist(?:band)?|waist\s*type)\s*[:=-]\s*(.+)$/i },
  { key: "rise", pattern: /^(?:rise|front\s*rise|back\s*rise)\s*[:=-]\s*(.+)$/i },
  { key: "closure", pattern: /^(?:closure|fastening)\s*[:=-]\s*(.+)$/i },
  { key: "pockets", pattern: /^(?:pockets?)\s*[:=-]\s*(.+)$/i },
  { key: "length", pattern: /^(?:length|inseam|outseam)\s*[:=-]\s*(.+)$/i },
  { key: "occasion", pattern: /^(?:occasion|use|best for)\s*[:=-]\s*(.+)$/i },
  { key: "careInstructions", pattern: /^(?:care(?:\s*instructions?)?|wash\s*care)\s*[:=-]\s*(.+)$/i },
  { key: "countryOfOrigin", pattern: /^(?:country\s*of\s*origin|origin|made in)\s*[:=-]\s*(.+)$/i },
  { key: "manufacturerDetails", pattern: /^(?:manufacturer(?:\s*details?)?)\s*[:=-]\s*(.+)$/i },
];

function normalizeWhitespace(value: string) {
  return value.replace(/[|]+/g, " ").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

function cleanupExtractedValue(value: string) {
  return normalizeWhitespace(value)
    .replace(/^[\-:;,]+\s*/, "")
    .replace(/\s*[|;,]+$/, "")
    .trim();
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");
}

function extractExplicitAttributes(text: string, target: Map<ProductAttributeKey, string>) {
  const segments = text
    .split(/[\n|]+/)
    .map((segment) => cleanupExtractedValue(segment))
    .filter(Boolean);

  for (const segment of segments) {
    for (const { key, pattern } of EXPLICIT_ATTRIBUTE_PATTERNS) {
      const match = segment.match(pattern);

      if (match?.[1] && !target.has(key)) {
        target.set(key, cleanupExtractedValue(match[1]));
      }
    }
  }
}

function extractKeywordAttribute(key: ProductAttributeKey, values: string[]) {
  const patterns = KEYWORD_EXTRACTORS[key] ?? [];

  for (const value of values) {
    const normalized = cleanupExtractedValue(value);

    if (!normalized) {
      continue;
    }

    for (const pattern of patterns) {
      const match = normalized.match(pattern);

      if (match?.[0]) {
        return cleanupExtractedValue(match[0]);
      }
    }
  }

  return undefined;
}

function collectRawAttributeValues(product: GridProduct) {
  const values = new Map<ProductAttributeKey, string>();
  const tagValues = (product.tags ?? []).map((tag) => cleanupExtractedValue(tag)).filter(Boolean);
  const description = product.description ?? "";

  for (const tag of tagValues) {
    extractExplicitAttributes(tag, values);
  }

  extractExplicitAttributes(description, values);

  const searchableValues = [description, ...tagValues];

  for (const key of Object.keys(KEYWORD_EXTRACTORS) as ProductAttributeKey[]) {
    if (!values.has(key)) {
      const extracted = extractKeywordAttribute(key, searchableValues);

      if (extracted) {
        values.set(key, extracted);
      }
    }
  }

  if (values.has("materialFabric")) {
    values.set("materialFabric", toTitleCase(values.get("materialFabric") ?? ""));
  }

  if (values.has("countryOfOrigin")) {
    values.set("countryOfOrigin", toTitleCase(values.get("countryOfOrigin") ?? ""));
  }

  return values;
}

export function resolveProductAttributeFamily(product: Pick<GridProduct, "category" | "subCategory" | "productType" | "name" | "tags">) {
  const haystack = [product.category, product.subCategory, product.productType, product.name, ...(product.tags ?? [])]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ");

  const matcher = FAMILY_MATCHERS.find((entry) => entry.patterns.some((pattern) => pattern.test(haystack)));
  return matcher?.family ?? "generic";
}

export function buildProductDetailSpecs(product: GridProduct): ProductDetailSpec[] {
  const family = resolveProductAttributeFamily(product);
  const rawValues = collectRawAttributeValues(product);
  const resolvedFit =
    deriveProductFit({
      fitMetafields: [product.fit],
      tags: product.tags,
      subCategory: product.subCategory,
      productType: product.productType ?? product.category,
      title: product.name,
    }) ?? "Fit varies by style";

  return ATTRIBUTE_ORDER_BY_FAMILY[family]
    .map((key) => {
      if (key === "fit") {
        return { label: ATTRIBUTE_LABELS[key], value: resolvedFit } satisfies ProductDetailSpec;
      }

      if (key === "careInstructions") {
        return {
          label: ATTRIBUTE_LABELS[key],
          value: rawValues.get(key) ?? DEFAULT_CARE_INSTRUCTIONS,
        } satisfies ProductDetailSpec;
      }

      if (key === "countryOfOrigin") {
        return {
          label: ATTRIBUTE_LABELS[key],
          value: rawValues.get(key) ?? DEFAULT_COUNTRY_OF_ORIGIN,
        } satisfies ProductDetailSpec;
      }

      if (key === "manufacturerDetails") {
        return {
          label: ATTRIBUTE_LABELS[key],
          value: rawValues.get(key) ?? COMPANY_MANUFACTURER_DETAILS,
        } satisfies ProductDetailSpec;
      }

      const value = rawValues.get(key);

      if (!value) {
        return null;
      }

      return {
        label: ATTRIBUTE_LABELS[key],
        value,
      } satisfies ProductDetailSpec;
    })
    .filter((item): item is ProductDetailSpec => item !== null);
}