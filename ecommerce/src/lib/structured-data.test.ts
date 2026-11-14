import { describe, expect, it } from "vitest";
import type { GridProduct } from "./catalog";
import { buildProductSchema } from "./structured-data";

describe("product structured data", () => {
  it("omits product sku when no real Shopify SKU is available and includes valid merchant and shipping policy details", async () => {
    const product: GridProduct = {
      id: "gid://shopify/Product/123456789012345",
      handle: "rose-gold-rimmed-sculpted-glass-tote",
      name: "Rose Gold Rimmed Sculpted Glass Tote",
      description: "Handcrafted statement tote for festive gifting.",
      price: "₹2,499",
      priceAmount: 2499,
      currencyCode: "INR",
      oldPrice: "₹3,499",
      img: "/images/test-product.jpg",
      variants: [
        {
          id: "gid://shopify/ProductVariant/123456789012345",
          name: "Default",
          availableForSale: true,
          img: "/images/test-product.jpg",
          price: "₹2,499",
          priceAmount: 2499,
          currencyCode: "INR",
          oldPrice: "₹3,499",
          options: [],
        },
      ],
    };

    const schema = await buildProductSchema(product, "https://firaang.com/products/rose-gold-rimmed-sculpted-glass-tote");

    expect(schema).not.toHaveProperty("sku");
    expect(schema.aggregateRating).toMatchObject({
      "@type": "AggregateRating",
      ratingValue: expect.any(Number),
      reviewCount: expect.any(Number),
    });
    expect(Array.isArray(schema.review)).toBe(true);
    expect(schema.offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    });
    expect(schema.offers.shippingDetails).toMatchObject({
      "@type": "OfferShippingDetails",
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "IN",
      },
      shippingRate: {
        "@type": "MonetaryAmount",
        currency: "INR",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        transitTime: {
          "@type": "QuantitativeValue",
          unitCode: "DAY",
        },
      },
    });
    expect(schema.offers.hasMerchantReturnPolicy).toMatchObject({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      merchantReturnLink: expect.stringMatching(/^https?:\/\/[^/]+\/pod-policy$/),
      description: expect.stringContaining("within 5 days of delivery"),
    });
    expect(schema.offers.hasMerchantReturnPolicy).not.toHaveProperty("returnShippingFeesAmount");
    expect(schema.offers.hasMerchantReturnPolicy).not.toHaveProperty("returnFees");
    expect(schema.offers.hasMerchantReturnPolicy).not.toHaveProperty("returnMethod");
    expect(schema.offers.hasMerchantReturnPolicy).not.toHaveProperty("merchantReturnDays");
    expect(schema.offers.shippingDetails).not.toHaveProperty("applicableRegion");
  });

  it.each([
    { handle: "printed-t-shirt", priceAmount: 799, currencyCode: "INR", availableForSale: true },
    { handle: "printed-hoodie", priceAmount: 2499, currencyCode: "INR", availableForSale: false },
    { handle: "printed-tote", priceAmount: 1299, currencyCode: "INR", availableForSale: true },
    { handle: "alternate-currency", priceAmount: 29, currencyCode: "USD", availableForSale: true },
  ])("serializes the same policy without invented fees for $handle", async ({ handle, priceAmount, currencyCode, availableForSale }) => {
    const product: GridProduct = {
      id: handle,
      handle,
      name: handle,
      description: "Made-to-order printed product.",
      oldPrice: String(priceAmount),
      price: String(priceAmount),
      priceAmount,
      currencyCode,
      img: "/images/test-product.jpg",
      variants: [{
        id: `${handle}-variant`,
        name: "Default",
        availableForSale,
        price: String(priceAmount),
        priceAmount,
        currencyCode,
        oldPrice: String(priceAmount),
        img: "/images/test-product.jpg",
        options: [],
      }],
    };
    const productUrl = `https://firaang.com/products/${handle}`;
    const schema = JSON.parse(JSON.stringify(await buildProductSchema(product, productUrl)));

    expect(schema.offers.hasMerchantReturnPolicy).toEqual({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      merchantReturnLink: expect.stringMatching(/^https?:\/\/[^/]+\/pod-policy$/),
      description: "Made-to-order items are eligible for a replacement or refund only when damaged, defective, or incorrect. Please raise your request within 5 days of delivery.",
    });
    expect(schema.offers).toMatchObject({
      "@type": "Offer",
      price: priceAmount,
      priceCurrency: currencyCode,
      url: productUrl,
      availability: `https://schema.org/${availableForSale ? "InStock" : "OutOfStock"}`,
    });
    expect(schema.offers.shippingDetails.shippingRate.currency).toBe("INR");
  });
});
