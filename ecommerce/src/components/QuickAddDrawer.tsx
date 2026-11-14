"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Ruler, ShoppingBag, X } from "lucide-react";
import ProductSizeChartModal from "@/components/ProductSizeChartModal";
import SafeImage from "@/components/SafeImage";
import { GridProduct } from "@/lib/catalog";
import { getSelectedOptionValue, isProductSelectionComplete, isSizeOption } from "@/lib/variant-options";

type QuickAddDrawerProps = {
  product: GridProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: GridProduct) => void;
};

function getInitialOptions(product: GridProduct | null) {
  if (!product) {
    return {};
  }

  return {
    ...(product.selectedOptions ?? {}),
  };
}

export default function QuickAddDrawer({ product, isOpen, onClose, onAddToCart }: QuickAddDrawerProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => getInitialOptions(product));
  const [quantity, setQuantity] = useState(1);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);

  const optionGroups = useMemo(() => {
    if (!product) {
      return [] as Array<{ name: string; values: string[] }>;
    }

    if (product.optionGroups && product.optionGroups.length > 0) {
      return product.optionGroups;
    }

    const groups = new Map<string, Set<string>>();

    for (const variant of product.variants ?? []) {
      for (const option of variant.options) {
        const current = groups.get(option.name) ?? new Set<string>();
        current.add(option.value);
        groups.set(option.name, current);
      }
    }

    return Array.from(groups.entries()).map(([name, values]) => ({ name, values: Array.from(values) }));
  }, [product]);

  const sizeGroup = optionGroups.find((group) => isSizeOption(group.name));
  const sizeValues = sizeGroup?.values ?? [];
  const selectedSizeValue = sizeGroup
    ? getSelectedOptionValue(selectedOptions, sizeGroup.name, "Size", "sizes", "Size / Fit")
    : undefined;

  const soldOutSizeValues = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) {
      return new Set<string>();
    }

    const unavailable = new Set<string>();

    for (const variant of product.variants) {
      const sizeOption = variant.options.find((option) => isSizeOption(option.name));
      if (sizeOption && !variant.availableForSale) {
        unavailable.add(sizeOption.value);
      }
    }

    return unavailable;
  }, [product]);

  const hasSizeOptions = sizeValues.length > 0;
  const canSubmit = product ? isProductSelectionComplete(product, selectedOptions) : true;

  const buildSelectedProduct = () => {
    if (!product) {
      return null;
    }

    if (hasSizeOptions && !selectedSizeValue) {
      return null;
    }

    return {
      ...product,
      selectedSize: selectedSizeValue ?? product.selectedSize,
      selectedVariantId: product.selectedVariantId ?? product.id,
      selectedOptions: { ...selectedOptions },
    } satisfies GridProduct;
  };

  const prepareAndSubmit = () => {
    if (!product || (!canSubmit && hasSizeOptions)) {
      return;
    }

    const preparedProduct = buildSelectedProduct();

    if (!preparedProduct) {
      return;
    }

    for (let i = 0; i < quantity; i += 1) {
      onAddToCart(preparedProduct);
    }

    onClose();
  };

  const selectedSummary = Object.entries(selectedOptions)
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([name, value]) => `${name}: ${value}`)
    .join(" • ");

  const sizeChartImage = product?.galleryImages?.[product.galleryImages.length - 1] ?? product?.img ?? null;

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] bg-black/50 transition ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-[95] flex h-full w-full max-w-md transform flex-col border-l border-[var(--gold)]/40 bg-[var(--popup-bg)] shadow-2xl transition duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--gold)]/30 px-5 py-4">
          <p className="text-lg font-semibold tracking-[0.08em] text-[var(--popup-footer-text)] uppercase">Select Options</p>
          <button type="button" aria-label="Close quick add" onClick={onClose} className="rounded-full p-2 transition hover:bg-[var(--popup-hover)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {product ? (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="flex gap-3 rounded-2xl border border-[var(--gold)]/20 bg-[var(--popup-inner)] p-3">
              <SafeImage src={product.img} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-[var(--popup-footer-text)]">{product.name}</p>
                <p className="mt-1 text-base font-semibold text-[var(--gold)]">{product.price}</p>
              </div>
            </div>

            {hasSizeOptions ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">SIZE</p>
                    <p className="mt-1 text-sm text-[var(--popup-subtext)]">Choose the size that fits your look best.</p>
                  </div>

                  {product.sizeChart || sizeValues.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsSizeChartOpen(true)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--secondary)] transition hover:text-[var(--secondary)]/70"
                    >
                      <Ruler className="h-4 w-4" />
                      Size chart
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {sizeValues.map((value) => {
                    const isSelected = selectedSizeValue === value;
                    const soldOut = soldOutSizeValues.has(value);

                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={soldOut}
                        onClick={() => {
                          if (soldOut) {
                            return;
                          }

                          setSelectedOptions((current) => ({ ...current, [sizeGroup?.name ?? "Size"]: value }));
                        }}
                        aria-pressed={isSelected}
                        className={`inline-flex min-h-[44px] min-w-[52px] items-center justify-center rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                          isSelected
                            ? "border-[#5b1219] bg-[#5b1219] text-white"
                            : "border-[#d9c4b7] bg-white text-[#2a2a2a] hover:border-[#5b1219] hover:text-[#5b1219]"
                        } ${soldOut ? "cursor-not-allowed opacity-35 line-through" : ""}`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>

                {hasSizeOptions && !selectedSizeValue ? (
                  <p className="mt-2 text-xs font-medium text-[var(--secondary)]">Please select a size</p>
                ) : null}
              </div>
            ) : null}

            {selectedSummary ? (
              <div className="rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-inner)] px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--popup-footer-text)]">
                Selected: {selectedSummary}
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-inner)] px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--popup-footer-text)]">Quantity</span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--gold)]/40 text-[var(--popup-footer-text)] transition hover:bg-[var(--popup-hover)]"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                <span className="min-w-[20px] text-center text-sm font-semibold text-[var(--popup-footer-text)]">{quantity}</span>

                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--gold)]/40 text-[var(--popup-footer-text)] transition hover:bg-[var(--popup-hover)]"
                  onClick={() => setQuantity((current) => current + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="border-t border-[var(--gold)]/30 p-5">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={prepareAndSubmit}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-4 py-3 text-sm font-medium text-[#3b0810] transition hover:bg-[#f0c654] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to cart
          </button>
        </div>
      </aside>

      {product ? (
        <ProductSizeChartModal
          isOpen={isSizeChartOpen}
          onClose={() => setIsSizeChartOpen(false)}
          image={sizeChartImage}
          productName={product.name}
        />
      ) : null}
    </>
  );
}
