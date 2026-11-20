"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion, MotionConfig, useMotionValue, useSpring } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import type { GridProduct } from "@/lib/catalog";
import { formatCurrency } from "@/lib/currency";
import {
  matchesHomeCollectionVibe,
  type HomeCollectionVibeId,
} from "@/lib/home-collection-keys";
import { getDisplayPricing } from "@/lib/pricing-display";

type VibeId = HomeCollectionVibeId;

type ShopifyCollectionVibeId = Extract<
  VibeId,
  "humor-quotes" | "limited-edition" | "womens-collection" | "rakhi-special" | "animal-love"
>;

type FilterId = "all" | VibeId;

type Vibe = {
  id: VibeId;
  title: string;
  subtitle: string;
  badge?: "TRENDING" | "NEW";
  collectionHref?: string;
  collectionImage?: string;
  collectionTitle?: string;
  collectionProducts?: GridProduct[];
};

type ShopifyCollectionVibe = Vibe & {
  id: ShopifyCollectionVibeId;
  collectionHref: string;
  collectionImage: string;
  collectionTitle: string;
  collectionProducts: GridProduct[];
};

export type HomeCollectionDiscoveryCollection = {
  id: string;
  handle: string;
  title: string;
  href: string;
  imageUrl: string;
  isSeasonallyVisible: boolean;
  products: GridProduct[];
};

const SHOPIFY_COLLECTION_VIBES: Array<{
  id: ShopifyCollectionVibeId;
  subtitle: string;
}> = [
  {
    id: "humor-quotes",
    subtitle: "Say it with a little wit.",
  },
  {
    id: "limited-edition",
    subtitle: "Rare drops. Made to stand out.",
  },
  {
    id: "womens-collection",
    subtitle: "Designed for your own rhythm.",
  },
  {
    id: "rakhi-special",
    subtitle: "A thoughtful gift for your bond.",
  },
  {
    id: "animal-love",
    subtitle: "Celebrate the companions who make life better.",
  },
];

const VIBES: Vibe[] = [
  {
    id: "mythology",
    title: "Mythology",
    subtitle: "Rooted in belief. Worn in style.",
    badge: "TRENDING",
  },
  {
    id: "streetwear",
    title: "Streetwear",
    subtitle: "Bold graphics. Louder stories.",
  },
  {
    id: "anime",
    title: "Anime & Pop",
    subtitle: "Fan culture, reimagined.",
    badge: "NEW",
  },
  {
    id: "india",
    title: "India Unfiltered",
    subtitle: "Our culture. Our stories. Our pride.",
  },
  {
    id: "mindset",
    title: "Mindset",
    subtitle: "Wear a higher standard.",
  },
  {
    id: "404",
    title: "404 Series",
    subtitle: "For those who feel different.",
  },
  {
    id: "essentials",
    title: "Essentials",
    subtitle: "Timeless fits. Everyday comfort.",
  },
  {
    id: "bottomwear",
    title: "Bottomwear",
    subtitle: "Move different.",
  },
];

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "mythology", label: "Mythology" },
  { id: "anime", label: "Anime" },
  { id: "streetwear", label: "Streetwear" },
  { id: "mindset", label: "Mindset" },
  { id: "india", label: "India" },
  { id: "404", label: "404" },
  { id: "essentials", label: "Essentials" },
  { id: "bottomwear", label: "Bottomwear" },
];

const TRENDING_COLLECTIONS = [
  {
    title: "Bestseller Collection",
    eyebrow: "THE CROWD FAVOURITES",
    description: "The designs that make a statement.",
    href: "/shop?section=bestsellers",
    terms: ["bestseller", "best seller", "popular", "most loved"],
    vibe: "streetwear" as const,
  },
  {
    title: "New Collection",
    eyebrow: "JUST LANDED",
    description: "Fresh energy. First access.",
    href: "/shop?section=just-dropped",
    terms: ["new", "new arrival", "new drop", "latest"],
    vibe: "anime" as const,
  },
  {
    title: "Most Viewed",
    eyebrow: "IN THE SPOTLIGHT",
    description: "Discover the designs turning heads.",
    href: "/shop?section=bestsellers",
    terms: ["most viewed", "popular", "trending", "bestseller"],
    vibe: "india" as const,
  },
  {
    title: "Staff Pick",
    eyebrow: "CURATED BY FIRAANG",
    description: "A considered edit from our collection.",
    href: "/shop?section=collections",
    terms: ["staff pick", "editors pick", "curated"],
    vibe: "mythology" as const,
  },
];

