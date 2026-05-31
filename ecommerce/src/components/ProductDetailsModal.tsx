"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GridProduct } from "@/lib/catalog";
import { convertAmount, formatCurrency, toSupportedCurrency } from "@/lib/currency";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Heart, Minus, Play, Plus, ShoppingBag, Sparkles, X } from "lucide-react";
import { getConfiguredSizeChart } from "@/lib/size-charts";
import SafeImage from "@/components/SafeImage";
import { useUiStore } from "@/store/useUiStore";

type ProductDetailsModalProps = {
  product: GridProduct | null;
  isOpen: boolean;
  isWishlisted: (product: GridProduct) => boolean;
  onClose: () => void;
  onToggleWishlist: (product: GridProduct) => void;
  onAddToCart: (product: GridProduct) => void;
  onBuyNow: (product: GridProduct) => void;
};

type PreviewMediaItem = {
  id: string;
  type: "image" | "video";
  src: string;
  thumbnail?: string;
  label: string;
  variantId: string | null;
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

function normalizeSizeLabel(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");

  if (normalized === "2XL") {
    return "XXL";
  }

  if (normalized === "3XL") {
    return "XXXL";
  }

  return normalized;
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

const DESCRIPTION_SECTION_LABELS = [
  "Product Story",
  "Fabric & Feel",
  "Design Essence",
  "Fit & Finish",
  "Care Instructions",
  "Wash Care",
  "Style Tip",
  "Occasion",
  "Sanskrit Mantra",
] as const;

const DESCRIPTION_SECTION_SET = new Set(
  DESCRIPTION_SECTION_LABELS.map((label) => label.toLowerCase())
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDescriptionBlocks(description: string) {
  let normalized = description.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return [] as Array<{ label?: string; text: string }>;
  }

  normalized = normalized
    .replace(/\s+/g, " ")
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    .replace(/([a-z])([A-Z][a-z])/g, "$1 $2");

  for (const label of DESCRIPTION_SECTION_LABELS) {
    const matcher = new RegExp(`\\s*${escapeRegExp(label)}\\s*:?\\s*`, "gi");
    normalized = normalized.replace(matcher, `\n${label}: `);
  }

  return normalized
    .split(/\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const headingMatch = segment.match(/^([^:]{3,30}):\s*(.+)$/);

      if (!headingMatch) {
        return { text: segment };
      }

      const label = headingMatch[1].trim();
      const text = headingMatch[2].trim();

      if (!DESCRIPTION_SECTION_SET.has(label.toLowerCase()) || !text) {
        return { text: segment };
      }

      return { label, text };
    });
}

function getTouchDistance(
  touchA: { clientX: number; clientY: number },
  touchB: { clientX: number; clientY: number },
) {
  return Math.hypot(touchA.clientX - touchB.clientX, touchA.clientY - touchB.clientY);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseZoomOrigin(origin: string) {
  const [xPart = "50%", yPart = "50%"] = origin.split(" ");
  const x = Number.parseFloat(xPart);
  const y = Number.parseFloat(yPart);

  return {
    x: Number.isFinite(x) ? x : 50,
    y: Number.isFinite(y) ? y : 50,
  };
}

export default function ProductDetailsModal({
  product,
  isOpen,
  isWishlisted,
  onClose,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
}: ProductDetailsModalProps) {
  const displayCurrency = useUiStore((state) => state.currency);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; originX: number; originY: number } | null>(null);
  const didPanRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

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
        const values = new Set((sizeOptionGroup?.values ?? []).map((value) => normalizeSizeLabel(value)));
        const rows =
          values.size > 0
            ? configured.rows.filter((row) => values.has(normalizeSizeLabel(row[0])))
            : configured.rows;

        const fallbackNotePrefix = "Using standard size guide for this product.";
        const note = configured.note
          ? `${fallbackNotePrefix} ${configured.note}`
          : fallbackNotePrefix;

        return {
          ...configured,
          rows,
          note,
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

  const descriptionBlocks = useMemo(() => {
    return formatDescriptionBlocks(product?.description ?? "");
  }, [product?.description]);

  const canZoomOut = zoomLevel > 1;
  const canZoomIn = zoomLevel < 2.6;

  const updateZoom = (nextValue: number) => {
    const clampedValue = Math.max(1, Math.min(2.6, Number(nextValue.toFixed(2))));
    setZoomLevel(clampedValue);

    if (clampedValue === 1) {
      setZoomOrigin("50% 50%");
      setIsPanning(false);
      panStartRef.current = null;
      didPanRef.current = false;
    }
  };

  const updateZoomOriginFromClientPoint = (
    eventTarget: EventTarget & HTMLElement,
    clientX: number,
    clientY: number,
  ) => {
    const rect = eventTarget.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setZoomOrigin(`${x}% ${y}%`);
  };

  const panZoomOriginFromDelta = (
    eventTarget: EventTarget & HTMLElement,
    deltaX: number,
    deltaY: number,
    originX: number,
    originY: number,
  ) => {
    const rect = eventTarget.getBoundingClientRect();
    const nextX = clamp(originX - (deltaX / rect.width) * 100, 0, 100);
    const nextY = clamp(originY - (deltaY / rect.height) * 100, 0, 100);

    setZoomOrigin(`${nextX}% ${nextY}%`);
  };

  useEffect(() => {
    if (!isOpen || !product) {
      return;
    }

    const initialVariant = variants[0] ?? null;
    setSelectedVariantId(initialVariant?.id ?? null);
    setSelectedOptions(
      Object.fromEntries((initialVariant?.options ?? []).map((option) => [option.name, option.value]))
    );
    setSelectedPreviewId(null);
    setIsSizeGuideOpen(false);
    setZoomLevel(1);
    setZoomOrigin("50% 50%");
    pinchStartRef.current = null;
    panStartRef.current = null;
    didPanRef.current = false;
    setIsPanning(false);
  }, [isOpen, product, variants]);

  const activeVariant =
    variants.find((variant) => variant.id === selectedVariantId) ??
    variants[0] ??
    null;

  useEffect(() => {
    setSelectedPreviewId(null);
    setZoomLevel(1);
    setZoomOrigin("50% 50%");
    pinchStartRef.current = null;
    panStartRef.current = null;
    didPanRef.current = false;
    setIsPanning(false);
  }, [selectedVariantId]);

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

  const previewMedia = useMemo(() => {
    if (!product) {
      return [];
    }

    const source = variants.length > 0 ? variants : [];
    const uniqueMedia = new Map<string, PreviewMediaItem>();

    const productMedia = product.productMedia ?? [];
    for (const media of productMedia) {
      const key = `${media.type}:${media.src}`;

      if (!uniqueMedia.has(key)) {
        uniqueMedia.set(key, {
          id: `media-${media.type}-${media.src}`,
          type: media.type,
          src: media.src,
          thumbnail: media.thumbnail,
          label: media.alt ?? product.name,
          variantId: null,
        });
      }
    }

    for (const variant of source) {
      const key = `image:${variant.img}`;

      if (!uniqueMedia.has(key)) {
        uniqueMedia.set(key, {
          id: `variant-${variant.id}`,
          type: "image",
          src: variant.img,
          label: variant.name,
          variantId: variant.id,
        });
      }
    }

    const galleryImages = product.galleryImages ?? [];
    for (const image of galleryImages) {
      const key = `image:${image}`;

      if (!uniqueMedia.has(key)) {
        uniqueMedia.set(key, {
          id: `gallery-${image}`,
          type: "image",
          src: image,
          label: product.name,
          variantId: null,
        });
      }
    }

    const defaultKey = `image:${product.img}`;
    if (!uniqueMedia.has(defaultKey)) {
      uniqueMedia.set(defaultKey, {
        id: `product-${product.id}`,
        type: "image",
        src: product.img,
        label: product.name,
        variantId: null,
      });
    }

    return Array.from(uniqueMedia.values());
  }, [product, variants]);

  const activePreview =
    (selectedPreviewId
      ? previewMedia.find((preview) => preview.id === selectedPreviewId)
      : undefined) ??
    previewMedia.find((preview) => preview.variantId === activeVariant?.id) ??
    previewMedia[0] ??
    null;

  const activeImage = activePreview?.src ?? resolvedProduct?.img ?? product?.img ?? "";
  const activeMediaType = activePreview?.type ?? "image";
  const activeImageThumbnail = activePreview?.thumbnail;
  const activeImageIndex = activePreview
    ? previewMedia.findIndex((preview) => preview.id === activePreview.id)
    : -1;

  const updateActivePreview = (preview: PreviewMediaItem) => {
    if (preview.variantId) {
      setSelectedVariantId(preview.variantId);
      setSelectedPreviewId(preview.id);
    } else {
      setSelectedPreviewId(preview.id);
    }

    setZoomLevel(1);
    setZoomOrigin("50% 50%");
    pinchStartRef.current = null;
    panStartRef.current = null;
    didPanRef.current = false;
    setIsPanning(false);

    const matchingVariant = preview.variantId ? variants.find((variant) => variant.id === preview.variantId) : null;

    if (matchingVariant) {
      setSelectedOptions(Object.fromEntries(matchingVariant.options.map((option) => [option.name, option.value])));
    }
  };

  const navigatePreviewImage = (direction: 1 | -1) => {
    if (previewMedia.length <= 1) {
      return;
    }

    const baseIndex = activeImageIndex >= 0 ? activeImageIndex : 0;
    const nextIndex = (baseIndex + direction + previewMedia.length) % previewMedia.length;
    const nextPreview = previewMedia[nextIndex];

    if (nextPreview) {
      updateActivePreview(nextPreview);
    }
  };

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
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-black/75 px-3 py-3 backdrop-blur-[2px] md:px-6 md:py-6"
      onClick={onClose}
    >
      <div
        className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-[var(--gold)]/45 bg-[image:var(--popup-gradient)] shadow-[0_30px_70px_rgba(0,0,0,0.6)] md:min-h-0 md:max-h-[calc(100vh-3rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--gold)]/25 px-5 py-4 md:px-7 md:py-5">
          <div className="min-w-0 flex-1">
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">
              <Sparkles className="h-3 w-3" />
              Product Details
            </p>
            <h3 className="max-w-4xl text-xl leading-tight text-[var(--popup-footer-text)] sm:text-2xl md:text-3xl">
              {resolvedProduct?.name ?? product.name}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close product details"
            className="shrink-0 rounded-full p-2 text-[var(--gold)] transition hover:bg-[var(--popup-hover2)]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] md:items-start md:gap-8 md:p-7">
            <div className="space-y-3 md:sticky md:top-0">
              <div className="group relative overflow-hidden rounded-[1.75rem] border border-[var(--gold)]/25 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.08))]">
                {activeMediaType === "image" ? (
                  <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-[var(--gold)]/40 bg-black/35 px-1.5 py-1 backdrop-blur-sm">
                    <button
                      type="button"
                      aria-label="Zoom out"
                      disabled={!canZoomOut}
                      className="rounded-full p-1 text-[var(--gold)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => updateZoom(zoomLevel - 0.3)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Reset zoom"
                      disabled={zoomLevel === 1}
                      className="min-w-12 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--popup-footer-text)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => updateZoom(1)}
                    >
                      {Math.round(zoomLevel * 100)}%
                    </button>
                    <button
                      type="button"
                      aria-label="Zoom in"
                      disabled={!canZoomIn}
                      className="rounded-full p-1 text-[var(--gold)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => updateZoom(zoomLevel + 0.3)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}

              {previewMedia.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Previous product image"
                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[var(--gold)]/35 bg-black/45 p-2 text-[var(--gold)] backdrop-blur-sm transition hover:bg-black/60"
                    onClick={() => navigatePreviewImage(-1)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next product image"
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[var(--gold)]/35 bg-black/45 p-2 text-[var(--gold)] backdrop-blur-sm transition hover:bg-black/60"
                    onClick={() => navigatePreviewImage(1)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full border border-[var(--gold)]/30 bg-black/45 px-3 py-1 text-[10px] font-medium tracking-[0.08em] text-[var(--popup-footer-text)] backdrop-blur-sm sm:text-[11px]">
                    {activeImageIndex + 1} / {previewMedia.length}
                  </div>
                </>
              ) : null}

              {activeMediaType === "video" ? (
                <div className="flex min-h-[340px] items-start justify-center px-4 pb-4 pt-14 sm:min-h-[420px] sm:px-6 sm:pb-6 md:min-h-[560px] md:px-8 md:pb-8">
                  <video
                    key={activePreview?.id ?? activeImage}
                    src={activeImage}
                    controls
                    playsInline
                    preload="metadata"
                    poster={activeImageThumbnail}
                    className="h-full max-h-[72vh] w-full rounded-xl bg-black object-contain"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  aria-label="Toggle image zoom"
                  className={`block w-full touch-none ${zoomLevel > 1 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"}`}
                  onClick={() => {
                    if (didPanRef.current) {
                      didPanRef.current = false;
                      return;
                    }

                    updateZoom(zoomLevel > 1 ? 1 : 1.8);
                  }}
                  onMouseDown={(event) => {
                    if (zoomLevel === 1) {
                      return;
                    }

                    event.preventDefault();
                    const { x, y } = parseZoomOrigin(zoomOrigin);
                    didPanRef.current = false;
                    setIsPanning(true);
                    panStartRef.current = {
                      clientX: event.clientX,
                      clientY: event.clientY,
                      originX: x,
                      originY: y,
                    };
                  }}
                  onMouseMove={(event) => {
                    if (panStartRef.current && zoomLevel > 1 && event.buttons === 1) {
                      event.preventDefault();

                      const deltaX = event.clientX - panStartRef.current.clientX;
                      const deltaY = event.clientY - panStartRef.current.clientY;

                      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                        didPanRef.current = true;
                      }

                      panZoomOriginFromDelta(
                        event.currentTarget,
                        deltaX,
                        deltaY,
                        panStartRef.current.originX,
                        panStartRef.current.originY,
                      );
                      return;
                    }

                    if (zoomLevel === 1) {
                      return;
                    }

                    updateZoomOriginFromClientPoint(event.currentTarget, event.clientX, event.clientY);
                  }}
                  onMouseUp={() => {
                    panStartRef.current = null;
                    setIsPanning(false);
                  }}
                  onWheel={(event) => {
                    event.preventDefault();

                    const wheelDirection = Math.sign(event.deltaY);
                    const zoomStep = wheelDirection > 0 ? -0.14 : 0.14;

                    updateZoomOriginFromClientPoint(event.currentTarget, event.clientX, event.clientY);
                    updateZoom(zoomLevel + zoomStep);
                  }}
                  onTouchStart={(event) => {
                    if (event.touches.length === 2) {
                      const [touchA, touchB] = [event.touches[0], event.touches[1]];
                      panStartRef.current = null;
                      setIsPanning(false);
                      pinchStartRef.current = {
                        distance: getTouchDistance(touchA, touchB),
                        zoom: zoomLevel,
                      };
                      return;
                    }

                    if (event.touches.length === 1 && zoomLevel > 1) {
                      const touch = event.touches[0];
                      const { x, y } = parseZoomOrigin(zoomOrigin);

                      didPanRef.current = false;
                      setIsPanning(true);
                      panStartRef.current = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        originX: x,
                        originY: y,
                      };
                    }
                  }}
                  onTouchMove={(event) => {
                    if (event.touches.length === 2 && pinchStartRef.current) {
                      event.preventDefault();

                      const [touchA, touchB] = [event.touches[0], event.touches[1]];
                      const currentDistance = getTouchDistance(touchA, touchB);
                      const { distance: initialDistance, zoom: initialZoom } = pinchStartRef.current;

                      if (initialDistance <= 0) {
                        return;
                      }

                      const midpointX = (touchA.clientX + touchB.clientX) / 2;
                      const midpointY = (touchA.clientY + touchB.clientY) / 2;

                      updateZoomOriginFromClientPoint(event.currentTarget, midpointX, midpointY);
                      updateZoom(initialZoom * (currentDistance / initialDistance));
                      return;
                    }

                    if (event.touches.length === 1 && panStartRef.current && zoomLevel > 1) {
                      event.preventDefault();

                      const touch = event.touches[0];
                      const deltaX = touch.clientX - panStartRef.current.clientX;
                      const deltaY = touch.clientY - panStartRef.current.clientY;

                      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                        didPanRef.current = true;
                      }

                      panZoomOriginFromDelta(
                        event.currentTarget,
                        deltaX,
                        deltaY,
                        panStartRef.current.originX,
                        panStartRef.current.originY,
                      );
                    }
                  }}
                  onTouchEnd={() => {
                    pinchStartRef.current = null;
                    panStartRef.current = null;
                    setIsPanning(false);
                  }}
                  onTouchCancel={() => {
                    pinchStartRef.current = null;
                    panStartRef.current = null;
                    setIsPanning(false);
                  }}
                  onMouseLeave={() => {
                    panStartRef.current = null;
                    setIsPanning(false);

                    if (zoomLevel === 1) {
                      setZoomOrigin("50% 50%");
                    }
                  }}
                >
                  <div className="flex min-h-[340px] items-start justify-center px-4 pb-4 pt-14 sm:min-h-[420px] sm:px-6 sm:pb-6 md:min-h-[560px] md:px-8 md:pb-8">
                    <SafeImage
                      src={activeImage}
                      alt={resolvedProduct?.name ?? product.name}
                      className="h-full max-h-[72vh] w-full select-none object-contain object-top transition-transform duration-200 ease-out"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: zoomOrigin,
                      }}
                    />
                  </div>
                </button>
              )}

              {activeMediaType === "image" && zoomLevel > 1 ? (
                <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border border-[var(--gold)]/35 bg-black/45 px-3 py-1 text-[10px] font-medium tracking-[0.06em] text-[var(--popup-footer-text)] backdrop-blur-sm sm:text-[11px]">
                  Drag to pan • Pinch or wheel to zoom
                </div>
              ) : null}
            </div>

            {previewMedia.length > 1 ? (
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                {previewMedia.map((preview) => {
                  const isActive = preview.id === activePreview?.id;
                  const previewThumb = preview.type === "video" ? (preview.thumbnail ?? product.img) : preview.src;

                  return (
                    <button
                      key={preview.id}
                      type="button"
                      onClick={() => updateActivePreview(preview)}
                      className={`overflow-hidden rounded-xl border bg-white/5 transition ${
                        isActive
                          ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/40"
                          : "border-[var(--gold)]/20 hover:border-[var(--gold)]/50"
                      }`}
                      aria-label={`Preview ${preview.label}`}
                    >
                      <div className="relative">
                        <SafeImage src={previewThumb} alt={preview.label} className="h-16 w-full object-contain object-top p-1 sm:h-20" />
                        {preview.type === "video" ? (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="rounded-full bg-black/60 p-1.5 text-white">
                              <Play className="h-3.5 w-3.5 fill-white" />
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

            <div className="flex min-w-0 flex-col self-start md:max-h-none">
              <div className="mb-5 rounded-[1.75rem] border border-[var(--gold)]/15 bg-black/10 p-5 md:p-6">
                <div className="mb-5 flex items-end gap-3 border-b border-[var(--gold)]/15 pb-5">
                  <p className="text-3xl leading-none sm:text-4xl">
                    {formatCurrency(
                      convertAmount(
                        resolvedProduct?.priceAmount ?? product.priceAmount,
                        toSupportedCurrency(resolvedProduct?.currencyCode ?? product.currencyCode),
                        displayCurrency,
                      ),
                      displayCurrency,
                    )}
                  </p>
                  {(resolvedProduct?.oldPrice ?? product.oldPrice) ? (
                    <p className="text-base text-[var(--popup-muted)] line-through sm:text-lg">
                      {formatCurrency(
                        convertAmount(
                          Number.parseFloat((resolvedProduct?.oldPrice ?? product.oldPrice).replace(/[^\d.]/g, "")) ||
                            (resolvedProduct?.priceAmount ?? product.priceAmount),
                          toSupportedCurrency(resolvedProduct?.currencyCode ?? product.currencyCode),
                          displayCurrency,
                        ),
                        displayCurrency,
                      )}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 text-[15px] leading-7 text-[var(--popup-subtext)]">
              {descriptionBlocks.map((block, index) => (
                <p key={`${block.label ?? "text"}-${index}`} className="text-pretty">
                  {block.label ? <span className="font-semibold text-[var(--popup-footer-text)]">{block.label}: </span> : null}
                  {block.text}
                </p>
              ))}
                </div>
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
                                  ? "border-[var(--gold)] bg-[var(--shop-filter-active)] text-[var(--popup-selected-text)]"
                                  : "border-[var(--gold)]/35 text-[var(--popup-subtext)] hover:border-[var(--gold)]/70"
                              } ${available ? "" : "cursor-not-allowed opacity-45 hover:border-[var(--gold)]/35"}`}
                              aria-label={`${group.name} ${value}${available ? "" : " unavailable"}`}
                            >
                              <span
                                className="h-5 w-5 rounded-full border border-white/50"
                                style={{ backgroundColor: getSwatchColor(value) }}
                              />
                              {value}
                              {selected ? <Check className="h-3.5 w-3.5" /> : null}
                              {!available ? <span className="text-[10px] text-[var(--popup-muted)]">Out</span> : null}
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
                                  ? "border-[var(--gold)] bg-[var(--shop-filter-active)] text-[var(--popup-selected-text)]"
                                  : "border-[var(--gold)]/30 text-[var(--popup-subtext)] hover:border-[var(--gold)]/65"
                              } ${available ? "" : "cursor-not-allowed opacity-45 hover:border-[var(--gold)]/30"}`}
                              aria-label={`${group.name} ${value}${available ? "" : " unavailable"}`}
                            >
                              {value}
                              {!available ? <span className="ml-1 text-[10px] text-[var(--popup-muted)]">(Out)</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {hasSizeOptions ? (
                  <div className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--popup-inner)]">
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
                                <div key={header} className="rounded-md bg-[var(--popup-header-cell)] px-2 py-1.5 text-[var(--popup-footer-text)]">
                                  {header}
                                </div>
                              ))}

                              {effectiveSizeChart.rows.flatMap((row, rowIndex) =>
                                row.map((cell, cellIndex) => (
                                  <div key={`${rowIndex}-${cellIndex}`} className="rounded-md bg-[var(--popup-row-cell)] px-2 py-1.5 text-[var(--popup-subtext)]">
                                    {cell}
                                  </div>
                                ))
                              )}
                            </div>
                            {effectiveSizeChart.note ? (
                              <p className="mt-2 text-[11px] text-[var(--popup-muted)]">{effectiveSizeChart.note}</p>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-[11px] text-[var(--popup-muted)]">
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
              <p className="mb-3 rounded-xl border border-[var(--gold)]/25 bg-[var(--popup-inner)] px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--popup-footer-text)]">
                Selected: {selectedSummary}
              </p>
            ) : null}

            {activeVariant && !activeVariant.availableForSale ? (
              <p className="mb-3 text-xs text-[var(--popup-muted)]">This variant is currently out of stock. Pick another option to continue.</p>
            ) : null}

            <div className="mt-auto flex flex-col gap-3 border-t border-[var(--gold)]/15 pt-5 sm:flex-row">
              <button
                type="button"
                disabled={activeVariant ? !activeVariant.availableForSale : false}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--gold)] px-5 py-3 font-medium text-[var(--popup-input-text)] transition hover:bg-[var(--popup-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  if (resolvedProduct) {
                    onAddToCart(resolvedProduct);
                    onClose();
                  }
                }}
              >
                <ShoppingBag className="h-4 w-4" />
                Add to Cart
              </button>
              <button
                type="button"
                disabled={activeVariant ? !activeVariant.availableForSale : false}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-3 font-medium text-[#3b0810] transition hover:bg-[#f0c654] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--gold)]"
                onClick={() => {
                  if (resolvedProduct) {
                    onBuyNow(resolvedProduct);
                  }
                }}
              >
                <ShoppingBag className="h-4 w-4" />
                Buy Now
              </button>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--gold)] px-5 py-3 text-[var(--popup-input-text)] transition hover:bg-[var(--popup-hover)]"
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
  </div>
  );
}
