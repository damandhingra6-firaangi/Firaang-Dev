"use client";

import { useEffect, useMemo, useState } from "react";
import { GridProduct } from "@/lib/catalog";
import { Check, ChevronDown, Heart, ShoppingBag, Sparkles, X } from "lucide-react";
import { getConfiguredSizeChart } from "@/lib/size-charts";

type ProductDetailsModalProps = {
  product: GridProduct | null;
  isOpen: boolean;
  isWishlisted: (product: GridProduct) => boolean;
  onClose: () => void;
  onToggleWishlist: (product: GridProduct) => void;
  onAddToCart: (product: GridProduct) => void;
};

function isColorOption(optionName: string) {
  const normalized = optionName.trim().toLowerCase();
  return normalized === "color" || normalized === "colour";
}

function isSizeOption(optionName: string) {
  return optionName.trim().toLowerCase() === "size";
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getSwatchColor(value: string) {
  const normalized = value.trim().toLowerCase();

  const preset: Record<string, string> = {
    black: "#121212",
    white: "#f3f3f3",
    red: "#b3272d",
    blue: "#2f4ea1",
    navy: "#1f2a48",
    green: "#2e7d4b",
    olive: "#5c6b36",
    yellow: "#d6ab2f",
    gold: "#b78b2f",
    pink: "#c96f96",
    purple: "#6c4a87",
    maroon: "#642330",
    brown: "#6b4628",
    beige: "#d5c4a3",
    cream: "#ece1cf",
    grey: "#7b7b81",
    gray: "#7b7b81",
    orange: "#c46c25",
  };

  return preset[normalized] ?? "#8c8c8c";
}

export default function ProductDetailsModal({
  product,
  isOpen,
  isWishlisted,
  onClose,
  onToggleWishlist,
  onAddToCart,
}: ProductDetailsModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const variants = product?.variants ?? [];

  const optionGroups = useMemo(() => {
    if (product?.optionGroups && product.optionGroups.length > 0) {
      return product.optionGroups;
    }

    const groups = new Map<string, string[]>();

    for (const variant of variants) {
      for (const option of variant.options) {
        const existing = groups.get(option.name) ?? [];

        if (!existing.includes(option.value)) {
          existing.push(option.value);
          groups.set(option.name, existing);
        }
      }
    }

    return Array.from(groups.entries()).map(([name, values]) => ({ name, values }));
  }, [product?.optionGroups, variants]);

  const hasSizeOptions = optionGroups.some((group) => isSizeOption(group.name));
  const sizeOptionGroup = optionGroups.find((group) => isSizeOption(group.name));

  const fallbackSizeChart = useMemo(() => {
    if (product) {
      const configured = getConfiguredSizeChart(product);

      if (configured) {
        const values = new Set((sizeOptionGroup?.values ?? []).map((value) => value.toUpperCase()));
        const rows =
          values.size > 0
            ? configured.rows.filter((row) => values.has(row[0].toUpperCase()))
            : configured.rows;

        return {
          ...configured,
          rows,
        };
      }
    }

    const values = sizeOptionGroup?.values ?? [];

    if (values.length === 0) {
      return null;
    }

    return {
      headers: ["Size", "Chest", "Length", "Shoulder", "To Fit Chest"],
      rows: values.map((size) => [size, "-", "-", "-", "-"]),
      note: "Add custom.size_chart_json metafield on Shopify products to show exact garment measurements.",
    };
  }, [sizeOptionGroup]);

  const effectiveSizeChart = product?.sizeChart ?? fallbackSizeChart;

  const selectedSummary = Object.entries(selectedOptions)
    .map(([name, value]) => `${toTitleCase(name)}: ${value}`)
    .join(" • ");

  useEffect(() => {
    if (!isOpen || !product) {
      return;
    }

    const initialVariant = variants[0] ?? null;
    setSelectedVariantId(initialVariant?.id ?? null);
    setSelectedOptions(
      Object.fromEntries((initialVariant?.options ?? []).map((option) => [option.name, option.value]))
    );
    setIsSizeGuideOpen(false);
  }, [isOpen, product, variants]);

  const activeVariant =
    variants.find((variant) => variant.id === selectedVariantId) ??
    variants[0] ??
    null;

  const resolvedProduct = useMemo(() => {
    if (!product) {
      return null;
    }

    if (!activeVariant) {
      return product;
    }

    const variantName =
      activeVariant.name && activeVariant.name !== "Default Title"
        ? `${product.name} - ${activeVariant.name}`
        : product.name;

    return {
      ...product,
      id: activeVariant.id,
      parentId: product.id,
      name: variantName,
      img: activeVariant.img,
      price: activeVariant.price,
      priceAmount: activeVariant.priceAmount,
      currencyCode: activeVariant.currencyCode,
      oldPrice: activeVariant.oldPrice,
    } satisfies GridProduct;
  }, [activeVariant, product]);

  const previewImages = useMemo(() => {
    if (!product) {
      return [];
    }

    const source = variants.length > 0 ? variants : [];
    const uniqueImages = new Map<string, { id: string; img: string; label: string }>();

    for (const variant of source) {
      if (!uniqueImages.has(variant.img)) {
        uniqueImages.set(variant.img, {
          id: variant.id,
          img: variant.img,
          label: variant.name,
        });
      }
    }

    if (!uniqueImages.has(product.img)) {
      uniqueImages.set(product.img, {
        id: product.id,
        img: product.img,
        label: product.name,
      });
    }

    return Array.from(uniqueImages.values()).slice(0, 6);
  }, [product, variants]);

  const selectOptionValue = (optionName: string, optionValue: string) => {
    setSelectedOptions((current) => {
      const nextOptions = {
        ...current,
        [optionName]: optionValue,
      };

      const perfectMatch = variants.find((variant) => {
        const optionNames = new Set(variant.options.map((option) => option.name));

        return Object.entries(nextOptions)
          .filter(([name]) => optionNames.has(name))
          .every(([name, value]) => {
          return variant.options.some((option) => option.name === name && option.value === value);
        });
      });

      if (perfectMatch) {
        setSelectedVariantId(perfectMatch.id);
        return nextOptions;
      }

      const partialMatch = variants.find((variant) => {
        return variant.options.some((option) => option.name === optionName && option.value === optionValue);
      });

      if (partialMatch) {
        setSelectedVariantId(partialMatch.id);
        return Object.fromEntries(partialMatch.options.map((option) => [option.name, option.value]));
      }

      return nextOptions;
    });
  };

  const isOptionValueAvailable = (optionName: string, optionValue: string) => {
    if (variants.length === 0) {
      return true;
    }

    return variants.some((variant) => {
      if (!variant.availableForSale) {
        return false;
      }

      const activeSelection = {
        ...selectedOptions,
        [optionName]: optionValue,
      };

      return variant.options.every((option) => {
        const selectedValue = activeSelection[option.name];
        return !selectedValue || selectedValue === option.value;
      });
    });
  };

  if (!isOpen || !product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-3 py-5 md:px-6" onClick={onClose}>
      <div
        className="w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--gold)]/45 bg-gradient-to-b from-[#30070d] to-[#22040a] shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[var(--gold)]/25 px-5 py-4 md:px-7 md:py-5">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">
              <Sparkles className="h-3 w-3" />
              Product Details
            </p>
            <h3 className="text-2xl leading-tight md:text-3xl">{resolvedProduct?.name ?? product.name}</h3>
          </div>
          <button
            type="button"
            aria-label="Close product details"
            className="rounded-full p-2 text-[#eac26a] transition hover:bg-[#461017]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[82vh] gap-6 overflow-y-auto p-5 md:grid-cols-[1.15fr_1fr] md:gap-8 md:p-7">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-[var(--gold)]/25 bg-[#1f0409]">
              <img
                src={resolvedProduct?.img ?? product.img}
                alt={resolvedProduct?.name ?? product.name}
                className="h-[320px] w-full object-cover sm:h-[420px] md:h-[500px]"
              />
            </div>

            {previewImages.length > 1 ? (
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                {previewImages.map((preview) => {
                  const isActive = activeVariant?.id === preview.id || (!activeVariant && product.id === preview.id);

                  return (
                    <button
                      key={preview.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(preview.id);

                        const matchingVariant = variants.find((variant) => variant.id === preview.id);
                        if (matchingVariant) {
                          setSelectedOptions(
                            Object.fromEntries(
                              matchingVariant.options.map((option) => [option.name, option.value])
                            )
                          );
                        }
                      }}
                      className={`overflow-hidden rounded-xl border transition ${
                        isActive
                          ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/40"
                          : "border-[var(--gold)]/20 hover:border-[var(--gold)]/50"
                      }`}
                      aria-label={`Preview ${preview.label}`}
                    >
                      <img src={preview.img} alt={preview.label} className="h-14 w-full object-cover sm:h-16" />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col">
            <p className="mb-5 text-base leading-relaxed text-[#f1d9d3]">{product.description}</p>

            <div className="mb-6 flex items-end gap-3 border-b border-[var(--gold)]/15 pb-5">
              <p className="text-3xl leading-none">{resolvedProduct?.price ?? product.price}</p>
              {(resolvedProduct?.oldPrice ?? product.oldPrice) ? (
                <p className="text-base text-[#d5bdb9] line-through">{resolvedProduct?.oldPrice ?? product.oldPrice}</p>
              ) : null}
            </div>

            {optionGroups.length > 0 ? (
              <div className="mb-7 space-y-5">
                {optionGroups.map((group) => (
                  <div key={group.name}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
                      {group.name}
                    </p>

                    {isColorOption(group.name) ? (
                      <div className="flex flex-wrap gap-2.5">
                        {group.values.map((value) => {
                          const selected = selectedOptions[group.name] === value;
                          const available = isOptionValueAvailable(group.name, value);

                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={!available}
                              onClick={() => selectOptionValue(group.name, value)}
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition ${
                                selected
                                  ? "border-[var(--gold)] bg-[#5a141e] text-white"
                                  : "border-[var(--gold)]/35 text-[#f2dbd7] hover:border-[var(--gold)]/70"
                              } ${available ? "" : "cursor-not-allowed opacity-45 hover:border-[var(--gold)]/35"}`}
                              aria-label={`${group.name} ${value}${available ? "" : " unavailable"}`}
                            >
                              <span
                                className="h-5 w-5 rounded-full border border-white/50"
                                style={{ backgroundColor: getSwatchColor(value) }}
                              />
                              {value}
                              {selected ? <Check className="h-3.5 w-3.5" /> : null}
                              {!available ? <span className="text-[10px] text-[#b68a8a]">Out</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {group.values.map((value) => {
                          const selected = selectedOptions[group.name] === value;
                          const available = isOptionValueAvailable(group.name, value);

                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={!available}
                              onClick={() => selectOptionValue(group.name, value)}
                              className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.08em] transition ${
                                selected
                                  ? "border-[var(--gold)] bg-[#5a141e] text-white"
                                  : "border-[var(--gold)]/30 text-[#f3ddd4] hover:border-[var(--gold)]/65"
                              } ${available ? "" : "cursor-not-allowed opacity-45 hover:border-[var(--gold)]/30"}`}
                              aria-label={`${group.name} ${value}${available ? "" : " unavailable"}`}
                            >
                              {value}
                              {!available ? <span className="ml-1 text-[10px] text-[#b68a8a]">(Out)</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {hasSizeOptions ? (
                  <div className="rounded-2xl border border-[var(--gold)]/20 bg-[#2a070d]">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                      onClick={() => setIsSizeGuideOpen((current) => !current)}
                      aria-expanded={isSizeGuideOpen}
                      aria-label="Toggle size guide"
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
                        Size Guide
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-[var(--gold)] transition ${isSizeGuideOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isSizeGuideOpen ? (
                      <div className="border-t border-[var(--gold)]/15 px-4 py-3">
                        {effectiveSizeChart ? (
                          <>
                            <div
                              className="grid gap-2 text-center text-[11px] uppercase tracking-[0.08em]"
                              style={{ gridTemplateColumns: `repeat(${effectiveSizeChart.headers.length}, minmax(0, 1fr))` }}
                            >
                              {effectiveSizeChart.headers.map((header) => (
                                <div key={header} className="rounded-md bg-[#3f0f16] px-2 py-1.5 text-[#f6ddce]">
                                  {header}
                                </div>
                              ))}

                              {effectiveSizeChart.rows.flatMap((row, rowIndex) =>
                                row.map((cell, cellIndex) => (
                                  <div key={`${rowIndex}-${cellIndex}`} className="rounded-md bg-[#2f0b11] px-2 py-1.5">
                                    {cell}
                                  </div>
                                ))
                              )}
                            </div>
                            {effectiveSizeChart.note ? (
                              <p className="mt-2 text-[11px] text-[#d6b9b2]">{effectiveSizeChart.note}</p>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-[11px] text-[#d6b9b2]">
                            Size chart is not available for this product yet. Please contact support for exact measurements.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {selectedSummary ? (
              <p className="mb-3 rounded-xl border border-[var(--gold)]/25 bg-[#2b070d] px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[#e9cfb0]">
                Selected: {selectedSummary}
              </p>
            ) : null}

            {activeVariant && !activeVariant.availableForSale ? (
              <p className="mb-3 text-xs text-[#d8a5a5]">This variant is currently out of stock. Pick another option to continue.</p>
            ) : null}

            <div className="mt-auto flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={activeVariant ? !activeVariant.availableForSale : false}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-3 font-medium text-[#3b0810] transition hover:bg-[#f0c654] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--gold)]"
                onClick={() => {
                  if (resolvedProduct) {
                    onAddToCart(resolvedProduct);
                  }
                }}
              >
                <ShoppingBag className="h-4 w-4" />
                Add to Cart
              </button>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--gold)] px-5 py-3 text-white transition hover:bg-[#461017]"
                onClick={() => {
                  if (resolvedProduct) {
                    onToggleWishlist(resolvedProduct);
                  }
                }}
              >
                <Heart
                  className={`h-4 w-4 ${
                    resolvedProduct && isWishlisted(resolvedProduct) ? "fill-[var(--gold)] text-[var(--gold)]" : ""
                  }`}
                />
                {resolvedProduct && isWishlisted(resolvedProduct) ? "Wishlisted" : "Add to Wishlist"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
