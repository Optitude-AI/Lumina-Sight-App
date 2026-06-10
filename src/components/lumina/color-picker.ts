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
 * Draw a color wheel on a canvas context
 */
export function drawColorWheel(
  ctx: CanvasRenderingContext2D,
  size: number
) {
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius * 0.55;

  // Draw hue ring
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

  // Draw center (neutral gray)
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius - 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#666666");
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}
