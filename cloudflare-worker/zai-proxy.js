/**
 * Cloudflare Worker: Public proxy for internal-api.z.ai
 * 
 * Deploy this to Cloudflare Workers (free tier):
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create
 * 2. Name it "zai-proxy"
 * 3. Paste this code
 * 4. Save and Deploy
 * 5. Set environment variables (Settings → Variables):
 *    - ZAI_TOKEN: <the JWT token>
 *    - ZAI_CHAT_ID: chat-5b636ad1-eee0-4b67-a06d-18c8e44d3b5f
 *    - ZAI_USER_ID: 966679fd-efe9-4e6b-bd3e-c0ed4238df67
 *    - PROXY_SECRET: lumina-ai-proxy-2026
 * 6. Copy the worker URL (e.g. https://zai-proxy.your-subdomain.workers.dev)
 * 7. Set Vercel env var AI_PROXY_URL = https://zai-proxy.your-subdomain.workers.dev/analyze
 * 8. Set Vercel env var AI_PROXY_SECRET = lumina-ai-proxy-2026
 * 9. Redeploy Vercel
 */

export default {
  async fetch(request, env) {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Proxy-Key",
        },
      });
    }

    if (request.method !== "POST" || !new URL(request.url).pathname.endsWith("/analyze")) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify proxy key
    const proxyKey = request.headers.get("x-proxy-key");
    if (proxyKey !== (env.PROXY_SECRET || "lumina-ai-proxy-2026")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const { imageBase64, analysisType } = await request.json();

      if (!imageBase64) {
        return new Response(JSON.stringify({ error: "No image data provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Build prompt
      const systemPrompt = "You are an expert photography analyst. Analyze the provided image and give specific, actionable feedback. Be concise but thorough. Use markdown formatting with headers, bullet points, and bold text for emphasis. Structure your response clearly.";

      const prompts = {
        composition: "Analyze the composition of this image. Comment on rule of thirds, leading lines, balance, framing, and suggest improvements.",
        color: "Analyze the color palette and harmony of this image. Comment on color temperature, complementary colors, mood, and suggest improvements.",
        exposure: "Analyze the exposure and tonal range of this image. Comment on highlights, shadows, contrast, dynamic range, and suggest improvements.",
        default: "Provide a comprehensive analysis of this image covering composition, color, exposure, and overall impact. Give specific, actionable suggestions for improvement.",
      };
      const userPrompt = prompts[analysisType] || prompts.default;

      // Call Z.AI internal API (Cloudflare Workers can reach private IPs in some configs)
      const response = await fetch("https://internal-api.z.ai/v1/chat/completions/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer Z.ai",
          "X-Token": env.ZAI_TOKEN,
          "X-Chat-Id": env.ZAI_CHAT_ID,
          "X-User-Id": env.ZAI_USER_ID,
          "X-Z-AI-From": "Z",
        },
        body: JSON.stringify({
          model: "glm-4v-flash",
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
      });

      if (!response.ok) {
        const errBody = await response.text();
        return new Response(JSON.stringify({ error: `Z.AI API ${response.status}: ${errBody.substring(0, 200)}` }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }

      const completion = await response.json();
      const analysis = completion?.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ analysis }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
