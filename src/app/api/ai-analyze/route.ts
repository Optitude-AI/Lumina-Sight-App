import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// AI analysis route - works on both dev server and Vercel
// Strategy 1: If AI_PROXY_URL is set, proxy to the dev server (which can reach internal-api.z.ai)
// Strategy 2: Otherwise, try writing .z-ai-config from env vars and use the ZAI SDK directly
// Strategy 3: If SDK fails, try calling the API directly with env var credentials

const PROXY_URL = process.env.AI_PROXY_URL || "";
const PROXY_KEY = process.env.AI_PROXY_SECRET || "lumina-ai-proxy-2026";

const VISION_MODEL = "glm-4v-flash";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, analysisType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Strategy 1: Proxy to dev server (recommended for Vercel deployment)
    if (PROXY_URL) {
      try {
        return await proxyToDevServer(imageBase64, analysisType);
      } catch (proxyErr) {
        console.error("Proxy failed, falling back to direct:", proxyErr);
        // Fall through to direct approach
      }
    }

    // Strategy 2: Write .z-ai-config from env vars and use ZAI SDK
    try {
      const analysis = await callWithZAISDK(imageBase64, analysisType);
      return NextResponse.json({ analysis });
    } catch (sdkErr) {
      console.error("SDK approach failed:", sdkErr);
    }

    // Strategy 3: Direct API call with env var credentials
    try {
      const analysis = await callDirectly(imageBase64, analysisType);
      return NextResponse.json({ analysis });
    } catch (directErr) {
      console.error("Direct approach failed:", directErr);
    }

    return NextResponse.json(
      { error: "All AI analysis methods failed. Please try again later." },
      { status: 500 }
    );
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image. Please try again." },
      { status: 500 }
    );
  }
}

async function proxyToDevServer(imageBase64: string, analysisType: string): Promise<NextResponse> {
  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Proxy-Key": PROXY_KEY,
    },
    body: JSON.stringify({ imageBase64, analysisType }),
    signal: AbortSignal.timeout(60000), // 60s timeout
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Proxy error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Proxy returned error: ${data.error}`);
  }

  return NextResponse.json({ analysis: data.analysis });
}

async function callWithZAISDK(imageBase64: string, analysisType: string): Promise<string> {
  // Write .z-ai-config from env vars if they exist
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  const token = process.env.ZAI_TOKEN;
  const chatId = process.env.ZAI_CHAT_ID;
  const userId = process.env.ZAI_USER_ID;

  if (baseUrl && apiKey) {
    const configPath = path.join(process.cwd(), ".z-ai-config");
    const config = JSON.stringify({ baseUrl, apiKey, token, chatId, userId });
    try {
      fs.writeFileSync(configPath, config);
    } catch {
      // Can't write config, fall through
    }
  }

  // Dynamic import to avoid build-time issues
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
  if (!analysis) throw new Error("No analysis returned from SDK");
  return analysis;
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

  const requestBody = {
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
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Vision API error ${response.status}: ${errorBody}`);
  }

  const completion = await response.json();
  const analysis = completion?.choices?.[0]?.message?.content || "";
  if (!analysis) throw new Error("No analysis returned from direct API");
  return analysis;
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
