"use client";

import Link from "next/link";
import { ClipboardList, Heart, LogIn, LogOut, MapPinHouse, UserCircle2, X } from "lucide-react";

type AccountView = "signin" | "profile" | "orders";

type AccountQuickActionsSheetProps = {
  isOpen: boolean;
  isSignedIn: boolean;
  displayName: string;
  contactDetail: string;
  onClose: () => void;
  onNavigateToAccount: (view: AccountView) => void;
  onOpenWishlist: () => void;
  onSignOut: () => void;
};

export default function AccountQuickActionsSheet({
  isOpen,
  isSignedIn,
  displayName,
  contactDetail,
  onClose,
  onNavigateToAccount,
  onOpenWishlist,
  onSignOut,
}: AccountQuickActionsSheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/55 md:hidden" onClick={onClose}>
      <section
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[#d9d9de] bg-white px-4 pb-5 pt-4 shadow-[0_-14px_36px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#ff3f6c]">Account</p>
            <h3 className="mt-1 text-lg font-semibold text-[#282c3f]">
              {isSignedIn ? `Hello ${displayName.split(/\s+/)[0] || displayName}` : "Welcome"}
            </h3>
            {contactDetail ? <p className="text-sm text-[#535766]">{contactDetail}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account quick actions"
            className="rounded-full p-2 text-[#282c3f] transition hover:bg-[#f3f3f6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isSignedIn ? (
          <button
            type="button"
            onClick={() => onNavigateToAccount("signin")}
            className="mb-3 inline-flex w-full items-center justify-center border border-[#d4d5d9] px-3 py-2 text-[14px] font-semibold uppercase tracking-[0.04em] text-[#ff3f6c]"
          >
            Login / Sign Up
          </button>
        ) : null}

        <div className="space-y-2">
          {!isSignedIn ? (
            <button
              type="button"
              onClick={() => onNavigateToAccount("signin")}
              className="flex w-full items-center gap-3 rounded-xl border border-[#e2e3e8] bg-[#fafafc] px-3 py-3 text-left text-sm text-[#282c3f] transition hover:border-[#ff3f6c]/45"
            >
              <LogIn className="h-4 w-4 text-[#ff3f6c]" />
              Login or Signup
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onNavigateToAccount("profile")}
            className="flex w-full items-center gap-3 rounded-xl border border-[#e2e3e8] bg-[#fafafc] px-3 py-3 text-left text-sm text-[#282c3f] transition hover:border-[#ff3f6c]/45"
          >
            <UserCircle2 className="h-4 w-4 text-[#ff3f6c]" />
            My Profile
          </button>

          <button
            type="button"
            onClick={() => onNavigateToAccount("orders")}
            className="flex w-full items-center gap-3 rounded-xl border border-[#e2e3e8] bg-[#fafafc] px-3 py-3 text-left text-sm text-[#282c3f] transition hover:border-[#ff3f6c]/45"
          >
            <ClipboardList className="h-4 w-4 text-[#ff3f6c]" />
            Orders
          </button>

          <button
            type="button"
            onClick={onOpenWishlist}
            className="flex w-full items-center gap-3 rounded-xl border border-[#e2e3e8] bg-[#fafafc] px-3 py-3 text-left text-sm text-[#282c3f] transition hover:border-[#ff3f6c]/45"
          >
            <Heart className="h-4 w-4 text-[#ff3f6c]" />
            Wishlist
          </button>

          <button
            type="button"
            onClick={() => onNavigateToAccount("profile")}
            className="flex w-full items-center gap-3 rounded-xl border border-[#e2e3e8] bg-[#fafafc] px-3 py-3 text-left text-sm text-[#282c3f] transition hover:border-[#ff3f6c]/45"
          >
            <MapPinHouse className="h-4 w-4 text-[#ff3f6c]" />
            Saved Addresses
          </button>

          <Link
            href="/contact"
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-xl border border-[#e2e3e8] bg-[#fafafc] px-3 py-3 text-left text-sm text-[#282c3f] transition hover:border-[#ff3f6c]/45"
          >
            <MapPinHouse className="h-4 w-4 text-[#ff3f6c]" />
            Contact Us
          </Link>

          {isSignedIn ? (
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-xl border border-[#ffd2df] bg-[#fff4f8] px-3 py-3 text-left text-sm text-[#282c3f] transition hover:border-[#ff3f6c]/55"
            >
              <LogOut className="h-4 w-4 text-[#ff3f6c]" />
              Logout
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
