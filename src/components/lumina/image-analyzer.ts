export type AnalysisMode =
  | "luminance"
  | "chroma"
  | "hybrid"
  | "squint"
  | "focus"
  | "attention"
  | "journey"
  | "negspace";

/**
 * Maximum processing dimension — downsample before analysis for speed
 */
const MAX_ANALYSIS_DIM = 1200;

/**
 * Apply analysis mode to image data and return modified ImageData.
 * Downsamples internally for heavy modes, then upscales back.
 */
export function applyAnalysis(
  sourceData: ImageData,
  mode: AnalysisMode,
  opacity: number,
  sensitivity: number
): ImageData {
  // Fast modes — process at full resolution (single-pass per pixel)
  if (mode === "luminance" || mode === "chroma" || mode === "hybrid") {
    const data = new Uint8ClampedArray(sourceData.data);
    const width = sourceData.width;
    const height = sourceData.height;
    const result = new ImageData(data, width, height);

    switch (mode) {
      case "luminance":
        applyLuminance(result, opacity);
        break;
      case "chroma":
        applyChroma(result, opacity);
        break;
      case "hybrid":
        applyHybrid(result, opacity);
        break;
    }
    return result;
  }

  // Heavy modes — downsample, process, upscale
  const { width, height } = sourceData;
  const needsDownsample = width > MAX_ANALYSIS_DIM || height > MAX_ANALYSIS_DIM;

  let processingData: ImageData;
  let scaleX = 1, scaleY = 1;

  if (needsDownsample) {
    const ratio = Math.min(MAX_ANALYSIS_DIM / width, MAX_ANALYSIS_DIM / height);
    scaleX = ratio;
    scaleY = ratio;
    const newW = Math.round(width * ratio);
    const newH = Math.round(height * ratio);
    processingData = downsample(sourceData, newW, newH);
  } else {
    processingData = new ImageData(new Uint8ClampedArray(sourceData.data), width, height);
  }

  const pw = processingData.width;
  const ph = processingData.height;
  const data = processingData.data;

  switch (mode) {
    case "squint":
      applySquintFast(data, pw, ph, opacity, sensitivity);
      break;
    case "focus":
      applyFocusMapFast(data, pw, ph, opacity, sensitivity);
      break;
    case "attention":
      applyAttentionFast(data, pw, ph, opacity, sensitivity);
      break;
    case "journey":
      applyJourneyFast(data, pw, ph, opacity, sensitivity);
      break;
    case "negspace":
      applyNegSpaceFast(data, pw, ph, opacity, sensitivity);
      break;
  }

  if (needsDownsample) {
    // Upscale back to original size
    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = pw;
    resultCanvas.height = ph;
    const rctx = resultCanvas.getContext("2d")!;
    rctx.putImageData(processingData, 0, 0);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = width;
    outCanvas.height = height;
    const octx = outCanvas.getContext("2d")!;
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(resultCanvas, 0, 0, width, height);
    return octx.getImageData(0, 0, width, height);
  }

  return processingData;
}

// ─── Downsample helper ───────────────────────────────────────────────

function downsample(source: ImageData, newW: number, newH: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(source, 0, 0);

  const out = document.createElement("canvas");
  out.width = newW;
  out.height = newH;
  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "medium";
  octx.drawImage(canvas, 0, 0, newW, newH);
  return octx.getImageData(0, 0, newW, newH);
}

// ─── Fast luminance (single pass) ────────────────────────────────────

function applyLuminance(imageData: ImageData, opacity: number) {
  const d = imageData.data;
  const inv = 1 - opacity;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i] * inv + lum * opacity;
    d[i + 1] = d[i + 1] * inv + lum * opacity;
    d[i + 2] = d[i + 2] * inv + lum * opacity;
  }
}

function applyChroma(imageData: ImageData, opacity: number) {
  const d = imageData.data;
  const inv = 1 - opacity;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const cr = d[i] - lum + 128;
    const cg = d[i + 1] - lum + 128;
    const cb = d[i + 2] - lum + 128;
    d[i] = d[i] * inv + cr * opacity;
    d[i + 1] = d[i + 1] * inv + cg * opacity;
    d[i + 2] = d[i + 2] * inv + cb * opacity;
  }
}

