import Navbar from "@/components/Navbar";
import AccountModal from "@/components/AccountModal";
import Link from "next/link";

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
    <main className="min-h-screen bg-[var(--page-bg)]">
      <Navbar />
      <div className="h-24 md:h-28" />
      <section className="section-shell pb-12 pt-6 md:pb-16 md:pt-8">
        <div className="mb-5 md:mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold)]">Account</p>
          <h1 className="mt-2 text-3xl text-[var(--page-fg)] md:text-4xl">Manage Your Profile</h1>
          <p className="mt-2 text-sm text-[var(--popup-subtext)]">View personal details, orders, addresses, wishlist, payment methods, and secure logout in one place.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-[#e5e7ee] bg-white p-4 shadow-[0_8px_24px_rgba(40,44,63,0.06)]">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#535766]">Account Menu</p>
            <nav className="space-y-1 text-sm text-[#282c3f]">
              <Link href="/account?tab=overview" className="block rounded-md px-2 py-2 hover:bg-[#f6f7fa] hover:text-[#ff3f6c]">Personal Information</Link>
              <Link href="/account?tab=profile" className="block rounded-md px-2 py-2 hover:bg-[#f6f7fa] hover:text-[#ff3f6c]">Profile Details</Link>
              <Link href="/account?tab=orders" className="block rounded-md px-2 py-2 hover:bg-[#f6f7fa] hover:text-[#ff3f6c]">Orders</Link>
              <Link href="/account?tab=profile" className="block rounded-md px-2 py-2 hover:bg-[#f6f7fa] hover:text-[#ff3f6c]">Saved Addresses</Link>
              <Link href="/shop" className="block rounded-md px-2 py-2 hover:bg-[#f6f7fa] hover:text-[#ff3f6c]">Wishlist</Link>
              <Link href="/account?tab=profile" className="block rounded-md px-2 py-2 hover:bg-[#f6f7fa] hover:text-[#ff3f6c]">Saved Payment Methods</Link>
            </nav>
          </aside>

          <div className="space-y-4">
            <AccountModal
              isOpen={true}
              initialView={toInitialView(params?.tab)}
              mode="page"
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/account?tab=profile" className="rounded-xl border border-[#e5e7ee] bg-white p-4 text-sm text-[#282c3f] shadow-[0_5px_20px_rgba(40,44,63,0.05)] transition hover:-translate-y-0.5 hover:border-[#ffc1d2]">
                <p className="font-semibold">Saved Addresses</p>
                <p className="mt-1 text-xs text-[#696e79]">Manage shipping addresses for faster checkout.</p>
              </Link>
              <Link href="/shop" className="rounded-xl border border-[#e5e7ee] bg-white p-4 text-sm text-[#282c3f] shadow-[0_5px_20px_rgba(40,44,63,0.05)] transition hover:-translate-y-0.5 hover:border-[#ffc1d2]">
                <p className="font-semibold">Wishlist</p>
                <p className="mt-1 text-xs text-[#696e79]">Review your saved products and move to bag.</p>
              </Link>
              <Link href="/account?tab=profile" className="rounded-xl border border-[#e5e7ee] bg-white p-4 text-sm text-[#282c3f] shadow-[0_5px_20px_rgba(40,44,63,0.05)] transition hover:-translate-y-0.5 hover:border-[#ffc1d2]">
                <p className="font-semibold">Saved Payment Methods</p>
                <p className="mt-1 text-xs text-[#696e79]">Keep payment preferences ready for quick purchases.</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
