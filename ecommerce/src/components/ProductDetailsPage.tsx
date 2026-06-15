"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { GridProduct } from "@/lib/catalog";
import { getWishlistIds, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";

type ProductDetailsPageProps = {
  product: GridProduct;
};

export default function ProductDetailsPage({ product }: ProductDetailsPageProps) {
  const wishlist = useShopStore((state) => state.wishlist);
  const toggleWishlist = useShopStore((state) => state.toggleWishlist);
  const addToCart = useShopStore((state) => state.addToCart);
  const openCart = useUiStore((state) => state.openCart);

  const wishlistIds = getWishlistIds(wishlist);

  return (
    <section className="section-shell pb-12 pt-6 md:pb-16 md:pt-8">
      <div className="mb-4 md:mb-5">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/45 px-3 py-2 text-xs uppercase tracking-[0.1em] text-[var(--gold)] transition hover:bg-[var(--popup-hover)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to shop
        </Link>
      </div>

      <ProductDetailsModal
        product={product}
        mode="page"
        isWishlisted={(item) => wishlistIds.has(item.id)}
        onToggleWishlist={toggleWishlist}
        onAddToCart={addToCart}
        onBuyNow={(item) => {
          addToCart(item);
          openCart();
        }}
      />
    </section>
  );
}
