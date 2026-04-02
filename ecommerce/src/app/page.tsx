// app/page.tsx

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Category from "@/components/Category";
import ProductGrid from "@/components/ProductGrid";
import SaleBanner from "@/components/SaleBanner";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Category />
      <ProductGrid />
      <SaleBanner />
    </>
  );
}