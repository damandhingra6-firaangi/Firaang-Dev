type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

type OrderNotificationContext = {
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount: number;
  currencyCode: string;
  subtotalAmount?: number;
  shippingFee?: number;
  taxAmount?: number;
  discountAmount?: number;
  shippingMethod?: string;
  shippingAddress?: {
    name?: string;
    email?: string;
    line1?: string;
    city?: string;
    state?: string;
    pinCode?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount}`;
  }
}

async function sendEmailViaResend(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { sent: false as const, reason: "resend_not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`RESEND_HTTP_${response.status}:${body}`);
  }

  return { sent: true as const };
}

export async function notifyOrderPaid(context: OrderNotificationContext) {
  const recipient = context.customerEmail || context.shippingAddress?.email;
  if (!recipient) {
    return { sent: false as const, reason: "missing_recipient" };
  }

  const amount = formatMoney(context.totalAmount, context.currencyCode);
  const subtotal = formatMoney(context.subtotalAmount ?? Math.max(0, context.totalAmount - (context.shippingFee ?? 0)), context.currencyCode);
  const shipping = formatMoney(context.shippingFee ?? 0, context.currencyCode);
  const tax = formatMoney(context.taxAmount ?? 0, context.currencyCode);
  const discount = context.discountAmount && context.discountAmount > 0 ? formatMoney(context.discountAmount, context.currencyCode) : null;
  const shippingAddressText = [
    context.shippingAddress?.line1,
    [context.shippingAddress?.city, context.shippingAddress?.state].filter(Boolean).join(", "),
    context.shippingAddress?.pinCode,
  ]
    .filter(Boolean)
    .join("<br />");
  const linesHtml = (context.items ?? [])
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0e5de;color:#2b060b">${item.name}<br /><span style="font-size:12px;color:#7a5c4d">Qty: ${item.quantity}</span></td>
          <td style="padding:10px 0;border-bottom:1px solid #f0e5de;color:#2b060b;text-align:right">${formatMoney(item.lineTotal, context.currencyCode)}</td>
        </tr>`,
    )
    .join("");

  const subject = `Firaang Order Confirmed: ${context.orderId}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2b060b;max-width:680px;margin:0 auto;background:#fffaf6;border:1px solid #f0e5de;border-radius:12px;overflow:hidden">
      <div style="background:#111111;padding:16px 20px;text-align:center">
        <div style="font-size:20px;font-weight:700;letter-spacing:0.08em;color:#ffffff">FIRAANG</div>
        <div style="font-size:11px;letter-spacing:0.12em;color:#e5d7cf">DIFFERENT BY DESIGN</div>
      </div>
      <div style="padding:20px">
        <h2 style="margin:0 0 8px 0">Order Confirmed</h2>
        <p style="margin:0 0 12px 0">Hi ${context.customerName ?? context.shippingAddress?.name ?? "there"},</p>
        <p style="margin:0 0 14px 0">Thank you for shopping with Firaang. Your payment has been received successfully.</p>
        <div style="background:#fff1e7;border:1px solid #f0d8c5;border-radius:10px;padding:12px 14px;margin-bottom:14px">
          <p style="margin:0"><strong>Order number:</strong> ${context.orderId}</p>
          <p style="margin:4px 0 0 0"><strong>Payment status:</strong> Paid</p>
          <p style="margin:4px 0 0 0"><strong>Total paid:</strong> ${amount}</p>
        </div>

        <h3 style="margin:0 0 8px 0;font-size:16px">Items Ordered</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
          <tbody>
            ${linesHtml || '<tr><td style="padding:8px 0;color:#6d574b">Order items will be visible in your account dashboard.</td></tr>'}
          </tbody>
        </table>

        <h3 style="margin:0 0 8px 0;font-size:16px">Price Breakdown</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
          <tbody>
            <tr><td style="padding:4px 0;color:#6d574b">Subtotal</td><td style="padding:4px 0;text-align:right">${subtotal}</td></tr>
            <tr><td style="padding:4px 0;color:#6d574b">Shipping${context.shippingMethod ? ` (${context.shippingMethod})` : ""}</td><td style="padding:4px 0;text-align:right">${shipping}</td></tr>
            <tr><td style="padding:4px 0;color:#6d574b">Tax</td><td style="padding:4px 0;text-align:right">${tax}</td></tr>
            ${discount ? `<tr><td style="padding:4px 0;color:#1f7a4b">Discount</td><td style="padding:4px 0;text-align:right;color:#1f7a4b">-${discount}</td></tr>` : ""}
            <tr><td style="padding:10px 0 0 0;font-weight:700;border-top:1px solid #ead8cb">Total Paid</td><td style="padding:10px 0 0 0;text-align:right;font-weight:700;border-top:1px solid #ead8cb">${amount}</td></tr>
          </tbody>
        </table>

        <h3 style="margin:0 0 8px 0;font-size:16px">Shipping / Billing Address</h3>
        <p style="margin:0 0 14px 0;color:#5d4b41">
          ${context.shippingAddress?.name ?? ""}${context.shippingAddress?.name ? "<br />" : ""}
          ${shippingAddressText || "Address unavailable"}
        </p>

        <p style="margin:0;color:#6d574b">Estimated delivery: Shared soon after dispatch.</p>
      </div>
    </div>
  `;
  const text = [
    `Firaang order confirmed: ${context.orderId}`,
    `Payment status: Paid`,
    `Subtotal: ${subtotal}`,
    `Shipping: ${shipping}`,
    `Tax: ${tax}`,
    discount ? `Discount: -${discount}` : undefined,
    `Total paid: ${amount}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmailViaResend({ to: recipient, subject, html, text });
}

export async function notifyOrderCancelled(context: OrderNotificationContext & { reason?: string }) {
  const recipient = context.customerEmail;
  if (!recipient) {
    return { sent: false as const, reason: "missing_recipient" };
  }

  const amount = formatMoney(context.totalAmount, context.currencyCode);
  const subject = `Your Firaang order ${context.orderId} was cancelled`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2b060b">
      <h2>Order cancelled</h2>
      <p>Hi ${context.customerName ?? "there"},</p>
      <p>Your order <strong>${context.orderId}</strong> has been cancelled.</p>
      <p>Order amount: <strong>${amount}</strong></p>
      ${context.reason ? `<p>Reason: ${context.reason}</p>` : ""}
    </div>
  `;
  const text = `Your Firaang order ${context.orderId} was cancelled. Order amount: ${amount}.`;

  return sendEmailViaResend({ to: recipient, subject, html, text });
}

export async function notifyRefundProcessed(context: OrderNotificationContext & { refundAmount?: number }) {
  const recipient = context.customerEmail;
  if (!recipient) {
    return { sent: false as const, reason: "missing_recipient" };
  }

  const amount = formatMoney(context.totalAmount, context.currencyCode);
  const refundAmount = typeof context.refundAmount === "number" ? formatMoney(context.refundAmount, context.currencyCode) : amount;
  const subject = `Refund processed for Firaang order ${context.orderId}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2b060b">
      <h2>Refund processed</h2>
      <p>Hi ${context.customerName ?? "there"},</p>
      <p>Your refund for order <strong>${context.orderId}</strong> has been processed.</p>
      <p>Refund amount: <strong>${refundAmount}</strong></p>
      <p>Original order value: <strong>${amount}</strong></p>
    </div>
  `;
  const text = `Refund processed for order ${context.orderId}. Refund amount: ${refundAmount}.`;

  return sendEmailViaResend({ to: recipient, subject, html, text });
}