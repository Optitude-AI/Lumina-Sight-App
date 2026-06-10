export interface GuideConfig {
  thirds: boolean;
  goldenRatio: boolean;
  goldenSpiral: boolean;
  diagonals: boolean;
  center: boolean;
  symmetry: boolean;
}

const GUIDE_COLOR = "rgba(249, 115, 22, 0.7)"; // orange-500
const GUIDE_COLOR_DIM = "rgba(249, 115, 22, 0.4)";
const GUIDE_COLOR_BG = "rgba(0, 0, 0, 0.3)";

/**
 * Draw all enabled guide overlays on a canvas context
 */
export function drawGuides(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  guides: GuideConfig
) {
  ctx.save();

  if (guides.thirds) drawRuleOfThirds(ctx, width, height);
  if (guides.goldenRatio) drawGoldenRatio(ctx, width, height);
  if (guides.goldenSpiral) drawGoldenSpiral(ctx, width, height);
  if (guides.diagonals) drawDiagonals(ctx, width, height);
  if (guides.center) drawCenter(ctx, width, height);
  if (guides.symmetry) drawSymmetry(ctx, width, height);

  ctx.restore();
}

function drawRuleOfThirds(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = 1;
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
  ctx.fillStyle = GUIDE_COLOR;
  for (let i = 1; i <= 2; i++) {
    for (let j = 1; j <= 2; j++) {
      const x = (w * i) / 3;
      const y = (h * j) / 3;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGoldenRatio(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const phi = 1.618033988749895;
  ctx.strokeStyle = GUIDE_COLOR_DIM;
  ctx.lineWidth = 1;
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
  ctx.fillStyle = GUIDE_COLOR;
  const points = [gx1, gx2];
  const pointsY = [gy1, gy2];
  for (const x of points) {
    for (const y of pointsY) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGoldenSpiral(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const phi = 1.618033988749895;
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);

  // Draw Fibonacci spiral starting from the largest arc
  // We'll draw in the top-right quadrant as is traditional
  const cx = w / phi;
  const cy = h / phi;

  // Draw the spiral as a series of quarter-circle arcs
  const numTurns = 4;
  const startRadius = Math.max(w, h) * 0.02;

  ctx.beginPath();
  ctx.moveTo(cx + startRadius, cy);

  let currentX = cx + startRadius;
  let currentY = cy;
  let angle = 0;

  for (let i = 0; i < numTurns * 4; i++) {
    const radius = startRadius * Math.pow(phi, i / 4);
    const arcAngle = Math.PI / 2;
    const startAngle = angle;
    const endAngle = angle + arcAngle;

    const arcCX = currentX - radius * Math.cos(startAngle);
    const arcCY = currentY - radius * Math.sin(startAngle);

    ctx.arc(arcCX, arcCY, radius, startAngle, endAngle);

    currentX = arcCX + radius * Math.cos(endAngle);
    currentY = arcCY + radius * Math.sin(endAngle);
    angle = endAngle;
  }
  ctx.stroke();
}

function drawDiagonals(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = GUIDE_COLOR_DIM;
  ctx.lineWidth = 1;
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
  ctx.fillStyle = GUIDE_COLOR;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawCenter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = 1;
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
  ctx.strokeStyle = GUIDE_COLOR_DIM;
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

function drawSymmetry(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = GUIDE_COLOR_DIM;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 4]);

  // Vertical symmetry line
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();

  // Horizontal symmetry line
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  ctx.setLineDash([]);

  // Small arrows indicating symmetry
  const arrowSize = 8;
  ctx.fillStyle = GUIDE_COLOR;

  // Top arrow
  ctx.beginPath();
  ctx.moveTo(w / 2 - arrowSize, 10);
  ctx.lineTo(w / 2 + arrowSize, 10);
  ctx.lineTo(w / 2, 2);
  ctx.closePath();
  ctx.fill();

  // Bottom arrow
  ctx.beginPath();
  ctx.moveTo(w / 2 - arrowSize, h - 10);
  ctx.lineTo(w / 2 + arrowSize, h - 10);
  ctx.lineTo(w / 2, h - 2);
  ctx.closePath();
  ctx.fill();

  // Left arrow
  ctx.beginPath();
  ctx.moveTo(10, h / 2 - arrowSize);
  ctx.lineTo(10, h / 2 + arrowSize);
  ctx.lineTo(2, h / 2);
  ctx.closePath();
  ctx.fill();

  // Right arrow
  ctx.beginPath();
  ctx.moveTo(w - 10, h / 2 - arrowSize);
  ctx.lineTo(w - 10, h / 2 + arrowSize);
  ctx.lineTo(w - 2, h / 2);
  ctx.closePath();
  ctx.fill();
}
