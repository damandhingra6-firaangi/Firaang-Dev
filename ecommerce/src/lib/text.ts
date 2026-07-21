const PRESERVED_UPPER_TOKENS = new Set(["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL", "5XL", "UV", "SPF"]);

function capitalizeToken(token: string) {
  const trimmed = token.trim();

  if (!trimmed) {
    return "";
  }

  const upper = trimmed.toUpperCase();
  if (PRESERVED_UPPER_TOKENS.has(upper)) {
    return upper;
  }

  if (/^[A-Z0-9]{2,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function toTitleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word
        .split("'")
        .map((segment) => capitalizeToken(segment))
        .join("'"),
    )
    .join(" ");
}

export function humanizeHandle(handle: string) {
  return toTitleCase(handle.replace(/[-_]+/g, " "));
}
