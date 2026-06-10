import { NextRequest, NextResponse } from "next/server";

// On the dev server (space-z.ai), the ZAI SDK has access to internal-api.z.ai via .z-ai-config
// On Vercel, the SDK can't reach internal-api.z.ai, so we proxy through the dev server's /api/ai-proxy
// The PROXY_URL env var is set on Vercel to point to the dev server's proxy endpoint

const PROXY_URL = process.env.AI_PROXY_URL || ""; // e.g. "https://lumina-sight2.space-z.ai/api/ai-proxy"
const PROXY_KEY = process.env.AI_PROXY_SECRET || "lumina-ai-proxy-2026";

// Local ZAI config (only works on the dev server where .z-ai-config exists)
const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1";
const ZAI_API_KEY = process.env.ZAI_API_KEY || "Z.ai";
const ZAI_TOKEN = process.env.ZAI_TOKEN || "";
const ZAI_CHAT_ID = process.env.ZAI_CHAT_ID || "";
const ZAI_USER_ID = process.env.ZAI_USER_ID || "";

const VISION_MODEL = "glm-4v-flash";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, analysisType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Strategy 1: If we have a proxy URL configured, use it (for Vercel deployment)
    if (PROXY_URL) {
      return await proxyToDevServer(imageBase64, analysisType);
    }

    // Strategy 2: Try using the ZAI SDK directly (works on dev server where .z-ai-config exists)
    return await callDirectly(imageBase64, analysisType);

  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image. Please try again." },
      { status: 500 }
    );
  }
}

async function proxyToDevServer(imageBase64: string, analysisType: string): Promise<NextResponse> {
  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Key": PROXY_KEY,
      },
      body: JSON.stringify({ imageBase64, analysisType }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Proxy error:", response.status, errorBody);
      return NextResponse.json(
        { error: `AI proxy returned error (${response.status}). Please try again.` },
        { status: 500 }
      );
    }

    const data = await response.json();
    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    return NextResponse.json({ analysis: data.analysis });
  } catch (error) {
    console.error("Proxy fetch error:", error);
    return NextResponse.json(
      { error: "Failed to connect to AI proxy. Please try again." },
      { status: 500 }
    );
  }
}

async function callDirectly(imageBase64: string, analysisType: string): Promise<NextResponse> {
  const systemPrompt = `You are an expert photography analyst. Analyze the provided image and give specific, actionable feedback. Be concise but thorough. Use markdown formatting with headers, bullet points, and bold text for emphasis. Structure your response clearly.`;

  let userPrompt: string;
  switch (analysisType) {
    case "composition":
      userPrompt =
        "Analyze the composition of this image. Comment on rule of thirds, leading lines, balance, framing, and suggest improvements.";
      break;
    case "color":
      userPrompt =
        "Analyze the color palette and harmony of this image. Comment on color temperature, complementary colors, mood, and suggest improvements.";
      break;
    case "exposure":
      userPrompt =
        "Analyze the exposure and tonal range of this image. Comment on highlights, shadows, contrast, dynamic range, and suggest improvements.";
      break;
    default:
      userPrompt =
        "Provide a comprehensive analysis of this image covering composition, color, exposure, and overall impact. Give specific, actionable suggestions for improvement.";
      break;
  }

  // Call the ZAI Vision API directly using env vars
  const url = `${ZAI_BASE_URL}/chat/completions/vision`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ZAI_API_KEY}`,
    "X-Z-AI-From": "Z",
  };

  if (ZAI_TOKEN) headers["X-Token"] = ZAI_TOKEN;
  if (ZAI_CHAT_ID) headers["X-Chat-Id"] = ZAI_CHAT_ID;
  if (ZAI_USER_ID) headers["X-User-Id"] = ZAI_USER_ID;

  const requestBody = {
    model: VISION_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
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
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Vision API error:", response.status, errorBody);
    return NextResponse.json(
      { error: `AI service returned error (${response.status}). Please try again.` },
      { status: 500 }
    );
  }

  const completion = await response.json();
  const analysis = completion?.choices?.[0]?.message?.content || "";

  if (!analysis) {
    return NextResponse.json({ error: "No analysis was generated. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ analysis });
}
