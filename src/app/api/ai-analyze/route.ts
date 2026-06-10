import { NextRequest, NextResponse } from "next/server";

// ZAI API config - reads from env vars (set in Vercel/deployment dashboard)
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

    // Call the ZAI Vision API directly (works on Vercel without .z-ai-config file)
    const url = `${ZAI_BASE_URL}/chat/completions/vision`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ZAI_API_KEY}`,
      "X-Z-AI-From": "Z",
    };

    // Add optional auth headers if configured
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
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image. Please try again." },
      { status: 500 }
    );
  }
}
