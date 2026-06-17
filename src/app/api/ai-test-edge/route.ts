import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const results: any = { runtime: "edge", tests: [] };
  
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
  
  try {
    const JWT = process.env.ZAI_TOKEN || "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch("https://internal-api.z.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer Z.ai",
        "X-Token": JWT,
        "X-Chat-Id": process.env.ZAI_CHAT_ID || "",
        "X-User-Id": process.env.ZAI_USER_ID || "",
        "X-Z-AI-From": "Z",
      },
      body: JSON.stringify({
        model: "glm-4v-flash",
        messages: [{ role: "user", content: "Say hello in one word" }],
        thinking: { type: "disabled" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const body = await resp.text();
    results.tests.push({
      target: "internal-api.z.ai (with auth)",
      ok: resp.ok,
      status: resp.status,
      body: body.substring(0, 300),
    });
  } catch (err: any) {
    results.tests.push({
      target: "internal-api.z.ai (with auth)",
      ok: false,
      error: err.message,
      cause: err.cause?.message || "?",
    });
  }
  
  return NextResponse.json(results);
}
