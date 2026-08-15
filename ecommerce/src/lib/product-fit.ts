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
  { label: "Oversized fit", patterns: [/\boversi[sz]ed\b/i, /\boversized\s*fit\b/i] },
  { label: "Boxy fit", patterns: [/\bboxy\b/i, /\bbox\s*fit\b/i] },
  { label: "Relaxed fit", patterns: [/\brelaxed\b/i, /\brelax\s*fit\b/i, /\bloose\b/i] },
  { label: "Regular fit", patterns: [/\bregular\b/i, /\bclassic\s*fit\b/i, /\bregular\s*fit\b/i] },
  { label: "Slim fit", patterns: [/\bslim\b/i, /\bslim\s*fit\b/i, /\btailored\b/i] },
  { label: "Straight fit", patterns: [/\bstraight\b/i, /\bstraight\s*fit\b/i] },
  { label: "Athletic fit", patterns: [/\bathletic\b/i, /\bathletic\s*fit\b/i] },
  { label: "Compression fit", patterns: [/\bcompression\b/i, /\bcompress(?:ion|ed)?\s*fit\b/i] },
];

function normalizeWhitespace(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function toCanonicalFit(rawValue: string) {
  const normalized = normalizeWhitespace(rawValue);

  for (const rule of FIT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.label;
    }
  }

  // If the merchant stores fit as a custom phrase, preserve it as readable text
  // instead of forcing an incorrect hardcoded default.
  if (normalized.length > 0) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return undefined;
}

function detectFromText(text: string) {
  const normalized = normalizeWhitespace(text);

  // Product taxonomy rule: "Oversized T-Shirts" should always map to
  // "Oversized fit" unless an explicit fit metafield overrides it.
  if (/\boversized\s+t\s*shirts?\b/i.test(normalized)) {
    return "Oversized fit";
  }

  if (/\bregular\s+fit\s+t\s*shirts?\b/i.test(normalized)) {
    return "Regular fit";
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