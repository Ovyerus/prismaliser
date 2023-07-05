import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: "/api/event",
};

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  const x = headers.get("X-Forwarded-For");

  headers.set("X-Forwarded-For", x ? `${x}, ${request.ip}` : request.ip!);
  request.nextUrl.href = new URL("/api/event", process.env.PLAUSIBLE_HOST).href;

  return NextResponse.rewrite(request.nextUrl, { request: { headers } });
}
