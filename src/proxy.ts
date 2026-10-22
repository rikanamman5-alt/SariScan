import { NextResponse, type NextRequest } from "next/server";

function allowedOrigin(origin: string | null) {
  if (!origin) return null;

  const configured = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.length === 0) return origin;
  return configured.includes(origin) ? origin : null;
}

function corsHeaders(origin: string) {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");
  return headers;
}

export function proxy(request: NextRequest) {
  const origin = allowedOrigin(request.headers.get("origin"));

  if (request.method === "OPTIONS") {
    if (!origin) {
      return new NextResponse(null, {
        status: 204,
        headers: { Vary: "Origin" },
      });
    }

    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  const response = NextResponse.next();

  if (origin) {
    const headers = corsHeaders(origin);
    headers.forEach((value, key) => response.headers.set(key, value));
  } else {
    response.headers.set("Vary", "Origin");
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
