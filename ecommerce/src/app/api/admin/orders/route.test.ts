import { beforeEach, describe, expect, it, vi } from "vitest";

const listOrdersForAdminMock = vi.fn();
const updateOrderForAdminMock = vi.fn();
const sendMetaPurchaseConversionMock = vi.fn();

vi.mock("@/lib/account-data", () => ({
  listOrdersForAdmin: listOrdersForAdminMock,
  updateOrderForAdmin: updateOrderForAdminMock,
}));

vi.mock("@/lib/meta-conversions", () => ({
  sendMetaPurchaseConversion: sendMetaPurchaseConversionMock,
}));

describe("admin order payment updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FEEDBACK_ADMIN_KEY = "admin-key";
    updateOrderForAdminMock.mockResolvedValue({
      id: "cod_123",
      status: "paid",
      paymentStatus: "captured",
      paymentMethod: "cod",
    });
    sendMetaPurchaseConversionMock.mockResolvedValue({ status: "sent" });
  });

  it("sends a server Purchase when COD is recorded as paid and captured", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://firaang.example/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": "admin-key",
        },
        body: JSON.stringify({
          orderId: "cod_123",
          status: "paid",
          paymentStatus: "captured",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(sendMetaPurchaseConversionMock).toHaveBeenCalledWith("cod_123");
  });

  it("does not send a Purchase for COD payment that is still pending", async () => {
    updateOrderForAdminMock.mockResolvedValueOnce({
      id: "cod_123",
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: "cod",
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://firaang.example/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": "admin-key",
        },
        body: JSON.stringify({ orderId: "cod_123", status: "pending" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(sendMetaPurchaseConversionMock).not.toHaveBeenCalled();
  });
});
