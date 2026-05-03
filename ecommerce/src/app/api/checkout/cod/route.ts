import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createPendingOrderForSessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";
import { COD_FEE_INR, COD_MAX_SUBTOTAL_INR } from "@/lib/checkout-config";
import { resolveCheckoutItems } from "@/lib/products";

type CreateCodOrderRequest = {
  items?: Array<{
    productId?: string;
    quantity?: number;
  }>;
};

export async function POST(request: Request) {
  try {
    const sessionToken = await getAccountSessionTokenFromCookies();
    const body = (await request.json()) as CreateCodOrderRequest;
    const rawItems = body.items ?? [];

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
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

    if (subtotalAmount > COD_MAX_SUBTOTAL_INR) {
      return NextResponse.json(
        { error: `COD is available only up to ${COD_MAX_SUBTOTAL_INR} INR subtotal` },
        { status: 400 },
      );
    }

    const orderId = `cod_${Date.now()}_${randomBytes(3).toString("hex")}`;
    const codFee = COD_FEE_INR;
    const totalAmount = subtotalAmount + codFee;

    const savedOrder = sessionToken
      ? await createPendingOrderForSessionToken(sessionToken, {
          orderId,
          totalAmount,
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

    return NextResponse.json({
      placed: true,
      orderId,
      subtotalAmount,
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
