import { BRAND_LOGO_LIGHT, COMPANY_SOCIAL_LINKS, COMPANY_SUPPORT_EMAIL, COMPANY_SUPPORT_PHONE } from "@/lib/company";

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
  paymentStatus?: string;
  paymentMethod?: string;
  orderDate?: string;
  estimatedDeliveryDate?: string;
  viewOrderUrl?: string;
  continueShoppingUrl?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    image?: string;
    selectedSize?: string;
    selectedColor?: string;
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

function escapeHtml(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.APP_BASE_URL?.trim();
  if (!fromEnv) {
    return "https://www.firaang.com";
  }

  return fromEnv.replace(/\/$/, "");
}

function resolvePublicUrl(pathOrUrl: string | undefined, siteUrl: string) {
  if (!pathOrUrl) {
    return "";
  }

  const trimmed = pathOrUrl.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${siteUrl}${path}`;
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(parsed);
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

  const siteUrl = resolveSiteUrl();
  const viewOrderUrl = context.viewOrderUrl?.trim() || `${siteUrl}/track-order?orderId=${encodeURIComponent(context.orderId)}`;
  const continueShoppingUrl = context.continueShoppingUrl?.trim() || siteUrl;
  const logoUrl = resolvePublicUrl(BRAND_LOGO_LIGHT, siteUrl);
  const supportEmail = COMPANY_SUPPORT_EMAIL;
  const supportPhone = COMPANY_SUPPORT_PHONE;
  const instagramUrl = COMPANY_SOCIAL_LINKS.instagram;
  const facebookUrl = COMPANY_SOCIAL_LINKS.facebook;
  const youtubeUrl = COMPANY_SOCIAL_LINKS.youtube;

  const amount = formatMoney(context.totalAmount, context.currencyCode);
  const subtotal = formatMoney(context.subtotalAmount ?? Math.max(0, context.totalAmount - (context.shippingFee ?? 0)), context.currencyCode);
  const shipping = formatMoney(context.shippingFee ?? 0, context.currencyCode);
  const tax = formatMoney(context.taxAmount ?? 0, context.currencyCode);
  const discount = context.discountAmount && context.discountAmount > 0 ? formatMoney(context.discountAmount, context.currencyCode) : null;
  const paymentStatus = context.paymentStatus || "Paid";
  const paymentMethod = (context.paymentMethod || "Online").toUpperCase();
  const orderDate = formatDate(context.orderDate) || formatDate(new Date().toISOString());
  const estimatedDate = formatDate(context.estimatedDeliveryDate) || "Shared soon after dispatch";

  const shippingAddressText = [
    context.shippingAddress?.line1,
    [context.shippingAddress?.city, context.shippingAddress?.state].filter(Boolean).join(", "),
    context.shippingAddress?.pinCode,
  ]
    .filter(Boolean)
    .join("<br />");

  const productsHtml = (context.items ?? [])
    .map((item) => {
      const image = resolvePublicUrl(item.image, siteUrl) || `${siteUrl}/images/image-fallback.svg`;
      const sizeLine = item.selectedSize ? `<div style="font-size:12px;color:#7c6f64;line-height:18px">Size: ${escapeHtml(item.selectedSize)}</div>` : "";
      const colorLine = item.selectedColor ? `<div style="font-size:12px;color:#7c6f64;line-height:18px">Color: ${escapeHtml(item.selectedColor)}</div>` : "";

      return `
        <tr>
          <td style="padding:0 0 12px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #efe2d7;border-radius:12px;background:#ffffff;">
              <tr>
                <td width="78" style="padding:12px;vertical-align:top">
                  <img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" width="64" height="64" style="display:block;border-radius:8px;border:1px solid #eaded4;background:#fbf7f3" />
                </td>
                <td style="padding:12px 0 12px 0;vertical-align:top">
                  <div style="font-size:14px;line-height:20px;color:#1c1a18;font-weight:600;padding-right:10px">${escapeHtml(item.name)}</div>
                  ${sizeLine}
                  ${colorLine}
                  <div style="font-size:12px;color:#7c6f64;line-height:18px">Qty: ${item.quantity}</div>
                  <div style="font-size:12px;color:#7c6f64;line-height:18px">Unit: ${formatMoney(item.unitPrice, context.currencyCode)}</div>
                </td>
                <td width="110" style="padding:12px;vertical-align:top;text-align:right">
                  <div style="font-size:14px;line-height:20px;color:#1c1a18;font-weight:700">${formatMoney(item.lineTotal, context.currencyCode)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const subject = `Firaang Order Confirmed: ${context.orderId}`;
  const html = `
    <div style="margin:0;padding:0;background:#f3efea;font-family:Arial,Helvetica,sans-serif;color:#1f1d1b;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3efea;padding:18px 10px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;background:#faf7f3;border:1px solid #e7d9cc;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="background:#101010;padding:18px 24px;text-align:center;">
                  <a href="${escapeHtml(siteUrl)}" target="_blank" style="text-decoration:none;display:inline-block;">
                    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Firaang" height="38" style="display:block;margin:0 auto;height:38px;max-width:180px;" />` : ""}
                  </a>
                </td>
              </tr>

              <tr>
                <td style="padding:22px 20px 10px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eaded4;background:#fffdfb;border-radius:12px;">
                    <tr><td style="padding:16px;">
                      <div style="font-size:22px;line-height:28px;font-weight:700;color:#171513;">Order Confirmed</div>
                      <div style="font-size:15px;line-height:24px;color:#5f554b;margin-top:6px;">Hi ${escapeHtml(context.customerName ?? context.shippingAddress?.name ?? "there")}, thank you for shopping with Firaang. Your payment has been received successfully.</div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                        <tr><td style="padding:5px 0;font-size:13px;color:#7a6d62;">Order Number</td><td style="padding:5px 0;font-size:13px;color:#1f1d1b;font-weight:600;text-align:right">${escapeHtml(context.orderId)}</td></tr>
                        <tr><td style="padding:5px 0;font-size:13px;color:#7a6d62;">Payment Status</td><td style="padding:5px 0;font-size:13px;color:#1f1d1b;font-weight:600;text-align:right">${escapeHtml(paymentStatus)}</td></tr>
                        <tr><td style="padding:5px 0;font-size:13px;color:#7a6d62;">Payment Method</td><td style="padding:5px 0;font-size:13px;color:#1f1d1b;font-weight:600;text-align:right">${escapeHtml(paymentMethod)}</td></tr>
                        <tr><td style="padding:5px 0;font-size:13px;color:#7a6d62;">Order Date</td><td style="padding:5px 0;font-size:13px;color:#1f1d1b;font-weight:600;text-align:right">${escapeHtml(orderDate)}</td></tr>
                        <tr><td style="padding:5px 0;font-size:13px;color:#7a6d62;">Estimated Delivery</td><td style="padding:5px 0;font-size:13px;color:#1f1d1b;font-weight:600;text-align:right">${escapeHtml(estimatedDate)}</td></tr>
                      </table>
                    </td></tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:8px 20px 0 20px;">
                  <div style="font-size:17px;line-height:24px;font-weight:700;color:#1d1a17;margin-bottom:10px;">Items Ordered</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tbody>
                      ${productsHtml || '<tr><td style="padding:12px;border:1px solid #efe2d7;border-radius:10px;background:#ffffff;color:#6d5f53;font-size:13px;">Order items will be visible in your account dashboard.</td></tr>'}
                    </tbody>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:12px 20px 0 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eaded4;background:#fffdfb;border-radius:12px;">
                    <tr><td style="padding:16px;">
                      <div style="font-size:17px;line-height:24px;font-weight:700;color:#1d1a17;margin-bottom:8px;">Price Breakdown</div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:22px;">
                        <tr><td style="padding:4px 0;color:#6c5f54">Subtotal</td><td style="padding:4px 0;text-align:right;color:#1f1d1b">${subtotal}</td></tr>
                        <tr><td style="padding:4px 0;color:#6c5f54">Shipping${context.shippingMethod ? ` (${escapeHtml(context.shippingMethod)})` : ""}</td><td style="padding:4px 0;text-align:right;color:#1f1d1b">${shipping}</td></tr>
                        <tr><td style="padding:4px 0;color:#6c5f54">Tax</td><td style="padding:4px 0;text-align:right;color:#1f1d1b">${tax}</td></tr>
                        ${discount ? `<tr><td style="padding:4px 0;color:#247248">Discount</td><td style="padding:4px 0;text-align:right;color:#247248">-${discount}</td></tr>` : ""}
                        <tr><td style="padding:9px 0 0 0;font-weight:700;border-top:1px solid #e8dbd0;color:#171513">Grand Total</td><td style="padding:9px 0 0 0;text-align:right;font-weight:700;border-top:1px solid #e8dbd0;color:#171513">${amount}</td></tr>
                      </table>
                    </td></tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:12px 20px 0 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eaded4;background:#fffdfb;border-radius:12px;">
                    <tr><td style="padding:16px;">
                      <div style="font-size:17px;line-height:24px;font-weight:700;color:#1d1a17;margin-bottom:8px;">Shipping Address</div>
                      <div style="font-size:14px;line-height:22px;color:#5a4f45;">
                        ${escapeHtml(context.shippingAddress?.name ?? "")}${context.shippingAddress?.name ? "<br />" : ""}
                        ${shippingAddressText || "Address unavailable"}
                      </div>
                    </td></tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:14px 20px 0 20px;text-align:center;">
                  <a href="${escapeHtml(viewOrderUrl)}" target="_blank" style="display:inline-block;background:#111111;border:1px solid #111111;color:#ffffff;text-decoration:none;font-size:14px;line-height:20px;font-weight:700;padding:11px 20px;border-radius:999px;">View Order</a>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 20px 0 20px;text-align:center;">
                  <a href="${escapeHtml(continueShoppingUrl)}" target="_blank" style="display:inline-block;background:#d1af78;border:1px solid #b9935b;color:#111111;text-decoration:none;font-size:14px;line-height:20px;font-weight:700;padding:11px 20px;border-radius:999px;">Continue Shopping</a>
                </td>
              </tr>

              <tr>
                <td style="padding:18px 20px 20px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111111;border-radius:12px;">
                    <tr><td style="padding:16px;text-align:center;">
                      <a href="${escapeHtml(siteUrl)}" target="_blank" style="text-decoration:none;color:#ffffff;font-size:18px;line-height:24px;font-weight:700;letter-spacing:0.08em;">FIRAANG</a>
                      <div style="font-size:12px;line-height:18px;color:#cbb08f;margin-top:4px;">Premium fashion designed to stand out.</div>
                      <div style="font-size:12px;line-height:20px;color:#f3e9df;margin-top:10px;">Website: <a href="${escapeHtml(siteUrl)}" target="_blank" style="color:#f3e9df;">${escapeHtml(siteUrl)}</a></div>
                      <div style="font-size:12px;line-height:20px;color:#f3e9df;">Support: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#f3e9df;">${escapeHtml(supportEmail)}</a> | ${escapeHtml(supportPhone)}</div>
                      <div style="font-size:12px;line-height:20px;color:#f3e9df;margin-top:8px;">
                        <a href="${escapeHtml(instagramUrl)}" target="_blank" style="color:#f3e9df;text-decoration:none;margin:0 6px;">Instagram</a>
                        <a href="${escapeHtml(facebookUrl)}" target="_blank" style="color:#f3e9df;text-decoration:none;margin:0 6px;">Facebook</a>
                        <a href="${escapeHtml(youtubeUrl)}" target="_blank" style="color:#f3e9df;text-decoration:none;margin:0 6px;">YouTube</a>
                      </div>
                      <div style="font-size:11px;line-height:18px;color:#a89b8d;margin-top:12px;">&copy; 2026 Firaang. All rights reserved.</div>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = [
    `Firaang order confirmed: ${context.orderId}`,
    `Payment status: ${paymentStatus}`,
    `Payment method: ${paymentMethod}`,
    `Order date: ${orderDate}`,
    `Estimated delivery: ${estimatedDate}`,
    `Subtotal: ${subtotal}`,
    `Shipping: ${shipping}`,
    `Tax: ${tax}`,
    discount ? `Discount: -${discount}` : undefined,
    `Total paid: ${amount}`,
    `View order: ${viewOrderUrl}`,
    `Continue shopping: ${continueShoppingUrl}`,
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
