import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";
import ProductsPage, { generateMetadata } from "../app/products/page";
import ShopPage from "../app/shop/page";

vi.mock("../app/shop/page", () => ({
  default: () => null,
  generateMetadata: vi.fn(async () => ({
    title: "Shop",
    alternates: { canonical: "/shop" },
    openGraph: { url: "/shop", title: "Shop" },
    robots: { index: false },
  })),
}));

describe("product listing routing", () => {
  it("reuses the listing and updates canonical and Open Graph URLs without losing metadata", async () => {
    expect(ProductsPage).toBe(ShopPage);
    const metadata = await generateMetadata({ searchParams: Promise.resolve({ q: "hoodie" }) });
    expect(metadata.alternates?.canonical).toBe("/products");
    expect(metadata.openGraph).toMatchObject({ url: "/products", title: "Shop" });
    expect(metadata.robots).toEqual({ index: false });
  });

  it.each(["/product", "/product/"])("redirects %s permanently and preserves filters", (path) => {
    const response = middleware(new NextRequest(`https://www.firaang.com${path}?q=hoodie&category=tees`));
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://www.firaang.com/products?q=hoodie&category=tees");
  });

  it.each(["/products", "/products/signature-tee", "/shop/menswear"])("does not redirect %s", (path) => {
    expect(middleware(new NextRequest(`https://www.firaang.com${path}`)).headers.get("location")).toBeNull();
  });

  it("redirects legacy product details to the plural route", () => {
    const response = middleware(new NextRequest("https://www.firaang.com/product/signature-tee?variant=123&utm_source=google"));
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://www.firaang.com/products/signature-tee?variant=123&utm_source=google");
  });
});