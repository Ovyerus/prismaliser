import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: "/api/event",
};

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  const xForwardedFor = headers.get("X-Forwarded-For");
  const clientIp = xForwardedFor ? xForwardedFor.split(",")[0] : "";
  headers.set("X-Forwarded-For", ` ${clientIp}`);
  request.nextUrl.href = new URL("/api/event", process.env.PLAUSIBLE_HOST).href;
  return NextResponse.rewrite(request.nextUrl, { request: { headers } });
}
