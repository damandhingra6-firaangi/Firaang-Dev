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

    const schema = await buildProductSchema(product, "https://firaang.com/product/rose-gold-rimmed-sculpted-glass-tote");

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
      applicableRegion: "IN",
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
      merchantReturnDays: 5,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/ReturnShippingFees",
    });
  });
});