function applyHybrid(imageData: ImageData, opacity: number) {
  const d = imageData.data;
  const inv = 1 - opacity;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const cr = d[i] - lum + 128;
    const cg = d[i + 1] - lum + 128;
    const cb = d[i + 2] - lum + 128;
    d[i] = d[i] * inv + (lum * 0.5 + cr * 0.5) * opacity;
    d[i + 1] = d[i + 1] * inv + (lum * 0.5 + cg * 0.5) * opacity;
    d[i + 2] = d[i + 2] * inv + (lum * 0.5 + cb * 0.5) * opacity;
  }
}

// ─── Fast Squint — separable box blur (O(n) instead of O(n·r²)) ─────

function applySquintFast(
  d: Uint8ClampedArray,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  const radius = Math.max(1, Math.round(sensitivity * 2));
  const inv = 1 - opacity;

  // Build luminance map
  const lum = new Float32Array(width * height);
  for (let i = 0; i < lum.length; i++) {
    const pi = i * 4;
    lum[i] = 0.299 * d[pi] + 0.587 * d[pi + 1] + 0.114 * d[pi + 2];
  }

  // Horizontal pass
  const blurH = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    let count = 0;
    // Init window
    for (let x = 0; x <= Math.min(radius, width - 1); x++) {
      sum += lum[y * width + x];
      count++;
    }
    blurH[y * width] = sum / count;
    // Slide window
    for (let x = 1; x < width; x++) {
      const addX = Math.min(x + radius, width - 1);
      const remX = Math.max(x - radius - 1, 0);
      sum += lum[y * width + addX] - lum[y * width + remX];
      count = Math.min(x + radius, width - 1) - Math.max(x - radius, 0) + 1;
      blurH[y * width + x] = sum / count;
    }
  }

  // Vertical pass
  const blurV = new Float32Array(width * height);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    let count = 0;
    for (let y = 0; y <= Math.min(radius, height - 1); y++) {
      sum += blurH[y * width + x];
      count++;
    }
    blurV[x] = sum / count;
    for (let y = 1; y < height; y++) {
      const addY = Math.min(y + radius, height - 1);
      const remY = Math.max(y - radius - 1, 0);
      sum += blurH[addY * width + x] - blurH[remY * width + x];
      count = Math.min(y + radius, height - 1) - Math.max(y - radius, 0) + 1;
      blurV[y * width + x] = sum / count;
    }
  }

  // Apply blurred luminance as grayscale blend
  for (let i = 0; i < lum.length; i++) {
    const blurred = blurV[i];
    const pi = i * 4;
    d[pi] = d[pi] * inv + blurred * opacity;
    d[pi + 1] = d[pi + 1] * inv + blurred * opacity;
    d[pi + 2] = d[pi + 2] * inv + blurred * opacity;
  }
}

// ─── Fast Focus Map — Sobel with precomputed luminance ───────────────

function applyFocusMapFast(
  d: Uint8ClampedArray,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  const inv = 1 - opacity;
  const threshold = (11 - sensitivity) * 10;

  // Precompute luminance
  const lum = new Float32Array(width * height);
  for (let i = 0; i < lum.length; i++) {
    const pi = i * 4;
    lum[i] = 0.299 * d[pi] + 0.587 * d[pi + 1] + 0.114 * d[pi + 2];
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      const gx =
        -lum[idx - width - 1] + lum[idx - width + 1] +
        -2 * lum[idx - 1] + 2 * lum[idx + 1] +
        -lum[idx + width - 1] + lum[idx + width + 1];

      const gy =
        -lum[idx - width - 1] - 2 * lum[idx - width] - lum[idx - width + 1] +
        lum[idx + width - 1] + 2 * lum[idx + width] + lum[idx + width + 1];

      let magnitude = Math.sqrt(gx * gx + gy * gy);
      magnitude = magnitude > threshold ? Math.min(255, magnitude) : 0;

      const pi = idx * 4;
      d[pi] = d[pi] * inv + magnitude * opacity;
      d[pi + 1] = d[pi + 1] * inv + magnitude * 0.45 * opacity;
      d[pi + 2] = d[pi + 2] * inv + magnitude * 0.05 * opacity;
    }
  }
}

// ─── Fast Attention — separable box blur for contrast ────────────────

