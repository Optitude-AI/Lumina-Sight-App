export interface ToneCurveConfig {
  brightness: number;
  contrast: number;
  shadows: number;
  highlights: number;
  curvePoints: number[]; // 256 values mapping input -> output
}

export const TONE_PRESETS: { name: string; curve: number[] }[] = [
  {
    name: "Linear",
    curve: Array.from({ length: 256 }, (_, i) => i),
  },
  {
    name: "High Contrast",
    curve: Array.from({ length: 256 }, (_, i) => {
      const x = i / 255;
      // S-curve for high contrast
      const y = 1 / (1 + Math.exp(-8 * (x - 0.5)));
      return Math.min(255, Math.max(0, Math.round(y * 255)));
    }),
  },
  {
    name: "Low Contrast",
    curve: Array.from({ length: 256 }, (_, i) => {
      const x = i / 255;
      // Inverse S-curve for low contrast
      const y = 0.5 + (x - 0.5) * 0.6;
      return Math.min(255, Math.max(0, Math.round(y * 255)));
    }),
  },
  {
    name: "Brighten",
    curve: Array.from({ length: 256 }, (_, i) => {
      const x = i / 255;
      const y = Math.pow(x, 0.6);
      return Math.min(255, Math.max(0, Math.round(y * 255)));
    }),
  },
  {
    name: "Darken",
    curve: Array.from({ length: 256 }, (_, i) => {
      const x = i / 255;
      const y = Math.pow(x, 1.8);
      return Math.min(255, Math.max(0, Math.round(y * 255)));
    }),
  },
  {
    name: "High Key",
    curve: Array.from({ length: 256 }, (_, i) => {
      const x = i / 255;
      const y = 0.15 + x * 0.75;
      return Math.min(255, Math.max(0, Math.round(y * 255)));
    }),
  },
  {
    name: "Low Key",
    curve: Array.from({ length: 256 }, (_, i) => {
      const x = i / 255;
      const y = x * 0.6 + 0.1;
      return Math.min(255, Math.max(0, Math.round(y * 255)));
    }),
  },
  {
    name: "Fade",
    curve: Array.from({ length: 256 }, (_, i) => {
      const x = i / 255;
      const y = 0.15 + x * 0.7;
      return Math.min(255, Math.max(0, Math.round(y * 255)));
    }),
  },
];

export const DEFAULT_TONE_CONFIG: ToneCurveConfig = {
  brightness: 0,
  contrast: 0,
  shadows: 0,
  highlights: 0,
  curvePoints: Array.from({ length: 256 }, (_, i) => i),
};

/**
 * Generate a tone curve from sliders
 */
export function generateCurveFromSliders(
  brightness: number,
  contrast: number,
  shadows: number,
  highlights: number
): number[] {
  const curve: number[] = [];

  for (let i = 0; i < 256; i++) {
    let v = i;

    // Apply brightness (shift the whole curve up/down)
    v = v + brightness * 2.55;

    // Apply contrast (S-curve around midpoint)
    const contrastFactor = (contrast + 100) / 100;
    const normalized = (v - 128) / 128;
    v = 128 + normalized * contrastFactor * 128;

    // Apply shadows (affect the dark tones)
    if (v < 128) {
      const t = v / 128;
      const shadowAdjust = (1 - Math.pow(t, 0.5)) * shadows * 1.5;
      v = v + shadowAdjust;
    }

    // Apply highlights (affect the bright tones)
    if (v > 128) {
      const t = (v - 128) / 127;
      const highlightAdjust = Math.pow(t, 0.5) * highlights * 1.5;
      v = v + highlightAdjust;
    }

    curve.push(Math.min(255, Math.max(0, Math.round(v))));
  }

  return curve;
}

/**
 * Apply tone curve to image data
 */
export function applyToneCurve(
  sourceData: ImageData,
  curvePoints: number[]
): ImageData {
  const data = new Uint8ClampedArray(sourceData.data);
  const result = new ImageData(data, sourceData.width, sourceData.height);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = curvePoints[Math.min(255, Math.max(0, data[i]))];
    data[i + 1] = curvePoints[Math.min(255, Math.max(0, data[i + 1]))];
    data[i + 2] = curvePoints[Math.min(255, Math.max(0, data[i + 2]))];
  }

  return result;
}

