type VariantOption = {
  name: string;
  value: string;
};

type VariantLike = {
  availableForSale?: boolean;
  options: VariantOption[];
};

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

    return variant.options.every((option) => {
      const selectedValue = nextOptions[option.name];
      return !selectedValue || selectedValue === option.value;
    });
  });
}
