type DeriveProductFitInput = {
  fitMetafields?: Array<string | null | undefined>;
  tags?: string[];
  subCategory?: string | null;
  productType?: string | null;
  title?: string | null;
};

type FitRule = {
  label: string;
  patterns: RegExp[];
};

const FIT_RULES: FitRule[] = [
  { label: "Oversized", patterns: [/\boversi[sz]ed\b/i, /\boversized\s*fit\b/i] },
  { label: "Boxy Fit", patterns: [/\bboxy\b/i, /\bbox\s*fit\b/i] },
  { label: "Relaxed Fit", patterns: [/\brelaxed\b/i, /\brelax\s*fit\b/i, /\bloose\b/i] },
  { label: "Regular Fit", patterns: [/\bregular\b/i, /\bclassic\s*fit\b/i, /\bregular\s*fit\b/i] },
  { label: "Slim Fit", patterns: [/\bslim\b/i, /\bslim\s*fit\b/i, /\btailored\b/i] },
  { label: "Straight Fit", patterns: [/\bstraight\b/i, /\bstraight\s*fit\b/i] },
  { label: "Athletic Fit", patterns: [/\bathletic\b/i, /\bathletic\s*fit\b/i] },
  { label: "Compression Fit", patterns: [/\bcompression\b/i, /\bcompress(?:ion|ed)?\s*fit\b/i] },
];

const MONTH_WORDS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "sept",
  "oct",
  "nov",
  "dec",
  "january",
  "february",
  "march",
  "april",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

function normalizeWhitespace(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function toDisplayCase(value: string) {
  return value
    .split(" ")
    .map((part) => {
      if (!part) {
        return part;
      }

      const lowered = part.toLowerCase();
      if (lowered === "fit") {
        return "Fit";
      }

      return lowered.charAt(0).toUpperCase() + lowered.slice(1);
    })
    .join(" ");
}

function looksLikeDateOrLaunchMarker(text: string) {
  const lowered = text.toLowerCase();

  if (MONTH_WORDS.some((month) => lowered.includes(month))) {
    return true;
  }

  // Ex: 15/08/2026, 2026-08-15, 15 aug, launch-2026
  return /\b\d{1,4}[\/\-.]\d{1,2}([\/\-.]\d{1,4})?\b/.test(lowered) || /\b(launch|drop|release)\b/.test(lowered) || /\b\d{4}\b/.test(lowered);
}

function isLikelyFitPhrase(text: string) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return false;
  }

  if (looksLikeDateOrLaunchMarker(normalized)) {
    return false;
  }

  const fitKeywords = [
    "fit",
    "regular",
    "oversized",
    "slim",
    "relaxed",
    "boxy",
    "straight",
    "athletic",
    "compression",
    "tailored",
    "loose",
    "drop shoulder",
  ];

  return fitKeywords.some((keyword) => normalized.toLowerCase().includes(keyword));
}

function toCanonicalFit(rawValue: string) {
  const normalized = normalizeWhitespace(rawValue);

  for (const rule of FIT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.label;
    }
  }

  // Preserve merchant-defined fit phrases only when they look like actual fit values.
  // This blocks unrelated content (for example dates) from leaking into Product Details.
  if (isLikelyFitPhrase(normalized)) {
    return toDisplayCase(normalized);
  }

  return undefined;
}

function detectFromText(text: string) {
  const normalized = normalizeWhitespace(text);

  // Product taxonomy rule: "Oversized T-Shirts" should always map to
  // "Oversized" unless an explicit fit metafield overrides it.
  if (/\boversized\s+t\s*shirts?\b/i.test(normalized)) {
    return "Oversized";
  }

  if (/\bregular\s+fit\s+t\s*shirts?\b/i.test(normalized)) {
    return "Regular Fit";
  }

  if (/\bslim\s+fit\b/i.test(normalized)) {
    return "Slim Fit";
  }

  if (/\brelaxed\s+fit\b/i.test(normalized)) {
    return "Relaxed Fit";
  }

  return toCanonicalFit(normalized);
}

function detectFromTag(tag: string) {
  const normalized = normalizeWhitespace(tag);
  const keyValueMatch = normalized.match(/^(?:fit|fitting|silhouette|style fit)\s*[:=]\s*(.+)$/i);

  if (keyValueMatch?.[1]) {
    return toCanonicalFit(keyValueMatch[1]);
  }

  return detectFromText(normalized);
}

export function deriveProductFit(input: DeriveProductFitInput) {
  const { fitMetafields = [], tags = [], subCategory, productType, title } = input;

  for (const metafieldValue of fitMetafields) {
    if (!metafieldValue) {
      continue;
    }

    const detected = toCanonicalFit(metafieldValue);
    if (detected) {
      return detected;
    }
  }

  for (const tag of tags) {
    const detected = detectFromTag(tag);
    if (detected) {
      return detected;
    }
  }

  const taxonomyDetected = [subCategory, productType, title]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => detectFromText(value))
    .find((value): value is string => Boolean(value));

  return taxonomyDetected;
}