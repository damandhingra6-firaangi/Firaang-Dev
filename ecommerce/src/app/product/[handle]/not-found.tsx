import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section-shell py-16 md:py-24">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-[#eaded3] bg-[rgba(255,252,248,0.96)] px-6 py-10 text-center shadow-[0_18px_60px_rgba(97,52,27,0.08)] md:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8d7f76]">Product unavailable</p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--page-fg)] md:text-4xl">We could not find this product</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#635850]">
          The item may have been removed, renamed, or is temporarily unavailable. Explore the shop to continue browsing the latest collection.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="rounded-full bg-[var(--secondary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#9f3940]">
            Browse shop
          </Link>
          <Link href="/" className="rounded-full border border-[#dccfc2] px-5 py-3 text-sm font-semibold text-[var(--page-fg)] transition hover:border-[var(--secondary)] hover:text-[var(--secondary)]">
            Go home
          </Link>
        </div>
      </div>
    </section>
  );
}