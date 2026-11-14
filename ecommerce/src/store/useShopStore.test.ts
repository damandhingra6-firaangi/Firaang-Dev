import { describe, expect, it } from "vitest";
import type { GridProduct } from "@/lib/catalog";
import { useShopStore } from "./useShopStore";

const product: GridProduct = {
  id: "p-1",
  name: "Test Tee",
  handle: "test-tee",
  price: "1200",
  priceAmount: 1200,
  oldPrice: "1500",
  currencyCode: "INR",
  img: "/test.jpg",
  category: "tops",
  subCategory: "tees",
  selectedSize: "M",
  selectedVariantId: "p-1",
  description: "Test description",
};

describe("shop checkout lock", () => {
  it("blocks cart mutations while checkout is loading", () => {
    useShopStore.setState({
      cart: {},
      isCheckoutLoading: true,
    });

    useShopStore.getState().addToCart(product);
    useShopStore.getState().updateCartQuantity("p-1", 2);
    useShopStore.getState().removeFromCart("p-1");

    expect(useShopStore.getState().cart).toEqual({});
  });

  it("allows lock/release toggling via the shared store state", () => {
    useShopStore.setState({ cart: {}, isCheckoutLoading: false });

    useShopStore.getState().setCheckoutLoading(true);
    expect(useShopStore.getState().isCheckoutLoading).toBe(true);

    useShopStore.getState().setCheckoutLoading(false);
    expect(useShopStore.getState().isCheckoutLoading).toBe(false);
  });

  it("allows clearing the cart after payment success even while checkout is locked", () => {
    useShopStore.setState({
      cart: {
        "p-1": {
          product,
          quantity: 1,
        },
      },
      isCheckoutLoading: true,
    });

    useShopStore.getState().clearCart(true);

    expect(useShopStore.getState().cart).toEqual({});
    expect(useShopStore.getState().isCheckoutLoading).toBe(true);
  });
});
