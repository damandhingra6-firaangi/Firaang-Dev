import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Newsletter from "@/components/Newsletter";
import FeedbackPill from "@/components/FeedbackPill";
import OrderSuccessContent from "@/components/OrderSuccessContent";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Order Confirmed",
  description: "Your order confirmation page.",
  path: "/order-success",
  noIndex: true,
});

export default async function OrderSuccessPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  return (
    <main className="min-h-screen bg-[#f7f4f1]">
      <Navbar />
      <section className="section-shell pb-12 pt-[132px] md:pt-[150px]">
        <OrderSuccessContent orderId={decodeURIComponent(orderId ?? "").trim()} />
      </section>
      <Newsletter />
      <FeedbackPill />
    </main>
  );
}
