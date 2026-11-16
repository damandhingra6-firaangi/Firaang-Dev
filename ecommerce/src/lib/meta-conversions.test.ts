import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/site", () => ({
  getSiteUrl: () => "https://firaang.example",
}));

import { buildMetaPurchaseEvent } from "./meta-conversions";

describe("buildMetaPurchaseEvent", () => {
  it("uses the verified order amount, currency, quantities, event ID, and hashed customer identifiers", () => {
    const event = buildMetaPurchaseEvent(
      {
        orderId: "order_123",
        eventId: "purchase:order_123",
        value: 1499,
        currencyCode: "INR",
        customerEmail: " Customer@Example.com ",
        customerPhone: "+91 98765 43210",
        items: [
          { productId: "ring_1", name: "Ring", unitPrice: 1499, quantity: 2 },
        ],
      },
      { clientUserAgent: "test-agent", fbp: "fb.1.123" },
      1_800_000_000,
    );

    expect(event).toMatchObject({
      event_name: "Purchase",
      event_time: 1_800_000_000,
      event_id: "purchase:order_123",
      event_source_url: "https://firaang.example/order-success/order_123",
      user_data: {
        em: [createHash("sha256").update("customer@example.com").digest("hex")],
        ph: [createHash("sha256").update("919876543210").digest("hex")],
        client_user_agent: "test-agent",
        fbp: "fb.1.123",
      },
      custom_data: {
        value: 1499,
        currency: "INR",
        content_type: "product",
        content_ids: ["ring_1"],
        contents: [{ id: "ring_1", quantity: 2, item_price: 1499 }],
        num_items: 2,
      },
    });
  });
});
