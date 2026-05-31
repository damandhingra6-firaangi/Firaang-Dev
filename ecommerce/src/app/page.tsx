// app/page.tsx

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Category from "@/components/Category";
import RedRibbon from "@/components/RedRibbon";
import ProductGrid from "@/components/ProductGrid";
import SaleBanner from "@/components/SaleBanner";
import CuratedCollection from "@/components/CuratedCollection";
import SeasonShowcase from "@/components/SeasonShowcase";
import Testimonials from "@/components/Testimonials";
import FeaturedSection from "@/components/FeaturedSection";
import BottomCta from "@/components/BottomCta";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import { fallbackProducts } from "@/lib/catalog";
import { getStorefrontProducts } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export default async function Home() {
  const storefrontProducts = await getStorefrontProducts(10);
  const products = storefrontProducts.length > 0 ? storefrontProducts : fallbackProducts;

  return (
    <main>
      <Navbar />
      <Hero />
      <RedRibbon />
      {/* <Category /> */}
      <ProductGrid products={products} />
      {/* <SaleBanner /> */}
      {/* <CuratedCollection /> */}
      {/* <SeasonShowcase /> */}
      {/* <Testimonials /> */}
      {/* <FeaturedSection /> */}
      {/* <BottomCta /> */}
      <Newsletter />
      <FeedbackPill />
    </main>
  );
}