"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import SafeImage from "@/components/SafeImage";

const categories = [
  {
    name: "Sweatshirts",
    count: "85 Products",
    img: "/Sweatshirts.png",
    href: "/shop?category=sweatshirts",
  },
  {
    name: "T - Shirts",
    count: "80 Products",
    img: "/T-shirts.png",
    href: "/shop?category=t-shirts",
  },
  {
    name: "Hoodies",
    count: "50 Products",
    img: "/Hoodies.jpg",
    href: "/shop?category=accessories",
  },
  {
    name: "Cap",
    count: "100 Products",
    img: "/Cap.png",
    href: "/shop?category=accessories",
  },
];

export default function Category() {
  const railRef = useRef<HTMLDivElement | null>(null);

  const scrollRail = (direction: "left" | "right") => {
    if (!railRef.current) {
      return;
    }

    const cardWidth = 336;
    const gap = 16;
    const offset = cardWidth + gap;
    railRef.current.scrollBy({
      left: direction === "left" ? -offset : offset,
      behavior: "smooth",
    });
  };

  return (
    <section className="border-t border-[#d9d9d9] bg-[#f3f3f3] py-10 md:py-14">
      <div className="home-shell">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-10">
          <div>
            <p className="font-sans text-[11px] font-medium uppercase tracking-[0.06em] text-[#2b2b2b] sm:text-[13px]">THE CORE SERIES</p>
            <h2 className="mt-1 font-sans text-[50px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#000000] sm:text-[44px] sm:leading-[1.08] sm:tracking-[-0.01em] md:text-[52px]">
              Shop By Category
            </h2>
          </div>

          <Link
            href="/shop"
            className="inline-flex h-[40px] min-w-[132px] items-center justify-center self-start rounded-[5px] border border-[#555555] px-5 font-sans text-[14px] font-medium uppercase tracking-[0.04em] text-[#303030] transition hover:bg-white sm:min-w-[154px] sm:self-auto sm:px-7 sm:text-[16px] sm:tracking-[0.01em]"
          >
            VIEW ALL
          </Link>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="View previous categories"
            onClick={() => scrollRail("left")}
            className="absolute -left-10 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1f1f1f] shadow-[0_2px_10px_rgba(0,0,0,0.14)] transition hover:bg-[#f7f7f7] xl:inline-flex"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div
            ref={railRef}
            className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
            style={{ scrollbarWidth: "none" }}
          >
            {categories.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="group relative h-[368px] w-[calc(100vw-2rem)] shrink-0 snap-center overflow-hidden rounded-[16px] bg-[#d9d9d9] sm:h-[410px] sm:w-[320px] sm:snap-start xl:w-[calc((100%-48px)/4)]"
              >
                <SafeImage
                  src={category.img}
                  alt={category.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white md:p-6">
                  <div>
                    <p className="font-sans text-[38px] font-semibold leading-[0.95] tracking-[-0.02em] sm:text-[30px] sm:leading-[1] sm:tracking-[-0.01em] md:text-[35px]">{category.name}</p>
                    {/* <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.04em] text-white/80">{category.count}</p> */}
                  </div>

                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition duration-300 group-hover:bg-[#ED467A] group-hover:scale-110 group-hover:shadow-[0_0_0_3px_rgba(237,70,122,0.35)] group-hover:text-white">
                    <ArrowUpRight className="h-5 w-5 transition duration-300 group-hover:rotate-45" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <button
            type="button"
            aria-label="View more categories"
            onClick={() => scrollRail("right")}
            className="absolute -right-10 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1f1f1f] shadow-[0_2px_10px_rgba(0,0,0,0.14)] transition hover:bg-[#f7f7f7] xl:inline-flex"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </section>
  );
}