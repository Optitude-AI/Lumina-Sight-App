import ZAI from "z-ai-web-dev-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, analysisType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
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

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image. Please try again." },
      { status: 500 }
    );
  }
}
