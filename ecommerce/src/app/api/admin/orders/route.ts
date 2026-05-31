import { NextResponse } from "next/server";
import { z } from "zod";
import { listOrdersForAdmin, updateOrderForAdmin } from "@/lib/account-data";

export const runtime = "nodejs";

const adminUpdateSchema = z.object({
  orderId: z.string().trim().min(1).max(120),
  status: z.enum(["paid", "pending", "failed", "cancelled"]).optional(),
  paymentStatus: z.enum(["created", "authorized", "captured", "failed", "refunded"]).optional(),
  paymentId: z.string().trim().max(200).optional().or(z.literal("")),
  refundId: z.string().trim().max(200).optional().or(z.literal("")),
  refundAmount: z.number().int().nonnegative().optional(),
  shopifyOrderId: z.string().trim().max(200).optional().or(z.literal("")),
  shopifySyncStatus: z.enum(["pending", "synced", "failed", "skipped"]).optional(),
  shopifySyncError: z.string().trim().max(500).optional().or(z.literal("")),
  fulfillmentStatus: z.enum(["unfulfilled", "processing", "fulfilled", "cancelled"]).optional(),
  shippingCarrier: z.string().trim().max(100).optional().or(z.literal("")),
  trackingNumber: z.string().trim().max(120).optional().or(z.literal("")),
  trackingUrl: z.string().trim().max(500).optional().or(z.literal("")),
  shippedAt: z.string().trim().max(40).optional().or(z.literal("")),
  deliveredAt: z.string().trim().max(40).optional().or(z.literal("")),
  cancelReason: z.string().trim().max(200).optional().or(z.literal("")),
});

function isAdminAuthorized(request: Request) {
  const adminKey = process.env.FEEDBACK_ADMIN_KEY;
  const requestKey = request.headers.get("x-admin-key");

  if (!adminKey) {
    return { ok: false as const, response: NextResponse.json({ error: "FEEDBACK_ADMIN_KEY is not configured" }, { status: 503 }) };
  }

  if (requestKey !== adminKey) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { ok: true as const };
}

export async function GET(request: Request) {
  const auth = isAdminAuthorized(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number.parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);

  try {
    const orders = await listOrdersForAdmin(limit);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to list admin orders", error);
    return NextResponse.json({ error: "Could not load orders" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = isAdminAuthorized(request);

  if (!auth.ok) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = adminUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid order update payload" }, { status: 400 });
  }

  try {
    const order = await updateOrderForAdmin(parsed.data.orderId, {
      status: parsed.data.status,
      paymentStatus: parsed.data.paymentStatus,
      paymentId: parsed.data.paymentId?.trim() || undefined,
      refundId: parsed.data.refundId?.trim() || undefined,
      refundAmount: parsed.data.refundAmount,
      shopifyOrderId: parsed.data.shopifyOrderId?.trim() || undefined,
      shopifySyncStatus: parsed.data.shopifySyncStatus,
      shopifySyncError: parsed.data.shopifySyncError?.trim() || undefined,
      fulfillmentStatus: parsed.data.fulfillmentStatus,
      shippingCarrier: parsed.data.shippingCarrier?.trim() || undefined,
      trackingNumber: parsed.data.trackingNumber?.trim() || undefined,
      trackingUrl: parsed.data.trackingUrl?.trim() || undefined,
      shippedAt: parsed.data.shippedAt?.trim() || undefined,
      deliveredAt: parsed.data.deliveredAt?.trim() || undefined,
      cancelReason: parsed.data.cancelReason?.trim() || undefined,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    console.error("Failed to update admin order", error);
    return NextResponse.json({ error: "Could not update order" }, { status: 500 });
  }
}