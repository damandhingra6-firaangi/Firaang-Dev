import Navbar from "@/components/Navbar";
import CheckoutClient from "@/app/checkout/CheckoutClient";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <CheckoutClient />
    </main>
  );
}
