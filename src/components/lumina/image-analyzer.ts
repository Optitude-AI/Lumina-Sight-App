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
 * Apply analysis mode to image data and return modified ImageData
 */
export function applyAnalysis(
  sourceData: ImageData,
  mode: AnalysisMode,
  opacity: number,
  sensitivity: number
): ImageData {
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
    case "squint":
      applySquint(result, width, height, opacity, sensitivity);
      break;
    case "focus":
      applyFocusMap(result, width, height, opacity, sensitivity);
      break;
    case "attention":
      applyAttention(result, width, height, opacity, sensitivity);
      break;
    case "journey":
      applyJourney(result, width, height, opacity, sensitivity);
      break;
    case "negspace":
      applyNegSpace(result, width, height, opacity, sensitivity);
      break;
  }

  return result;
}

/**
 * Luminance: Convert to grayscale using weighted formula
 */
function applyLuminance(imageData: ImageData, opacity: number) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i] * (1 - opacity) + lum * opacity;
    d[i + 1] = d[i + 1] * (1 - opacity) + lum * opacity;
    d[i + 2] = d[i + 2] * (1 - opacity) + lum * opacity;
  }
}

/**
 * Chroma: Show chrominance by removing luminance
 */
function applyChroma(imageData: ImageData, opacity: number) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const cr = d[i] - lum + 128;
    const cg = d[i + 1] - lum + 128;
    const cb = d[i + 2] - lum + 128;
    d[i] = d[i] * (1 - opacity) + cr * opacity;
    d[i + 1] = d[i + 1] * (1 - opacity) + cg * opacity;
    d[i + 2] = d[i + 2] * (1 - opacity) + cb * opacity;
  }
}

/**
 * Hybrid: Blend luminance and chroma
 */
function applyHybrid(imageData: ImageData, opacity: number) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const cr = d[i] - lum + 128;
    const cg = d[i + 1] - lum + 128;
    const cb = d[i + 2] - lum + 128;
    // Blend: luminance in brightness, chroma in color
    const hr = lum * 0.5 + cr * 0.5;
    const hg = lum * 0.5 + cg * 0.5;
    const hb = lum * 0.5 + cb * 0.5;
    d[i] = d[i] * (1 - opacity) + hr * opacity;
    d[i + 1] = d[i + 1] * (1 - opacity) + hg * opacity;
    d[i + 2] = d[i + 2] * (1 - opacity) + hb * opacity;
  }
}

/**
 * Squint: Box blur to simulate squinting
 */
function applySquint(
  imageData: ImageData,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  const src = new Uint8ClampedArray(imageData.data);
  const d = imageData.data;
  const radius = Math.max(1, Math.round(sensitivity * 2));

  // Simple box blur
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const ni = (ny * width + nx) * 4;
          r += src[ni];
          g += src[ni + 1];
          b += src[ni + 2];
          count++;
        }
      }
      const idx = (y * width + x) * 4;
      const br = r / count;
      const bg = g / count;
      const bb = b / count;
      d[idx] = src[idx] * (1 - opacity) + br * opacity;
      d[idx + 1] = src[idx + 1] * (1 - opacity) + bg * opacity;
      d[idx + 2] = src[idx + 2] * (1 - opacity) + bb * opacity;
    }
  }
}

/**
 * Focus Map: Edge detection using Sobel operator
 */
