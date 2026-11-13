import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveShopifyProductUrl } from "@/lib/product-url";

const PREFERRED_HOSTNAME = "www.firaang.com";

export function middleware(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");

  const host = forwardedHost.split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  const proto = forwardedProto.split(",")[0]?.trim().toLowerCase() ?? "http";

  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (request.nextUrl.pathname === "/product" || request.nextUrl.pathname === "/product/") {
    const listingRedirect = new URL(request.url);
    listingRedirect.pathname = "/products";
    if (!isLocalHost) {
      listingRedirect.protocol = "https:";
      listingRedirect.hostname = PREFERRED_HOSTNAME;
      listingRedirect.port = "";
    }
    return NextResponse.redirect(listingRedirect, 301);
  }

  const productRedirect = resolveShopifyProductUrl(request.nextUrl);
  if (productRedirect) {
    if (!isLocalHost) {
      productRedirect.protocol = "https:";
      productRedirect.hostname = PREFERRED_HOSTNAME;
      productRedirect.port = "";
    }
    return NextResponse.redirect(productRedirect, 301);
  }

  if (isLocalHost) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/&" || request.nextUrl.pathname === "/$") {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.hostname = PREFERRED_HOSTNAME;
    redirectUrl.protocol = "https:";
    return NextResponse.redirect(redirectUrl, 308);
  }

  const needsWww = hostname !== PREFERRED_HOSTNAME;
  const needsHttps = proto !== "https";

  if (!needsWww && !needsHttps) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = "https:";
  redirectUrl.hostname = PREFERRED_HOSTNAME;
  redirectUrl.port = "";

  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|site.webmanifest).*)"],
};