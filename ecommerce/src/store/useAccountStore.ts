"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccountOrder, AccountProfile } from "@/lib/account-data";

type AccountSessionPayload = {
  profile: AccountProfile;
  orders: AccountOrder[];
};

type AccountState = {
  isLoading: boolean;
  isSignedIn: boolean;
  profile: AccountProfile;
  orders: AccountOrder[];
  setLoading: (isLoading: boolean) => void;
  setSession: (payload: AccountSessionPayload) => void;
  clearSession: () => void;
  updateProfile: (payload: Partial<AccountProfile>) => void;
  upsertOrder: (order: AccountOrder) => void;
};

const defaultProfile: AccountProfile = {
  fullName: "",
  email: "",
  avatarUrl: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  authProvider: "google",
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      isLoading: true,
      isSignedIn: false,
      profile: defaultProfile,
      orders: [],
      setLoading: (isLoading) => set({ isLoading }),
      setSession: ({ profile, orders }) =>
        set({
          isLoading: false,
          isSignedIn: true,
          profile,
          orders,
        }),
      clearSession: () =>
        set({
          isLoading: false,
          isSignedIn: false,
          profile: defaultProfile,
          orders: [],
        }),
      updateProfile: (payload) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...payload,
          },
        })),
      upsertOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders.filter((current) => current.id !== order.id)],
        })),
    }),
    {
      name: "Firaang-account-store",
      partialize: (state) => ({
        isLoading: false,
        isSignedIn: state.isSignedIn,
        profile: state.profile,
        orders: state.orders,
      }),
    }
  )
);
