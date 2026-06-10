export interface ColorInfo {
  r: number;
  g: number;
  b: number;
  hex: string;
  hsl: { h: number; s: number; l: number };
  luminance: number;
}

/**
 * Get color info from image data at a specific pixel
 */
export function getColorAtPixel(
  imageData: ImageData,
  x: number,
  y: number
): ColorInfo | null {
  const { width, data } = imageData;
  if (x < 0 || y < 0 || x >= width || y >= imageData.height) return null;

  const idx = (y * width + x) * 4;
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];

  return {
    r,
    g,
    b,
    hex: rgbToHex(r, g, b),
    hsl: rgbToHsl(r, g, b),
    luminance: 0.299 * r + 0.587 * g + 0.114 * b,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Draw a color wheel on a canvas context — improved with saturation/lightness center
 */
export function drawColorWheel(
  ctx: CanvasRenderingContext2D,
  size: number
) {
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius * 0.55;

  // Draw hue ring with slight gradient for richness
  for (let angle = 0; angle < 360; angle += 1) {
    const startAngle = ((angle - 1) * Math.PI) / 180;
    const endAngle = ((angle + 1) * Math.PI) / 180;

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
    ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
    ctx.fill();
  }

  // Draw a subtle border around the ring
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius + 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw center with saturation gradient (center = white, edges = gray)
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius - 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.5, "#cccccc");
  gradient.addColorStop(1, "#444444");
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Add a subtle crosshair at center
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy);
  ctx.lineTo(cx + 6, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx, cy + 6);
  ctx.stroke();
}

/**
 * Draw a highlight indicator on the color wheel at a specific hue
 */
export function drawColorWheelIndicator(
  ctx: CanvasRenderingContext2D,
  size: number,
  hue: number
) {
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius * 0.55;
  const midRadius = (outerRadius + innerRadius) / 2;

  const angle = (hue * Math.PI) / 180 - Math.PI / 2;
  const ix = cx + Math.cos(angle) * midRadius;
  const iy = cy + Math.sin(angle) * midRadius;

  // Draw indicator
  ctx.beginPath();
  ctx.arc(ix, iy, 5, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Extract a color palette from image data using median cut algorithm
 */
export function extractPalette(
  imageData: ImageData,
  numColors: number = 8
): ColorInfo[] {
  const data = imageData.data;
  const pixels: [number, number, number][] = [];

  // Sample pixels (skip every Nth pixel for performance)
  const step = Math.max(1, Math.floor(data.length / 4 / 10000));
  for (let i = 0; i < data.length; i += step * 4) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  const buckets = medianCut(pixels, numColors);

  // Sort by luminance for a nicer display
  const colors = buckets.map((bucket) => {
    const avgR = Math.round(bucket.reduce((s, p) => s + p[0], 0) / bucket.length);
    const avgG = Math.round(bucket.reduce((s, p) => s + p[1], 0) / bucket.length);
    const avgB = Math.round(bucket.reduce((s, p) => s + p[2], 0) / bucket.length);

    return {
      r: avgR,
      g: avgG,
      b: avgB,
      hex: rgbToHex(avgR, avgG, avgB),
      hsl: rgbToHsl(avgR, avgG, avgB),
      luminance: 0.299 * avgR + 0.587 * avgG + 0.114 * avgB,
    };
  });

  // Sort by luminance (dark to light)
  colors.sort((a, b) => a.luminance - b.luminance);

  return colors;
}

/**
 * Apply a color tint overlay to image data
 */
export function applyColorTint(
  sourceData: ImageData,
  color: ColorInfo,
  intensity: number // 0 to 1
): ImageData {
  const data = new Uint8ClampedArray(sourceData.data);
  const result = new ImageData(data, sourceData.width, sourceData.height);

  const tintR = color.r;
  const tintG = color.g;
  const tintB = color.b;
  const alpha = intensity * 0.3; // Max 30% tint

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * (1 - alpha) + tintR * alpha);
    data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + tintG * alpha);
    data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + tintB * alpha);
  }

  return result;
}

function medianCut(
  pixels: [number, number, number][],
  numColors: number
): [number, number, number][][] {
  if (pixels.length === 0) return [[[0, 0, 0]]];
  if (numColors <= 1) return [pixels];

  // Find the channel with the greatest range
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (const [r, g, b] of pixels) {
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
  }

  const rangeR = maxR - minR;
  const rangeG = maxG - minG;
  const rangeB = maxB - minB;

  let channel: 0 | 1 | 2;
  if (rangeR >= rangeG && rangeR >= rangeB) channel = 0;
  else if (rangeG >= rangeR && rangeG >= rangeB) channel = 1;
  else channel = 2;

  // Sort by the channel with greatest range
  pixels.sort((a, b) => a[channel] - b[channel]);

  const mid = Math.floor(pixels.length / 2);
  const left = pixels.slice(0, mid);
  const right = pixels.slice(mid);

  const halfColors = Math.ceil(numColors / 2);

  return [
    ...medianCut(left, halfColors),
    ...medianCut(right, numColors - halfColors),
  ];
}