function applyAttentionFast(
  d: Uint8ClampedArray,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  const inv = 1 - opacity;
  const radius = Math.max(1, Math.round(sensitivity * 3));

  // Precompute luminance
  const lum = new Float32Array(width * height);
  for (let i = 0; i < lum.length; i++) {
    const pi = i * 4;
    lum[i] = 0.299 * d[pi] + 0.587 * d[pi + 1] + 0.114 * d[pi + 2];
  }

  // Compute local mean using separable blur (much faster than per-pixel neighbor sampling)
  const meanLum = separableBoxBlur(lum, width, height, radius);

  // Compute local variance (contrast proxy) from mean
  // variance = mean(lum²) - mean(lum)²
  const lumSq = new Float32Array(width * height);
  for (let i = 0; i < lum.length; i++) lumSq[i] = lum[i] * lum[i];
  const meanLumSq = separableBoxBlur(lumSq, width, height, radius);

  // Build attention map
  const attentionMap = new Float32Array(width * height);
  for (let i = 0; i < lum.length; i++) {
    const variance = Math.max(0, meanLumSq[i] - meanLum[i] * meanLum[i]);
    const contrast = Math.sqrt(variance);

    // Color saturation
    const pi = i * 4;
    const r = d[pi], g = d[pi + 1], b = d[pi + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    attentionMap[i] = Math.min(1, (contrast / 40 + sat + (lum[i] / 255) * 0.3) / 1.3);
  }

  // Apply heatmap coloring
  for (let i = 0; i < lum.length; i++) {
    const val = attentionMap[i];
    let hr: number, hg: number, hb: number;
    if (val < 0.25) {
      hr = 0; hg = val * 4 * 255; hb = 255;
    } else if (val < 0.5) {
      hr = 0; hg = 255; hb = (1 - (val - 0.25) * 4) * 255;
    } else if (val < 0.75) {
      hr = (val - 0.5) * 4 * 255; hg = 255; hb = 0;
    } else {
      hr = 255; hg = (1 - (val - 0.75) * 4) * 255; hb = 0;
    }
    const pi = i * 4;
    d[pi] = d[pi] * inv + hr * opacity;
    d[pi + 1] = d[pi + 1] * inv + hg * opacity;
    d[pi + 2] = d[pi + 2] * inv + hb * opacity;
  }
}

// ─── Fast Neg Space — separable blur for contrast ────────────────────

function applyNegSpaceFast(
  d: Uint8ClampedArray,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  const radius = Math.max(2, Math.round(sensitivity * 2));
  const threshold = (11 - sensitivity) * 8;

  // Precompute luminance
  const lum = new Float32Array(width * height);
  for (let i = 0; i < lum.length; i++) {
    const pi = i * 4;
    lum[i] = 0.299 * d[pi] + 0.587 * d[pi + 1] + 0.114 * d[pi + 2];
  }

  // Use variance as contrast measure (much faster than per-pixel neighbor sampling)
  const meanLum = separableBoxBlur(lum, width, height, radius);
  const lumSq = new Float32Array(width * height);
  for (let i = 0; i < lum.length; i++) lumSq[i] = lum[i] * lum[i];
  const meanLumSq = separableBoxBlur(lumSq, width, height, radius);

  for (let i = 0; i < lum.length; i++) {
    const variance = Math.max(0, meanLumSq[i] - meanLum[i] * meanLum[i]);
    const contrast = Math.sqrt(variance) * 3; // scale up for threshold comparison

    const pi = i * 4;
    if (contrast < threshold) {
      const intensity = (1 - contrast / threshold) * opacity;
      d[pi] = d[pi] * (1 - intensity) + 40 * intensity;
      d[pi + 1] = d[pi + 1] * (1 - intensity) + 100 * intensity;
      d[pi + 2] = d[pi + 2] * (1 - intensity) + 220 * intensity;
    } else {
      d[pi] = d[pi] * (1 - opacity * 0.3);
      d[pi + 1] = d[pi + 1] * (1 - opacity * 0.3);
      d[pi + 2] = d[pi + 2] * (1 - opacity * 0.3);
    }
  }
}

// ─── Fast Journey — dim image + subtle attention heatmap ────────────
// The numbered path overlay is drawn on the overlay canvas (see canvas-area.tsx)
// This function only handles the pixel-level image dimming + heatmap tint

function applyJourneyFast(
  d: Uint8ClampedArray,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  // Dim the image to make the overlay stand out
  const dimFactor = 1 - opacity * 0.55;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] * dimFactor;
    d[i + 1] = d[i + 1] * dimFactor;
    d[i + 2] = d[i + 2] * dimFactor;
  }

  // Add a subtle warm heatmap tint at high-attention areas
  const radius = Math.max(1, Math.round(sensitivity * 3));

  // Precompute luminance
  const lum = new Float32Array(width * height);
  for (let i = 0; i < lum.length; i++) {
    const pi = i * 4;
    lum[i] = 0.299 * d[pi] + 0.587 * d[pi + 1] + 0.114 * d[pi + 2];
  }

  // Compute local mean
  const meanLum = separableBoxBlur(lum, width, height, radius);

  // Compute local variance (contrast proxy)
  const lumSq = new Float32Array(width * height);
  for (let i = 0; i < lum.length; i++) lumSq[i] = lum[i] * lum[i];
  const meanLumSq = separableBoxBlur(lumSq, width, height, radius);

  // Apply subtle orange heatmap tint
  const inv = 1 - opacity * 0.25;
  for (let i = 0; i < lum.length; i++) {
    const variance = Math.max(0, meanLumSq[i] - meanLum[i] * meanLum[i]);
    const contrast = Math.sqrt(variance);
    const attention = Math.min(1, contrast / 50);

    // Color saturation bonus
    const pi = i * 4;
    const r = d[pi], g = d[pi + 1], b = d[pi + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    const val = Math.min(1, (attention * 0.7 + sat * 0.3));

    // Warm tint (orange) proportional to attention
    const tint = val * opacity * 0.35;
    d[pi] = Math.min(255, d[pi] * inv + 255 * tint);
    d[pi + 1] = Math.min(255, d[pi + 1] * inv + 160 * tint);
    d[pi + 2] = Math.min(255, d[pi + 2] * inv + 40 * tint);
  }
}

