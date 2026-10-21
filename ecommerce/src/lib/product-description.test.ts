import { describe, expect, it } from "vitest";
import { formatProductDescriptionBlocks, getProductDescriptionSummary, normalizeProductDescriptionText } from "./product-description";

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
  });
});
