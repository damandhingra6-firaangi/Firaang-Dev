const DESCRIPTION_SECTION_LABELS = [
  "Product Story",
  "Fabric & Feel",
  "Design Essence",
  "Fit & Finish",
  "Care Instructions",
  "Wash Care",
  "Style Tip",
  "Sanskrit Mantra",
  "Color",
  "Colour",
  "Fabric",
  "Fit",
  "Material",
  "Pattern",
  "Style",
  "Sleeve",
  "Length",
  "Type",
  "Work",
  "Occasion",
  "Care",
  "Details",
  "Specifications",
  "Description",
];

const DESCRIPTION_SECTION_SET = new Set(DESCRIPTION_SECTION_LABELS.map((label) => label.toLowerCase()));

function decodeHtmlEntities(value: string) {
  if (!value) {
    return value;
  }

  const numericEntityPattern = /&#(x?[0-9a-fA-F]+);/g;
  const namedEntities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "-",
    mdash: "-",
    hellip: "...",
  };

  let current = value;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const decoded = current.replace(numericEntityPattern, (match, rawValue: string) => {
      const isHex = rawValue.startsWith("x") || rawValue.startsWith("X");
      const numericValue = Number.parseInt(isHex ? rawValue.slice(1) : rawValue, isHex ? 16 : 10);

      if (!Number.isFinite(numericValue)) {
        return match;
      }

      return String.fromCodePoint(numericValue);
    });

    const replaced = decoded.replace(/&([a-zA-Z]+);/g, (match, entity: string) => namedEntities[entity.toLowerCase()] ?? match);

    if (replaced === current) {
      return replaced;
    }

    current = replaced;
  }

  return current;
}

export function normalizeProductDescriptionText(description: string) {
  let normalized = description.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return "";
  }

  normalized = decodeHtmlEntities(normalized)
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ");

  const looksLikeHtml = /<[^>]+>/.test(normalized);

  if (looksLikeHtml) {
    normalized = normalized
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<(\/)?(p|div|section|article|header|footer|aside|main|table|thead|tbody|tfoot|tr|blockquote|h[1-6])\b[^>]*>/gi, (match, closing: string | undefined) => (closing ? "\n\n" : ""))
      .replace(/<(\/)?(ul|ol)\b[^>]*>/gi, (match, closing: string | undefined) => (closing ? "\n\n" : ""))
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "");
  }

  normalized = normalized
    .replace(/[\t\v\f ]+/g, " ")
    .replace(/[ ]*\n[ ]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized;
}

export type ProductDescriptionBlock =
  | { type: "paragraph"; text: string }
  | { type: "label"; label: string; text: string }
  | { type: "bullet"; text: string };

export function formatProductDescriptionBlocks(description: string): ProductDescriptionBlock[] {
  const normalized = normalizeProductDescriptionText(description);

  if (!normalized) {
    return [];
  }

  const blocks: ProductDescriptionBlock[] = [];
  const rawBlocks = normalized.split(/\n{2,}/);

  for (const rawBlock of rawBlocks) {
    const lines = rawBlock
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    for (const line of lines) {
      const bulletMatch = line.match(/^[-*•]\s+(.+)$/);

      if (bulletMatch?.[1]) {
        blocks.push({ type: "bullet", text: bulletMatch[1].trim() });
        continue;
      }

      const headingMatch = line.match(/^([^:]{2,40}):\s*(.+)$/);

      if (headingMatch) {
        const label = headingMatch[1].trim();
        const text = headingMatch[2].trim();

        if (DESCRIPTION_SECTION_SET.has(label.toLowerCase()) && text) {
          blocks.push({ type: "label", label, text });
          continue;
        }
      }

      if (line.endsWith(":")) {
        const label = line.slice(0, -1).trim();

        if (DESCRIPTION_SECTION_SET.has(label.toLowerCase())) {
          continue;
        }
      }

      blocks.push({ type: "paragraph", text: line });
    }
  }

  const dedupedBlocks: ProductDescriptionBlock[] = [];

  for (const block of blocks) {
    const previous = dedupedBlocks[dedupedBlocks.length - 1];

    if (previous?.type === block.type) {
      if (block.type === "paragraph" && previous.text === block.text) {
        continue;
      }

      if (block.type === "bullet" && previous.text === block.text) {
        continue;
      }
    }

    dedupedBlocks.push(block);
  }

  return dedupedBlocks;
}

export function getProductDescriptionSummary(description: string, maxLength = 120) {
  const normalized = normalizeProductDescriptionText(description);

  if (!normalized) {
    return null;
  }

  const firstParagraph = normalized
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .find(Boolean);

  if (!firstParagraph) {
    return null;
  }

  if (firstParagraph.length <= maxLength) {
    return firstParagraph;
  }

  return `${firstParagraph.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
