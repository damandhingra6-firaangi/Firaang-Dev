import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PREFERRED_HOSTNAME = "www.firaang.com";

export function middleware(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");

  const host = forwardedHost.split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  const proto = forwardedProto.split(",")[0]?.trim().toLowerCase() ?? "http";

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
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