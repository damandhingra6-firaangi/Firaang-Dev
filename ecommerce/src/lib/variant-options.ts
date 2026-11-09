type VariantOption = {
  name: string;
  value: string;
};

type VariantLike = {
  availableForSale?: boolean;
  options: VariantOption[];
};

export type ProductSelectionCandidate = {
  optionGroups?: Array<{ name: string; values: string[] }>;
  variants?: VariantLike[];
};

export function normalizeOptionName(optionName: string) {
  return optionName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function getNormalizedOptionMap(selectedOptions: Record<string, string> | undefined) {
  const normalized = new Map<string, string>();

  for (const [key, value] of Object.entries(selectedOptions ?? {})) {
    const normalizedKey = normalizeOptionName(key);

    if (normalizedKey && value !== undefined) {
      normalized.set(normalizedKey, value);
    }
  }

  return normalized;
}

export function optionMatchesSelection({
  variantOptions,
  selectedOptions,
}: {
  variantOptions: VariantOption[];
  selectedOptions: Record<string, string>;
}) {
  const normalizedSelection = getNormalizedOptionMap(selectedOptions);

  return variantOptions.every((option) => {
    const selectedValue = normalizedSelection.get(normalizeOptionName(option.name));

    if (selectedValue === undefined) {
      return true;
    }

    return normalizeOptionName(selectedValue) === normalizeOptionName(option.value);
  });
}

export function isColorOption(optionName: string) {
  const normalized = normalizeOptionName(optionName);
  return normalized === "color" || normalized === "colour";
}

export function isSizeOption(optionName: string) {
  const normalized = normalizeOptionName(optionName);
  return normalized === "size" || normalized === "sizes" || normalized.includes("size");
}

export function getSelectedOptionValue(
  selectedOptions: Record<string, string>,
  ...candidateNames: string[]
) {
  const normalizedCandidates = candidateNames.filter(Boolean).map((name) => normalizeOptionName(name));
  if (normalizedCandidates.length === 0) {
    return undefined;
  }

  for (const [key, value] of Object.entries(selectedOptions ?? {})) {
    if (normalizedCandidates.includes(normalizeOptionName(key))) {
      return value;
    }
  }

  return undefined;
}

export function isOptionAvailableForSelection({
  variants,
  selectedOptions,
  optionName,
  optionValue,
}: {
  variants: VariantLike[];
  selectedOptions: Record<string, string>;
  optionName: string;
  optionValue: string;
}) {
  if (variants.length === 0) {
    return true;
  }

  const nextOptions = { ...selectedOptions, [optionName]: optionValue };

  return variants.some((variant) => {
    if (!variant.availableForSale) {
      return false;
    }

    return optionMatchesSelection({
      variantOptions: variant.options,
      selectedOptions: nextOptions,
    });
  });
}

export function isProductSelectionComplete(
  product: ProductSelectionCandidate | null | undefined,
  selectedOptions: Record<string, string>,
) {
  const optionGroups = product?.optionGroups && product.optionGroups.length > 0
    ? product.optionGroups
    : product?.variants?.flatMap((variant) => {
        const groups = new Map<string, Set<string>>();

        for (const option of variant.options) {
          const current = groups.get(option.name) ?? new Set<string>();
          current.add(option.value);
          groups.set(option.name, current);
        }

        return Array.from(groups.entries()).map(([name, values]) => ({
          name,
          values: Array.from(values),
        }));
      }) ?? [];

  if (optionGroups.length === 0) {
    return true;
  }

  for (const group of optionGroups) {
    if (!isSizeOption(group.name) || group.values.length === 0) {
      continue;
    }

    const value = getSelectedOptionValue(selectedOptions, group.name, "Size", "sizes", "Size / Fit");
    if (!value || group.values.every((candidate) => normalizeOptionName(candidate) !== normalizeOptionName(value))) {
      return false;
    }
  }

  return true;
}
