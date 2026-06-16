export interface Terrain3DConfig {
  elevationScale: number;
  resolution: number;
  colorMode: "splices" | "original" | "luminance" | "heatmap" | "topo";
  darksCeiling: number;
  midtonesCeiling: number;
  darksElevation: number;
  midtonesElevation: number;
  highlightsElevation: number;
  scaleGrid: boolean;
  wireframe: boolean;
  autoRotate: boolean;
  contourLines: boolean;
}

export const DEFAULT_TERRAIN_CONFIG: Terrain3DConfig = {
  elevationScale: 3,
  resolution: 128,
  colorMode: "original",
  darksCeiling: 25,
  midtonesCeiling: 65,
  darksElevation: 1.0,
  midtonesElevation: 1.0,
  highlightsElevation: 1.0,
  scaleGrid: true,
  wireframe: false,
  autoRotate: false,
  contourLines: false,
};

/**
 * Render 3D terrain with full controls
 */
export function render3DTerrain(
  ctx: CanvasRenderingContext2D,
  sourceData: ImageData,
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  config: Terrain3DConfig,
  rotationAngle: number = 0
) {
  const step = Math.max(1, Math.floor(Math.max(imageWidth, imageHeight) / config.resolution));
  const cols = Math.floor(imageWidth / step);
  const rows = Math.floor(imageHeight / step);

  // Build height map from luminance
  const heightMap: number[][] = [];
  const lumMap: number[][] = [];
  const colorMap: [number, number, number][][] = [];

  for (let y = 0; y < rows; y++) {
    heightMap[y] = [];
    lumMap[y] = [];
    colorMap[y] = [];
    for (let x = 0; x < cols; x++) {
      const sx = Math.min(imageWidth - 1, x * step);
      const sy = Math.min(imageHeight - 1, y * step);
      const idx = (sy * imageWidth + sx) * 4;
      const r = sourceData.data[idx];
      const g = sourceData.data[idx + 1];
      const b = sourceData.data[idx + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Apply splice elevation multipliers
      let elevationMult = 1.0;
      const lumPct = lum * 100;
      if (lumPct <= config.darksCeiling) {
        elevationMult = config.darksElevation;
      } else if (lumPct <= config.midtonesCeiling) {
        elevationMult = config.midtonesElevation;
      } else {
        elevationMult = config.highlightsElevation;
      }

      heightMap[y][x] = lum * config.elevationScale * elevationMult;
      lumMap[y][x] = lum;
      colorMap[y][x] = [r, g, b];
    }
  }

  const maxHeight = 80 * config.elevationScale;
  const tileWidth = Math.min(
    canvasWidth / (cols + rows) * 1.2,
    canvasHeight / ((cols + rows) * 0.3 + maxHeight / 80) * 1.2
  );
  const tileHeight = tileWidth * 0.6;

  // Center offset
  const offsetX = canvasWidth / 2;
  const offsetY = canvasHeight * 0.35;

  // Isometric projection with rotation
  const toScreen = (x: number, y: number, z: number) => {
    const rx = x - cols / 2;
    const ry = y - rows / 2;
    const angle = rotationAngle;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const rotX = rx * cosA - ry * sinA + cols / 2;
    const rotY = rx * sinA + ry * cosA + rows / 2;

    return {
      sx: (rotX - rotY) * tileWidth / 2 + offsetX,
      sy: (rotX + rotY) * tileHeight / 2 - z * 15 + offsetY,
    };
  };

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw scale grid
  if (config.scaleGrid) {
    drawScaleGrid(ctx, cols, rows, maxHeight, toScreen);
  }

  // Draw terrain from back to front
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

      const lum = lumMap[y][x];
      const [cr, cg, cb] = colorMap[y][x];
      const fillColor = getTerrainColor(lum, cr, cg, cb, config);
      const strokeColor = getTerrainStroke(lum, cr, cg, cb, config);

      if (config.wireframe) {
        // Wireframe only
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(p00.sx, p00.sy);
        ctx.lineTo(p10.sx, p10.sy);
        ctx.lineTo(p11.sx, p11.sy);
        ctx.lineTo(p01.sx, p01.sy);
        ctx.closePath();
        ctx.stroke();
      } else {
        // Filled
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 0.3;
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

  // Draw contour lines
  if (config.contourLines) {
    drawContourLines(ctx, heightMap, lumMap, cols, rows, toScreen, config);
  }
}

function drawScaleGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  _maxHeight: number,
  toScreen: (x: number, y: number, z: number) => { sx: number; sy: number }
) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 4]);

  // Draw grid at base level (z=0)
  const gridStep = Math.max(1, Math.floor(Math.max(cols, rows) / 8));

  for (let x = 0; x <= cols; x += gridStep) {
    const p1 = toScreen(x, 0, 0);
    const p2 = toScreen(x, rows, 0);
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.stroke();
  }

  for (let y = 0; y <= rows; y += gridStep) {
    const p1 = toScreen(0, y, 0);
    const p2 = toScreen(cols, y, 0);
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function getTerrainColor(
  lum: number,
  r: number,
  g: number,
  b: number,
  config: Terrain3DConfig
): string {
  const brightness = 0.5 + lum * 0.5;

  switch (config.colorMode) {
    case "original": {
      const fr = Math.min(255, r * brightness);
      const fg = Math.min(255, g * brightness);
      const fb = Math.min(255, b * brightness);
      return `rgb(${fr},${fg},${fb})`;
    }
    case "luminance": {
      const v = Math.round(lum * 255 * brightness);
      return `rgb(${v},${v},${v})`;
    }
    case "heatmap":
      return heatmapColor(lum);
    case "splices":
      return spliceColor(lum, config, brightness);
    case "topo": {
      const v = Math.round(lum * 200 * brightness);
      return `rgb(${v},${v},${Math.min(255, v + 40)})`;
    }
    default:
      return `rgb(${r},${g},${b})`;
  }
}

function getTerrainStroke(
  lum: number,
  r: number,
  g: number,
  b: number,
  config: Terrain3DConfig
): string {
  const brightness = 0.3 + lum * 0.3;

  switch (config.colorMode) {
    case "original": {
      const fr = Math.min(255, r * brightness);
      const fg = Math.min(255, g * brightness);
      const fb = Math.min(255, b * brightness);
      return `rgba(${fr},${fg},${fb},0.3)`;
    }
    case "luminance": {
      const v = Math.round(lum * 180);
      return `rgba(${v},${v},${v},0.3)`;
    }
    case "heatmap":
      return "rgba(0,0,0,0.15)";
    case "splices":
      return "rgba(0,0,0,0.2)";
    case "topo":
      return "rgba(0,0,0,0.15)";
    default:
      return `rgba(${r * 0.5},${g * 0.5},${b * 0.5},0.3)`;
  }
}

function heatmapColor(lum: number): string {
  // Blue -> Cyan -> Green -> Yellow -> Red
  let r: number, g: number, b: number;
  if (lum < 0.25) {
    r = 0;
    g = Math.round(lum * 4 * 255);
    b = 255;
  } else if (lum < 0.5) {
    r = 0;
    g = 255;
    b = Math.round((1 - (lum - 0.25) * 4) * 255);
  } else if (lum < 0.75) {
    r = Math.round((lum - 0.5) * 4 * 255);
    g = 255;
    b = 0;
  } else {
    r = 255;
    g = Math.round((1 - (lum - 0.75) * 4) * 255);
    b = 0;
  }
  return `rgb(${r},${g},${b})`;
}

function spliceColor(
  lum: number,
  config: Terrain3DConfig,
  brightness: number
): string {
  const lumPct = lum * 100;

  if (lumPct <= config.darksCeiling) {
    // Darks - blue tint
    const v = Math.round(lum * 255 * brightness);
    return `rgb(${Math.round(v * 0.3)},${Math.round(v * 0.4)},${Math.min(255, Math.round(v * 1.2))})`;
  } else if (lumPct <= config.midtonesCeiling) {
    // Midtones - green/yellow tint
    const v = Math.round(lum * 255 * brightness);
    return `rgb(${Math.round(v * 0.6)},${Math.min(255, Math.round(v * 1.0))},${Math.round(v * 0.3)})`;
  } else {
    // Highlights - orange/red tint
    const v = Math.round(lum * 255 * brightness);
    return `rgb(${Math.min(255, Math.round(v * 1.1))},${Math.round(v * 0.7)},${Math.round(v * 0.2)})`;
  }
}

function drawContourLines(
  ctx: CanvasRenderingContext2D,
  heightMap: number[][],
  _lumMap: number[][],
  cols: number,
  rows: number,
  toScreen: (x: number, y: number, z: number) => { sx: number; sy: number },
  _config: Terrain3DConfig
) {
  const levels = 10;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 0.8;

  // Find min/max height
  let minH = Infinity,
    maxH = -Infinity;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (heightMap[y][x] < minH) minH = heightMap[y][x];
      if (heightMap[y][x] > maxH) maxH = heightMap[y][x];
    }
  }

  const range = maxH - minH || 1;
  const step = range / levels;

  for (let level = 1; level < levels; level++) {
    const threshold = minH + step * level;

    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols - 1; x++) {
        // Check if contour line crosses this cell
        const v00 = heightMap[y][x];
        const v10 = heightMap[y][x + 1];
        const v01 = heightMap[y + 1][x];
        const v11 = heightMap[y + 1][x + 1];

        // Simplified marching squares
        const points: { sx: number; sy: number }[] = [];

        // Top edge
        if ((v00 < threshold) !== (v10 < threshold)) {
          const t = (threshold - v00) / (v10 - v00);
          const z = v00 + t * (v10 - v00);
          points.push(toScreen(x + t, y, z));
        }

        // Right edge
        if ((v10 < threshold) !== (v11 < threshold)) {
          const t = (threshold - v10) / (v11 - v10);
          const z = v10 + t * (v11 - v10);
          points.push(toScreen(x + 1, y + t, z));
        }

        // Bottom edge
        if ((v01 < threshold) !== (v11 < threshold)) {
          const t = (threshold - v01) / (v11 - v01);
          const z = v01 + t * (v11 - v01);
          points.push(toScreen(x + t, y + 1, z));
        }

        // Left edge
        if ((v00 < threshold) !== (v01 < threshold)) {
          const t = (threshold - v00) / (v01 - v00);
          const z = v00 + t * (v01 - v00);
          points.push(toScreen(x, y + t, z));
        }

        if (points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].sx, points[0].sy);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].sx, points[i].sy);
          }
          ctx.stroke();
        }
      }
    }
  }
}
