import { NextResponse } from "next/server";
import { createPendingOrderForSessionToken } from "@/lib/account-data";
import { getAccountSessionTokenFromCookies } from "@/lib/account-session";
import { getRazorpayClient } from "@/lib/razorpay";
import { resolveCheckoutItems } from "@/lib/products";

type CreateOrderRequest = {
  items?: Array<{
    productId?: string;
    quantity?: number;
  }>;
};

export async function POST(request: Request) {
  try {
    const sessionToken = await getAccountSessionTokenFromCookies();
    const body = (await request.json()) as CreateOrderRequest;
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

    const razorpay = getRazorpayClient();

    const order = await razorpay.orders.create({
      amount: totalPaise,
      currency: currencyCode,
      receipt: `rcpt_${Date.now()}`,
      payment_capture: true,
      notes: {
        itemCount: String(items.length),
      },
    });

    const totalAmount = Math.round(Number(order.amount) / 100);

    let persistedOrder = null;

    if (sessionToken) {
      persistedOrder = await createPendingOrderForSessionToken(sessionToken, {
        orderId: order.id,
        totalAmount,
        currencyCode: order.currency,
        items: items.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          image: item.product.img,
          unitPrice: item.product.priceAmount,
          quantity: item.quantity,
          lineTotal: item.product.priceAmount * item.quantity,
        })),
      });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      meta: {
        accountLinked: persistedOrder !== null,
      },
    });
  } catch (error) {
    console.error("Razorpay order creation failed", error);
    return NextResponse.json({ error: "Unable to create order" }, { status: 500 });
  }
}
