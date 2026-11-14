import { describe, expect, it } from "vitest";
import { formatProductDescriptionBlocks, getProductDescriptionSummary, normalizeProductDescriptionText } from "./product-description";
import { sanitizeProductDescriptionHtml } from "./product-description-html";

describe("product description formatting", () => {
  it("strips style and script tags while preserving readable content", () => {
    const input = `
      <style>
        .product-description { color: red; }
      </style>
      <script>window.alert("ignore me");</script>
      <p>Made for daily wear.</p>
      <p>Fabric: Cotton</p>
    `;

    expect(normalizeProductDescriptionText(input)).toContain("Made for daily wear.");
    expect(normalizeProductDescriptionText(input)).toContain("Fabric: Cotton");
    expect(normalizeProductDescriptionText(input)).not.toContain("color: red");
    expect(normalizeProductDescriptionText(input)).not.toContain("ignore me");
  });

  it("strips escaped html markup before rendering", () => {
    const input = `
      &lt;style&gt;
        .product-description { color: red; }
      &lt;/style&gt;
      &lt;p&gt;Made for daily wear.&lt;/p&gt;
      &lt;ul&gt;&lt;li&gt;Breathable fabric&lt;/li&gt;&lt;li&gt;Easy to style&lt;/li&gt;&lt;/ul&gt;
    `;

    const normalized = normalizeProductDescriptionText(input);

    expect(normalized).toContain("Made for daily wear.");
    expect(normalized).toContain("Breathable fabric");
    expect(normalized).toContain("Easy to style");
    expect(normalized).not.toContain("color: red");
    expect(normalized).not.toContain("<style>");
  });

  it("parses labels and bullet points into display blocks", () => {
    const blocks = formatProductDescriptionBlocks(`
      <p>Product Story: A soft cotton piece for everyday wear.</p>
      <ul>
        <li>Breathable fabric</li>
        <li>Easy to style</li>
      </ul>
      <p>Care: Gentle wash recommended.</p>
    `);

    expect(blocks).toEqual([
      { type: "label", label: "Product Story", text: "A soft cotton piece for everyday wear." },
      { type: "bullet", text: "Breathable fabric" },
      { type: "bullet", text: "Easy to style" },
      { type: "label", label: "Care", text: "Gentle wash recommended." },
    ]);
  });

  it("returns a concise summary from the first readable paragraph", () => {
    const summary = getProductDescriptionSummary(`
      <div>Designed for premium comfort and an easy drape.</div>
      <div>Fabric: Cotton blend</div>
    `);

    expect(summary).toBe("Designed for premium comfort and an easy drape.");
    expect(getProductDescriptionSummary("<ul><li>Color: Heather Grey</li><li>Fabric: Cotton</li></ul>")).toBe("Color: Heather Grey");
  });

  it("removes CSS flattened into Shopify's plain-text field without losing product content", () => {
    const css = "a { text-decoration: none; color: #464feb; } tr th, tr td { border: 1px solid #e6e6e6; } tr th { background-color: #f5f5f5; }";
    const content = "Color: Heather Grey Fabric: 360 GSM Premium 100% Cotton Fit: Relaxed Wide-Leg";
    expect(normalizeProductDescriptionText(`${css} ${content} ${css}`)).toBe(content);
    expect(getProductDescriptionSummary(`${css} Premium cotton comfort.`)).toBe("Premium cotton comfort.");
  });

  it("preserves safe rich formatting and strips styles, scripts, unsafe URLs and event handlers", () => {
    const input = '<style>a { color: red; }</style><h2>Fabric</h2><p><strong>Cotton</strong> <em>comfort</em></p><ul><li>Relaxed fit</li></ul><table><tr><th>Size</th><td>XL</td></tr></table><a href="https://firaang.com/size-guide" target="_blank">Size guide</a><a href="javascript:alert(1)">Bad link</a><img src="https://cdn.shopify.com/test.jpg" onerror="alert(1)"><script>alert(1)</script>';
    const html = sanitizeProductDescriptionHtml(input);
    expect(html).toContain("<h2>Fabric</h2>");
    expect(html).toContain("<strong>Cotton</strong>");
    expect(html).toContain("<em>comfort</em>");
    expect(html).toContain("<ul><li>Relaxed fit</li></ul>");
    expect(html).toContain("<table>");
    expect(html).toContain('href="https://firaang.com/size-guide"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toMatch(/<style|<script|onerror|javascript:|color: red|alert\(1\)/);
  });

  it("handles escaped and malformed HTML and only permits safe inline CSS", () => {
    const html = sanitizeProductDescriptionHtml('&lt;p style="color:#464feb;position:fixed;background-image:url(javascript:alert(1))"&gt;Cotton &lt;strong&gt;comfort');
    expect(html).toContain("color:#464feb");
    expect(html).toContain("<strong>comfort</strong>");
    expect(html).not.toContain("position");
    expect(html).not.toContain("background-image");
    expect(() => normalizeProductDescriptionText("Cotton &#x110000;")).not.toThrow();
    expect(sanitizeProductDescriptionHtml("Plain cotton comfort.")).toBe("");
  });
});
