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
      const y = x < 0.5 ? (x * 1.5) / 0.75 : 0.5 + ((x - 0.5) * 1.5) / 0.75;
      return Math.min(255, Math.max(0, Math.round(y * 255)));
    }),
  },
  {
    name: "Low Contrast",
    curve: Array.from({ length: 256 }, (_, i) => {
      const x = i / 255;
      const y = 0.25 + x * 0.5;
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
    const shadowFactor = 1 + shadows / 200;
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
  isDragging: boolean = false
) {
  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, width, height);

  // Draw grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    const x = (width * i) / 4;
    const y = (height * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw diagonal reference line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(width, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw the curve
  ctx.strokeStyle = isDragging ? "#f97316" : "rgba(249, 115, 22, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * width;
    const y = height - (curvePoints[i] / 255) * height;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Draw fill under the curve
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#f97316";
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * Handle mouse interaction on the tone curve canvas
 */
export function handleCurveDrag(
  mouseX: number,
  mouseY: number,
  canvasWidth: number,
  canvasHeight: number,
  currentCurve: number[]
): number[] {
  const inputVal = Math.min(255, Math.max(0, Math.round((mouseX / canvasWidth) * 255)));
  const outputVal = Math.min(255, Math.max(0, Math.round((1 - mouseY / canvasHeight) * 255)));

  const newCurve = [...currentCurve];

  // Set the point
  newCurve[inputVal] = outputVal;

  // Smooth the curve to avoid harsh transitions
  // Apply a gentle gaussian-like smoothing around the changed point
  const smoothRadius = 10;
  for (let offset = -smoothRadius; offset <= smoothRadius; offset++) {
    const idx = inputVal + offset;
    if (idx < 0 || idx >= 256 || offset === 0) continue;
    const weight = 1 - Math.abs(offset) / (smoothRadius + 1);
    const originalOutput = currentCurve[idx];
    const diff = outputVal - currentCurve[inputVal];
    newCurve[idx] = Math.min(255, Math.max(0, Math.round(originalOutput + diff * weight * 0.5)));
  }

  // Ensure monotonic-ish behavior (optional: let the user create non-monotonic curves)
  return newCurve;
}
