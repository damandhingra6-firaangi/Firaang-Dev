"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { GridProduct } from "@/lib/catalog";
import { convertAmount, formatCurrency, toSupportedCurrency } from "@/lib/currency";
import { getProductPath } from "@/lib/product-url";
import { useUiStore } from "@/store/useUiStore";

type HeaderSearchPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HeaderSearchPanel({ isOpen, onClose }: HeaderSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<GridProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultQuery, setResultQuery] = useState<string | null>(null);
  const displayCurrency = useUiStore((state) => state.currency);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const controller = new AbortController();
    const searchTerm = query.trim();

    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ search: "1", q: searchTerm, limit: "8" });
        const response = await fetch(`/api/products?${params}`, {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(35_000)]),
        });
        if (!response.ok) {
          throw new Error("Product search is unavailable");
        }

        const data = (await response.json()) as { products?: GridProduct[] };
        if (!Array.isArray(data.products)) throw new Error("Invalid search response");
        if (!controller.signal.aborted) {
          setProducts(data.products);
        }
      } catch {
        if (!controller.signal.aborted) {
          setProducts([]);
          setError("Unable to load search results. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setResultQuery(searchTerm);
          setIsLoading(false);
        }
      }
    };

    const debounce = setTimeout(() => { void loadProducts(); }, searchTerm ? 200 : 0);

    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [isOpen, query]);

  const isPending = isLoading || resultQuery !== query.trim();
  const filteredProducts = !isPending && !error ? products.filter((product) => product.handle?.trim()).slice(0, 8) : [];

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[98] bg-black/45 px-4 py-20 md:py-24" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-3xl rounded-2xl border border-[#e5e7ee] bg-white p-4 shadow-[0_16px_42px_rgba(40,44,63,0.2)] md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#d9dde7] bg-white px-3 py-2.5 shadow-[0_4px_12px_rgba(40,44,63,0.06)]">
          <Search className="h-4 w-4 text-[#6a6f7a]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, brands and more"
            className="w-full bg-transparent text-sm text-[#1f2432] outline-none placeholder:text-[#8b90a0]"
            autoFocus
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="rounded-full p-1 text-[#757b8b] hover:bg-[#f1f3f8]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isPending ? <p role="status" className="text-sm text-[#696e79]">Loading products...</p> : null}

        {!isPending && error ? <p role="alert" className="text-sm text-[#696e79]">{error}</p> : null}

        {!isPending && !error && filteredProducts.length === 0 ? (
          <p className="text-sm text-[#696e79]">No products found.</p>
        ) : null}

        <div className="space-y-2">
          {filteredProducts.map((product) => (
            <Link
              href={getProductPath(product.handle!)}
              key={product.id}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition hover:border-[#eceef4] hover:bg-[#f7f8fb]"
            >
              <SafeImage src={product.img} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
              <div>
                <p className="text-sm font-medium text-[#282c3f]">{product.name}</p>
                <p className="text-xs text-[#3e4152]">
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
