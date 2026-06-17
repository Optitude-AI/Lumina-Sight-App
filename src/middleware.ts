import { NextRequest, NextResponse } from "next/server";

// Password is set via SITE_PASSWORD env var
const PASSWORD = process.env.SITE_PASSWORD || "lumina2026";
const COOKIE_NAME = "lumina-auth";
const LOGIN_PATH = "/login";

function isAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return false;

  try {
    const expected = hashPassword(PASSWORD);
    return cookie === expected;
  } catch {
    return false;
  }
}

function hashPassword(pwd: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(pwd + "-lumina-sight-salt");
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  let hash2 = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const char = data[i];
    hash2 = ((hash2 << 7) + hash2) ^ char;
    hash2 = hash2 & hash2;
  }
  return `h1_${Math.abs(hash).toString(36)}_${Math.abs(hash2).toString(36)}`;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow access to the login page itself
  if (pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  // Allow access to auth API route
  if (pathname === "/api/auth") {
    return NextResponse.next();
  }

  // Allow access to AI proxy route (has its own API key auth)
  if (pathname === "/api/ai-proxy") {
    return NextResponse.next();
  }

  // Allow access to AI test routes (diagnostic only)
  if (pathname === "/api/ai-test" || pathname === "/api/ai-test-edge") {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/logo.svg") ||
    pathname.includes(".") // static files like .css, .js, .woff2, etc.
  ) {
    return NextResponse.next();
  }

  // Check authentication
  if (isAuthenticated(req)) {
    return NextResponse.next();
  }

  // Redirect to login page using the same protocol and host
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
