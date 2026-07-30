"use client";

import { useRouter } from "next/navigation";
import CartDrawer from "@/components/CartDrawer";

export default function CheckoutClient() {
  const router = useRouter();

  return <CartDrawer isOpen mode="page" onClose={() => router.push("/")} />;
}
