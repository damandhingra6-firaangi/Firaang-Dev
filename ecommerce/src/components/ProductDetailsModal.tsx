"use client";

import { GridProduct } from "@/lib/catalog";
import { Heart, ShoppingBag, X } from "lucide-react";

type ProductDetailsModalProps = {
  product: GridProduct | null;
  isOpen: boolean;
  isWishlisted: boolean;
  onClose: () => void;
  onToggleWishlist: (product: GridProduct) => void;
  onAddToCart: (product: GridProduct) => void;
};

export default function ProductDetailsModal({
  product,
  isOpen,
  isWishlisted,
  onClose,
  onToggleWishlist,
  onAddToCart,
}: ProductDetailsModalProps) {
  if (!isOpen || !product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--gold)]/60 bg-[#2b060b]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--gold)]/40 px-5 py-4 md:px-6">
          <h3 className="text-2xl md:text-3xl">{product.name}</h3>
          <button
            type="button"
            aria-label="Close product details"
            className="rounded-full p-2 text-[#eac26a] transition hover:bg-[#461017]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[1.2fr_1fr] md:gap-8 md:p-6">
          <img
            src={product.img}
            alt={product.name}
            className="h-[380px] w-full rounded-xl object-cover md:h-[460px]"
          />

          <div className="flex flex-col">
            <p className="mb-2 text-sm uppercase tracking-[0.16em] text-[#eac26a]">Product Details</p>
            <p className="mb-4 text-lg text-[#f1d9d3]">{product.description}</p>

            <div className="mb-6 flex items-end gap-3">
              <p className="text-3xl leading-none">{product.price}</p>
              {product.oldPrice ? (
                <p className="text-base text-[#d5bdb9] line-through">{product.oldPrice}</p>
              ) : null}
            </div>

            <div className="mt-auto flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-3 font-medium text-[#3b0810] transition hover:bg-[#f0c654]"
                onClick={() => onAddToCart(product)}
              >
                <ShoppingBag className="h-4 w-4" />
                Add to Cart
              </button>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--gold)] px-5 py-3 text-white transition hover:bg-[#461017]"
                onClick={() => onToggleWishlist(product)}
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? "fill-[var(--gold)] text-[var(--gold)]" : ""}`} />
                {isWishlisted ? "Wishlisted" : "Add to Wishlist"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
