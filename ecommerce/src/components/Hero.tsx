"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import JewelleryComingSoonModal from "@/components/JewelleryComingSoonModal";

const heroSlides = [
  {
    id: 1,
    image: "/Home Page Banner.png",
    mobileImage: "/Mobile view_02.png",
    alt: "Model in red couture attire",
    eyebrow: "AUTUMN / WINTER 2026",
    title: ["Define Your", "Style With Firaang"],
  },
];

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % heroSlides.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeSlide = heroSlides[activeIndex];

  const handleShopCollection = () => {
    router.push("/shop?audience=girls");
  };

  const handleShopCollectionBoys = () => {
    router.push("/shop?audience=boys");
  };

  return (
    <section className="hero-section relative mt-[92px] min-h-[64vh] w-full overflow-hidden min-[401px]:min-h-[66vh] md:mt-[98px] md:min-h-[82vh] lg:min-h-[86vh]">
      <SafeImage
        src={activeSlide.mobileImage ?? activeSlide.image}
        alt={activeSlide.alt}
        className="absolute left-0 top-0 h-full w-full object-cover object-[50%_4%] max-[374px]:object-[50%_2%] min-[375px]:object-[50%_3%] min-[390px]:object-[50%_4%] min-[414px]:object-[50%_6%] md:hidden"
      />
      <SafeImage
        src={activeSlide.image}
        alt={activeSlide.alt}
        className="absolute left-0 top-0 hidden h-full w-full object-cover object-[50%_3%] md:block lg:object-[50%_7%] xl:object-[50%_10%]"
      />

      <div className="hero-overlay-primary absolute inset-0" />
      <div className="hero-overlay-glow absolute inset-0" />

      <div className="hero-content absolute inset-x-0 bottom-0 top-8 z-10 home-shell flex flex-col items-center justify-start pt-4 text-center fade-in-up md:inset-0 md:justify-center md:pt-0">
        <p className="hero-eyebrow font-sans text-[12px] font-medium uppercase tracking-[0.26em] text-[#f4f4f4] md:text-[16px] md:tracking-[0.22em]">
          {activeSlide.eyebrow}
        </p>

        <h1 className="hero-title mt-4 max-w-4xl font-sans text-[clamp(2.5rem,11vw,4.75rem)] font-semibold leading-[1.03] tracking-[-0.02em] md:mt-5 md:text-[clamp(4.4rem,6.8vw,6rem)] md:leading-[0.98]">
          {activeSlide.title[0]} <br />
          {activeSlide.title[1]}
        </h1>

        <p className="mt-4 max-w-[760px] font-sans text-[12px] font-medium leading-[1.5] text-[#f6f6f6] md:mt-6 md:text-[16px] md:leading-[1.35] lg:text-[18px]">
          Premium Clothing And Jewellery, Sculpted For Those Who Treat Their Wardrobe
          <br className="hidden md:block" />
          Like An Archive.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-2.5 md:mt-8 md:gap-4">
          <button
            type="button"
            onClick={handleShopCollection}
            className="inline-flex h-[42px] items-center justify-center rounded-[4px] border border-white bg-white px-6 font-sans text-[15px] font-medium uppercase tracking-[0.02em] text-[#222222] transition duration-200 hover:bg-[#f2f2f2]"
          >
            SHOP WOMEN
          </button>
          <button
            type="button"
            onClick={handleShopCollectionBoys}
            className="inline-flex h-[42px] items-center justify-center rounded-[4px] border border-white/85 bg-transparent px-6 font-sans text-[15px] font-medium uppercase tracking-[0.02em] text-white transition duration-200 hover:bg-white/15"
          >
            SHOP MEN
          </button>
        </div>
      </div>

      {heroSlides.length > 1 ? (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-3 md:bottom-8">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={index === activeIndex ? "text-[var(--gold)]" : "text-white/80"}
            >
              <span className="text-sm">◆</span>
            </button>
          ))}
        </div>
      ) : null}

      <JewelleryComingSoonModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />
    </section>
  );
}
