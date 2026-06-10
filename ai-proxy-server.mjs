import { createServer } from 'http';
import ZAI from 'z-ai-web-dev-sdk';

const PROXY_SECRET = process.env.AI_PROXY_SECRET || "lumina-ai-proxy-2026";
const PORT = parseInt(process.env.PROXY_PORT || "19008");

let zaiInstance = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/analyze') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Verify proxy key
  const proxyKey = req.headers['x-proxy-key'];
  if (proxyKey !== PROXY_SECRET) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  // Read request body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { imageBase64, analysisType } = JSON.parse(body);

      if (!imageBase64) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No image data provided' }));
        return;
      }

      const zai = await getZAI();

      const systemPrompt = `You are an expert photography analyst. Analyze the provided image and give specific, actionable feedback. Be concise but thorough. Use markdown formatting with headers, bullet points, and bold text for emphasis. Structure your response clearly.`;

      let userPrompt;
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

      const completion = await zai.chat.completions.createVision({
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
      });

      const analysis = completion?.choices?.[0]?.message?.content || "";
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ analysis }));
    } catch (error) {
      console.error('Proxy error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to analyze image' }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Proxy server running on port ${PORT}`);
});
