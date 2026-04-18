"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AccountProfile = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
};

type AccountOrderItem = {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type AccountOrder = {
  id: string;
  createdAt: string;
  totalAmount: number;
  currencyCode: string;
  status: "paid" | "pending" | "failed";
  paymentId?: string;
  items: AccountOrderItem[];
};

type SignInPayload = {
  email: string;
  fullName?: string;
};

type AccountState = {
  isSignedIn: boolean;
  profile: AccountProfile;
  orders: AccountOrder[];
  signIn: (payload: SignInPayload) => void;
  signOut: () => void;
  updateProfile: (payload: Partial<AccountProfile>) => void;
  addOrder: (order: AccountOrder) => void;
};

const defaultProfile: AccountProfile = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      isSignedIn: false,
      profile: defaultProfile,
      orders: [],
      signIn: ({ email, fullName }) =>
        set((state) => ({
          isSignedIn: true,
          profile: {
            ...state.profile,
            email,
            fullName: fullName ?? state.profile.fullName,
          },
        })),
      signOut: () =>
        set((state) => ({
          isSignedIn: false,
          profile: {
            ...state.profile,
            email: "",
          },
        })),
      updateProfile: (payload) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...payload,
          },
        })),
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),
    }),
    {
      name: "firaangi-account-store",
      partialize: (state) => ({
        isSignedIn: state.isSignedIn,
        profile: state.profile,
        orders: state.orders,
      }),
    }
  )
);