function applyFocusMap(
  imageData: ImageData,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  const src = new Uint8ClampedArray(imageData.data);
  const d = imageData.data;
  const threshold = (11 - sensitivity) * 10;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Get luminance values for 3x3 neighborhood
      const getLum = (px: number, py: number) => {
        const i = (py * width + px) * 4;
        return 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
      };

      // Sobel X kernel
      const gx =
        -getLum(x - 1, y - 1) + getLum(x + 1, y - 1) +
        -2 * getLum(x - 1, y) + 2 * getLum(x + 1, y) +
        -getLum(x - 1, y + 1) + getLum(x + 1, y + 1);

      // Sobel Y kernel
      const gy =
        -getLum(x - 1, y - 1) - 2 * getLum(x, y - 1) - getLum(x + 1, y - 1) +
        getLum(x - 1, y + 1) + 2 * getLum(x, y + 1) + getLum(x + 1, y + 1);

      let magnitude = Math.sqrt(gx * gx + gy * gy);
      magnitude = magnitude > threshold ? Math.min(255, magnitude) : 0;

      const idx = (y * width + x) * 4;
      // Orange-tinted focus map
      const focusR = magnitude;
      const focusG = magnitude * 0.45;
      const focusB = magnitude * 0.05;
      d[idx] = src[idx] * (1 - opacity) + focusR * opacity;
      d[idx + 1] = src[idx + 1] * (1 - opacity) + focusG * opacity;
      d[idx + 2] = src[idx + 2] * (1 - opacity) + focusB * opacity;
    }
  }
}

/**
 * Attention: Simulate attention heatmap based on luminance contrast and color saturation
 */
function applyAttention(
  imageData: ImageData,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  const d = imageData.data;
  const radius = Math.max(1, Math.round(sensitivity * 3));

  // Build attention map
  const attentionMap = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = d[idx], g = d[idx + 1], b = d[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Color saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;

      // Contrast with surrounding area
      let contrast = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy += 2) {
        for (let dx = -radius; dx <= radius; dx += 2) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          if (nx !== x || ny !== y) {
            const ni = (ny * width + nx) * 4;
            const nlum = 0.299 * d[ni] + 0.587 * d[ni + 1] + 0.114 * d[ni + 2];
            contrast += Math.abs(lum - nlum);
            count++;
          }
        }
      }
      contrast = count > 0 ? contrast / count : 0;

      // Combine factors
      attentionMap[y * width + x] = Math.min(1, (contrast / 80 + sat + (lum / 255) * 0.3) / 1.3);
    }
  }

  // Apply heatmap coloring
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const val = attentionMap[y * width + x];
      // Heatmap: blue -> cyan -> green -> yellow -> red
      let hr: number, hg: number, hb: number;
      if (val < 0.25) {
        hr = 0;
        hg = val * 4 * 255;
        hb = 255;
      } else if (val < 0.5) {
        hr = 0;
        hg = 255;
        hb = (1 - (val - 0.25) * 4) * 255;
      } else if (val < 0.75) {
        hr = (val - 0.5) * 4 * 255;
        hg = 255;
        hb = 0;
      } else {
        hr = 255;
        hg = (1 - (val - 0.75) * 4) * 255;
        hb = 0;
      }
      d[idx] = d[idx] * (1 - opacity) + hr * opacity;
      d[idx + 1] = d[idx + 1] * (1 - opacity) + hg * opacity;
      d[idx + 2] = d[idx + 2] * (1 - opacity) + hb * opacity;
    }
  }
}

/**
 * Journey: Show eye movement path through brightest point flow
 */
function applyJourney(
  imageData: ImageData,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  const d = imageData.data;
  const src = new Uint8ClampedArray(d);

  // First, apply a slight blur to find salient regions
  const lumMap = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      lumMap[y * width + x] = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
    }
  }

  // Find journey points (local maxima of luminance)
  const step = Math.max(4, Math.round(12 - sensitivity));
  const points: { x: number; y: number; lum: number }[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      // Find max in this cell
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

  // Sort by luminance descending (eye visits bright areas first)
  points.sort((a, b) => b.lum - a.lum);

  // Darken image slightly
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] * (1 - opacity * 0.6);
    d[i + 1] = d[i + 1] * (1 - opacity * 0.6);
    d[i + 2] = d[i + 2] * (1 - opacity * 0.6);
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
      // Draw dot with glow
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

/**
 * Neg Space: Highlight negative space (low-contrast areas)
 */