/**
 * Draw tone curve editor on a canvas
 */
export function drawToneCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  curvePoints: number[],
  isDragging: boolean = false,
  dragInputVal: number = -1
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = width;
  const h = height;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, w, h);

  // Draw grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    const x = (w * i) / 4;
    const y = (h * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw diagonal reference line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw the curve with anti-aliasing
  ctx.strokeStyle = isDragging ? "#f97316" : "rgba(249, 115, 22, 0.9)";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();

  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * w;
    const y = h - (curvePoints[i] / 255) * h;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Draw fill under the curve
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#f97316";
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Draw quarter-point markers (shadows, midtones, highlights control points)
  const markers = [
    { input: 64, label: "S" },  // Shadows
    { input: 128, label: "M" }, // Midtones
    { input: 192, label: "H" }, // Highlights
  ];

  for (const marker of markers) {
    const mx = (marker.input / 255) * w;
    const my = h - (curvePoints[marker.input] / 255) * h;
    const isAtDragPoint = Math.abs(marker.input - dragInputVal) < 15;

    // Outer circle
    ctx.beginPath();
    ctx.arc(mx, my, isAtDragPoint ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isAtDragPoint ? "#f97316" : "rgba(255, 255, 255, 0.6)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // If dragging, show a large indicator at the current position
  if (isDragging && dragInputVal >= 0 && dragInputVal < 256) {
    const dx = (dragInputVal / 255) * w;
    const dy = h - (curvePoints[dragInputVal] / 255) * h;

    // Crosshair lines
    ctx.strokeStyle = "rgba(249, 115, 22, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(dx, 0);
    ctx.lineTo(dx, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, dy);
    ctx.lineTo(w, dy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Value tooltip
    const outputVal = curvePoints[dragInputVal];
    const tooltipText = `In: ${dragInputVal}  Out: ${outputVal}`;
    ctx.font = `${10 * dpr}px monospace`;
    const textWidth = ctx.measureText(tooltipText).width;
    const tooltipX = Math.min(dx + 8, w - textWidth - 8);
    const tooltipY = Math.max(dy - 12, 14);

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(tooltipX - 4, tooltipY - 10, textWidth + 8, 14);
    ctx.fillStyle = "#f97316";
    ctx.fillText(tooltipText, tooltipX, tooltipY);
  }
}

/**
 * Handle mouse interaction on the tone curve canvas
 * Now accepts properly scaled coordinates (in canvas pixel space)
 */
export function handleCurveDrag(
  mouseCanvasX: number,
  mouseCanvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  currentCurve: number[]
): { curve: number[]; inputVal: number } {
  const inputVal = Math.min(255, Math.max(0, Math.round((mouseCanvasX / canvasWidth) * 255)));
  const outputVal = Math.min(255, Math.max(0, Math.round((1 - mouseCanvasY / canvasHeight) * 255)));

  const newCurve = [...currentCurve];

  // Set the center point
  newCurve[inputVal] = outputVal;

  // Smooth the curve using a wider gaussian-like kernel for smooth interaction
  const smoothRadius = 20;
  for (let offset = -smoothRadius; offset <= smoothRadius; offset++) {
    const idx = inputVal + offset;
    if (idx < 0 || idx >= 256 || offset === 0) continue;

    // Gaussian-like weight: stronger near center, fading at edges
    const weight = Math.exp(-(offset * offset) / (2 * (smoothRadius / 2.5) * (smoothRadius / 2.5)));
    const diff = outputVal - currentCurve[inputVal];
    newCurve[idx] = Math.min(255, Math.max(0, Math.round(currentCurve[idx] + diff * weight * 0.7)));
  }

  // Ensure endpoints stay clamped
  newCurve[0] = Math.max(0, Math.min(255, newCurve[0]));
  newCurve[255] = Math.max(0, Math.min(255, newCurve[255]));

  return { curve: newCurve, inputVal };
}
