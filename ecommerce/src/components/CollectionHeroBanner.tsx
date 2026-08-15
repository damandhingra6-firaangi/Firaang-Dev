import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { GridProduct } from "@/lib/catalog";

/**
 * Known fashion compound terms that should keep their internal hyphen.
 * Keys must be lowercase slugs; values are the correct display form.
 */
const FASHION_COMPOUNDS: Record<string, string> = {
  "t-shirt": "T-Shirt",
  "t-shirts": "T-Shirts",
  "half-shirt": "Half-Shirt",
  "half-shirts": "Half-Shirts",
  "full-sleeve": "Full-Sleeve",
  "co-ord": "Co-Ord",
  "co-ords": "Co-Ords",
};

/**
 * Convert a URL slug into a human-readable display title.
 * Handles fashion compound terms: "classic-t-shirts" → "Classic T-Shirts"
 */
function unslugify(slug: string): string {
  const lower = slug.toLowerCase();
  if (FASHION_COMPOUNDS[lower]) return FASHION_COMPOUNDS[lower];

  const words = lower.split("-");
  const result: string[] = [];
  let i = 0;

  while (i < words.length) {
    // Try two-word compound first
    if (i + 1 < words.length) {
      const twoWord = words[i] + "-" + words[i + 1];
      if (FASHION_COMPOUNDS[twoWord]) {
        result.push(FASHION_COMPOUNDS[twoWord]);
        i += 2;
        continue;
      }
    }
    result.push(words[i].charAt(0).toUpperCase() + words[i].slice(1));
    i++;
  }

  return result.join(" ");
}

/**
 * Score an image for face/model visibility using its alt text and URL.
 * Higher = more likely to show a model's face.
 */
function scoreFaceVisibility(src: string, alt: string): number {
  const haystack = (alt + " " + src).toLowerCase();

  // Strong positive: explicit face/portrait/lifestyle signals
  if (/\b(lifestyle|portrait|face|look book|lookbook|editorial|front.?view|facing|full.?body)\b/.test(haystack)) return 12;
  // Good positive: model or person wearing the product
  if (/\b(model|wearing|styled|outfit|on model|street|person|girl|boy|woman|man|people)\b/.test(haystack)) return 8;
  // Negative: no person expected
  if (/\b(flat.?lay|flatlay|back.?view|rear|detail|close.?up|closeup|graphic|print|logo|texture|white.?bg|product.?only|mannequin)\b/.test(haystack)) return -8;

  return 0; // neutral
}

/**
 * From all available product images, pick the one most likely to show a clearly
 * visible model face. Falls back to the featured image if no better option is found.
 */
function pickBestBannerImage(product: GridProduct | null): string {
  if (!product) return "/cat1.jpg";

  const featured = product.img || "/cat1.jpg";

  const mediaImages = (product.productMedia ?? [])
    .filter((m) => m.type === "image" && Boolean(m.src))
    .map((m, idx) => ({
      src: m.src,
      score: scoreFaceVisibility(m.src, m.alt ?? "") - idx * 0.4, // small ordering penalty
    }));

  if (mediaImages.length === 0) return featured;

  // Sort by score descending
  mediaImages.sort((a, b) => b.score - a.score);

  const best = mediaImages[0];
  // Only use gallery pick if it beats a "negative" threshold
  return best.score > -8 ? best.src : featured;
}

type BannerStyleKey = "drop" | "bestseller" | "devotional" | "festival" | "sale" | "editorial" | "default";

type CollectionHeroBannerProps = {
  title: string;
  product: GridProduct | null;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  couponCode?: string;
  couponLabel?: string;
};

