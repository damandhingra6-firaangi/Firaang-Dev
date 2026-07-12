import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createPendingOrderForSessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";
import { calculateCheckoutPricing, estimateOrderWeightKg } from "@/lib/checkout-config";
import { resolveCheckoutItems } from "@/lib/products";
import { syncShopifyInventoryForOrder } from "@/lib/shopify-admin";

type CreateCodOrderRequest = {
  items?: Array<{
    productId?: string;
    quantity?: number;
  }>;
  shippingState?: string;
  shippingMethod?: "surface" | "air";
};

export async function POST(request: Request) {
  try {
    const sessionToken = await getAccountSessionTokenFromCookies();
    const body = (await request.json()) as CreateCodOrderRequest;
    const rawItems = body.items ?? [];
    const shippingState = body.shippingState?.trim() ?? "";
    const shippingMethod = body.shippingMethod ?? "surface";

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (!sessionToken) {
      return NextResponse.json({ error: "Sign in required to place an order" }, { status: 401 });
    }

    const checkoutItems = rawItems
      .map((item) => ({
        productId: item.productId ?? "",
        quantity: typeof item.quantity === "number" ? item.quantity : 1,
      }))
      .filter((item) => item.productId.length > 0);

    const { items, totalPaise, currencyCode } = await resolveCheckoutItems(checkoutItems);

    if (items.length === 0 || totalPaise <= 0) {
      return NextResponse.json({ error: "No valid items found for checkout" }, { status: 400 });
    }

    const subtotalAmount = Math.round(totalPaise / 100);

    const orderWeightKg = estimateOrderWeightKg(
      items.map((item) => ({ quantity: item.quantity, tags: item.product.tags })),
    );
    const pricing = calculateCheckoutPricing({
      subtotalAmount,
      shippingState,
      shippingMethod,
      orderWeightKg,
      paymentMethod: "cod",
    });

    const orderId = `cod_${Date.now()}_${randomBytes(3).toString("hex")}`;
    const codFee = pricing.codFee;
    const totalAmount = pricing.totalAmount;

    const savedOrder = sessionToken
      ? await createPendingOrderForSessionToken(sessionToken, {
          orderId,
          totalAmount,
          subtotalAmount: pricing.subtotalAmount,
          shippingFee: pricing.shippingFee,
          taxAmount: 0,
          discountAmount: pricing.discountAmount,
          codFee: pricing.codFee,
          shippingLabel: pricing.shippingLabel,
          shippingMethod: pricing.shippingMethod,
          orderWeightKg,
          currencyCode,
          paymentMethod: "cod",
          items: items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            image: item.product.img,
            unitPrice: item.product.priceAmount,
            quantity: item.quantity,
            lineTotal: item.product.priceAmount * item.quantity,
          })),
        })
      : null;

    if (savedOrder) {
      await syncShopifyInventoryForOrder(savedOrder.id, "reserve").catch((error) => {
        console.error("Shopify inventory reserve sync failed", error);
      });
    }

    return NextResponse.json({
      placed: true,
      orderId,
      subtotalAmount,
      shippingFee: pricing.shippingFee,
      codFee,
      amount: totalAmount,
      currencyCode,
      order: savedOrder,
      meta: {
        accountLinked: savedOrder !== null,
      },
    });
  } catch (error) {
    console.error("COD order creation failed", error);
    return NextResponse.json({ error: "Unable to place COD order" }, { status: 500 });
  }
}
