import Navbar from "@/components/Navbar";
import AccountModal from "@/components/AccountModal";
import Link from "next/link";
import { BookMarked, CreditCard, Heart, MapPin, Package, User } from "lucide-react";

type AccountPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

function toInitialView(tab?: string): "signin" | "profile" | "orders" {
  const normalized = (tab ?? "").trim().toLowerCase();

  if (normalized === "overview") {
    return "profile";
  }

  if (normalized === "orders") {
    return "orders";
  }

  if (normalized === "profile") {
    return "profile";
  }

  return "signin";
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      <Navbar />
      <div className="h-24 md:h-28" />
      <section className="section-shell pb-12 pt-6 md:pb-16 md:pt-8">
        <div className="mb-6 md:mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3f6c]">Account</p>
          <h1 className="mt-1.5 text-3xl font-semibold text-[#1f2430] md:text-4xl">Manage Your Profile</h1>
          <p className="mt-2 text-sm text-[#6b7280]">View personal details, orders, addresses, wishlist, and more.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="rounded-2xl border border-[#e6e8f0] bg-white p-4 shadow-sm">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Account Menu</p>
              <nav className="space-y-0.5 text-sm">
                <Link href="/account?tab=overview" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium text-[#1f2430] transition hover:bg-[#f7f8fc] hover:text-[#ff3f6c]">
                  <User className="h-4 w-4 shrink-0" /> Personal Information
                </Link>
                <Link href="/account?tab=profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium text-[#1f2430] transition hover:bg-[#f7f8fc] hover:text-[#ff3f6c]">
                  <BookMarked className="h-4 w-4 shrink-0" /> Profile Details
                </Link>
                <Link href="/account?tab=orders" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium text-[#1f2430] transition hover:bg-[#f7f8fc] hover:text-[#ff3f6c]">
                  <Package className="h-4 w-4 shrink-0" /> Orders
                </Link>
                <Link href="/account?tab=profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium text-[#1f2430] transition hover:bg-[#f7f8fc] hover:text-[#ff3f6c]">
                  <MapPin className="h-4 w-4 shrink-0" /> Saved Addresses
                </Link>
                <Link href="/shop" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium text-[#1f2430] transition hover:bg-[#f7f8fc] hover:text-[#ff3f6c]">
                  <Heart className="h-4 w-4 shrink-0" /> Wishlist
                </Link>
                <Link href="/account?tab=profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium text-[#1f2430] transition hover:bg-[#f7f8fc] hover:text-[#ff3f6c]">
                  <CreditCard className="h-4 w-4 shrink-0" /> Saved Payment Methods
                </Link>
              </nav>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              <Link href="/account?tab=profile" className="flex items-start gap-3 rounded-2xl border border-[#e6e8f0] bg-white p-4 text-sm shadow-sm transition hover:border-[#ff3f6c]/30 hover:shadow-md">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#ff3f6c]" />
                <div>
                  <p className="font-semibold text-[#1f2430]">Saved Addresses</p>
                  <p className="mt-0.5 text-xs text-[#9ca3af]">Manage shipping addresses for faster checkout.</p>
                </div>
              </Link>
              <Link href="/shop" className="flex items-start gap-3 rounded-2xl border border-[#e6e8f0] bg-white p-4 text-sm shadow-sm transition hover:border-[#ff3f6c]/30 hover:shadow-md">
                <Heart className="mt-0.5 h-4 w-4 shrink-0 text-[#ff3f6c]" />
                <div>
                  <p className="font-semibold text-[#1f2430]">Wishlist</p>
                  <p className="mt-0.5 text-xs text-[#9ca3af]">Review saved products and move to bag.</p>
                </div>
              </Link>
              <Link href="/account?tab=profile" className="flex items-start gap-3 rounded-2xl border border-[#e6e8f0] bg-white p-4 text-sm shadow-sm transition hover:border-[#ff3f6c]/30 hover:shadow-md">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[#ff3f6c]" />
                <div>
                  <p className="font-semibold text-[#1f2430]">Payment Methods</p>
                  <p className="mt-0.5 text-xs text-[#9ca3af]">Keep payment preferences ready.</p>
                </div>
              </Link>
            </div>
          </aside>

          <div>
            <AccountModal
              isOpen={true}
              initialView={toInitialView(params?.tab)}
              mode="page"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