/**
 * Compute the 10 ordered eye-journey points for an image.
 * Uses saliency (contrast + saturation + luminance) to find attention peaks,
 * then orders them using a nearest-neighbor path starting from the top peak,
 * simulating how a viewer's eye would naturally scan the image.
 *
 * Returns points in IMAGE coordinates (same scale as sourceData).
 */
export function computeJourneyPoints(
  sourceData: ImageData,
  sensitivity: number
): { x: number; y: number; score: number }[] {
  const { width, height } = sourceData;
  const d = sourceData.data;

  // Downsample for speed
  const maxDim = 200;
  const ratio = Math.min(1, maxDim / Math.max(width, height));
  const sw = Math.round(width * ratio);
  const sh = Math.round(height * ratio);

  // Downsample to small canvas
  const smallCanvas = document.createElement("canvas");
  smallCanvas.width = sw;
  smallCanvas.height = sh;
  const sctx = smallCanvas.getContext("2d")!;

  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = width;
  fullCanvas.height = height;
  const fctx = fullCanvas.getContext("2d")!;
  fctx.putImageData(sourceData, 0, 0);
  sctx.drawImage(fullCanvas, 0, 0, sw, sh);

  const smallData = sctx.getImageData(0, 0, sw, sh);
  const sd = smallData.data;

  // Compute saliency map: contrast + saturation + luminance
  const lum = new Float32Array(sw * sh);
  for (let i = 0; i < lum.length; i++) {
    const pi = i * 4;
    lum[i] = 0.299 * sd[pi] + 0.587 * sd[pi + 1] + 0.114 * sd[pi + 2];
  }

  const blurRadius = Math.max(2, Math.round(sensitivity * 1.5));
  const meanLum = separableBoxBlur(lum, sw, sh, blurRadius);
  const lumSq = new Float32Array(sw * sh);
  for (let i = 0; i < lum.length; i++) lumSq[i] = lum[i] * lum[i];
  const meanLumSq = separableBoxBlur(lumSq, sw, sh, blurRadius);

  const saliency = new Float32Array(sw * sh);
  for (let i = 0; i < lum.length; i++) {
    const variance = Math.max(0, meanLumSq[i] - meanLum[i] * meanLum[i]);
    const contrast = Math.sqrt(variance);

    const pi = i * 4;
    const r = sd[pi], g = sd[pi + 1], b = sd[pi + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

    // Edge proximity bonus — eyes tend to look near edges
    const x = i % sw;
    const y = Math.floor(i / sw);
    const edgeDist = Math.min(x, sw - 1 - x, y, sh - 1 - y);
    const edgeBonus = Math.max(0, 1 - edgeDist / (Math.min(sw, sh) * 0.3)) * 0.15;

    // Center bias — eyes naturally start near center
    const cx = sw / 2, cy = sh / 2;
    const centerDist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const centerBonus = Math.max(0, 1 - centerDist / (Math.min(sw, sh) * 0.6)) * 0.2;

    saliency[i] = Math.min(1, (contrast / 40) * 0.4 + sat * 0.25 + (lum[i] / 255) * 0.15 + edgeBonus + centerBonus);
  }

  // Find top-N peak points using non-maximum suppression
  const numTargets = 10;
  const peaks: { x: number; y: number; score: number }[] = [];
  const minDist = Math.min(sw, sh) / (numTargets * 0.6); // Minimum distance between peaks
  const used = new Uint8Array(sw * sh);

  // Sort all pixels by saliency descending
  const indices = Array.from({ length: sw * sh }, (_, i) => i);
  indices.sort((a, b) => saliency[b] - saliency[a]);

  for (const idx of indices) {
    if (peaks.length >= numTargets * 3) break; // Over-sample, then we'll pick the best 10
    const px = idx % sw;
    const py = Math.floor(idx / sw);

    // Skip if too close to existing peak (non-max suppression)
    let tooClose = false;
    for (const p of peaks) {
      const dx = px - p.x;
      const dy = py - p.y;
      if (dx * dx + dy * dy < minDist * minDist) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    peaks.push({ x: px, y: py, score: saliency[idx] });
  }

  // Take top 10 by score
  peaks.sort((a, b) => b.score - a.score);
  const topPeaks = peaks.slice(0, numTargets);

  // Order peaks using nearest-neighbor heuristic starting from the most salient
  // This simulates the natural eye scanning path
  if (topPeaks.length <= 1) {
    return topPeaks.map(p => ({
      x: Math.round(p.x / ratio),
      y: Math.round(p.y / ratio),
      score: p.score,
    }));
  }

  const ordered: { x: number; y: number; score: number }[] = [];
  const remaining = [...topPeaks];

  // Start from the most salient point
  ordered.push(remaining.shift()!);

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];

    // Find the nearest remaining point, with a preference for
    // high-saliency points (weighted nearest-neighbor)
    let bestIdx = 0;
    let bestCost = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i];
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Cost = distance / saliency — lower is better
      // This balances proximity with visual importance
      const cost = dist / Math.max(0.1, p.score);
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = i;
      }
    }

    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }

  // Scale back to original image coordinates
  return ordered.map(p => ({
    x: Math.round(p.x / ratio),
    y: Math.round(p.y / ratio),
    score: p.score,
  }));
}

