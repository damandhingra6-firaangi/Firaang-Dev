import { NextResponse } from "next/server";
import { designInquirySchema } from "@/lib/design-inquiry";
import { saveDesignInquiry } from "@/lib/design-inquiry-store";
import { COMPANY_SUPPORT_EMAIL, COMPANY_SUPPORT_PHONE } from "@/lib/company";

export const runtime = "nodejs";

function escapeHtml(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendEmail(payload: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}) {
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
    throw new Error(`EMAIL_HTTP_${response.status}:${body}`);
  }

  return { sent: true as const };
}

function buildAdminEmailHtml(data: {
  name: string;
  email: string;
  phone?: string;
  description: string;
  budget?: string;
  expectedDelivery?: string;
  productName?: string;
  referenceImageUrls?: string[];
  submittedAt: string;
}) {
  const images =
    data.referenceImageUrls && data.referenceImageUrls.length > 0
      ? data.referenceImageUrls
          .map(
            (url, i) =>
              `<p><a href="${escapeHtml(url)}" style="color:#b04050;">Reference image ${i + 1}</a></p>`
          )
          .join("")
      : "<p>No reference images provided.</p>";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#2d2520;background:#fff;">
  <h2 style="color:#b04050;margin-bottom:4px;">New Custom Design Inquiry</h2>
  <p style="color:#888;margin-top:0;font-size:13px;">Received: ${escapeHtml(data.submittedAt)}</p>

  <table style="width:100%;border-collapse:collapse;margin-top:20px;">
    <tr><td style="padding:8px 0;font-weight:600;width:160px;color:#555;">Customer Name</td><td style="padding:8px 0;">${escapeHtml(data.name)}</td></tr>
    <tr style="background:#fdf7f4;"><td style="padding:8px 4px;font-weight:600;color:#555;">Email</td><td style="padding:8px 4px;"><a href="mailto:${escapeHtml(data.email)}" style="color:#b04050;">${escapeHtml(data.email)}</a></td></tr>
    <tr><td style="padding:8px 0;font-weight:600;color:#555;">Phone</td><td style="padding:8px 0;">${escapeHtml(data.phone) || "Not provided"}</td></tr>
    <tr style="background:#fdf7f4;"><td style="padding:8px 4px;font-weight:600;color:#555;">Product</td><td style="padding:8px 4px;">${escapeHtml(data.productName) || "Not specified"}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;color:#555;">Budget</td><td style="padding:8px 0;">${escapeHtml(data.budget) || "Not specified"}</td></tr>
    <tr style="background:#fdf7f4;"><td style="padding:8px 4px;font-weight:600;color:#555;">Expected Delivery</td><td style="padding:8px 4px;">${escapeHtml(data.expectedDelivery) || "Not specified"}</td></tr>
  </table>

  <h3 style="margin-top:24px;color:#2d2520;">Design Description</h3>
  <div style="background:#fdf7f4;border-left:4px solid #b04050;padding:16px;border-radius:0 8px 8px 0;white-space:pre-wrap;font-size:14px;line-height:1.6;">${escapeHtml(data.description)}</div>

  <h3 style="margin-top:24px;color:#2d2520;">Reference Images</h3>
  ${images}

  <hr style="margin-top:32px;border:none;border-top:1px solid #eee;"/>
  <p style="color:#aaa;font-size:12px;">Firaang Custom Design Studio — ${escapeHtml(COMPANY_SUPPORT_EMAIL)}</p>
</body>
</html>`;
}

function buildCustomerEmailHtml(name: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#2d2520;background:#fff;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#b04050;font-size:28px;margin:0;">Firaang</h1>
    <p style="color:#888;margin-top:4px;font-size:13px;">Custom Design Studio</p>
  </div>

  <h2 style="font-size:22px;">Hi ${escapeHtml(name)}, we got your idea! 🎨</h2>
  <p style="line-height:1.7;color:#4a3f38;">Thank you for reaching out to <strong>Firaang Custom Design Studio</strong>. We've received your design inquiry and our team will review your idea shortly.</p>

  <div style="background:#fdf7f4;border-radius:12px;padding:20px;margin:24px 0;">
    <h3 style="margin:0 0 8px 0;font-size:16px;color:#2d2520;">What happens next?</h3>
    <ul style="margin:0;padding-left:20px;color:#5a4a42;line-height:2;">
      <li>Our designers will review your idea within 1–2 business days</li>
      <li>We'll contact you on the email or phone you provided</li>
      <li>We'll share a concept sketch or design mockup for your approval</li>
      <li>Once approved, we'll move to production</li>
    </ul>
  </div>

  <p style="line-height:1.7;color:#4a3f38;">If you have more details or reference images to share, just reply to this email.</p>

  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #eee;font-size:13px;color:#888;text-align:center;">
    <p>Questions? Contact us at <a href="mailto:${escapeHtml(COMPANY_SUPPORT_EMAIL)}" style="color:#b04050;">${escapeHtml(COMPANY_SUPPORT_EMAIL)}</a> or <strong>${escapeHtml(COMPANY_SUPPORT_PHONE)}</strong></p>
    <p style="margin-top:4px;">Firaang Studio, Chandigarh, India</p>
  </div>
</body>
</html>`;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = designInquirySchema.safeParse(payload);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid inquiry data";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const data = parsed.data;

  const { record } = await saveDesignInquiry(data).catch((error) => {
    console.error("Failed to save design inquiry:", error);
    throw error;
  });

  const adminEmail = process.env.ADMIN_EMAIL ?? COMPANY_SUPPORT_EMAIL;
  const submittedAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(record.submittedAt));

  // Fire both emails concurrently; don't fail the request if emails fail
  await Promise.allSettled([
    sendEmail({
      to: adminEmail,
      subject: `New Custom Design Inquiry from ${data.name}`,
      html: buildAdminEmailHtml({
        ...data,
        submittedAt,
      }),
      text: `New design inquiry from ${data.name} (${data.email})\n\nDescription: ${data.description}\n\nPhone: ${data.phone ?? "N/A"}\nProduct: ${data.productName ?? "N/A"}\nBudget: ${data.budget ?? "N/A"}\nExpected Delivery: ${data.expectedDelivery ?? "N/A"}`,
    }),
    sendEmail({
      to: data.email,
      subject: "We received your design idea — Firaang",
      html: buildCustomerEmailHtml(data.name),
      text: `Hi ${data.name},\n\nThank you for contacting Firaang Custom Design Studio. Our designers will review your idea and contact you within 1–2 business days.\n\nIf you have any questions, reach us at ${COMPANY_SUPPORT_EMAIL} or ${COMPANY_SUPPORT_PHONE}.\n\nFiraang Studio`,
    }),
  ]);

  return NextResponse.json({ success: true, id: record.id });
}
