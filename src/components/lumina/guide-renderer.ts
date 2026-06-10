export type GuideType = "thirds" | "goldenRatio" | "spiral" | "diagonals" | "center" | "dynamic";

export interface GuideConfig {
  activeGuide: GuideType | null;
  thickness: number;
  guideColor: string;
}

const GUIDE_COLOR_BG = "rgba(0, 0, 0, 0.3)";

/**
 * Draw the active guide overlay on a canvas context
 */
export function drawGuides(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  guides: GuideConfig,
  imageData?: ImageData | null
) {
  if (!guides.activeGuide) return;

  ctx.save();

  const color = guides.guideColor;
  const colorDim = hexToRgba(color.startsWith("#") ? color : "#f97316", 0.4);
  const thickness = guides.thickness;

  switch (guides.activeGuide) {
    case "thirds":
      drawRuleOfThirds(ctx, width, height, color, colorDim, thickness);
      break;
    case "goldenRatio":
      drawGoldenRatio(ctx, width, height, color, colorDim, thickness);
      break;
    case "spiral":
      drawGoldenSpiral(ctx, width, height, color, thickness);
      break;
    case "diagonals":
      drawDiagonals(ctx, width, height, color, colorDim, thickness);
      break;
    case "center":
      drawCenter(ctx, width, height, color, colorDim, thickness);
      break;
    case "dynamic":
      drawDynamic(ctx, width, height, color, thickness, imageData);
      break;
  }

  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRuleOfThirds(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  colorDim: string,
  thickness: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.setLineDash([8, 4]);

  // Vertical lines
  for (let i = 1; i <= 2; i++) {
    const x = (w * i) / 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Horizontal lines
  for (let i = 1; i <= 2; i++) {
    const y = (h * i) / 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // Draw intersection points
  ctx.fillStyle = color;
  for (let i = 1; i <= 2; i++) {
    for (let j = 1; j <= 2; j++) {
      const x = (w * i) / 3;
      const y = (h * j) / 3;
      ctx.beginPath();
      ctx.arc(x, y, 4 + thickness, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGoldenRatio(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  _colorDim: string,
  thickness: number
) {
  const phi = 1.618033988749895;
  const colorDim = hexToRgba(color.startsWith("#") ? color : "#f97316", 0.4);
  ctx.strokeStyle = colorDim;
  ctx.lineWidth = thickness;
  ctx.setLineDash([6, 3]);

  // Vertical golden ratio lines
  const gx1 = w / phi;
  const gx2 = w - gx1;
  ctx.beginPath();
  ctx.moveTo(gx1, 0);
  ctx.lineTo(gx1, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(gx2, 0);
  ctx.lineTo(gx2, h);
  ctx.stroke();

  // Horizontal golden ratio lines
  const gy1 = h / phi;
  const gy2 = h - gy1;
  ctx.beginPath();
  ctx.moveTo(0, gy1);
  ctx.lineTo(w, gy1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, gy2);
  ctx.lineTo(w, gy2);
  ctx.stroke();

  ctx.setLineDash([]);

  // Draw golden ratio intersection points
  ctx.fillStyle = color;
  const points = [gx1, gx2];
  const pointsY = [gy1, gy2];
  for (const x of points) {
    for (const y of pointsY) {
      ctx.beginPath();
      ctx.arc(x, y, 3 + thickness, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGoldenSpiral(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  thickness: number
) {
  const phi = 1.618033988749895;
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.setLineDash([]);

  // Build the Fibonacci spiral using quarter-arc segments
  // that subdivide the golden rectangle progressively.
  // Start from the largest square and work inward.

  // The golden rectangle fills the image: w × h
  // We compute the sequence of Fibonacci-like squares from large to small.

  // Generate Fibonacci numbers until they exceed the image
  const fibs: number[] = [1, 1];
  while (fibs[fibs.length - 1] < Math.max(w, h) * 2) {
    fibs.push(fibs[fibs.length - 1] + fibs[fibs.length - 2]);
  }

  // Use a unit square size that makes the spiral fill the image
  // The spiral is drawn inside the golden rectangle.
  // Scale: the total Fibonacci number that covers the largest dimension
  const fibIdx = fibs.length - 1;
  // The golden rectangle has sides in ratio phi:1
  // We want the spiral to fill the entire image area

  // Simple approach: draw the spiral as quarter arcs at each step of the golden rectangle subdivision
  // Direction cycle: right, down, left, up (each quarter turn)
  // The spiral starts at the "eye" of the spiral (the small end) and grows outward

  // We'll use a logarithmic spiral parametrically:
  // r(θ) = a * e^(b*θ) where b = ln(phi) / (π/2) so that r grows by phi every quarter turn
  const b = Math.log(phi) / (Math.PI / 2);
  // Scale 'a' so that at the final angle, the spiral fills the image
  // The spiral center is at the golden ratio point of the image
  const spiralCX = w / phi;
  const spiralCY = h / phi;

  // We want the maximum extent of the spiral to approximately fill the image
  // The farthest point from center is roughly at angle 2π * numTurns
  // r_max = a * e^(b * 2π * numTurns)
  // We want r_max ≈ distance from center to the farthest corner
  const maxDist = Math.sqrt(
    Math.max(spiralCX, w - spiralCX) ** 2 +
    Math.max(spiralCY, h - spiralCY) ** 2
  );
  const numTurns = 4;
  const totalAngle = Math.PI / 2 * 4 * numTurns; // 4 quarter-turns per full turn × numTurns
  const a = maxDist / Math.exp(b * totalAngle);

  ctx.beginPath();

  const steps = numTurns * 80; // smooth curve with many small segments
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * totalAngle;
    const r = a * Math.exp(b * theta);
    const x = spiralCX + r * Math.cos(theta);
    const y = spiralCY + r * Math.sin(theta);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Draw a small dot at the spiral's focal point (the "eye")
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(spiralCX, spiralCY, 3 + thickness, 0, Math.PI * 2);
  ctx.fill();
}

function drawDiagonals(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  _colorDim: string,
  thickness: number
) {
  const colorDim = hexToRgba(color.startsWith("#") ? color : "#f97316", 0.4);
  ctx.strokeStyle = colorDim;
  ctx.lineWidth = thickness;
  ctx.setLineDash([6, 4]);

  // Main diagonals
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(0, h);
  ctx.stroke();

  ctx.setLineDash([]);

  // Center point
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 3 + thickness, 0, Math.PI * 2);
  ctx.fill();
}

function drawCenter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  _colorDim: string,
  thickness: number
) {
  const cx = w / 2;
  const cy = h / 2;
  const colorDim = hexToRgba(color.startsWith("#") ? color : "#f97316", 0.4);

  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.setLineDash([]);

  // Crosshair
  const crossSize = 20;

  // Horizontal
  ctx.beginPath();
  ctx.moveTo(cx - crossSize, cy);
  ctx.lineTo(cx - 4, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 4, cy);
  ctx.lineTo(cx + crossSize, cy);
  ctx.stroke();

  // Vertical
  ctx.beginPath();
  ctx.moveTo(cx, cy - crossSize);
  ctx.lineTo(cx, cy - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + 4);
  ctx.lineTo(cx, cy + crossSize);
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.stroke();

  // Full cross lines (dimmer)
  ctx.strokeStyle = colorDim;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Dynamic guide: shows the largest area of visual weight (brightest/most saturated region)
 */
function drawDynamic(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  thickness: number,
  imageData: ImageData | null | undefined
) {
  if (!imageData) {
    // Fallback: draw center region
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.setLineDash([6, 3]);
    const cx = w / 2;
    const cy = h / 2;
    const rw = w * 0.3;
    const rh = h * 0.3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  const data = imageData.data;
  const imgW = imageData.width;
  const imgH = imageData.height;

  // Calculate visual weight map (combination of luminance and saturation)
  const blockSize = Math.max(4, Math.floor(Math.max(imgW, imgH) / 64));
  const gridW = Math.ceil(imgW / blockSize);
  const gridH = Math.ceil(imgH / blockSize);
  const weightMap = new Float32Array(gridW * gridH);

  let maxWeight = 0;
  let maxGX = 0;
  let maxGY = 0;

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      let totalWeight = 0;
      let count = 0;
      for (let dy = 0; dy < blockSize && gy * blockSize + dy < imgH; dy++) {
        for (let dx = 0; dx < blockSize && gx * blockSize + dx < imgW; dx++) {
          const px = gx * blockSize + dx;
          const py = gy * blockSize + dy;
          const idx = (py * imgW + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          totalWeight += lum / 255 + sat;
          count++;
        }
      }
      const avgWeight = count > 0 ? totalWeight / count : 0;
      weightMap[gy * gridW + gx] = avgWeight;
      if (avgWeight > maxWeight) {
        maxWeight = avgWeight;
        maxGX = gx;
        maxGY = gy;
      }
    }
  }

  // Find the extent of the high-weight region using flood fill from max
  const threshold = maxWeight * 0.6;
  const visited = new Uint8Array(gridW * gridH);
  const queue: [number, number][] = [[maxGX, maxGY]];
  visited[maxGY * gridW + maxGX] = 1;

  let minX = maxGX,
    maxX = maxGX,
    minY = maxGY,
    maxY = maxGY;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    minX = Math.min(minX, cx);
    maxX = Math.max(maxX, cx);
    minY = Math.min(minY, cy);
    maxY = Math.max(maxY, cy);

    const neighbors: [number, number][] = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (
        nx >= 0 &&
        nx < gridW &&
        ny >= 0 &&
        ny < gridH &&
        !visited[ny * gridW + nx] &&
        weightMap[ny * gridW + nx] >= threshold
      ) {
        visited[ny * gridW + nx] = 1;
        queue.push([nx, ny]);
      }
    }
  }

  // Scale to image coordinates
  const scaleX = w / imgW;
  const scaleY = h / imgH;
  const regionX = minX * blockSize * scaleX;
  const regionY = minY * blockSize * scaleY;
  const regionW = (maxX - minX + 1) * blockSize * scaleX;
  const regionH = (maxY - minY + 1) * blockSize * scaleY;

  // Draw the region
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.setLineDash([8, 4]);

  // Draw rounded rectangle around the visual weight region
  const padding = 10;
  const rx = regionX - padding;
  const ry = regionY - padding;
  const rw = regionW + padding * 2;
  const rh = regionH + padding * 2;
  const radius = 8;

  ctx.beginPath();
  ctx.moveTo(rx + radius, ry);
  ctx.lineTo(rx + rw - radius, ry);
  ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
  ctx.lineTo(rx + rw, ry + rh - radius);
  ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
  ctx.lineTo(rx + radius, ry + rh);
  ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
  ctx.lineTo(rx, ry + radius);
  ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
  ctx.closePath();
  ctx.stroke();

  ctx.setLineDash([]);

  // Draw center of mass marker
  const centerX = rx + rw / 2;
  const centerY = ry + rh / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5 + thickness, 0, Math.PI * 2);
  ctx.fill();

  // Draw crosshair at center of mass
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness * 0.7;
  ctx.setLineDash([]);
  const chSize = 15;
  ctx.beginPath();
  ctx.moveTo(centerX - chSize, centerY);
  ctx.lineTo(centerX - 6, centerY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX + 6, centerY);
  ctx.lineTo(centerX + chSize, centerY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - chSize);
  ctx.lineTo(centerX, centerY - 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY + 6);
  ctx.lineTo(centerX, centerY + chSize);
  ctx.stroke();
}
