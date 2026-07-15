import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { BRAND_LOGO_LIGHT, COMPANY_SOCIAL_LINKS, COMPANY_SUPPORT_EMAIL, COMPANY_SUPPORT_PHONE } from "@/lib/company";

// Inline helpers duplicated from order-notifications to avoid sending anything
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
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET() {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) return auth.response;

  const siteUrl = "https://www.firaang.com";
  const logoUrl = `${siteUrl}${BRAND_LOGO_LIGHT}`;
  const supportEmail = COMPANY_SUPPORT_EMAIL;
  const supportPhone = COMPANY_SUPPORT_PHONE;
  const instagramUrl = COMPANY_SOCIAL_LINKS.instagram;
  const facebookUrl = COMPANY_SOCIAL_LINKS.facebook;
  const youtubeUrl = COMPANY_SOCIAL_LINKS.youtube;

  const orderId = "FRG-PREVIEW-001";
  const currencyCode = "INR";
  const customerName = "Aarav Sharma";
  const totalAmount = 3699;
  const subtotalAmount = 3399;
  const shippingFee = 99;
  const taxAmount = 201;
  const discountAmount = 0;
  const paymentStatus = "Paid";
  const paymentMethod = "UPI";
  const orderDate = new Date().toISOString();
  const estimatedDeliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const viewOrderUrl = `${siteUrl}/track-order?orderId=${encodeURIComponent(orderId)}`;
  const continueShoppingUrl = siteUrl;

  const shippingAddress = {
    name: "Aarav Sharma",
    line1: "42, Sector 18, Noida",
    city: "Noida",
    state: "Uttar Pradesh",
    pinCode: "201301",
  };

  const items = [
    {
      name: "Firaang Classic Kurta – Sand Beige",
      quantity: 1,
      unitPrice: 1899,
      lineTotal: 1899,
      image: `${siteUrl}/images/image-fallback.svg`,
      selectedSize: "L",
      selectedColor: "Sand Beige",
    },
    {
      name: "Firaang Palazzo Set – Midnight Black",
      quantity: 1,
      unitPrice: 1500,
      lineTotal: 1500,
      image: `${siteUrl}/images/image-fallback.svg`,
      selectedSize: "M",
      selectedColor: "Midnight Black",
    },
  ];

  const amount = formatMoney(totalAmount, currencyCode);
  const subtotal = formatMoney(subtotalAmount, currencyCode);
  const shipping = formatMoney(shippingFee, currencyCode);
  const tax = formatMoney(taxAmount, currencyCode);
  const discount = discountAmount > 0 ? formatMoney(discountAmount, currencyCode) : null;

  const formattedOrderDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(orderDate));
  const formattedEstimated = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(estimatedDeliveryDate));

  const shippingAddressText = [
    shippingAddress.line1,
    [shippingAddress.city, shippingAddress.state].filter(Boolean).join(", "),
    shippingAddress.pinCode,
  ]
    .filter(Boolean)
    .join("<br />");

  const productsHtml = items
    .map((item) => {
      const sizeLine = item.selectedSize
        ? `<div style="font-size:12px;color:#7c6f64;line-height:18px">Size: ${escapeHtml(item.selectedSize)}</div>`
        : "";
      const colorLine = item.selectedColor
        ? `<div style="font-size:12px;color:#7c6f64;line-height:18px">Color: ${escapeHtml(item.selectedColor)}</div>`
        : "";

      return `
        <tr>
          <td style="padding:0 0 12px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #efe2d7;border-radius:12px;background:#ffffff;">
              <tr>
                <td width="78" style="padding:12px;vertical-align:top">
                  <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" width="64" height="64" style="display:block;border-radius:8px;border:1px solid #eaded4;background:#fbf7f3" />
                </td>
                <td style="padding:12px 0 12px 0;vertical-align:top">
                  <div style="font-size:14px;line-height:20px;color:#1c1a18;font-weight:600;padding-right:10px">${escapeHtml(item.name)}</div>
                  ${sizeLine}
                  ${colorLine}
                  <div style="font-size:12px;color:#7c6f64;line-height:18px">Qty: ${item.quantity}</div>
                  <div style="font-size:12px;color:#7c6f64;line-height:18px">Unit: ${formatMoney(item.unitPrice, currencyCode)}</div>
                </td>
                <td width="110" style="padding:12px;vertical-align:top;text-align:right">
                  <div style="font-size:14px;line-height:20px;color:#1c1a18;font-weight:700">${formatMoney(item.lineTotal, currencyCode)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Email Preview – Order Confirmed</title>
<style>
  body { margin: 0; padding: 0; background: #e9e5df; }
  .preview-bar {
    background: #1f2937; color: #f9fafb; font-family: monospace;
    font-size: 13px; padding: 10px 16px; display: flex; align-items: center; gap: 12px;
  }
  .preview-bar span { opacity: 0.6; }
</style>
</head>
<body>
<div class="preview-bar">
  <strong>📧 Email Preview</strong>
  <span>Subject: Firaang Order Confirmed: ${escapeHtml(orderId)}</span>
  <span>– Admin only, no email was sent</span>
</div>
<div style="margin:0;padding:0;background:#f3efea;font-family:Arial,Helvetica,sans-serif;color:#1f1d1b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3efea;padding:18px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;background:#faf7f3;border:1px solid #e7d9cc;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#101010;padding:18px 24px;text-align:center;">
              <a href="${escapeHtml(siteUrl)}" target="_blank" style="text-decoration:none;display:inline-block;">
                <img src="${escapeHtml(logoUrl)}" alt="Firaang" height="38" style="display:block;margin:0 auto;height:38px;max-width:180px;" />
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 20px 10px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eaded4;background:#fffdfb;border-radius:12px;">
                <tr><td style="padding:16px;">
                  <div style="font-size:22px;line-height:28px;font-weight:700;color:#171513;">Order Confirmed</div>
                  <div style="font-size:15px;line-height:24px;color:#5f554b;margin-top:6px;">Hi ${escapeHtml(customerName)}, thank you for shopping with Firaang. Your payment has been received successfully.</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                    <tr><td style="padding:5px 0;font-size:13px;color:#7a6d62;">Order Number</td><td style="padding:5px 0;font-size:13px;color:#1f1d1b;font-weight:600;text-align:right">${escapeHtml(orderId)}</td></tr>
                    <tr><td style="padding:5px 0;font-size:13px;color:#7a6d62;">Payment Status</td><td style="padding:5px 0;font-size:13px;color:#1f1d1b;font-weight:600;text-align:right">${escapeHtml(paymentStatus)}</td></tr>
                    <tr><td style="padding:5px 0;font-size:13px;color:#7a6d62;">Payment Method</td><td style="padding:5px 0;font-size:13px;color:#1f1d1b;font-weight:600;text-align:right">${escapeHtml(paymentMethod)}</td></tr>
                    <tr><td style="padding:5px 0;font-size:13px;color:#7a6d62;">Order Date</td><td style="padding:5px 0;font-size:13px;color:#1f1d1b;font-weight:600;text-align:right">${escapeHtml(formattedOrderDate)}</td></tr>
                    <tr><td style="padding:5px 0;font-size:13px;color:#7a6d62;">Estimated Delivery</td><td style="padding:5px 0;font-size:13px;color:#1f1d1b;font-weight:600;text-align:right">${escapeHtml(formattedEstimated)}</td></tr>
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 20px 0 20px;">
              <div style="font-size:17px;line-height:24px;font-weight:700;color:#1d1a17;margin-bottom:10px;">Items Ordered</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tbody>${productsHtml}</tbody>
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
                    <tr><td style="padding:4px 0;color:#6c5f54">Shipping</td><td style="padding:4px 0;text-align:right;color:#1f1d1b">${shipping}</td></tr>
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
                    ${escapeHtml(shippingAddress.name)}<br />
                    ${shippingAddressText}
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
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
