import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

// AI analysis route - multi-strategy approach
const PROXY_URL = process.env.AI_PROXY_URL || "";
const PROXY_KEY = process.env.AI_PROXY_SECRET || "lumina-ai-proxy-2026";
const PROXY_AUTH_COOKIE = process.env.AI_PROXY_AUTH_COOKIE || "";
const VISION_MODEL = "glm-4v-flash";

const errors: string[] = [];

export async function POST(req: NextRequest) {
  errors.length = 0;

  try {
    const { imageBase64, analysisType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Strategy 1: Proxy to dev server
    if (PROXY_URL) {
      try {
        const result = await proxyToDevServer(imageBase64, analysisType);
        return result;
      } catch (proxyErr: any) {
        errors.push(`Proxy: ${proxyErr.message}`);
      }
    }

    // Strategy 2: Write .z-ai-config and use ZAI SDK
    try {
      const analysis = await callWithZAISDK(imageBase64, analysisType);
      return NextResponse.json({ analysis });
    } catch (sdkErr: any) {
      errors.push(`SDK: ${sdkErr.message}`);
    }

    // Strategy 3: Direct API call
    try {
      const analysis = await callDirectly(imageBase64, analysisType);
      return NextResponse.json({ analysis });
    } catch (directErr: any) {
      errors.push(`Direct: ${directErr.message}`);
    }

    return NextResponse.json(
      { error: "AI analysis failed.", debug: errors },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to analyze image.", debug: [error.message] },
      { status: 500 }
    );
  }
}

async function proxyToDevServer(imageBase64: string, analysisType: string): Promise<NextResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // If proxy uses the standalone proxy server (X-Proxy-Key auth)
    if (PROXY_KEY && PROXY_URL.includes("/analyze")) {
      headers["X-Proxy-Key"] = PROXY_KEY;
    }
    
    // If proxy uses the Next.js /api/ai-analyze route (cookie auth)
    if (PROXY_AUTH_COOKIE) {
      headers["Cookie"] = PROXY_AUTH_COOKIE;
    }

    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ imageBase64, analysisType }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Proxy ${response.status}: ${errorBody.substring(0, 200)}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(`Proxy error: ${data.error}`);
    return NextResponse.json({ analysis: data.analysis });
  } finally {
    clearTimeout(timeout);
  }
}

async function callWithZAISDK(imageBase64: string, analysisType: string): Promise<string> {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  const token = process.env.ZAI_TOKEN;
  const chatId = process.env.ZAI_CHAT_ID;
  const userId = process.env.ZAI_USER_ID;

  if (baseUrl && apiKey) {
    const config = JSON.stringify({ baseUrl, apiKey, token, chatId, userId });

    // Try writing to multiple locations the SDK checks
    const configPaths = [
      path.join(process.cwd(), ".z-ai-config"),
      path.join(os.homedir(), ".z-ai-config"),
      "/tmp/.z-ai-config",
    ];

    for (const configPath of configPaths) {
      try {
        fs.writeFileSync(configPath, config);
      } catch {
        // Can't write to this path, try next
      }
    }

    // Also set HOME to /tmp so SDK finds /tmp/.z-ai-config
    const origHome = process.env.HOME;
    process.env.HOME = "/tmp";
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();

      const { systemPrompt, userPrompt } = getPrompts(analysisType);

      const completion = await zai.chat.completions.createVision({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
      });

      const analysis = completion?.choices?.[0]?.message?.content || "";
      if (!analysis) throw new Error("No analysis from SDK");
      return analysis;
    } finally {
      process.env.HOME = origHome;
    }
  }

  throw new Error("ZAI env vars not configured");
}

async function callDirectly(imageBase64: string, analysisType: string): Promise<string> {
  const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1";
  const ZAI_API_KEY = process.env.ZAI_API_KEY || "Z.ai";
  const ZAI_TOKEN = process.env.ZAI_TOKEN || "";
  const ZAI_CHAT_ID = process.env.ZAI_CHAT_ID || "";
  const ZAI_USER_ID = process.env.ZAI_USER_ID || "";

  const url = `${ZAI_BASE_URL}/chat/completions/vision`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ZAI_API_KEY}`,
    "X-Z-AI-From": "Z",
  };
  if (ZAI_TOKEN) headers["X-Token"] = ZAI_TOKEN;
  if (ZAI_CHAT_ID) headers["X-Chat-Id"] = ZAI_CHAT_ID;
  if (ZAI_USER_ID) headers["X-User-Id"] = ZAI_USER_ID;

  const { systemPrompt, userPrompt } = getPrompts(analysisType);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        thinking: { type: "disabled" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API ${response.status}: ${errorBody.substring(0, 200)}`);
    }

    const completion = await response.json();
    const analysis = completion?.choices?.[0]?.message?.content || "";
    if (!analysis) throw new Error("No analysis from direct API");
    return analysis;
  } finally {
    clearTimeout(timeout);
  }
}

function getPrompts(analysisType: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert photography analyst. Analyze the provided image and give specific, actionable feedback. Be concise but thorough. Use markdown formatting with headers, bullet points, and bold text for emphasis. Structure your response clearly.`;

  let userPrompt: string;
  switch (analysisType) {
    case "composition":
      userPrompt = "Analyze the composition of this image. Comment on rule of thirds, leading lines, balance, framing, and suggest improvements.";
      break;
    case "color":
      userPrompt = "Analyze the color palette and harmony of this image. Comment on color temperature, complementary colors, mood, and suggest improvements.";
      break;
    case "exposure":
      userPrompt = "Analyze the exposure and tonal range of this image. Comment on highlights, shadows, contrast, dynamic range, and suggest improvements.";
      break;
    default:
      userPrompt = "Provide a comprehensive analysis of this image covering composition, color, exposure, and overall impact. Give specific, actionable suggestions for improvement.";
      break;
  }
  return { systemPrompt, userPrompt };
}