const PRODUCT_PAGE_SIZE = 12;

function getProductSearchText(product: GridProduct) {
  return [
    product.name,
    product.handle,
    product.category,
    product.subCategory,
    product.productType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesTerms(product: GridProduct, terms: string[]) {
  const searchText = getProductSearchText(product);
  const tagText = (product.tags ?? []).join(" ").toLowerCase();
  return terms.some((term) => {
    if (searchText.includes(term)) return true;
    if (term === "india" || term === "indian") return false;
    return tagText.includes(term);
  });
}

function getVibeProducts(vibe: Vibe) {
  return vibe.collectionProducts ?? [];
}

function isNewProduct(product: GridProduct) {
  if (!product.publishedAt) return false;
  const publishedAt = Date.parse(product.publishedAt);
  return Number.isFinite(publishedAt) && Date.now() - publishedAt < 30 * 24 * 60 * 60 * 1000;
}

function MagneticCta({ children }: { children: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 16, mass: 0.3 });
  const springY = useSpring(y, { stiffness: 220, damping: 16, mass: 0.3 });

  return (
    <motion.span
      style={{ x: springX, y: springY }}
      onPointerMove={(event: ReactPointerEvent<HTMLSpanElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - bounds.left - bounds.width / 2) * 0.18);
        y.set((event.clientY - bounds.top - bounds.height / 2) * 0.18);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
    >
      {children}
      <ArrowUpRight className="h-4 w-4 text-[#D4AF37] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </motion.span>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-7 flex flex-col gap-3 md:mb-9 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#A13F45]">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-[clamp(2rem,4vw,3.5rem)] font-semibold uppercase leading-[0.98] tracking-[-0.045em] text-[#272220]">
          {title}
        </h2>
      </div>
      {description ? <p className="max-w-[420px] text-sm leading-6 text-[#756A63] md:text-right">{description}</p> : null}
    </div>
  );
}

export default function HomeCollectionDiscovery({
  products,
  collections,
}: {
  products: GridProduct[];
  collections: HomeCollectionDiscoveryCollection[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [visibleCount, setVisibleCount] = useState(PRODUCT_PAGE_SIZE);
  const exploreRef = useRef<HTMLElement | null>(null);

  const curatedVibes = useMemo(
    () =>
      VIBES.flatMap((vibe) => {
        const collection = collections.find(
          (item) => item.isSeasonallyVisible && matchesHomeCollectionVibe(item, vibe.id),
        );
        if (!collection && vibe.id !== "404") return [];
        return [
          {
            ...vibe,
            collectionHref: collection?.href,
            collectionImage: collection?.imageUrl,
            collectionTitle: collection?.title,
            collectionProducts: collection?.products ?? [],
          },
        ];
      }),
    [collections],
  );

  const collectionVibes = useMemo<ShopifyCollectionVibe[]>(
    () =>
      SHOPIFY_COLLECTION_VIBES.flatMap((config) => {
        const collection = collections.find(
          (item) => matchesHomeCollectionVibe(item, config.id),
        );

        if (!collection?.isSeasonallyVisible) {
          return [];
        }

        return [
          {
            id: config.id,
            title: collection.title,
            subtitle: config.subtitle,
            collectionHref: collection.href,
            collectionImage: collection.imageUrl,
            collectionTitle: collection.title,
            collectionProducts: collection.products,
          },
        ];
      }),
    [collections],
  );
  const vibes = useMemo<Vibe[]>(() => [...curatedVibes, ...collectionVibes], [collectionVibes, curatedVibes]);
  const filters = useMemo(
    () => [
      ...FILTERS.filter(
        (filter) => filter.id === "all" || curatedVibes.some((vibe) => vibe.id === filter.id),
      ).map((filter) => {
        if (filter.id === "all") return filter;
        const vibe = curatedVibes.find((item) => item.id === filter.id);
        return { ...filter, label: vibe?.collectionTitle ?? filter.label };
      }),
      ...collectionVibes.map(({ id, title }) => ({ id, label: title })),
    ],
    [collectionVibes, curatedVibes],
  );

  const vibeProducts = useMemo(
    () => Object.fromEntries(vibes.map((vibe) => [vibe.id, getVibeProducts(vibe)])) as Record<VibeId, GridProduct[]>,
    [vibes],
  );

  const vibeCards = useMemo(() => {
    return vibes.map((vibe, index) => {
      const matches = vibeProducts[vibe.id];
      const imageProduct = matches.find((product) => Boolean(product.img)) ?? null;
      const imageSrc =
        vibe.collectionImage && vibe.collectionImage !== "/Home Page Banner.png"
          ? vibe.collectionImage
          : imageProduct?.img ?? null;
      return { vibe, index, matches, imageProduct, imageSrc };
    });
  }, [vibes, vibeProducts]);

  const filteredProducts = useMemo(() => {
    if (activeFilter === "all") return products;
    const activeVibeConfig = vibes.find((vibe) => vibe.id === activeFilter);
    return activeVibeConfig ? getVibeProducts(activeVibeConfig) : [];
  }, [activeFilter, products, vibes]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const activeFilterLabel = filters.find((filter) => filter.id === activeFilter)?.label ?? "All";
  const activeCollection = vibes.find((vibe) => vibe.id === activeFilter && vibe.collectionHref);
  const isCollectionUnavailable = activeFilter !== "all" && !activeCollection;
  const unavailableCollectionTitle = vibes.find((vibe) => vibe.id === activeFilter)?.title ?? activeFilterLabel;

  const selectFilter = (filter: FilterId) => {
    setActiveFilter(filter);
    setVisibleCount(PRODUCT_PAGE_SIZE);
  };

  const exploreVibe = (vibe: Vibe) => {
    setActiveFilter(vibe.id);
    setVisibleCount(PRODUCT_PAGE_SIZE);
    window.setTimeout(() => exploreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const trendingProducts = useMemo(
    () =>
      TRENDING_COLLECTIONS.map((collection) => {
        const matched = products.filter((product) => matchesTerms(product, collection.terms));
        const relatedVibe = vibes.find((vibe) => vibe.id === collection.vibe);
        const fallbackProducts = relatedVibe ? vibeProducts[relatedVibe.id] : [];
        return {
          ...collection,
          product: matched[0] ?? fallbackProducts[0] ?? products[0] ?? null,
          count: matched.length || fallbackProducts.length,
        };
      }),
    [products, vibes, vibeProducts],
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-[#F8F5F0] text-[#2F2B2A]">
        <motion.section
          aria-labelledby="shop-by-vibe-heading"
          className="overflow-hidden bg-[linear-gradient(180deg,#F8F5F0_0%,#F5EFE8_100%)] py-8 md:py-10 lg:py-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.08 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="home-shell">
            <SectionHeading
              id="shop-by-vibe-heading"
              eyebrow="FIND YOUR FREQUENCY"
              title="SHOP BY VIBE"
              description="Curated worlds. One point of view. Find the collection that feels like you."
            />

            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
              {vibeCards.map(({ vibe, index, matches, imageSrc }) => {
                return (
                  <motion.button
                    key={vibe.id}
                    type="button"
                    onClick={() => exploreVibe(vibe)}
                    className="group relative h-[390px] w-[82vw] max-w-[360px] shrink-0 snap-center overflow-hidden rounded-[24px] border border-white/35 bg-[#e5ddd5] text-left shadow-[0_16px_40px_rgba(47,43,42,0.12)] transition-shadow duration-300 hover:border-white/70 hover:shadow-[0_22px_48px_rgba(47,43,42,0.18)] sm:w-full sm:max-w-none"
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.12 }}
                    transition={{ duration: 0.5, delay: Math.min(index * 0.045, 0.25), ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -4 }}
                    aria-label={`Explore ${vibe.title}, ${matches.length} ${matches.length === 1 ? "product" : "products"}`}
                  >
                    {imageSrc ? (
                      <SafeImage
                        src={imageSrc}
                        alt=""
                        width={900}
                        height={1100}
                        sizes="(max-width: 640px) 82vw, (max-width: 1024px) 340px, 25vw"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.16)_34%,rgba(0,0,0,0.88)_100%)] transition-colors duration-500 group-hover:bg-black/55" />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/25 via-transparent to-[#D4AF37]/10 opacity-70" />

                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-5 md:p-6">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/75">FIRAANG / 0{index + 1}</span>
                      {vibe.badge ? (
                        <span className="rounded-full border border-[#D4AF37]/55 bg-black/35 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#F2D98B] backdrop-blur-md">
                          {vibe.badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white/85 backdrop-blur-xl">
                        <Sparkles className="h-3 w-3 text-[#D4AF37]" />
                        {matches.length} {matches.length === 1 ? "PRODUCT" : "PRODUCTS"}
                      </div>
                      <h3 className="text-[clamp(1.75rem,3vw,2.4rem)] font-semibold uppercase leading-[0.95] tracking-[-0.045em] text-white">
                        {vibe.title}
                      </h3>
                      <p className="mt-2 text-[12px] leading-5 text-white/70">{vibe.subtitle}</p>
                      <div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4">
                        <MagneticCta>EXPLORE</MagneticCta>
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-white/[0.08] text-white backdrop-blur-md transition duration-300 group-hover:border-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.section>

        <motion.section
          aria-labelledby="trending-collections-heading"
          className="border-y border-[#E8DCD1] bg-[linear-gradient(145deg,#FFFDFA_0%,#F4EDE6_62%,#FAF6F0_100%)] py-8 md:py-10 lg:py-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.08 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="home-shell">
            <SectionHeading
              id="trending-collections-heading"
              eyebrow="IN THE FIRAANG ROTATION"
              title="TRENDING COLLECTIONS"
              description="Explore the edits everyone comes back to."
            />

            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              {trendingProducts.map((collection, index) => (
                <motion.div
                  key={collection.title}
                  className="w-[78vw] max-w-[380px] shrink-0 snap-start sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-48px)/4)]"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                >
                  <Link
                    href={collection.href}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-[24px] border border-white/45 bg-[#e5ddd5] shadow-[0_16px_40px_rgba(47,43,42,0.12)] transition-shadow duration-300 hover:shadow-[0_22px_48px_rgba(47,43,42,0.18)]"
                  >
                    {collection.product ? (
                      <SafeImage
                        src={collection.product.img}
                        alt={collection.product.name}
                        width={800}
                        height={1000}
                        sizes="(max-width: 640px) 78vw, (max-width: 1024px) 45vw, 24vw"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                      <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md">
                        {collection.eyebrow}
                      </span>
                      <span className="text-[9px] font-medium text-white/75">{collection.count || products.length} styles</span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h3 className="text-[clamp(1.4rem,2.4vw,2rem)] font-semibold uppercase leading-[0.95] tracking-[-0.04em] text-white">
                        {collection.title}
                      </h3>
                      <p className="mt-2 text-[11px] leading-5 text-white/70">{collection.description}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F2D98B]">
                        DISCOVER THE EDIT <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          id="explore-all-designs"
          ref={exploreRef}
          aria-labelledby="explore-all-designs-heading"
          className="scroll-mt-28 py-8 md:py-10 lg:py-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.06 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="home-shell">
            <SectionHeading
              id="explore-all-designs-heading"
              eyebrow="YOUR NEXT FAVOURITE IS HERE"
              title="EXPLORE ALL DESIGNS"
              description="Filter the full edit and find your next everyday essential."
            />

            <div className="sticky top-[100px] z-30 -mx-4 mb-7 border-y border-[#E7DBD0] bg-[#F8F5F0]/95 px-4 py-3 backdrop-blur-xl lg:top-[104px] md:mb-8">
              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filters.map((filter) => {
                  const isActive = activeFilter === filter.id;
                  const filterVibe =
                    filter.id === "all" ? null : vibes.find((vibe) => vibe.id === filter.id);
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => selectFilter(filter.id)}
                      aria-pressed={isActive}
                      className={`shrink-0 snap-start rounded-full border px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors duration-200 sm:px-5 sm:text-[10px] ${
                        isActive
                          ? "border-[#B54847] bg-[#B54847] text-white"
                          : "border-[#DFD1C5] bg-white/80 text-[#6B5F58] hover:border-[#B54847]/50 hover:text-[#312A26]"
                      }`}
                    >
                      {filter.label}
                      {filterVibe ? (
                        <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[8px] ${isActive ? "bg-white/20" : "bg-[#B54847]/10"}`}>
                          {vibeProducts[filterVibe.id]?.length ?? 0}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[#766A63]" aria-live="polite">
                <span className="text-[#2F2B2A]">{filteredProducts.length}</span> designs / {activeFilterLabel}
              </p>
              {!isCollectionUnavailable ? (
                <Link
                  href={activeCollection?.collectionHref ?? "/shop"}
                  className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#A13F45] transition-colors hover:text-[#742F35]"
                >
                  {activeCollection ? "VIEW COLLECTION" : "VIEW THE FULL STORE"} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>

            {visibleProducts.length > 0 ? (
              <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {visibleProducts.map((product, index) => {
                  const productHref = `/products/${encodeURIComponent(product.handle?.trim() || product.id)}`;

                  return (
                    <motion.article
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(index * 0.025, 0.2) }}
                      className="group overflow-hidden rounded-[20px] border border-[#E8DDD3] bg-white/90 shadow-[0_10px_28px_rgba(47,43,42,0.07)] transition duration-300 hover:border-[#B54847]/40 hover:shadow-[0_16px_34px_rgba(47,43,42,0.12)]"
                    >
                      <Link href={productHref} className="block">
                        <div className="relative aspect-[4/5] overflow-hidden bg-[#F0E9E2]">
                          <SafeImage
                            src={product.img}
                            alt={product.name}
                            width={700}
                            height={875}
                            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 23vw"
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.055]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
                          {isNewProduct(product) ? (
                            <span className="absolute left-3 top-3 rounded-full border border-[#D4AF37]/60 bg-black/55 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#F2D98B] backdrop-blur-md">
                              NEW DROP
                            </span>
                          ) : null}
                          <span className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md transition duration-300 group-hover:border-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black">
                            <ArrowUpRight className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="p-3.5 sm:p-4">
                          <h3 className="line-clamp-2 min-h-[2.6em] text-[12px] font-medium leading-[1.3] text-[#342D29] sm:text-[13px]">
                            {product.name}
                          </h3>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-[14px] font-semibold text-[#2F2B2A]">
                              {formatCurrency(getDisplayPricing({ priceAmount: product.priceAmount, compareAt: product.oldPrice }).priceAmount, "INR")}
                            </span>
                            <span className="text-[9px] uppercase tracking-[0.12em] text-[#927F75]">FIRAANG</span>
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  );
                })}
              </motion.div>
            ) : (
              <div className="rounded-[24px] border border-[#E7DBD0] bg-white/75 px-5 py-14 text-center shadow-[0_12px_30px_rgba(47,43,42,0.06)]">
                <p className="text-lg font-medium text-[#342D29]">
                  {isCollectionUnavailable ? `${unavailableCollectionTitle} is coming soon.` : "This edit is coming together."}
                </p>
                <p className="mt-2 text-sm text-[#766A63]">
                  {isCollectionUnavailable
                    ? "This collection will appear here once it is published in Shopify."
                    : "Explore all designs while we curate this collection."}
                </p>
                {!isCollectionUnavailable ? (
                  <button
                    type="button"
                    onClick={() => selectFilter("all")}
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#B54847]/60 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A13F45] transition hover:bg-[#B54847] hover:text-white"
                  >
                    Browse all designs <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            )}

            {visibleCount < filteredProducts.length ? (
              <div className="mt-9 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PRODUCT_PAGE_SIZE)}
                  className="group inline-flex items-center gap-3 rounded-full border border-[#D8C6B9] bg-white/70 px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B5F58] transition-colors hover:border-[#B54847] hover:text-[#A13F45]"
                >
                  LOAD MORE DESIGNS
                  <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1" />
                </button>
              </div>
            ) : null}
          </div>
        </motion.section>
      </div>
    </MotionConfig>
  );
}
