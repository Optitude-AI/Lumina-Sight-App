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

// ─── Fast Journey — grid-sampled salient points ──────────────────────

function applyJourneyFast(
  d: Uint8ClampedArray,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  // Precompute luminance
  const lumMap = new Float32Array(width * height);
  for (let i = 0; i < lumMap.length; i++) {
    const pi = i * 4;
    lumMap[i] = 0.299 * d[pi] + 0.587 * d[pi + 1] + 0.114 * d[pi + 2];
  }

  // Find journey points (local maxima of luminance in grid cells)
  const step = Math.max(4, Math.round(12 - sensitivity));
  const points: { x: number; y: number; lum: number }[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      let maxLum = 0;
      let maxX = x;
      let maxY = y;
      for (let dy = 0; dy < step && y + dy < height; dy++) {
        for (let dx = 0; dx < step && x + dx < width; dx++) {
          const l = lumMap[(y + dy) * width + (x + dx)];
          if (l > maxLum) {
            maxLum = l;
            maxX = x + dx;
            maxY = y + dy;
          }
        }
      }
      points.push({ x: maxX, y: maxY, lum: maxLum });
    }
  }

  // Sort by luminance descending
  points.sort((a, b) => b.lum - a.lum);

  // Darken image slightly
  const dimFactor = 1 - opacity * 0.6;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] * dimFactor;
    d[i + 1] = d[i + 1] * dimFactor;
    d[i + 2] = d[i + 2] * dimFactor;
  }

  // Draw journey path
  const numPoints = Math.min(points.length, Math.round(sensitivity * 8));
  for (let i = 0; i < numPoints - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const t = i / numPoints;

    // Draw line between points using Bresenham
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);
    const sx = p1.x < p2.x ? 1 : -1;
    const sy = p1.y < p2.y ? 1 : -1;
    let err = dx - dy;
    let cx = p1.x;
    let cy = p1.y;

    while (cx !== p2.x || cy !== p2.y) {
      const fade = 1 - t * 0.5;
      for (let gy = -2; gy <= 2; gy++) {
        for (let gx = -2; gx <= 2; gx++) {
          const nx = cx + gx;
          const ny = cy + gy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const dist = Math.sqrt(gx * gx + gy * gy);
            const intensity = Math.max(0, 1 - dist / 3) * fade * opacity;
            const idx = (ny * width + nx) * 4;
            d[idx] = Math.min(255, d[idx] + 255 * intensity);
            d[idx + 1] = Math.min(255, d[idx + 1] + 140 * intensity);
            d[idx + 2] = Math.min(255, d[idx + 2] + 20 * intensity);
          }
        }
      }

      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
  }

  // Draw numbered circles at key points
  for (let i = 0; i < Math.min(numPoints, 8); i++) {
    const p = points[i];
    const fade = 1 - (i / 8) * 0.5;
    for (let gy = -6; gy <= 6; gy++) {
      for (let gx = -6; gx <= 6; gx++) {
        const nx = p.x + gx;
        const ny = p.y + gy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const dist = Math.sqrt(gx * gx + gy * gy);
          if (dist <= 6) {
            const intensity = (1 - dist / 7) * fade * opacity;
            const idx = (ny * width + nx) * 4;
            d[idx] = Math.min(255, d[idx] + 255 * intensity);
            d[idx + 1] = Math.min(255, d[idx + 1] + 160 * intensity);
            d[idx + 2] = Math.min(255, d[idx + 2] + 30 * intensity);
          }
        }
      }
    }
  }
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
