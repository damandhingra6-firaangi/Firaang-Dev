import type { Metadata } from "next";
import { ArrowDownUp, MoveHorizontal, Ruler } from "lucide-react";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";

export const metadata: Metadata = {
  title: "Size Guide | Firaang",
  description: "Use the Firaang size guide to find your ideal fit before ordering.",
};

const SIZE_HEADERS = ["Size", "Bust / Chest", "Length", "Across Shoulder", "Body Fit Range"];

const SIZE_ROWS = [
  ["XS", "24", "14", "12", "30"],
  ["S", "26", "14.5", "12.5", "32"],
  ["M", "28", "15", "13", "34"],
  ["L", "30", "15.5", "13.5", "36"],
  ["XL", "32", "16", "14", "38"],
  ["2XL", "34", "16.5", "14.5", "40"],
];

export default function SizeGuidePage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden pb-16 pt-[148px] md:pb-20 md:pt-[164px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(226,175,76,0.16),transparent_38%),radial-gradient(circle_at_82%_20%,rgba(144,24,38,0.42),transparent_36%)]" />

        <div className="section-shell relative">
          <div className="mx-auto max-w-4xl rounded-[30px] border border-[var(--gold)]/35 bg-[image:var(--popup-gradient)] px-6 py-10 text-center shadow-[0_24px_60px_rgba(0,0,0,0.34)] md:px-10 md:py-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gold)]">Fit Guide</p>
            <h1
              className="mt-3 text-[42px] font-semibold leading-none text-[var(--popup-footer-text)] md:text-[64px]"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Size Chart
            </h1>

            <p
              className="mx-auto mt-7 max-w-2xl text-[22px] font-semibold leading-[1.35] text-[var(--popup-footer-text)] md:text-[30px]"
              style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            >
              Find Your Perfect Fit
            </p>

            <div
              className="mx-auto mt-7 max-w-2xl space-y-5 text-[17px] font-medium leading-[1.7] text-[var(--popup-subtext)] md:text-[19px]"
              style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            >
              <p>
                Use this guide to choose your ideal size across our key styles. Our silhouettes are designed
                to balance comfort, structure, and effortless everyday wear.
              </p>

              <p>
                Measurements are in inches and taken flat, so compare with a similar garment you already own
                for the best fit.
              </p>

              <p>Whether you prefer tailored, regular, or relaxed, there is a fit that works for you.</p>
            </div>

            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-[var(--gold)]/30 bg-[var(--popup-inner)] px-5 py-5 text-left md:px-6">
              <p
                className="text-center text-[24px] font-semibold text-[var(--popup-footer-text)] md:text-[27px]"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                Size Tips
              </p>

              <ul
                className="mt-3 space-y-2 text-[16px] leading-[1.65] text-[var(--popup-subtext)] md:text-[18px]"
                style={{ fontFamily: "var(--font-poppins), sans-serif" }}
              >
                <li>- For a clean, true fit: go with your usual size.</li>
                <li>- For a roomier silhouette: size up one step.</li>
                <li>- For a closer, sharper fit: size down one step.</li>
              </ul>
            </div>

            <p
              className="mx-auto mt-8 max-w-2xl text-[17px] font-medium leading-[1.75] text-[var(--popup-subtext)] md:text-[19px]"
              style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            >
              Because each piece is prepared with care, choosing the right size helps reduce waste and
              ensures you get the fit that feels best on you.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-[26px] border border-[var(--gold)]/30 bg-[var(--popup-card)] shadow-[0_22px_52px_rgba(0,0,0,0.34)] backdrop-blur">
            <div className="border-b border-[var(--gold)]/20 bg-[var(--popup-inner)] px-5 py-4 md:px-8">
              <p
                className="text-[24px] font-semibold text-[var(--popup-footer-text)] md:text-[30px]"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                Garment Measurements (Inches)
              </p>
              <p
                className="mt-1 text-[13px] text-[var(--popup-subtext)] md:text-[14px]"
                style={{ fontFamily: "var(--font-poppins), sans-serif" }}
              >
                Garment measured flat. For best accuracy, compare with a similar piece laid flat.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
                <thead>
                  <tr className="bg-[var(--popup-header-cell)] text-[var(--popup-footer-text)]">
                    {SIZE_HEADERS.map((header) => (
                      <th key={header} className="border-b border-[var(--gold)]/20 px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.12em] md:px-6">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SIZE_ROWS.map((row) => (
                    <tr key={row[0]} className="odd:bg-[var(--popup-row-cell)] even:bg-[var(--popup-inner)]">
                      {row.map((cell, index) => (
                        <td
                          key={`${row[0]}-${index}`}
                          className="border-b border-[var(--gold)]/15 px-5 py-3 text-[14px] font-medium text-[var(--popup-subtext)] md:px-6 md:text-[15px]"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-5xl rounded-[26px] border border-[var(--gold)]/30 bg-[image:var(--popup-gradient)] px-5 py-6 shadow-[0_20px_46px_rgba(0,0,0,0.32)] md:px-8 md:py-8">
            <p
              className="text-center text-[28px] font-semibold text-[var(--popup-footer-text)] md:text-[36px]"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              How To Measure
            </p>
            <p
              className="mx-auto mt-2 max-w-2xl text-center text-[14px] text-[var(--popup-subtext)] md:text-[15px]"
              style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            >
              Lay your garment flat on a surface and use a measuring tape. Match these points with the table above.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--popup-inner)] p-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gold)] text-[#3a0810]">
                  <MoveHorizontal className="h-4 w-4" />
                </span>
                <p
                  className="mt-3 text-[22px] font-semibold text-[var(--popup-footer-text)]"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  Bust / Chest
                </p>
                <p
                  className="mt-1 text-[14px] leading-[1.6] text-[var(--popup-subtext)]"
                  style={{ fontFamily: "var(--font-poppins), sans-serif" }}
                >
                  Measure straight across from underarm to underarm. Double this number for full body circumference.
                </p>
              </article>

              <article className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--popup-inner)] p-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gold)] text-[#3a0810]">
                  <ArrowDownUp className="h-4 w-4" />
                </span>
                <p
                  className="mt-3 text-[22px] font-semibold text-[var(--popup-footer-text)]"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  Length
                </p>
                <p
                  className="mt-1 text-[14px] leading-[1.6] text-[var(--popup-subtext)]"
                  style={{ fontFamily: "var(--font-poppins), sans-serif" }}
                >
                  Start at the highest shoulder point near the collar and measure down to the bottom hem.
                </p>
              </article>

              <article className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--popup-inner)] p-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gold)] text-[#3a0810]">
                  <Ruler className="h-4 w-4" />
                </span>
                <p
                  className="mt-3 text-[22px] font-semibold text-[var(--popup-footer-text)]"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  Across Shoulder
                </p>
                <p
                  className="mt-1 text-[14px] leading-[1.6] text-[var(--popup-subtext)]"
                  style={{ fontFamily: "var(--font-poppins), sans-serif" }}
                >
                  Measure from one shoulder seam to the other across the upper back panel of the garment.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <Newsletter />
      <FeedbackPill />
    </main>
  );
}
