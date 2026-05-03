"use client";

import { create } from "zustand";

export type ToastVariant = "success" | "info" | "warning" | "error";

type ToastMessage = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastOptions = {
  variant?: ToastVariant;
  durationMs?: number;
};

type UiState = {
  isCartOpen: boolean;
  isWishlistOpen: boolean;
  isSearchOpen: boolean;
  isUserMenuOpen: boolean;
  isFeedbackOpen: boolean;
  isAccountModalOpen: boolean;
  language: "EN" | "HI";
  currency: "INR" | "USD" | "AED";
  toasts: ToastMessage[];
  openCart: () => void;
  closeCart: () => void;
  openWishlist: () => void;
  closeWishlist: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleUserMenu: () => void;
  closeUserMenu: () => void;
  openFeedback: () => void;
  closeFeedback: () => void;
  openAccountModal: () => void;
  closeAccountModal: () => void;
  setLanguage: (language: "EN" | "HI") => void;
  setCurrency: (currency: "INR" | "USD" | "AED") => void;
  pushToast: (message: string, options?: ToastOptions | number) => void;
  dismissToast: (id: number) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isCartOpen: false,
  isWishlistOpen: false,
  isSearchOpen: false,
  isUserMenuOpen: false,
  isFeedbackOpen: false,
  isAccountModalOpen: false,
  language: "EN",
  currency: "INR",
  toasts: [],
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  openWishlist: () => set({ isWishlistOpen: true }),
  closeWishlist: () => set({ isWishlistOpen: false }),
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  toggleUserMenu: () => set((state) => ({ isUserMenuOpen: !state.isUserMenuOpen })),
  closeUserMenu: () => set({ isUserMenuOpen: false }),
  openFeedback: () => set({ isFeedbackOpen: true }),
  closeFeedback: () => set({ isFeedbackOpen: false }),
  openAccountModal: () => set({ isAccountModalOpen: true }),
  closeAccountModal: () => set({ isAccountModalOpen: false }),
  setLanguage: (language) => set({ language }),
  setCurrency: (currency) => set({ currency }),
  pushToast: (message, options) => {
    const normalizedOptions = typeof options === "number" ? { durationMs: options } : options ?? {};
    const durationMs = normalizedOptions.durationMs ?? 2200;
    const variant = normalizedOptions.variant ?? "info";
    const id = Date.now() + Math.floor(Math.random() * 1000);

    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, durationMs);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
