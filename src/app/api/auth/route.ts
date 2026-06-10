import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.SITE_PASSWORD || "lumina2026";
const COOKIE_NAME = "lumina-auth";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (password !== PASSWORD) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Password matches — set auth cookie
    const token = hashPassword(PASSWORD);
    const response = NextResponse.json({ success: true });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("lumina-auth", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
