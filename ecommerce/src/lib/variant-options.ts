type VariantOption = {
  name: string;
  value: string;
};

type VariantLike = {
  availableForSale?: boolean;
  options: VariantOption[];
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
