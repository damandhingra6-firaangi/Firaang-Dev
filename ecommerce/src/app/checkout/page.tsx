import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CheckoutClient from "@/app/checkout/CheckoutClient";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Checkout",
  description: "Complete your purchase securely on Firaang checkout.",
  path: "/checkout",
  noIndex: true,
});

export default function CheckoutPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <CheckoutClient />
    </main>
  );
}
