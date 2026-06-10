import ZAI from "z-ai-web-dev-sdk";
import { NextRequest, NextResponse } from "next/server";

// This proxy route is called by the Vercel deployment (which can't reach internal-api.z.ai)
// It uses the ZAI SDK directly (which reads .z-ai-config from this server)
// Protected by a shared secret API key
// CORS-enabled so the browser can call it cross-origin from lumina-sight.com

const PROXY_SECRET = process.env.AI_PROXY_SECRET || "lumina-ai-proxy-2026";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://lumina-sight.com",
  "https://www.lumina-sight.com",
  "https://lumina-sight2.space-z.ai",
  "http://localhost:3000",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Proxy-Key",
    "Access-Control-Max-Age": "86400",
  };
}

// Handle CORS preflight
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  try {
    // Verify proxy secret
    const proxyKey = req.headers.get("X-Proxy-Key");
    if (proxyKey !== PROXY_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const { imageBase64, analysisType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const zai = await ZAI.create();

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

    const completion = await zai.chat.completions.createVision({
      model: "glm-4v-flash",
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
    });

    const analysis = completion?.choices?.[0]?.message?.content || "";

    if (!analysis) {
      return NextResponse.json(
        { error: "No analysis was generated" },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json({ analysis }, { headers: corsHeaders(origin) });
  } catch (error) {
    console.error("AI proxy error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image. Please try again." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
