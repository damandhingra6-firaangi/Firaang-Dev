"use client";

import { Heart, ShoppingBag, Trash2, X } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { getWishlistItems, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";

type WishlistDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function WishlistDrawer({ isOpen, onClose }: WishlistDrawerProps) {
  const wishlist = useShopStore((state) => state.wishlist);
  const toggleWishlist = useShopStore((state) => state.toggleWishlist);
  const moveWishlistItemToCart = useShopStore((state) => state.moveWishlistItemToCart);
  const openCart = useUiStore((state) => state.openCart);
  const pushToast = useUiStore((state) => state.pushToast);

  const wishlistItems = getWishlistItems(wishlist);

  return (
    <>
      <div
        className={`fixed inset-0 z-[84] bg-black/50 transition ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-[94] h-full w-full max-w-md transform border-l border-[var(--gold)]/40 bg-[var(--popup-bg)] transition duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--gold)]/40 px-5 py-4">
            <h3 className="text-xl">Wishlist ({wishlistItems.length})</h3>
            <button type="button" onClick={onClose} aria-label="Close wishlist" className="rounded-full p-2 hover:bg-[var(--popup-hover)]">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {wishlistItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-[var(--popup-muted)]">
                <Heart className="mb-3 h-8 w-8" />
                <p>Your wishlist is empty.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {wishlistItems.map((product) => (
                  <article key={product.id} className="rounded-xl border border-[var(--gold)]/40 p-3">
                    <div className="flex gap-3">
                      <SafeImage src={product.img} alt={product.name} className="h-20 w-20 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="text-[var(--gold)]">{product.price}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/70 px-3 py-1.5 text-sm"
                        onClick={() => {
                          moveWishlistItemToCart(product.id);
                          pushToast("Moved to cart", { variant: "success" });
                          onClose();
                          openCart();
                        }}
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Move to Cart
                      </button>

                      <button
                        type="button"
                        className="rounded-full p-2 text-[var(--gold)] transition hover:bg-[var(--popup-hover)]"
                        onClick={() => {
                          toggleWishlist(product);
                          pushToast("Removed from wishlist", { variant: "info" });
                        }}
                        aria-label={`Remove ${product.name} from wishlist`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
