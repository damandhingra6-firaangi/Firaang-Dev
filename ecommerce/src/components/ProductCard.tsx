// components/ProductCard.tsx

"use client";

import { Eye, Heart, ShoppingBag } from "lucide-react";
import SafeImage from "@/components/SafeImage";

type Props = {
  title: string;
  currentPrice: string;
  oldPrice?: string;
  image: string;
  isNew?: boolean;
  borderColor?: string;
  backgroundColor?: string;
  isWishlisted?: boolean;
  onOpenDetails?: () => void;
  onQuickView?: () => void;
  onToggleWishlist?: () => void;
  onAddToCart?: () => void;
};

export default function ProductCard({
  title,
  currentPrice,
  oldPrice,
  image,
  isNew,
  borderColor,
  backgroundColor,
  isWishlisted,
  onOpenDetails,
  onQuickView,
  onToggleWishlist,
  onAddToCart,
}: Props) {
  return (
    <article
      className="group overflow-hidden rounded-[10px] border shadow-none transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.08)]"
      style={{ borderColor: borderColor ?? "#8CCAD7", backgroundColor: backgroundColor ?? "#ffffff" }}
      onClick={onOpenDetails}
    >
      <div className="relative overflow-hidden bg-[#f3f3f3]">
        <SafeImage
          src={image}
          alt={title}
          className="h-[176px] w-full object-cover object-top transition duration-500 group-hover:scale-[1.03] sm:h-[210px] md:h-[226px] lg:h-[238px]"
        />
        <div
          className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
          style={{ background: "var(--card-hover-overlay)" }}
        />

        {isNew ? (
          <span className="absolute right-2 top-2 inline-flex rounded-[4px] bg-[#66d8af] px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.04em] text-[#ffffff]">
            NEW
          </span>
        ) : null}

        <div className="absolute inset-x-2 bottom-2 flex translate-y-2 items-center justify-center gap-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            aria-label={`Quick view ${title}`}
            className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--gold)] px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3b0810]"
            onClick={(event) => {
              event.stopPropagation();
              onQuickView?.();
            }}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Quick View
          </button>

          <button
            type="button"
            aria-label={`Add ${title} to wishlist`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--arrivals-action-bg)] text-[var(--arrivals-card-title)]"
            onClick={(event) => {
              event.stopPropagation();
              onToggleWishlist?.();
            }}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? "fill-[var(--gold)] text-[var(--gold)]" : ""}`} />
          </button>

          <button
            type="button"
            aria-label={`Add ${title} to cart`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--arrivals-action-bg)] text-[var(--arrivals-card-title)]"
            onClick={(event) => {
              event.stopPropagation();
              onAddToCart?.();
            }}
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1 p-2.5 md:p-3">
        <h3 className="line-clamp-2 min-h-[28px] font-sans text-[10px] font-medium leading-[1.18] text-[#242424] md:min-h-[30px] md:text-[11px]">
          {title}
        </h3>

        <div className="flex items-end gap-1.5 md:gap-2">
          <p className="font-sans text-[20px] font-semibold leading-none tracking-[-0.01em] text-[#111111] md:text-[22px]">
            {currentPrice}
          </p>

          {oldPrice ? (
            <p className="mb-0.5 font-sans text-[9px] font-medium line-through md:text-[10px]" style={{ color: borderColor ?? "#909090" }}>{oldPrice}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}