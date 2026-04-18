"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardList, LogOut, UserCircle2, UserRound, X } from "lucide-react";
import { useAccountStore } from "@/store/useAccountStore";
import { useUiStore } from "@/store/useUiStore";

type AccountView = "signin" | "profile" | "orders";

type AccountModalProps = {
  isOpen: boolean;
  initialView: AccountView;
  onClose: () => void;
};

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AccountModal({ isOpen, initialView, onClose }: AccountModalProps) {
  const isSignedIn = useAccountStore((state) => state.isSignedIn);
  const profile = useAccountStore((state) => state.profile);
  const orders = useAccountStore((state) => state.orders);
  const signIn = useAccountStore((state) => state.signIn);
  const signOut = useAccountStore((state) => state.signOut);
  const updateProfile = useAccountStore((state) => state.updateProfile);
  const pushToast = useUiStore((state) => state.pushToast);

  const [activeView, setActiveView] = useState<AccountView>(initialView);
  const [signInEmail, setSignInEmail] = useState(profile.email);
  const [signInPassword, setSignInPassword] = useState("");
  const [profileDraft, setProfileDraft] = useState(profile);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveView(initialView);
  }, [initialView, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSignInEmail(profile.email);
    setProfileDraft(profile);
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [isOpen, onClose]);

  const totalSpend = useMemo(
    () => orders.reduce((sum, order) => sum + order.totalAmount, 0),
    [orders]
  );

  const handleSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = signInEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      pushToast("Please enter your email", { variant: "warning" });
      return;
    }

    if (!signInPassword.trim()) {
      pushToast("Please enter your password", { variant: "warning" });
      return;
    }

    const fallbackName = normalizedEmail.split("@")[0] ?? "Firaangi Shopper";
    signIn({ email: normalizedEmail, fullName: profile.fullName || fallbackName });
    setSignInPassword("");
    setActiveView("profile");
    pushToast("Signed in successfully", { variant: "success" });
  };

  const handleProfileSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profileDraft.fullName.trim()) {
      pushToast("Please add your full name", { variant: "warning" });
      return;
    }

    if (!profileDraft.email.trim()) {
      pushToast("Please add your email", { variant: "warning" });
      return;
    }

    updateProfile({
      fullName: profileDraft.fullName.trim(),
      email: profileDraft.email.trim().toLowerCase(),
      phone: profileDraft.phone.trim(),
      address: profileDraft.address.trim(),
      city: profileDraft.city.trim(),
      state: profileDraft.state.trim(),
      pinCode: profileDraft.pinCode.trim(),
    });

    pushToast("Profile updated", { variant: "success" });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/65 px-4 py-10" onClick={onClose}>
      <section
        className="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-[var(--gold)]/50 bg-[#2b060b] shadow-2xl md:mt-14"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-[var(--gold)]/30 px-4 py-4 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Account</p>
            <h2 className="mt-1 text-2xl">Your Space</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account panel"
            className="rounded-full p-2 transition hover:bg-[#4a1118]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-[var(--gold)]/20 px-4 py-3 md:px-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveView("signin")}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition ${
                activeView === "signin" ? "bg-[var(--gold)] text-[#3b0810]" : "border border-[var(--gold)]/40 text-[var(--gold)]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveView("profile")}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition ${
                activeView === "profile" ? "bg-[var(--gold)] text-[#3b0810]" : "border border-[var(--gold)]/40 text-[var(--gold)]"
              }`}
            >
              My Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveView("orders")}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition ${
                activeView === "orders" ? "bg-[var(--gold)] text-[#3b0810]" : "border border-[var(--gold)]/40 text-[var(--gold)]"
              }`}
            >
              Orders
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {activeView === "signin" ? (
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div className="rounded-xl border border-[var(--gold)]/25 bg-[#3a0d14]/65 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm text-[#f1d8ce]">
                  <UserRound className="h-4 w-4 text-[var(--gold)]" />
                  Quick access to profile and order history
                </p>

                <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">Email</label>
                <input
                  type="email"
                  value={signInEmail}
                  onChange={(event) => setSignInEmail(event.target.value)}
                  className="mb-3 w-full rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  placeholder="you@example.com"
                />

                <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">Password</label>
                <input
                  type="password"
                  value={signInPassword}
                  onChange={(event) => setSignInPassword(event.target.value)}
                  className="w-full rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  placeholder="Enter password"
                />

                <button type="submit" className="gold-button mt-4 w-full">
                  Continue
                </button>
              </div>
            </form>
          ) : null}

          {activeView === "profile" ? (
            isSignedIn ? (
              <form className="grid gap-3 md:grid-cols-2" onSubmit={handleProfileSave}>
                <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-[var(--gold)]/25 bg-[#3a0d14]/65 p-4">
                  <p className="flex items-center gap-2 text-sm text-[#f1d8ce]">
                    <UserCircle2 className="h-4 w-4 text-[var(--gold)]" />
                    Signed in as {profile.email}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      pushToast("Signed out", { variant: "info" });
                      setActiveView("signin");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--gold)]/35 px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-[var(--gold)] transition hover:bg-[#4a1118]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">Full Name</label>
                  <input
                    type="text"
                    value={profileDraft.fullName}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">Email</label>
                  <input
                    type="email"
                    value={profileDraft.email}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">Phone</label>
                  <input
                    type="tel"
                    value={profileDraft.phone}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">City</label>
                  <input
                    type="text"
                    value={profileDraft.city}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, city: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">State</label>
                  <input
                    type="text"
                    value={profileDraft.state}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, state: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">PIN Code</label>
                  <input
                    type="text"
                    value={profileDraft.pinCode}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, pinCode: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-[#f2d7c3]">Address</label>
                  <textarea
                    value={profileDraft.address}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, address: event.target.value }))}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-[var(--gold)]/35 bg-[#3a0d14] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--gold)]"
                  />
                </div>

                <div className="md:col-span-2">
                  <button type="submit" className="gold-button w-full md:w-auto">
                    Save Profile
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-[var(--gold)]/25 bg-[#3a0d14]/65 p-4 text-center">
                <p className="text-sm text-[#f1d8ce]">Please sign in to view and edit your profile details.</p>
                <button
                  type="button"
                  onClick={() => setActiveView("signin")}
                  className="gold-button mt-4"
                >
                  Go To Sign In
                </button>
              </div>
            )
          ) : null}

          {activeView === "orders" ? (
            isSignedIn ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--gold)]/25 bg-[#3a0d14]/65 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm text-[#f1d8ce]">
                    <ClipboardList className="h-4 w-4 text-[var(--gold)]" />
                    Total orders: {orders.length}
                  </p>
                  <p className="text-sm text-[#eac26a]">Lifetime spend: {formatCurrency(totalSpend, "INR")}</p>
                </div>

                {orders.length === 0 ? (
                  <div className="rounded-xl border border-[var(--gold)]/25 bg-[#3a0d14]/65 p-4 text-sm text-[#f1d8ce]">
                    No orders yet. Complete checkout to see your order history here.
                  </div>
                ) : (
                  orders.map((order) => (
                    <article key={order.id} className="rounded-xl border border-[var(--gold)]/30 bg-[#3a0d14]/65 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--gold)]/20 pb-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-[var(--gold)]">Order #{order.id.slice(-8)}</p>
                          <p className="text-xs text-[#d7bbb5]">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#f3ddd8]">{formatCurrency(order.totalAmount, order.currencyCode)}</p>
                          <p className="text-xs uppercase tracking-[0.12em] text-emerald-300">{order.status}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={`${order.id}-${item.productId}`} className="flex items-center gap-3">
                            <img src={item.image} alt={item.name} className="h-12 w-12 rounded-md object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-white">{item.name}</p>
                              <p className="text-xs text-[#d7bbb5]">Qty {item.quantity}</p>
                            </div>
                            <p className="text-sm text-[#eac26a]">{formatCurrency(item.lineTotal, order.currencyCode)}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--gold)]/25 bg-[#3a0d14]/65 p-4 text-center">
                <p className="text-sm text-[#f1d8ce]">Please sign in to view your orders.</p>
                <button
                  type="button"
                  onClick={() => setActiveView("signin")}
                  className="gold-button mt-4"
                >
                  Go To Sign In
                </button>
              </div>
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}
