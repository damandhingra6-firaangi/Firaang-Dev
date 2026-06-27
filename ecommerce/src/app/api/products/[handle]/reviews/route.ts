import { NextResponse } from "next/server";
import { listProductReviews, productReviewSchema, saveProductReview } from "@/lib/product-reviews";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ handle: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { handle } = await params;

  try {
    const items = await listProductReviews(decodeURIComponent(handle));
    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    console.error("Failed to load product reviews", error);
    return NextResponse.json({ error: "Could not load product reviews" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { handle } = await params;
  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = productReviewSchema.safeParse({
    ...payload,
    productHandle: decodeURIComponent(handle),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid review payload";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  try {
    const record = await saveProductReview(parsed.data);
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    console.error("Failed to save product review", error);
    return NextResponse.json({ error: "Could not store your review" }, { status: 500 });
  }
}