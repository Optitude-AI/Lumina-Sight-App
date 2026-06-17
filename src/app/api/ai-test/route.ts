import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const results: any = { tests: [] };
  const body = await req.json().catch(() => ({}));
  const timeout = body.timeout || 15000;
  
  // Test 1: Try internal-api.z.ai (private IP - expected to fail)
  // Test 2: Try fetching ALB directly with public IP
  const PUBLIC_IPS = ["47.239.88.7", "47.239.134.228", "47.83.197.91"];
  
  for (const ip of PUBLIC_IPS) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeout);
      const start = Date.now();
      const resp = await fetch(`https://${ip}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Host": "internal-api.z.ai",
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
        // @ts-ignore - allow insecure
        insecureHTTPParser: true,
      });
      clearTimeout(t);
      const elapsed = Date.now() - start;
      const respBody = await resp.text();
      results.tests.push({
        target: `ALB direct ${ip}`,
        ok: resp.ok,
        status: resp.status,
        elapsed_ms: elapsed,
        body: respBody.substring(0, 200),
      });
    } catch (err: any) {
      results.tests.push({
        target: `ALB direct ${ip}`,
        ok: false,
        error: err.message,
        cause: err.cause?.message || "?",
        code: err.cause?.code || "?",
      });
    }
  }
  
  return NextResponse.json(results);
}
