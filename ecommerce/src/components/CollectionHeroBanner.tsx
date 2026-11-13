import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
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

const INFO_GRAPHIC_IMAGE_PATTERN =
  /size[-_\s]*(chart|guide)|chart|measurement|dimension|spec[-_\s]*sheet|care[-_\s]*label/i;

function normalizeImageSrc(src: string): string {
  return src.split("?")[0].toLowerCase();
}

/**
 * Pick the main product image for the banner, skipping size charts and
 * informational graphics. Prefers the featured image, then gallery order.
 */
function pickBestBannerImage(product: GridProduct | null): string {
  if (!product) return "/cat1.jpg";

  const mediaImages = (product.productMedia ?? [])
    .filter((m) => m.type === "image" && Boolean(m.src))
    .map((m) => ({ src: m.src, alt: m.alt ?? "" }));
  const images = mediaImages.length > 0
    ? mediaImages
    : (product.galleryImages ?? []).filter(Boolean).map((src) => ({ src, alt: "" }));

  // Size charts are uploaded as the last gallery image (same convention as the product page size-chart modal).
  const trailingSrc = images.length > 1 ? normalizeImageSrc(images[images.length - 1].src) : null;

  const isUsable = (src: string, alt: string) =>
    Boolean(src) &&
    normalizeImageSrc(src) !== trailingSrc &&
    !INFO_GRAPHIC_IMAGE_PATTERN.test(`${alt} ${src}`);

  const featured = product.img;
  if (featured) {
    const featuredAlt = images.find((image) => normalizeImageSrc(image.src) === normalizeImageSrc(featured))?.alt ?? "";
    if (isUsable(featured, featuredAlt)) return featured;
  }

  const fallback = images.find((image) => isUsable(image.src, image.alt));
  return fallback?.src ?? featured ?? "/cat1.jpg";
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

const STYLE_MAP: Record<BannerStyleKey, { accent: string; ink: string; wash: string }> = {
  drop: { accent: "#00bdff", ink: "#006b91", wash: "#eefaff" },
  bestseller: { accent: "#fdce48", ink: "#765700", wash: "#fff9e4" },
  devotional: { accent: "#9058ff", ink: "#6236ae", wash: "#f6f2ff" },
  festival: { accent: "#0acf83", ink: "#08734b", wash: "#edf9f3" },
  sale: { accent: "#ed467a", ink: "#ab2750", wash: "#fff0f5" },
  editorial: { accent: "#0acf83", ink: "#08734b", wash: "#edf9f3" },
  default: { accent: "#00bdff", ink: "#006b91", wash: "#eefaff" },
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
    ? `/products/${encodeURIComponent(product.handle.trim())}`
    : product?.id
      ? `/products/${encodeURIComponent(product.id)}`
      : undefined;
  const resolvedCtaHref = featuredProductHref ?? ctaHref;

  return (
    <section
      aria-label={`${headline} collection banner`}
      className="relative mt-5 w-full overflow-hidden border-y border-black/10 bg-white md:mt-6"
    >
      <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div
          className="relative flex min-w-0 items-center justify-center overflow-hidden px-5 py-5 md:border-r md:border-black/10 md:px-8 md:py-7"
          style={{ background: `linear-gradient(145deg, ${style.wash} 0%, #ffffff 88%)` }}
        >
          <span className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: style.accent }} aria-hidden="true" />
          <div className="relative aspect-[4/5] w-full max-w-[260px] md:max-w-[320px] lg:max-w-[360px] xl:max-w-[400px]">
            <SafeImage
              src={imageSrc}
              alt={product?.name || title}
              sizes="(min-width: 1280px) 400px, (min-width: 1024px) 360px, (min-width: 768px) 320px, 260px"
              className="relative h-full w-full object-contain object-center"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-center px-6 py-7 md:px-8 md:py-8 lg:px-12 xl:px-16">
          <div className="flex items-center gap-3">
            <span className="h-px w-9 shrink-0" style={{ backgroundColor: style.accent }} aria-hidden="true" />
            <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-normal" style={{ color: style.ink }}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {styleKey === "sale" ? "Limited Time Offer" : styleKey === "bestseller" ? "Customer Favourite" : styleKey === "drop" ? "Just Launched" : "Curated Collection"}
            </span>
          </div>

          <h1 className="mt-4 max-w-[16ch] break-words text-[34px] font-medium leading-[1.08] tracking-normal text-[#171719] md:text-[40px] lg:text-[48px] xl:text-[56px]">
            {headline}
          </h1>

          <p className="mt-4 max-w-[44ch] text-[14px] leading-[1.7] text-[#5b5b63] md:text-[15px]">
            {displaySubtitle}
          </p>

          {couponCode ? (
            <div className="mt-6 flex w-fit max-w-full flex-wrap items-center gap-x-6 gap-y-2 border-l-2 px-4 py-3" style={{ borderColor: style.accent, backgroundColor: style.wash }}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-normal" style={{ color: style.ink }}>{couponLabel ?? "Discount Code"}</p>
                <p className="mt-1 break-all font-mono text-xl font-semibold text-[#171719]">{couponCode}</p>
              </div>
              <p className="max-w-[16ch] text-[11px] leading-[1.5] text-[#5b5b63]">Apply at checkout to save</p>
            </div>
          ) : null}

          {resolvedCtaHref ? (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href={resolvedCtaHref}
                className="group inline-flex min-h-[50px] items-center gap-7 rounded-md bg-[#171719] py-2.5 pl-6 pr-3 text-[12px] font-semibold uppercase tracking-normal text-white transition-colors duration-200 hover:bg-[#303035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ outlineColor: style.accent }}
              >
                {ctaLabel}
                <span className="flex h-8 w-8 items-center justify-center rounded text-[#171719]" style={{ backgroundColor: style.accent }} aria-hidden="true">
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
                </span>
              </Link>
            </div>
          ) : null}

          {product && !couponCode ? (
            <div className="mt-7 border-t border-black/10 pt-4">
              {featuredProductHref ? (
                <Link href={featuredProductHref} className="group flex max-w-full items-center justify-between gap-4 text-[12px] font-medium leading-[1.5] text-[#47474f] transition-colors hover:text-[#171719]">
                  <span className="min-w-0 break-words">{product.name}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
                </Link>
              ) : (
                <span className="block max-w-full break-words text-[12px] font-medium leading-[1.5] text-[#47474f]">{product.name}</span>
              )}
            </div>
          ) : null}
          </div>
      </div>
    </section>
  );
}
