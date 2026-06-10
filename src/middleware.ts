import { NextRequest, NextResponse } from "next/server";

// Password is set via SITE_PASSWORD env var
const PASSWORD = process.env.SITE_PASSWORD || "lumina2026";
const COOKIE_NAME = "lumina-auth";
const LOGIN_PATH = "/login";

function isAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return false;

  // Simple hash check — the cookie stores a hash of the password
  // Using a basic approach since this is a shared password, not per-user auth
  try {
    const expected = hashPassword(PASSWORD);
    return cookie === expected;
  } catch {
    return false;
  }
}

function hashPassword(pwd: string): string {
  // Simple deterministic hash for cookie comparison
  // For production, use bcrypt — but middleware runs on Edge where bcrypt isn't available
  const encoder = new TextEncoder();
  const data = encoder.encode(pwd + "-lumina-sight-salt");
  // Use a simple but sufficient approach for Edge runtime
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Add a second pass for more uniqueness
  let hash2 = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const char = data[i];
    hash2 = ((hash2 << 7) + hash2) ^ char;
    hash2 = hash2 & hash2;
  }
  return `h1_${Math.abs(hash).toString(36)}_${Math.abs(hash2).toString(36)}`;
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Allow access to the login page itself
  if (pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  // Allow access to auth API route
  if (pathname === "/api/auth") {
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

  // Redirect to login page
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
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
