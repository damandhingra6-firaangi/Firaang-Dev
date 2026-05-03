import { NextResponse } from "next/server";
import { findOrderForTracking } from "@/lib/account-data";

type TrackOrderRequest = {
  orderId?: string;
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrackOrderRequest;
    const orderId = body.orderId?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!orderId || !email) {
      return NextResponse.json({ error: "Order ID and email are required" }, { status: 400 });
    }

    const order = await findOrderForTracking({ orderId, email });

    if (!order) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    return NextResponse.json({ found: true, order });
  } catch (error) {
    console.error("Track order lookup failed", error);
    return NextResponse.json({ error: "Unable to track order right now" }, { status: 500 });
  }
}
