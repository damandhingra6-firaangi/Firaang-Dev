"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { GridProduct } from "@/lib/catalog";
import { convertAmount, formatCurrency, toSupportedCurrency } from "@/lib/currency";
import { useUiStore } from "@/store/useUiStore";

type HeaderSearchPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HeaderSearchPanel({ isOpen, onClose }: HeaderSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<GridProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const displayCurrency = useUiStore((state) => state.currency);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { products?: GridProduct[] };
        if (isMounted && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return products.slice(0, 8);
    }

    return products
      .filter((product) => {
        return (
          product.name.toLowerCase().includes(normalized) ||
          product.description.toLowerCase().includes(normalized)
        );
      })
      .slice(0, 8);
  }, [products, query]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[98] bg-black/60 px-4 py-24" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-2xl rounded-2xl border border-[var(--gold)]/50 bg-[#2b060b] p-4 shadow-2xl md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--gold)]/50 bg-[#3f0d14] px-3 py-2">
          <Search className="h-4 w-4 text-[#eac26a]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#d5bdb9]"
            autoFocus
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="rounded-full p-1 hover:bg-[#58121a]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? <p className="text-sm text-[#d5bdb9]">Loading products...</p> : null}

        {!isLoading && filteredProducts.length === 0 ? (
          <p className="text-sm text-[#d5bdb9]">No products matched your search.</p>
        ) : null}

        <div className="space-y-2">
          {filteredProducts.map((product) => (
            <Link
              href={`/shop?q=${encodeURIComponent(product.name)}`}
              key={product.id}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition hover:border-[var(--gold)]/40 hover:bg-[#451018]"
            >
              <SafeImage src={product.img} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
              <div>
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-[#eac26a]">
                  {formatCurrency(
                    convertAmount(product.priceAmount, toSupportedCurrency(product.currencyCode), displayCurrency),
                    displayCurrency,
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
