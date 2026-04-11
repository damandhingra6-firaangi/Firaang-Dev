"use client";

import { useMemo, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { GridProduct } from "@/lib/catalog";
import { getWishlistIds, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";

type ShopListingProps = {
  products: GridProduct[];
  initialQuery?: string;
};

export default function ShopListing({ products, initialQuery = "" }: ShopListingProps) {
  const [query, setQuery] = useState(initialQuery);
  const wishlist = useShopStore((state) => state.wishlist);
  const toggleWishlist = useShopStore((state) => state.toggleWishlist);
  const addToCart = useShopStore((state) => state.addToCart);
  const openCart = useUiStore((state) => state.openCart);

  const wishlistIds = getWishlistIds(wishlist);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized)
      );
    });
  }, [products, query]);

  return (
    <section className="section-shell py-12 md:py-16">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl md:text-5xl">Shop</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.12em] text-[var(--gold)]">Browse all products</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search in catalog..."
          className="w-full rounded-xl border border-[var(--gold)]/50 bg-[#4a0b12] px-4 py-3 text-sm text-white outline-none placeholder:text-[#d5bdb9] md:w-[360px]"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <p className="text-[#d5bdb9]">No products found for your search.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-[18px] border border-[var(--gold)]/50 bg-[#4a0b12]">
              <img src={product.img} alt={product.name} className="h-[320px] w-full object-cover" />
              <div className="space-y-3 p-4">
                <h3 className="text-lg leading-tight">{product.name}</h3>
                <p className="line-clamp-2 text-sm text-[#e9c9c3]">{product.description}</p>
                <div className="flex items-end gap-3">
                  <p className="text-xl">{product.price}</p>
                  {product.oldPrice ? <p className="text-sm text-[#d5bdb9] line-through">{product.oldPrice}</p> : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-medium text-[#3b0810]"
                    onClick={() => {
                      addToCart(product);
                      openCart();
                    }}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--gold)] p-2"
                    onClick={() => toggleWishlist(product)}
                    aria-label={`Toggle wishlist for ${product.name}`}
                  >
                    <Heart className={`h-4 w-4 ${wishlistIds.has(product.id) ? "fill-[var(--gold)] text-[var(--gold)]" : ""}`} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