function getBannerStyleKey(title: string, isSaleSection?: boolean): BannerStyleKey {
  const lowered = title.toLowerCase();

  if (isSaleSection || /^sale$/.test(lowered.trim())) {
    return "sale";
  }

  if (/offer|deal|discount/.test(lowered)) {
    return "sale";
  }

  if (/just dropped|new drop|latest|drop/.test(lowered)) {
    return "drop";
  }

  if (/bestseller|best seller|most loved|popular/.test(lowered)) {
    return "bestseller";
  }

  if (/rakhi|festival|celebration/.test(lowered)) {
    return "festival";
  }

  if (/spiritual|devotional|pooja|mandala|bhakti/.test(lowered)) {
    return "devotional";
  }

  if (/oversized|collared|editorial|signature/.test(lowered)) {
    return "editorial";
  }

  return "default";
}

const STYLE_MAP: Record<BannerStyleKey, { shell: string; panel: string; accent: string; badge: string; cta: string; text: string; subtitle: string; imageOverlay: string; glow: string; couponPill: string; }> = {
  drop: {
    shell: "bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.2),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.18),_transparent_46%),linear-gradient(120deg,#ffffff_0%,#f8f4ff_42%,#f7fbff_100%)]",
    panel: "border-[#d9cbff] bg-white/85",
    accent: "#8b5cf6",
    badge: "border-[#cab8ff] bg-[#f8f2ff] text-[#5b2fa8]",
    cta: "bg-[#8b5cf6] text-white hover:bg-[#7b4be7]",
    text: "text-[#1a1630]",
    subtitle: "text-[#3f3a63]",
    imageOverlay: "from-[#8b5cf6]/10 via-transparent to-[#ec4899]/10",
    glow: "bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.16),_transparent_65%)]",
    couponPill: "bg-[#f8f2ff] border-[#cab8ff] text-[#5b2fa8]",
  },
  bestseller: {
    shell: "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.16),_transparent_42%),linear-gradient(120deg,#ffffff_0%,#f3f8ff_45%,#f5f1ff_100%)]",
    panel: "border-[#c8dcff] bg-white/88",
    accent: "#3b82f6",
    badge: "border-[#b8d2ff] bg-[#eef6ff] text-[#1b4fa8]",
    cta: "bg-[#2563eb] text-white hover:bg-[#1f57cf]",
    text: "text-[#111c39]",
    subtitle: "text-[#334970]",
    imageOverlay: "from-[#3b82f6]/8 via-transparent to-[#8b5cf6]/10",
    glow: "bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.14),_transparent_65%)]",
    couponPill: "bg-[#eef6ff] border-[#b8d2ff] text-[#1b4fa8]",
  },
  devotional: {
    shell: "bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.16),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.15),_transparent_45%),linear-gradient(120deg,#ffffff_0%,#fff6fb_45%,#f7f4ff_100%)]",
    panel: "border-[#f3c2dd] bg-white/90",
    accent: "#ec4899",
    badge: "border-[#f4b7d9] bg-[#fff0f8] text-[#a32672]",
    cta: "bg-[#d946ef] text-white hover:bg-[#bf3ad3]",
    text: "text-[#321138]",
    subtitle: "text-[#5a2f66]",
    imageOverlay: "from-[#ec4899]/8 via-transparent to-[#8b5cf6]/8",
    glow: "bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.12),_transparent_65%)]",
    couponPill: "bg-[#fff0f8] border-[#f4b7d9] text-[#a32672]",
  },
  festival: {
    shell: "bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.18),_transparent_45%),linear-gradient(120deg,#ffffff_0%,#fff5fb_40%,#f3fff8_100%)]",
    panel: "border-[#eec2de] bg-white/90",
    accent: "#ec4899",
    badge: "border-[#ccefdc] bg-[#f0fff7] text-[#1f8a53]",
    cta: "bg-[#22c55e] text-white hover:bg-[#1eae53]",
    text: "text-[#1f1430]",
    subtitle: "text-[#4b3566]",
    imageOverlay: "from-[#ec4899]/8 via-transparent to-[#22c55e]/10",
    glow: "bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.14),_transparent_65%)]",
    couponPill: "bg-[#f0fff7] border-[#ccefdc] text-[#1f8a53]",
  },
  sale: {
    shell: "bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.22),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.18),_transparent_44%),linear-gradient(120deg,#ffffff_0%,#fff3f9_44%,#f6f0ff_100%)]",
    panel: "border-[#f9b8d8] bg-white/92",
    accent: "#ec4899",
    badge: "border-[#f9b8d8] bg-[#fff0f8] text-[#b5295e]",
    cta: "bg-[#ec4899] text-white hover:bg-[#d83b87]",
    text: "text-[#2b0d24]",
    subtitle: "text-[#5e2745]",
    imageOverlay: "from-[#ec4899]/10 via-transparent to-[#8b5cf6]/8",
    glow: "bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.16),_transparent_65%)]",
    couponPill: "bg-[#fff0f8] border-[#f9b8d8] text-[#b5295e]",
  },
  editorial: {
    shell: "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.16),_transparent_45%),linear-gradient(120deg,#ffffff_0%,#f5f9ff_40%,#fff5fc_100%)]",
    panel: "border-[#d3dfff] bg-white/90",
    accent: "#2563eb",
    badge: "border-[#d3dcff] bg-[#f3f7ff] text-[#2f4fa6]",
    cta: "bg-[#2563eb] text-white hover:bg-[#1f57cf]",
    text: "text-[#13213f]",
    subtitle: "text-[#3a4f75]",
    imageOverlay: "from-[#3b82f6]/8 via-transparent to-[#ec4899]/8",
    glow: "bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.13),_transparent_65%)]",
    couponPill: "bg-[#f3f7ff] border-[#d3dcff] text-[#2f4fa6]",
  },
  default: {
    shell: "bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_45%),linear-gradient(120deg,#ffffff_0%,#f8f6ff_46%,#f4fbff_100%)]",
    panel: "border-[#d7ccff] bg-white/90",
    accent: "#8b5cf6",
    badge: "border-[#d3c7ff] bg-[#f7f3ff] text-[#55339d]",
    cta: "bg-[#8b5cf6] text-white hover:bg-[#7b4be7]",
    text: "text-[#1b1932]",
    subtitle: "text-[#45406a]",
    imageOverlay: "from-[#8b5cf6]/8 via-transparent to-[#3b82f6]/8",
    glow: "bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.12),_transparent_65%)]",
    couponPill: "bg-[#f7f3ff] border-[#d3c7ff] text-[#55339d]",
  },
};

