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
  const recipient = context.customerEmail;
  if (!recipient) {
    return { sent: false as const, reason: "missing_recipient" };
  }

  const amount = formatMoney(context.totalAmount, context.currencyCode);
  const subject = `Your Firaang order ${context.orderId} is confirmed`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2b060b">
      <h2>Your order is confirmed</h2>
      <p>Hi ${context.customerName ?? "there"},</p>
      <p>We have received your payment for order <strong>${context.orderId}</strong>.</p>
      <p>Total paid: <strong>${amount}</strong></p>
      <p>We’ll notify you again when your order is packed and shipped.</p>
    </div>
  `;
  const text = `Your Firaang order ${context.orderId} is confirmed. Total paid: ${amount}.`;

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