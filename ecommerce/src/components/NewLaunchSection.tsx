import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import type { ShopifyCollectionLaunch } from "@/lib/shopify-collections";

type NewLaunchSectionProps = {
  collection: ShopifyCollectionLaunch;
};

export default function NewLaunchSection({ collection }: NewLaunchSectionProps) {
  return (
    <section className="bg-[linear-gradient(165deg,#fff9ee_0%,#fff3f8_56%,#fff_100%)] py-12 md:py-16">
      <div className="home-shell">
        <div className="mb-6 flex items-center gap-2.5 text-[#8c4b21] md:mb-8">
          <span className="inline-flex rounded-full bg-[#ffd58a] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
            {collection.badge ?? "NEW"}
          </span>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#b45c31]">New Launch</p>
        </div>

        <article className="grid gap-6 overflow-hidden rounded-[24px] border border-[#f3cda6] bg-white p-4 shadow-[0_16px_40px_rgba(213,102,48,0.14)] md:grid-cols-[1.05fr_1fr] md:items-center md:gap-8 md:p-8 lg:p-10">
          <div className="relative h-[260px] overflow-hidden rounded-[18px] bg-[#f7f2e8] sm:h-[300px] md:h-[360px]">
            <SafeImage
              src={collection.imageUrl}
              alt={collection.title}
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <h2 className="text-[32px] font-semibold leading-[1.04] tracking-[-0.02em] text-[#201a17] sm:text-[42px] md:text-[48px]">
              {collection.title}
            </h2>
            <p className="mt-4 max-w-[56ch] text-[15px] leading-[1.7] text-[#4e3c34] md:text-[16px]">
              {collection.launchSubtitle || collection.description || "Explore the latest drop crafted for this special season."}
            </p>
            <Link
              href={collection.href}
              className="mt-6 inline-flex h-[46px] items-center justify-center rounded-[8px] bg-[#201a17] px-6 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#ed467a]"
            >
              Shop Now
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
