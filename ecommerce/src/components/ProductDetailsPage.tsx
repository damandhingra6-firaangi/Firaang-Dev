"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Heart,
  Loader2,
  MapPin,
  MessageSquarePlus,
  PackageCheck,
  RefreshCcw,
  Ruler,
  Send,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import SafeImage from "@/components/SafeImage";
import ProductSizeChartModal from "@/components/ProductSizeChartModal";
import CustomDesignSection from "@/components/CustomDesignSection";
import type { DesignCustomization } from "@/components/DesignStudio";
import { CUSTOM_DESIGN_SURCHARGE_INR, GridProduct } from "@/lib/catalog";
import { isSignatureProduct } from "@/lib/design-inquiry";
import { COMPANY_MANUFACTURER_DETAILS } from "@/lib/company";
import { convertAmount, formatCurrency } from "@/lib/currency";
import { getWishlistIds, useShopStore } from "@/store/useShopStore";
import { useAccountStore } from "@/store/useAccountStore";
import { useUiStore } from "@/store/useUiStore";

export type ProductCardLite = Pick<
  GridProduct,
  | "id"
  | "handle"
  | "name"
  | "price"
  | "priceAmount"
  | "currencyCode"
  | "oldPrice"
  | "img"
  | "category"
  | "categorySlug"
  | "subCategory"
  | "subCategorySlug"
  | "audience"
  | "audienceSlug"
>;

type ProductReviewRecord = {
  id: string;
  productId: string;
  productHandle: string;
  productName: string;
  reviewerName?: string;
  rating: number;
  title?: string;
  message: string;
  createdAt: string;
  verifiedPurchase?: boolean;
};

type ProductDetailsPageProps = {
  product: GridProduct;
  catalogProducts: ProductCardLite[];
};

type ReviewFormState = {
  reviewerName: string;
  rating: number;
  title: string;
  message: string;
};

type GalleryItem = {
  id: string;
  type: "image" | "video";
  src: string;
  thumbnail?: string;
  label: string;
};

type ImageCandidate = {
  src: string;
  label: string;
};

const FALLBACK_REVIEWS: ProductReviewRecord[] = [
  {
    id: "demo-review-1",
    productId: "demo",
    productHandle: "demo",
    productName: "Firaang Signature",
    reviewerName: "Aaravi",
    rating: 5,
    title: "Excellent finish and fit",
    message: "The fabric feels premium, the stitching is clean, and the fit looks polished straight out of the box.",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    verifiedPurchase: true,
  },
  {
    id: "demo-review-2",
    productId: "demo",
    productHandle: "demo",
    productName: "Firaang Signature",
    reviewerName: "Mehul",
    rating: 4,
    title: "Looks premium on wear",
    message: "The product photos match the actual look well. It has a refined feel and the delivery was quick.",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    verifiedPurchase: true,
  },
  {
    id: "demo-review-3",
    productId: "demo",
    productHandle: "demo",
    productName: "Firaang Signature",
    reviewerName: "Ishita",
    rating: 5,
    title: "Worth the price",
    message: "The product has a nice premium touch, holds shape well, and works for both daily and occasion wear.",
    createdAt: new Date(Date.now() - 86400000 * 11).toISOString(),
  },
];

function isColorOption(optionName: string) {
  const normalized = optionName.trim().toLowerCase();
  return normalized === "color" || normalized === "colour";
}

function isSizeOption(optionName: string) {
  return optionName.trim().toLowerCase() === "size";
}

function normalizeSizeLabel(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  if (normalized === "2XL") return "XXL";
  if (normalized === "3XL") return "XXXL";
  return normalized;
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getSwatchColor(value: string) {
  const normalized = value.trim().toLowerCase();
  const palette: Record<string, string> = {
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

  return palette[normalized] ?? "#8c8c8c";
}

function parseAmount(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasBackKeyword(input: string) {
  const text = input.toLowerCase();
  return /(\bback\b|\brear\b|\bbackside\b|\breverse\b|\bback-view\b|\bbackview\b)/.test(text);
}

function hasFrontKeyword(input: string) {
  const text = input.toLowerCase();
  return /(\bfront\b|\bfront-view\b|\bfrontview\b)/.test(text);
}

function looksLikeModelShot(input: string) {
  const text = input.toLowerCase();
  return /(\bmodel\b|\bwear\b|\bworn\b|\bman\b|\bwoman\b|\bperson\b|\blifestyle\b)/.test(text);
}

function roundRating(value: number) {
  return Math.max(0, Math.min(5, Math.round(value * 2) / 2));
}

function renderStars(value: number) {
  const rating = roundRating(value);
  return Array.from({ length: 5 }, (_, index) => (
    <Star key={index} className={`h-3.5 w-3.5 ${rating >= index + 1 ? "fill-[var(--gold)] text-[var(--gold)]" : "text-[#b9aba4]"}`} />
  ));
}

function buildDistribution(reviews: ProductReviewRecord[]) {
  const total = Math.max(1, reviews.length);
  return [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((item) => Math.round(item.rating) === rating).length;
    return { rating, count, percentage: Math.round((count / total) * 100) };
  });
}

function getBrand(product: GridProduct) {
  return product.category ?? product.audience ?? "Firaang";
}

function getSubtitle(product: GridProduct) {
  return product.subCategory ?? product.description.split(".")[0] ?? "Signature everyday styling";
}

function getShippingEstimate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(date);
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const days = Math.max(1, Math.round((Date.now() - date.getTime()) / 86400000));
  if (days < 7) {
    return `${days} days ago`;
  }
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function DetailLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-[var(--secondary)]">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-[var(--page-fg)]">{label}</p>
        <p className="mt-1 text-sm leading-6 text-[#665b55]">{value}</p>
      </div>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 md:p-4">
      <p className="text-[15px] font-semibold leading-6 text-[var(--page-fg)] md:text-sm">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#675d56] break-words md:text-sm">{text}</p>
    </div>
  );
}

function SectionShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <details className="group w-full max-w-full rounded-3xl border border-[#eaded3] bg-[rgba(255,252,248,0.94)] p-4 shadow-[0_12px_36px_rgba(97,52,27,0.04)] md:rounded-[28px] md:p-5" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[1.9rem] font-semibold leading-tight text-[var(--page-fg)] md:text-2xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] leading-6 text-[#6f625b] md:text-sm">{subtitle}</p> : null}
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-[#8e7f75] transition group-open:rotate-180" />
      </summary>
      <div className="mt-4 md:mt-5">{children}</div>
    </details>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eaded3] bg-white p-4 md:p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e7f75]">{label}</p>
      <p className="mt-2 text-sm leading-7 text-[#4d4540] break-words">{value}</p>
    </div>
  );
}

function OptionGroup({
  title,
  subtitle,
  values,
  selected,
  onSelect,
  isDisabled,
  renderSwatch = false,
  showSizeGuide = false,
  onSizeChartClick,
}: {
  title: string;
  subtitle?: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  isDisabled?: (value: string) => boolean;
  renderSwatch?: boolean;
  showSizeGuide?: boolean;
  onSizeChartClick?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8e7f75]">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-[#695e57]">{subtitle}</p> : null}
        </div>
        {showSizeGuide ? (
          <button
            type="button"
            onClick={onSizeChartClick}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--secondary)] transition hover:text-[var(--secondary)]/70"
          >
            <Ruler className="h-4 w-4" />
            Size chart
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => {
          const disabled = isDisabled?.(value) ?? false;
          const active = selected === value;

          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(value)}
              className={`inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm font-semibold transition ${active ? "border-[var(--secondary)] bg-[var(--secondary)] text-white" : "border-[#ddcfc1] bg-white text-[var(--page-fg)] hover:border-[var(--secondary)] hover:text-[var(--secondary)]"} ${disabled ? "cursor-not-allowed opacity-35" : ""}`}
              aria-pressed={active}
            >
              {renderSwatch ? <span className="mr-2 inline-flex h-4 w-4 rounded-full border border-white/70" style={{ backgroundColor: getSwatchColor(value) }} /> : null}
              {renderSwatch ? value : normalizeSizeLabel(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RelatedRail({
  title,
  items,
  currencyCode,
  emptyMessage = "No items available right now.",
  compact = false,
}: {
  title: string;
  items: ProductCardLite[];
  currencyCode: "INR" | "USD" | "AED";
  emptyMessage?: string;
  compact?: boolean;
}) {
  return (
    <section className="rounded-[28px] border border-[#eaded3] bg-[rgba(255,252,248,0.95)] p-5 shadow-[0_12px_36px_rgba(97,52,27,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-[var(--page-fg)]">{title}</h3>
        <Sparkles className="h-4 w-4 text-[var(--secondary)]" />
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-[#dcca9f] px-4 py-6 text-sm text-[#6c615b]">{emptyMessage}</p>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/product/${encodeURIComponent(item.handle ?? item.id)}`}
              className="group min-w-[176px] flex-1 snap-start overflow-hidden rounded-[22px] border border-[#eaded3] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <SafeImage src={item.img} alt={item.name} className={compact ? "h-40 w-full object-cover" : "h-52 w-full object-cover"} loading="lazy" />
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-[var(--page-fg)]">{item.name}</p>
                <p className="mt-2 text-sm text-[#5f544d]">{formatCurrency(convertAmount(item.priceAmount, "INR", currencyCode), currencyCode)}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--secondary)] transition group-hover:gap-2">
                  View details
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProductDetailsPage({ product, catalogProducts }: ProductDetailsPageProps) {
  const wishlist = useShopStore((state) => state.wishlist);
  const toggleWishlist = useShopStore((state) => state.toggleWishlist);
  const addToCart = useShopStore((state) => state.addToCart);
  const openCart = useUiStore((state) => state.openCart);
  const pushToast = useUiStore((state) => state.pushToast);
  const openAccountModal = useUiStore((state) => state.openAccountModal);
  const displayCurrency = useUiStore((state) => state.currency);
  const isSignedIn = useAccountStore((state) => state.isSignedIn);
  const wishlistIds = getWishlistIds(wishlist);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [deliveryPin, setDeliveryPin] = useState("110001");
  const [deliveryState, setDeliveryState] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);
  const [reviews, setReviews] = useState<ProductReviewRecord[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>({ reviewerName: "", rating: 5, title: "", message: "" });
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const [designCustomization, setDesignCustomization] = useState<DesignCustomization | null>(null);
  const isSignature = isSignatureProduct(product.tags);
  const swipeStartRef = useRef<number | null>(null);

  const variants = product.variants ?? [];
  const optionGroups = useMemo(() => {
    if (product.optionGroups && product.optionGroups.length > 0) {
      return product.optionGroups;
    }

    const groups = new Map<string, string[]>();

    for (const variant of variants) {
      for (const option of variant.options) {
        const current = groups.get(option.name) ?? [];
        if (!current.includes(option.value)) {
          current.push(option.value);
          groups.set(option.name, current);
        }
      }
    }

    return Array.from(groups.entries()).map(([name, values]) => ({ name, values }));
  }, [product.optionGroups, variants]);

  const colorGroup = optionGroups.find((group) => isColorOption(group.name));
  const sizeGroup = optionGroups.find((group) => isSizeOption(group.name));
  const hasSizeOptions = Boolean(sizeGroup?.values.length);
  const hasColorOptions = Boolean(colorGroup?.values.length);
  const basePrice = product.priceAmount;
  const comparePrice = Math.max(parseAmount(product.oldPrice) || basePrice + 1200, basePrice + 1200);
  const discountPercent = Math.max(0, Math.round(((comparePrice - basePrice) / comparePrice) * 100));
  const hasAnyDesign = Boolean(designCustomization?.front ?? designCustomization?.back);
  const effectivePriceAmount = basePrice + (hasAnyDesign ? CUSTOM_DESIGN_SURCHARGE_INR : 0);
  const displayPrice = formatCurrency(convertAmount(effectivePriceAmount, "INR", displayCurrency), displayCurrency);
  const displayOldPrice = formatCurrency(convertAmount(comparePrice, "INR", displayCurrency), displayCurrency);

  useEffect(() => {
    const initialVariant = variants.find((variant) => variant.availableForSale) ?? variants[0] ?? null;

    if (!initialVariant) {
      setSelectedVariantId(null);
      setSelectedOptions({});
      return;
    }

    setSelectedVariantId(initialVariant.id);
    setSelectedOptions(Object.fromEntries(initialVariant.options.map((option) => [option.name, option.value])));
  }, [product.id]);

  const galleryItems = useMemo(() => {
    const unique = new Map<string, GalleryItem>();
    const sources = [
      product.img,
      ...(product.galleryImages ?? []),
      ...variants.map((variant) => variant.img),
      ...(product.productMedia ?? []).flatMap((media) => (media.type === "image" ? [media.src] : [])),
    ].filter(Boolean);

    for (const media of product.productMedia ?? []) {
      const key = `${media.type}:${media.src}`;
      if (!unique.has(key)) {
        unique.set(key, {
          id: key,
          type: media.type,
          src: media.src,
          thumbnail: media.thumbnail,
          label: media.alt ?? product.name,
        });
      }
    }

    for (const src of sources) {
      const key = `image:${src}`;
      if (!unique.has(key)) {
        unique.set(key, {
          id: key,
          type: "image",
          src,
          label: product.name,
        });
      }
    }

    return Array.from(unique.values());
  }, [product.galleryImages, product.img, product.name, product.productMedia, variants]);

  const activeVariant = useMemo(() => {
    return variants.find((variant) => variant.id === selectedVariantId) ?? variants[0] ?? null;
  }, [selectedVariantId, variants]);

  const resolvedProduct = useMemo(() => {
    if (!activeVariant) {
      return product;
    }

    return {
      ...product,
      id: activeVariant.id,
      parentId: product.id,
      name: activeVariant.name && activeVariant.name !== "Default Title" ? `${product.name} - ${activeVariant.name}` : product.name,
      img: activeVariant.img,
      price: activeVariant.price,
      priceAmount: activeVariant.priceAmount,
      currencyCode: activeVariant.currencyCode,
      oldPrice: activeVariant.oldPrice,
    } satisfies GridProduct;
  }, [activeVariant, product]);

  const activeMedia = useMemo(() => {
    if (selectedMediaId) {
      const selected = galleryItems.find((item) => item.id === selectedMediaId);
      if (selected) {
        return selected;
      }
    }

    if (activeVariant) {
      const variantImage = galleryItems.find((item) => item.src === activeVariant.img);
      if (variantImage) {
        return variantImage;
      }
    }

    return galleryItems[0] ?? null;
  }, [activeVariant, galleryItems, selectedMediaId]);

  const designStudioMockups = useMemo(() => {
    const frontSrc = activeVariant?.img ?? product.img;
    const candidates: ImageCandidate[] = [];

    for (const media of product.productMedia ?? []) {
      if (media.type === "image" && media.src) {
        candidates.push({ src: media.src, label: media.alt ?? "" });
      }
    }

    for (const src of product.galleryImages ?? []) {
      if (src) {
        candidates.push({ src, label: src });
      }
    }

    for (const variant of variants) {
      if (variant.img) {
        candidates.push({ src: variant.img, label: `${variant.name} ${variant.img}` });
      }
    }

    const unique = new Map<string, ImageCandidate>();
    for (const candidate of candidates) {
      if (!unique.has(candidate.src)) {
        unique.set(candidate.src, candidate);
      }
    }
    const list = Array.from(unique.values());
    const nonFront = list.filter((item) => item.src !== frontSrc);

    const explicitBack = nonFront.find((item) => {
      return hasBackKeyword(item.label) || hasBackKeyword(item.src);
    });

    const explicitFront = list.find((item) => {
      if (item.src !== frontSrc) return false;
      return hasFrontKeyword(item.label) || hasFrontKeyword(item.src);
    });

    const likelyBack = nonFront.find((item) => {
      const descriptor = `${item.label} ${item.src}`;
      if (hasFrontKeyword(descriptor)) return false;
      if (looksLikeModelShot(descriptor)) return false;
      return true;
    });

    // Last distinct image is usually back/alternate studio shot when metadata is missing.
    const lastDistinctFallback = nonFront.length > 0 ? nonFront[nonFront.length - 1] : null;

    return {
      front: explicitFront?.src ?? frontSrc,
      back: explicitBack?.src ?? likelyBack?.src ?? lastDistinctFallback?.src ?? frontSrc,
    };
  }, [activeVariant?.img, product.galleryImages, product.img, product.productMedia, variants]);

  const previewIndex = Math.max(0, galleryItems.findIndex((item) => item.id === activeMedia?.id));
  const sizeChartImage = galleryItems.length > 0 ? galleryItems[galleryItems.length - 1]?.src ?? null : null;
  const reviewSource = reviews.length > 0 ? reviews : FALLBACK_REVIEWS;
  const averageRating = reviewSource.reduce((sum, item) => sum + item.rating, 0) / Math.max(1, reviewSource.length);
  const reviewDistribution = buildDistribution(reviewSource);

  const similarProducts = useMemo(() => {
    const matched = catalogProducts
      .filter((item) => item.id !== product.id)
      .filter((item) => {
        const sameCategory = Boolean(product.categorySlug && item.categorySlug && product.categorySlug === item.categorySlug);
        const sameSubCategory = Boolean(product.subCategorySlug && item.subCategorySlug && product.subCategorySlug === item.subCategorySlug);
        const sameAudience = Boolean(product.audienceSlug && item.audienceSlug && product.audienceSlug === item.audienceSlug);
        return sameCategory || sameSubCategory || sameAudience;
      })
      .slice(0, 8);

    return matched.length > 0 ? matched : catalogProducts.filter((item) => item.id !== product.id).slice(0, 8);
  }, [catalogProducts, product.audienceSlug, product.categorySlug, product.id, product.subCategorySlug]);

  const alsoLikeProducts = useMemo(() => {
    return catalogProducts.filter((item) => item.id !== product.id).sort((left, right) => left.priceAmount - right.priceAmount).slice(0, 8);
  }, [catalogProducts, product.id]);

  const frequentlyBoughtTogether = useMemo(() => similarProducts.slice(0, 4), [similarProducts]);

  const recentlyViewedProducts = useMemo(() => {
    const byKey = new Map(catalogProducts.map((item) => [item.handle ?? item.id, item]));
    return recentlyViewedIds
      .map((id) => byKey.get(id))
      .filter((item): item is ProductCardLite => Boolean(item && item.id !== product.id))
      .slice(0, 6);
  }, [catalogProducts, product.id, recentlyViewedIds]);

  useEffect(() => {
    const storageKey = "firaang-recently-viewed-products";
    const key = product.handle ?? product.id;

    try {
      const raw = window.localStorage.getItem(storageKey);
      const current = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [key, ...current.filter((item) => item !== key)].slice(0, 12);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setRecentlyViewedIds(next);
    } catch {
      setRecentlyViewedIds([]);
    }
  }, [product.handle, product.id]);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const key = encodeURIComponent(product.handle ?? product.id);
        const response = await fetch(`/api/products/${key}/reviews`, { cache: "no-store" });

        if (!response.ok) {
          setReviews([]);
          return;
        }

        const payload = (await response.json()) as { items?: ProductReviewRecord[] };
        setReviews(payload.items ?? []);
      } catch {
        setReviews([]);
      }
    };

    void loadReviews();
  }, [product.handle, product.id]);

  useEffect(() => {
    if (!copyFeedback) {
      return;
    }

    const timer = window.setTimeout(() => setCopyFeedback(null), 1400);
    return () => window.clearTimeout(timer);
  }, [copyFeedback]);

  const optionAvailability = (optionName: string, optionValue: string) => {
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
  };

  const selectOptionValue = (optionName: string, optionValue: string) => {
    setSelectedOptions((current) => {
      const next = { ...current, [optionName]: optionValue };
      const exactMatch = variants.find((variant) => {
        return variant.options.every((option) => {
          const selectedValue = next[option.name];
          return !selectedValue || selectedValue === option.value;
        });
      });

      if (exactMatch) {
        setSelectedVariantId(exactMatch.id);
        return Object.fromEntries(exactMatch.options.map((option) => [option.name, option.value]));
      }

      return next;
    });
  };

  const handleAddToBag = () => {
    if (hasSizeOptions && !selectedOptions.Size && !selectedOptions.size) {
      pushToast("Select a size before adding this product.", { variant: "warning" });
      return;
    }

    setIsAdding(true);
    const productToAdd = hasAnyDesign
      ? {
          ...resolvedProduct,
          priceAmount: resolvedProduct.priceAmount + CUSTOM_DESIGN_SURCHARGE_INR,
          price: formatCurrency(convertAmount(resolvedProduct.priceAmount + CUSTOM_DESIGN_SURCHARGE_INR, "INR", displayCurrency), displayCurrency),
          customization: designCustomization ?? undefined,
        }
      : resolvedProduct;
    addToCart(productToAdd);
    openCart();
    pushToast(
      hasAnyDesign ? "Custom design added to bag" : "Added to bag",
      { variant: "success" }
    );
    window.setTimeout(() => setIsAdding(false), 450);
  };

  const handleWishlistToggle = () => {
    setIsWishlisting(true);
    toggleWishlist(resolvedProduct);
    pushToast(wishlistIds.has(resolvedProduct.id) ? "Removed from wishlist" : "Saved to wishlist", { variant: "info" });
    window.setTimeout(() => setIsWishlisting(false), 300);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyFeedback("Copied");
      pushToast("Product link copied", { variant: "success" });
    } catch {
      pushToast("Could not copy the link.", { variant: "error" });
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: window.location.href });
        return;
      }

      await handleCopyLink();
    } catch {
      pushToast("Could not share this product right now.", { variant: "error" });
    }
  };

  const handleCheckDelivery = () => {
    const pin = deliveryPin.trim();

    if (!/^\d{6}$/.test(pin)) {
      setDeliveryState("error");
      setDeliveryMessage("Enter a valid 6-digit pincode to check delivery.");
      return;
    }

    setDeliveryState("checking");
    window.setTimeout(() => {
      if (pin.startsWith("000")) {
        setDeliveryState("error");
        setDeliveryMessage("Delivery is currently unavailable in this area.");
        return;
      }

      const estimatedDays = 4 + (Number.parseInt(pin.slice(-1), 10) % 3);
      setDeliveryState("success");
      setDeliveryMessage(`Expected by ${getShippingEstimate(estimatedDays)}. Cash on Delivery is available on selected orders.`);
    }, 500);
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSignedIn) {
      openAccountModal();
      return;
    }

    if (reviewForm.message.trim().length < 10) {
      setReviewStatus("Please add at least 10 characters to your review.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewStatus(null);

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.handle ?? product.id)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          reviewerName: reviewForm.reviewerName.trim(),
          rating: reviewForm.rating,
          title: reviewForm.title.trim(),
          message: reviewForm.message.trim(),
          verifiedPurchase: isSignedIn,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { record?: ProductReviewRecord; error?: string };
      const createdRecord = payload.record;

      if (!response.ok || !createdRecord) {
        throw new Error(payload.error ?? "Could not store your review");
      }

      setReviews((current) => [createdRecord, ...current]);
      setReviewForm({ reviewerName: "", rating: 5, title: "", message: "" });
      setReviewStatus("Review submitted successfully.");
      pushToast("Your review has been posted", { variant: "success" });
    } catch (error) {
      setReviewStatus(error instanceof Error ? error.message : "Could not save your review right now.");
      pushToast("Failed to save review", { variant: "error" });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSwipeStart = (clientX: number) => {
    swipeStartRef.current = clientX;
  };

  const handleSwipeEnd = (clientX: number) => {
    if (swipeStartRef.current === null || galleryItems.length < 2) {
      return;
    }

    const delta = clientX - swipeStartRef.current;
    swipeStartRef.current = null;

    if (Math.abs(delta) < 40) {
      return;
    }

    const direction = delta < 0 ? 1 : -1;
    const nextIndex = (previewIndex + direction + galleryItems.length) % galleryItems.length;
    setSelectedMediaId(galleryItems[nextIndex]?.id ?? null);
  };

  const specs = [
    { label: "Material & Fabric", value: product.tags?.find((tag) => /cotton|silk|linen|viscose|wool/i.test(tag)) ?? "Premium woven fabric" },
    { label: "Fit", value: product.tags?.find((tag) => /regular|slim|relaxed|straight/i.test(tag)) ?? "Regular fit" },
    { label: "Pattern", value: product.tags?.find((tag) => /embroider|printed|woven|solid|checked/i.test(tag)) ?? "Contemporary solid finish" },
    { label: "Sleeve Type", value: product.tags?.find((tag) => /sleeve/i.test(tag)) ?? "Three-quarter sleeves" },
    { label: "Neck Type", value: product.tags?.find((tag) => /neck/i.test(tag)) ?? "Round neck" },
    { label: "Occasion", value: product.audience ?? product.category ?? "Everyday and occasion wear" },
    { label: "Care Instructions", value: "Hand wash separately or gentle machine wash; dry in shade." },
    { label: "Country of Origin", value: "India" },
    { label: "Manufacturer Details", value: COMPANY_MANUFACTURER_DETAILS },
  ];

  return (
    <section className="section-shell w-full max-w-full overflow-x-clip pb-16 pt-6 md:pb-20 md:pt-8">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#8f8179] md:mb-6">
        <Link href="/" className="transition hover:text-[var(--secondary)]">
          Home
        </Link>
        <span>/</span>
        <Link href="/shop" className="transition hover:text-[var(--secondary)]">
          Shop
        </Link>
        {product.categorySlug ? (
          <>
            <span>/</span>
            <Link href={`/shop?category=${encodeURIComponent(product.categorySlug)}`} className="transition hover:text-[var(--secondary)]">
              {product.category ?? "Category"}
            </Link>
          </>
        ) : null}
        {product.subCategorySlug ? (
          <>
            <span>/</span>
            <Link href={`/shop?subCategory=${encodeURIComponent(product.subCategorySlug)}`} className="transition hover:text-[var(--secondary)]">
              {product.subCategory ?? "Product"}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="text-[var(--page-fg)]">{product.name}</span>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] xl:gap-12">
        <div className="min-w-0 space-y-5">
          <div className="rounded-[30px] border border-white/70 bg-[rgba(255,252,248,0.92)] p-3 shadow-[0_18px_60px_rgba(97,52,27,0.08)] backdrop-blur md:p-4">
            <div className="grid gap-3 md:grid-cols-[88px_minmax(0,1fr)] md:gap-4">
              <div className="hidden md:flex md:flex-col md:gap-3">
                {galleryItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMediaId(item.id)}
                    className={`relative overflow-hidden rounded-2xl border transition ${activeMedia?.id === item.id ? "border-[var(--secondary)] ring-2 ring-[var(--secondary)]/20" : "border-white/80 hover:border-[var(--secondary)]/40"}`}
                    aria-label={`View image ${index + 1}`}
                  >
                    {item.type === "video" ? (
                      <div className="flex h-24 items-center justify-center bg-[#171717] text-white">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    ) : (
                      <SafeImage src={item.thumbnail ?? item.src} alt={item.label} className="h-24 w-full object-cover" loading="lazy" />
                    )}
                  </button>
                ))}
              </div>

              <div className="relative overflow-hidden rounded-[26px] bg-[#f6eee4]">
                <div
                  className="group relative aspect-[4/5] cursor-zoom-in overflow-hidden bg-[#f3e5cf]"
                  onClick={() => setZoomed((current) => !current)}
                  onTouchStart={(event) => handleSwipeStart(event.touches[0]?.clientX ?? 0)}
                  onTouchEnd={(event) => handleSwipeEnd(event.changedTouches[0]?.clientX ?? 0)}
                >
                  {activeMedia?.type === "video" ? (
                    <video
                      src={activeMedia.src}
                      poster={activeMedia.thumbnail}
                      controls
                      muted
                      playsInline
                      className={`h-full w-full object-cover transition duration-300 ${zoomed ? "scale-[1.15]" : "scale-100 group-hover:scale-[1.04]"}`}
                    />
                  ) : (
                    <SafeImage
                      src={activeMedia?.src ?? product.img}
                      alt={activeMedia?.label ?? product.name}
                      className={`h-full w-full object-contain transition duration-300 ${zoomed ? "scale-[1.25]" : "scale-100 group-hover:scale-[1.05]"}`}
                      loading="eager"
                    />
                  )}

                  <div className="absolute left-4 top-4 flex gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--secondary)] shadow-sm">
                      {getBrand(product)}
                    </span>
                    <span className="rounded-full bg-[#111111]/82 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                      {discountPercent}% OFF
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/45 to-transparent p-4 text-white md:hidden">
                    <button type="button" className="rounded-full bg-white/15 p-2 backdrop-blur" onClick={(event) => { event.stopPropagation(); setSelectedMediaId(galleryItems[(previewIndex - 1 + galleryItems.length) % galleryItems.length]?.id ?? null); }}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-xs uppercase tracking-[0.18em]">Swipe to browse</p>
                    <button type="button" className="rounded-full bg-white/15 p-2 backdrop-blur" onClick={(event) => { event.stopPropagation(); setSelectedMediaId(galleryItems[(previewIndex + 1) % galleryItems.length]?.id ?? null); }}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setZoomed(false);
                    }}
                    className={`absolute right-4 top-4 rounded-full bg-white/92 p-2 text-[var(--page-fg)] shadow-sm transition ${zoomed ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    aria-label="Reset zoom"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto border-t border-white/70 bg-white/80 px-3 py-3 md:hidden">
                  {galleryItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedMediaId(item.id)}
                      className={`relative h-16 w-16 flex-none overflow-hidden rounded-xl border transition ${activeMedia?.id === item.id ? "border-[var(--secondary)] ring-2 ring-[var(--secondary)]/15" : "border-[#e8ddd5]"}`}
                    >
                      {item.type === "video" ? (
                        <div className="flex h-full w-full items-center justify-center bg-[#171717] text-white">
                          <Sparkles className="h-4 w-4" />
                        </div>
                      ) : (
                        <SafeImage src={item.thumbnail ?? item.src} alt={item.label} className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard title="Delivery" text="Fast dispatch, tracked shipping, and serviceability by pincode." />
            <InfoCard title="Easy returns" text="Return and exchange support on eligible orders." />
          </div>

          {isSignature && (
            <CustomDesignSection
              productName={product.name}
              productId={product.id}
              onCustomizationChange={setDesignCustomization}
              productImageFront={designStudioMockups.front}
              productImageBack={designStudioMockups.back}
            />
          )}

          <SectionShell title="Product Details" subtitle="All essential product information at a glance.">
            <div className="grid gap-3 md:grid-cols-2">
              {specs.map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#eaded3] bg-white p-4 md:p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e7f75]">{item.label}</p>
                  <p className="mt-2 text-sm leading-7 text-[#4d4540] break-words">{item.value}</p>
                </div>
              ))}
            </div>
          </SectionShell>
        </div>

        <div className="min-w-0 space-y-6 rounded-[30px] border border-white/80 bg-[rgba(255,253,250,0.96)] p-5 shadow-[0_18px_60px_rgba(97,52,27,0.08)] md:p-6 lg:sticky lg:top-28 lg:self-start">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#f2e6dc] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7e5a45]">
              {getBrand(product)}
            </span>
            <div className="flex items-center gap-2 text-sm text-[#6b605a]">
              <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 rounded-full border border-[#e4d7cc] px-3 py-1.5 transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-1.5 rounded-full border border-[#e4d7cc] px-3 py-1.5 transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">
                <Copy className="h-4 w-4" />
                {copyFeedback ?? "Copy"}
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#8b7d75]">{getSubtitle(product)}</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-[var(--page-fg)] md:text-[2.55rem]">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#655a54]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6eee4] px-3 py-1 font-medium text-[#594e48]">
                <Star className="h-4 w-4 fill-[var(--gold)] text-[var(--gold)]" />
                {averageRating.toFixed(1)}
              </span>
              <span>{reviewSource.length.toLocaleString()} ratings</span>
              <span>•</span>
              <span>{reviewSource.length.toLocaleString()} reviews</span>
            </div>
          </div>

          <div className="rounded-[24px] bg-[linear-gradient(135deg,#fff7f0_0%,#f4ebe3_100%)] p-4">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <p className="text-4xl font-semibold tracking-tight text-[#271e1b] md:text-[2.85rem]">{displayPrice}</p>
              <p className="text-lg text-[#917d72] line-through">{displayOldPrice}</p>
              <p className="rounded-full bg-[#ffe7d7] px-3 py-1 text-sm font-semibold text-[#b2552b]">{discountPercent}% OFF</p>
              {hasAnyDesign && (
                <p className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  +{formatCurrency(convertAmount(CUSTOM_DESIGN_SURCHARGE_INR, "INR", displayCurrency), displayCurrency)} Custom Print
                </p>
              )}
            </div>
            <p className="mt-2 text-sm text-[#6f625b]">Inclusive of all taxes. Additional discounts may apply at checkout.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#5d534d]">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5">
                <BadgeIndianRupee className="h-4 w-4 text-[var(--secondary)]" />
                Price locked for today
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5">
                <PackageCheck className="h-4 w-4 text-[var(--secondary)]" />
                {activeVariant?.availableForSale === false ? "Out of stock" : "In stock"}
              </span>
            </div>
          </div>

          {hasColorOptions ? (
            <OptionGroup
              title="Color"
              subtitle="Switch shades and preview the catalog images immediately."
              values={colorGroup?.values ?? []}
              selected={selectedOptions[colorGroup?.name ?? ""] ?? selectedOptions.Color ?? selectedOptions.colour ?? ""}
              renderSwatch
              onSelect={(value) => selectOptionValue(colorGroup?.name ?? "Color", value)}
            />
          ) : null}

          {hasSizeOptions ? (
            <OptionGroup
              title="Size"
              subtitle="Choose the size that fits your look best."
              values={sizeGroup?.values ?? []}
              selected={selectedOptions[sizeGroup?.name ?? ""] ?? selectedOptions.Size ?? selectedOptions.size ?? ""}
              onSelect={(value) => selectOptionValue(sizeGroup?.name ?? "Size", value)}
              isDisabled={(value) => !optionAvailability(sizeGroup?.name ?? "Size", value)}
              showSizeGuide
              onSizeChartClick={() => setIsSizeChartOpen(true)}
            />
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleAddToBag}
              disabled={isAdding}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--secondary)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#9f3940] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              {hasAnyDesign ? "Add Custom Design to Bag" : "Add to Bag"}
            </button>
            <button
              type="button"
              onClick={handleWishlistToggle}
              disabled={isWishlisting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#dbcbbf] bg-white px-5 py-4 text-sm font-semibold text-[var(--page-fg)] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Heart className={`h-4 w-4 ${wishlistIds.has(resolvedProduct.id) ? "fill-[var(--secondary)] text-[var(--secondary)]" : ""}`} />
              Wishlist
            </button>
          </div>

          {hasAnyDesign && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>
                <strong>Custom design attached</strong>
                {designCustomization?.front && <span className="ml-1">— front print</span>}
                {designCustomization?.front && designCustomization?.back && <span>, </span>}
                {designCustomization?.back && <span className={designCustomization?.front ? "" : "ml-1"}>— back print</span>}
                . Your artwork will be printed exactly as positioned.
              </span>
            </div>
          )}

          <div className="rounded-[24px] border border-[#ede2d7] bg-[#fffaf5] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b7d75]">Delivery options</p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--page-fg)]">Check delivery by pincode</h2>
              </div>
              <Truck className="h-5 w-5 text-[var(--secondary)]" />
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={deliveryPin}
                onChange={(event) => setDeliveryPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                placeholder="Enter pincode"
                className="min-w-0 flex-1 rounded-xl border border-[#e2d5c9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--secondary)]"
              />
              <button
                type="button"
                onClick={handleCheckDelivery}
                disabled={deliveryState === "checking"}
                className="rounded-xl bg-[#f3e0d3] px-4 py-3 text-sm font-semibold text-[#5f4338] transition hover:bg-[#ead1c0] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deliveryState === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[#5f544e]">
              <DetailLine icon={<Clock3 className="h-4 w-4" />} label="Estimated delivery" value={deliveryMessage && deliveryState === "success" ? deliveryMessage : `Arrives by ${getShippingEstimate(5)}`} />
              <DetailLine icon={<MapPin className="h-4 w-4" />} label="Availability" value={deliveryState === "error" ? deliveryMessage ?? "Unavailable" : "Delivery available across major serviceable pincodes."} />
              <DetailLine icon={<Check className="h-4 w-4" />} label="Cash on Delivery" value="Available on selected orders." />
              <DetailLine icon={<RefreshCcw className="h-4 w-4" />} label="Return & Exchange" value="Easy return and exchange within the policy window." />
              <DetailLine icon={<Truck className="h-4 w-4" />} label="Shipping charges" value="Shipping charges may apply on low-value orders or remote locations." />
            </div>
          </div>

          <div className="rounded-[24px] border border-[#ede2d7] bg-[#fffaf5] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b7d75]">Why this product stands out</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoCard title="Premium finish" text="Refined detailing and a polished visual hierarchy." />
              <InfoCard title="Touch friendly" text="Larger targets for clean mobile size selection." />
              <InfoCard title="Smart preview" text="Images update with colors and selected variants." />
              <InfoCard title="Fast actions" text="Quick add, wishlist, copy link, and share support." />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-7 lg:mt-6 lg:gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] xl:gap-12">
        <div className="min-w-0 space-y-6">
          <SectionShell title="Specifications" subtitle="Structured product attributes for quick scanning.">
            <div className="grid gap-3 md:grid-cols-2">
              <SpecCard label="Brand" value={getBrand(product)} />
              <SpecCard label="Style" value={getSubtitle(product)} />
              <SpecCard label="Color" value={selectedOptions[colorGroup?.name ?? ""] ?? "As shown"} />
              <SpecCard label="Size range" value={sizeGroup?.values.join(" • ") ?? "Multiple sizes available"} />
              <SpecCard label="Tax" value="Inclusive of all taxes" />
            </div>
          </SectionShell>

          <SectionShell title="Ratings & Reviews" subtitle="Average rating, distribution, and customer opinions.">
            <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
              <div className="rounded-3xl border border-[#eaded3] bg-white p-4 text-center md:p-5">
                <p className="text-5xl font-semibold text-[var(--page-fg)]">{averageRating.toFixed(1)}</p>
                <div className="mt-3 flex items-center justify-center gap-1">{renderStars(averageRating)}</div>
                <p className="mt-3 text-sm text-[#685d57]">{reviewSource.length.toLocaleString()} reviews</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!isSignedIn) {
                      openAccountModal();
                      return;
                    }
                    document.getElementById("product-review-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--secondary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9f3940]"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  {isSignedIn ? "Write a review" : "Sign in to review"}
                </button>
              </div>

              <div className="space-y-3 rounded-3xl border border-[#eaded3] bg-white p-4 md:p-5">
                {reviewDistribution.map((item) => (
                  <div key={item.rating} className="flex items-center gap-3 text-sm">
                    <div className="flex w-14 items-center gap-1 text-[#625751]">
                      <span>{item.rating}</span>
                      <Star className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
                    </div>
                    <div className="h-2 flex-1 rounded-full bg-[#f3e7df]">
                      <div className="h-2 rounded-full bg-[var(--secondary)]" style={{ width: `${Math.max(8, item.percentage)}%` }} />
                    </div>
                    <span className="w-10 text-right text-[#6f6159]">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reviewSource.map((review) => (
                <article key={review.id} className="rounded-3xl border border-[#eaded3] bg-white p-4 md:p-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--page-fg)]">{review.reviewerName || "Verified buyer"}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8f7f74]">{review.verifiedPurchase ? "Verified purchase" : "Customer review"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 justify-self-end">{renderStars(review.rating)}</div>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[#352f2c]">{review.title ?? "Customer review"}</p>
                  <p className="mt-2 text-sm leading-7 text-[#5d534d] break-words">{review.message}</p>
                  <p className="mt-4 text-xs text-[#998981]">{formatRelativeDate(review.createdAt)}</p>
                </article>
              ))}
            </div>

            <form id="product-review-form" className="mt-6 rounded-3xl border border-[#eaded3] bg-[#fffaf7] p-4 md:p-5" onSubmit={handleReviewSubmit}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8e7f75]">Write a review</p>
                  <h3 className="mt-1 text-xl font-semibold text-[var(--page-fg)]">Share your experience</h3>
                </div>
                <p className="text-sm text-[#685d57]">{isSignedIn ? "Eligible users can post a review." : "Sign in to post a review."}</p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-[#5c534d]">
                  Name
                  <input
                    value={reviewForm.reviewerName}
                    onChange={(event) => setReviewForm((current) => ({ ...current, reviewerName: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]"
                    placeholder="Your name"
                    disabled={!isSignedIn}
                  />
                </label>
                <label className="text-sm text-[#5c534d]">
                  Rating
                  <select
                    value={reviewForm.rating}
                    onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number.parseInt(event.target.value, 10) }))}
                    className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]"
                    disabled={!isSignedIn}
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} stars
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-[#5c534d]">
                  Title
                  <input
                    value={reviewForm.title}
                    onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]"
                    placeholder="What stood out?"
                    disabled={!isSignedIn}
                  />
                </label>
                <label className="text-sm text-[#5c534d] md:col-span-2">
                  Review
                  <textarea
                    value={reviewForm.message}
                    onChange={(event) => setReviewForm((current) => ({ ...current, message: event.target.value }))}
                    className="mt-2 min-h-32 w-full rounded-2xl border border-[#e1d5ca] bg-white px-4 py-3 outline-none transition focus:border-[var(--secondary)]"
                    placeholder="Describe fit, material feel, styling, and value."
                    disabled={!isSignedIn}
                  />
                </label>
              </div>

              {reviewStatus ? <p className="mt-4 rounded-2xl bg-[#f4eadf] px-4 py-3 text-sm text-[#715c4a]">{reviewStatus}</p> : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmittingReview || !isSignedIn}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--secondary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#9f3940] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit review
                </button>
                {!isSignedIn ? (
                  <button type="button" onClick={openAccountModal} className="inline-flex items-center gap-2 rounded-full border border-[#d9cbbf] px-5 py-3 text-sm font-semibold text-[var(--page-fg)] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">
                    Sign in to continue
                  </button>
                ) : null}
              </div>
            </form>
          </SectionShell>

          <SectionShell title="Product Description" subtitle="A richer look at the fit, finish, and styling context.">
            <p className="max-w-3xl text-sm leading-7 text-[#4f4641] break-words">{product.description}</p>
          </SectionShell>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-28 lg:self-start">
          <RelatedRail title="Similar Products" items={similarProducts} currencyCode={displayCurrency} />
          <RelatedRail title="You May Also Like" items={alsoLikeProducts} currencyCode={displayCurrency} />
          <RelatedRail title="Frequently Bought Together" items={frequentlyBoughtTogether} currencyCode={displayCurrency} compact />
          <RelatedRail title="Recently Viewed" items={recentlyViewedProducts} currencyCode={displayCurrency} emptyMessage="Your recently viewed products will appear here." compact />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eaded3] bg-white/96 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
          <button type="button" onClick={handleWishlistToggle} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#dccfc2] px-4 py-4 text-sm font-semibold text-[var(--page-fg)] shadow-sm">
            <Heart className={`h-4 w-4 ${wishlistIds.has(resolvedProduct.id) ? "fill-[var(--secondary)] text-[var(--secondary)]" : ""}`} />
            Wishlist
          </button>
          <button type="button" onClick={handleAddToBag} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--secondary)] px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-[rgba(157,57,64,0.2)]">
            <ShoppingBag className="h-4 w-4" />
            Add to Bag
          </button>
        </div>
      </div>

      <div className="h-24 lg:hidden" />

      <ProductSizeChartModal
        isOpen={isSizeChartOpen}
        onClose={() => setIsSizeChartOpen(false)}
        image={sizeChartImage}
        productName={product.name}
      />
    </section>
  );
}
