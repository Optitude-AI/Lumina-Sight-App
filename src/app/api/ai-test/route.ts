import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const results: any = { tests: [] };
  const body = await req.json().catch(() => ({}));
  const timeout = body.timeout || 30000;
  
  // Test: Try to reach internal-api.z.ai with longer timeout
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeout);
    const start = Date.now();
    const resp = await fetch("https://internal-api.z.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer Z.ai",
        "X-Token": process.env.ZAI_TOKEN || "",
        "X-Chat-Id": process.env.ZAI_CHAT_ID || "",
        "X-User-Id": process.env.ZAI_USER_ID || "",
        "X-Z-AI-From": "Z",
      },
      body: JSON.stringify({
        model: "glm-4v-flash",
        messages: [{ role: "user", content: "hi" }],
        thinking: { type: "disabled" },
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    const elapsed = Date.now() - start;
    const respBody = await resp.text();
    results.tests.push({
      target: "internal-api.z.ai (with auth)",
      ok: resp.ok,
      status: resp.status,
      elapsed_ms: elapsed,
      body: respBody.substring(0, 300),
    });
  } catch (err: any) {
    results.tests.push({
      target: "internal-api.z.ai (with auth)",
      ok: false,
      error: err.message,
      cause: err.cause?.message || "?",
      code: err.cause?.code || "?",
    });
  }
  
  return NextResponse.json(results);
}