// ─── Separable Box Blur ──────────────────────────────────────────────

function separableBoxBlur(
  input: Float32Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  const temp = new Float32Array(width * height);
  const output = new Float32Array(width * height);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    let sum = 0;
    let count = 0;
    const rowStart = y * width;
    // Initialize window [0, radius]
    for (let x = 0; x <= Math.min(radius, width - 1); x++) {
      sum += input[rowStart + x];
      count++;
    }
    temp[rowStart] = sum / count;
    // Slide
    for (let x = 1; x < width; x++) {
      const addX = Math.min(x + radius, width - 1);
      const remX = Math.max(x - radius - 1, 0);
      sum += input[rowStart + addX] - input[rowStart + remX];
      count = Math.min(x + radius, width - 1) - Math.max(x - radius, 0) + 1;
      temp[rowStart + x] = sum / count;
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    let sum = 0;
    let count = 0;
    for (let y = 0; y <= Math.min(radius, height - 1); y++) {
      sum += temp[y * width + x];
      count++;
    }
    output[x] = sum / count;
    for (let y = 1; y < height; y++) {
      const addY = Math.min(y + radius, height - 1);
      const remY = Math.max(y - radius - 1, 0);
      sum += temp[addY * width + x] - temp[remY * width + x];
      count = Math.min(y + radius, height - 1) - Math.max(y - radius, 0) + 1;
      output[y * width + x] = sum / count;
    }
  }

  return output;
}