function getContextSubtitle(styleKey: BannerStyleKey, displayTitle: string, productName: string | undefined) {
  const productMention = productName ? `Featuring ${productName}.` : "Featuring a standout pick from this collection.";

  if (styleKey === "drop") {
    return `Fresh designs. Fresh energy. Discover the latest additions to Firaang — straight off the press.`;
  }

  if (styleKey === "bestseller") {
    return `Customer favourites that keep selling out. ${productMention}`;
  }

  if (styleKey === "sale") {
    return `Your favourite Firaang fits just got better. Stack your savings and shop before stock runs out.`;
  }

  if (styleKey === "devotional") {
    return `Calm, expressive, and meaningful design inspired by your vibe. ${productMention}`;
  }

  if (styleKey === "festival") {
    return `Festive-ready styles with statement detail and celebratory mood. ${productMention}`;
  }

  if (styleKey === "editorial") {
    return `Modern silhouettes curated for everyday streetwear expression. ${productMention}`;
  }

  return `Explore ${displayTitle} — handpicked styles and premium designs from Firaang. ${productMention}`;
}

export default function CollectionHeroBanner({ title, product, subtitle, ctaHref, ctaLabel = "SHOP", couponCode, couponLabel }: CollectionHeroBannerProps) {
  const styleKey = getBannerStyleKey(title, Boolean(couponCode));
  const style = STYLE_MAP[styleKey];

  const imageSrc = pickBestBannerImage(product);
  const rawHeadline = title.trim() || "Shop Collection";
  // Convert URL slugs ("classic-t-shirts") to readable titles ("Classic T-Shirts")
  const headline = rawHeadline.includes("-") && !/\s/.test(rawHeadline)
    ? unslugify(rawHeadline)
    : rawHeadline;
  // Use the display-friendly headline so subtitle never contains raw slugs
  const displaySubtitle = subtitle || getContextSubtitle(styleKey, headline, product?.name);
  const featuredProductHref = product?.handle?.trim()
    ? `/product/${encodeURIComponent(product.handle.trim())}`
    : product?.id
      ? `/product/${encodeURIComponent(product.id)}`
      : undefined;
  const resolvedCtaHref = featuredProductHref ?? ctaHref;

  return (
    <section className={`relative left-1/2 mt-4 w-[100vw] -translate-x-1/2 overflow-hidden border-b border-[#ede7ff] md:mt-5 ${style.shell}`}>
      <div className={`pointer-events-none absolute inset-0 ${style.glow}`} aria-hidden="true" />

      <div className="mx-auto w-full max-w-[1600px] px-4 py-2 md:px-6 md:py-3 lg:px-8">
        <div className={`relative overflow-hidden rounded-[24px] border ${style.panel} shadow-[0_8px_18px_rgba(100,84,170,0.11)]`}>
          <div className="grid items-center gap-5 p-4 md:p-6 lg:grid-cols-[1.3fr_0.85fr] lg:p-8">
            <div className="relative z-10">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${style.badge}`}>
                <Sparkles className="h-3.5 w-3.5" style={{ color: style.accent }} />
                {styleKey === "sale" ? "Limited Time Offer" : styleKey === "bestseller" ? "Customer Favourite" : styleKey === "drop" ? "Just Launched" : title.toUpperCase().includes("RAKHI") ? "Festival Edit" : "Curated Collection"}
              </span>

              <h1 className={`mt-2.5 max-w-[16ch] text-3xl font-semibold tracking-[-0.04em] md:text-4xl lg:text-5xl ${style.text}`}>
                {headline}
              </h1>

              <p className={`mt-2.5 max-w-[52ch] text-sm md:text-[15px] ${style.subtitle}`}>
                {displaySubtitle}
              </p>

              {couponCode ? (
                <div className="mt-4 inline-flex flex-col gap-1 rounded-xl border bg-white/80 p-3 shadow-[0_2px_10px_rgba(180,80,150,0.1)] sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-2.5">
                  <div>
                    <p className={`text-[9px] font-bold uppercase tracking-[0.22em] ${style.subtitle}`}>{couponLabel ?? "Discount Code"}</p>
                    <p className={`mt-0.5 font-mono text-xl font-extrabold tracking-widest ${style.text}`}>{couponCode}</p>
                  </div>
                  <p className={`text-[10px] font-medium leading-snug sm:max-w-[14ch] ${style.subtitle}`}>Apply at checkout to save</p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {resolvedCtaHref ? (
                  <Link
                    href={resolvedCtaHref}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${style.cta}`}
                  >
                    {ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}

                {product && !couponCode ? (
                  featuredProductHref ? (
                    <Link href={featuredProductHref} className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition hover:opacity-85 ${style.badge}`}>
                      {product.name}
                    </Link>
                  ) : (
                    <span className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${style.badge}`}>
                      {product.name}
                    </span>
                  )
                ) : null}
              </div>
            </div>

            <div className="relative z-10 flex justify-center">
              <div className={`relative w-full max-w-[500px] overflow-hidden rounded-[22px] border border-white/70 bg-white/55 ${style.panel}`}>
                <div className={`absolute inset-0 bg-gradient-to-t ${style.imageOverlay}`} aria-hidden="true" />
                <SafeImage
                  src={imageSrc}
                  alt={product?.name || title}
                  className="relative h-[220px] w-full object-cover object-top md:h-[290px] lg:h-[360px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
