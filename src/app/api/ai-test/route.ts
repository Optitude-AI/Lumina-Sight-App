import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const results: any = { tests: [] };
  
  // Test 1: Try to reach internal-api.z.ai
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch("https://internal-api.z.ai/v1/", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    results.tests.push({
      target: "internal-api.z.ai",
      ok: true,
      status: resp.status,
    });
  } catch (err: any) {
    results.tests.push({
      target: "internal-api.z.ai",
      ok: false,
      error: err.message,
      cause: err.cause?.message || "?",
    });
  }
  
  // Test 2: Try public Z.AI API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "glm-4v-flash", messages: [{ role: "user", content: "hi" }] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    results.tests.push({
      target: "api.z.ai",
      ok: true,
      status: resp.status,
      body: (await resp.text()).substring(0, 200),
    });
  } catch (err: any) {
    results.tests.push({
      target: "api.z.ai",
      ok: false,
      error: err.message,
      cause: err.cause?.message || "?",
    });
  }
  
  return NextResponse.json(results);
}
