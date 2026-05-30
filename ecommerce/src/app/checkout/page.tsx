"use client";

import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";

export default function CheckoutPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen">
      <Navbar />
      <CartDrawer isOpen mode="page" onClose={() => router.push("/")} />
    </main>
  );
}
