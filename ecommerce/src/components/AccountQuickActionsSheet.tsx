"use client";

import { ClipboardList, LogIn, LogOut, UserCircle2, X } from "lucide-react";

type AccountView = "signin" | "profile" | "orders";

type AccountQuickActionsSheetProps = {
  isOpen: boolean;
  isSignedIn: boolean;
  onClose: () => void;
  onSelectView: (view: AccountView) => void;
  onSignOut: () => void;
};

export default function AccountQuickActionsSheet({
  isOpen,
  isSignedIn,
  onClose,
  onSelectView,
  onSignOut,
}: AccountQuickActionsSheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/55 md:hidden" onClick={onClose}>
      <section
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--gold)]/40 bg-[var(--panel-bg)] px-4 pb-5 pt-4 shadow-[0_-14px_36px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">Account</p>
            <h3 className="mt-1 text-lg text-[var(--page-fg)]">Quick Actions</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account quick actions"
            className="rounded-full p-2 text-[var(--page-fg)] transition hover:bg-[var(--popup-hover2)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onSelectView("signin")}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--gold)]/30 bg-[var(--popup-inner)] px-3 py-3 text-left text-sm text-[var(--popup-footer-text)] transition hover:border-[var(--gold)]/65"
          >
            <LogIn className="h-4 w-4 text-[var(--gold)]" />
            {isSignedIn ? "Switch Account" : "Login or Signup"}
          </button>

          <button
            type="button"
            onClick={() => onSelectView("profile")}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--gold)]/30 bg-[var(--popup-inner)] px-3 py-3 text-left text-sm text-[var(--popup-footer-text)] transition hover:border-[var(--gold)]/65"
          >
            <UserCircle2 className="h-4 w-4 text-[var(--gold)]" />
            My Profile
          </button>

          <button
            type="button"
            onClick={() => onSelectView("orders")}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--gold)]/30 bg-[var(--popup-inner)] px-3 py-3 text-left text-sm text-[var(--popup-footer-text)] transition hover:border-[var(--gold)]/65"
          >
            <ClipboardList className="h-4 w-4 text-[var(--gold)]" />
            Orders
          </button>

          {isSignedIn ? (
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-xl border border-[var(--gold)]/30 bg-[var(--panel-signout)] px-3 py-3 text-left text-sm text-[var(--popup-footer-text)] transition hover:border-[var(--gold)]/55"
            >
              <LogOut className="h-4 w-4 text-[var(--gold)]" />
              Sign Out
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
