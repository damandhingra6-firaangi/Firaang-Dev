"use client";

import { useEffect, useState } from "react";

const heroSlides = [
  {
    id: 1,
    image: "/hero.jpg",
    alt: "Model in red couture attire",
    eyebrow: "Luxury Clothing & Jewellery",
    title: ["Wear The World.", "Own The Style."],
  },
];

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);

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

  return (
    <section className="relative min-h-[90vh] w-full overflow-hidden pt-24 md:pt-28 lg:mt-24">
      <img
        src={activeSlide.image}
        alt={activeSlide.alt}
        className="absolute left-0 top-0 h-full w-full object-cover object-top"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-[#30070bcc] via-[#4f0f17c2] to-[#220406de]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(211,167,54,0.18),transparent_35%)]" />

      <div className="absolute inset-0 z-10 section-shell flex flex-col items-center justify-center text-center fade-in-up">
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-[var(--gold)] md:text-sm">
          {activeSlide.eyebrow}
        </p>

        <h1 className="mt-4 text-4xl font-bold leading-tight drop-shadow-2xl md:text-7xl">
          {activeSlide.title[0]} <br />
          {activeSlide.title[1]}
        </h1>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <button className="outline-button px-6 py-3">
            SHOP COLLECTION
          </button>
          <button className="gold-button px-6 py-3">
            EXPLORE JEWELLERY
          </button>
        </div>
      </div>

      {heroSlides.length > 1 ? (
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
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
    </section>
  );
}