function applyNegSpace(
  imageData: ImageData,
  width: number,
  height: number,
  opacity: number,
  sensitivity: number
) {
  const d = imageData.data;
  const src = new Uint8ClampedArray(d);
  const radius = Math.max(2, Math.round(sensitivity * 2));
  const threshold = (11 - sensitivity) * 8;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];

      // Calculate local contrast
      let contrast = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          if (nx !== x || ny !== y) {
            const ni = (ny * width + nx) * 4;
            const nlum = 0.299 * src[ni] + 0.587 * src[ni + 1] + 0.114 * src[ni + 2];
            contrast += Math.abs(lum - nlum);
            count++;
          }
        }
      }
      contrast = count > 0 ? contrast / count : 0;

      // Low contrast = negative space -> highlight with blue tint
      const isNegSpace = contrast < threshold;
      if (isNegSpace) {
        const intensity = (1 - contrast / threshold) * opacity;
        d[idx] = d[idx] * (1 - intensity) + 40 * intensity;
        d[idx + 1] = d[idx + 1] * (1 - intensity) + 100 * intensity;
        d[idx + 2] = d[idx + 2] * (1 - intensity) + 220 * intensity;
      } else {
        // Dim the non-negative space
        d[idx] = d[idx] * (1 - opacity * 0.3);
        d[idx + 1] = d[idx + 1] * (1 - opacity * 0.3);
        d[idx + 2] = d[idx + 2] * (1 - opacity * 0.3);
      }
    }
  }
}

/**
 * 3D Terrain: Render luminance as isometric terrain
 */
export function render3DTerrain(
  ctx: CanvasRenderingContext2D,
  sourceData: ImageData,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
) {
  // Downsample for performance
  const step = Math.max(2, Math.floor(Math.max(width, height) / 150));
  const cols = Math.floor(width / step);
  const rows = Math.floor(height / step);

  // Build height map from luminance
  const heightMap: number[][] = [];
  for (let y = 0; y < rows; y++) {
    heightMap[y] = [];
    for (let x = 0; x < cols; x++) {
      const sx = Math.min(width - 1, x * step);
      const sy = Math.min(height - 1, y * step);
      const idx = (sy * width + sx) * 4;
      heightMap[y][x] = (0.299 * sourceData.data[idx] + 0.587 * sourceData.data[idx + 1] + 0.114 * sourceData.data[idx + 2]) / 255;
    }
  }

  const maxHeight = 80;
  const tileWidth = canvasWidth / (cols + rows) * 1.2;
  const tileHeight = tileWidth * 0.6;

  // Center offset
  const offsetX = canvasWidth / 2;
  const offsetY = canvasHeight * 0.3;

  // Isometric projection
  const toScreen = (x: number, y: number, z: number) => ({
    sx: (x - y) * tileWidth / 2 + offsetX,
    sy: (x + y) * tileHeight / 2 - z * maxHeight + offsetY
  });

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw from back to front
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const z00 = heightMap[y][x];
      const z10 = heightMap[y][x + 1];
      const z01 = heightMap[y + 1][x];
      const z11 = heightMap[y + 1][x + 1];

      const p00 = toScreen(x, y, z00);
      const p10 = toScreen(x + 1, y, z10);
      const p01 = toScreen(x, y + 1, z01);
      const p11 = toScreen(x + 1, y + 1, z11);

      // Get color from image
      const sx = Math.min(width - 1, x * step);
      const sy = Math.min(height - 1, y * step);
      const idx = (sy * width + sx) * 4;

      const brightness = 0.5 + z00 * 0.5;
      const r = Math.min(255, sourceData.data[idx] * brightness);
      const g = Math.min(255, sourceData.data[idx + 1] * brightness);
      const b = Math.min(255, sourceData.data[idx + 2] * brightness);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.strokeStyle = `rgba(${r * 0.7},${g * 0.7},${b * 0.7},0.3)`;
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      ctx.moveTo(p00.sx, p00.sy);
      ctx.lineTo(p10.sx, p10.sy);
      ctx.lineTo(p11.sx, p11.sy);
      ctx.lineTo(p01.sx, p01.sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}
