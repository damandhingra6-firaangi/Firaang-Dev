"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GridProduct } from "@/lib/catalog";

type CartItem = {
  product: GridProduct;
  quantity: number;
};

type ShopState = {
  wishlist: Record<string, GridProduct>;
  cart: Record<string, CartItem>;
  toggleWishlist: (product: GridProduct) => void;
  addToCart: (product: GridProduct) => void;
  moveWishlistItemToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      wishlist: {},
      cart: {},
      toggleWishlist: (product) =>
        set((state) => {
          const nextWishlist = { ...state.wishlist };

          if (nextWishlist[product.id]) {
            delete nextWishlist[product.id];
          } else {
            nextWishlist[product.id] = product;
          }

          return { wishlist: nextWishlist };
        }),
      addToCart: (product) =>
        set((state) => {
          const existing = state.cart[product.id];

          return {
            cart: {
              ...state.cart,
              [product.id]: {
                product,
                quantity: existing ? existing.quantity + 1 : 1,
              },
            },
          };
        }),
      moveWishlistItemToCart: (productId) =>
        set((state) => {
          const product = state.wishlist[productId];

          if (!product) {
            return state;
          }

          const existing = state.cart[product.id];
          const nextWishlist = { ...state.wishlist };
          delete nextWishlist[product.id];

          return {
            wishlist: nextWishlist,
            cart: {
              ...state.cart,
              [product.id]: {
                product,
                quantity: existing ? existing.quantity + 1 : 1,
              },
            },
          };
        }),
      removeFromCart: (productId) =>
        set((state) => {
          const nextCart = { ...state.cart };
          delete nextCart[productId];
          return { cart: nextCart };
        }),
      updateCartQuantity: (productId, quantity) =>
        set((state) => {
          if (!state.cart[productId]) {
            return state;
          }

          if (quantity <= 0) {
            const nextCart = { ...state.cart };
            delete nextCart[productId];
            return { cart: nextCart };
          }

          return {
            cart: {
              ...state.cart,
              [productId]: {
                ...state.cart[productId],
                quantity,
              },
            },
          };
        }),
      clearCart: () => set({ cart: {} }),
    }),
    {
      name: "Firaang-shop-store",
      partialize: (state) => ({
        wishlist: state.wishlist,
        cart: state.cart,
      }),
    }
  )
);

export function getWishlistIds(wishlist: Record<string, GridProduct>) {
  return new Set(Object.keys(wishlist));
}

export function getWishlistItems(wishlist: Record<string, GridProduct>) {
  return Object.values(wishlist);
}

export function getCartItems(cart: Record<string, CartItem>) {
  return Object.values(cart);
}

export function getCartCount(cart: Record<string, CartItem>) {
  return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal(cart: Record<string, CartItem>) {
  return Object.values(cart).reduce((sum, item) => {
    if (Number.isNaN(item.product.priceAmount)) {
      return sum;
    }

    return sum + item.product.priceAmount * item.quantity;
  }, 0);
}
