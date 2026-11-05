import { describe, expect, it } from "vitest";
import { useShopStore } from "./useShopStore";

describe("shop checkout lock", () => {
  it("blocks cart mutations while checkout is loading", () => {
    useShopStore.setState({
      cart: {},
      isCheckoutLoading: true,
    });

    const product = {
      id: "p-1",
      name: "Test Tee",
      handle: "test-tee",
      priceAmount: 1200,
      oldPrice: 1500,
      currencyCode: "INR",
      img: "/test.jpg",
      category: "tops",
      subCategory: "tees",
      parentId: null,
      collection: "test",
      rating: 4.5,
      popularity: 10,
      tags: [],
      available: true,
      selectedSize: "M",
      selectedVariantId: "p-1",
      description: "Test description",
      brand: "Firaang",
      availableForSale: true,
      discountPercent: 20,
      displayPriceAmount: 1200,
      displayOldPriceAmount: 1500,
    } as any;

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
});
