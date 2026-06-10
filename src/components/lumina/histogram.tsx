"use client";

import { useEffect, useRef } from "react";

export interface HistogramProps {
  imageData: ImageData | null;
  rgbChannels: { r: boolean; g: boolean; b: boolean };
  curvePoints?: number[]; // Tone curve to apply before computing histogram
}

export default function Histogram({ imageData, rgbChannels, curvePoints }: HistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use the actual displayed size for crisp rendering
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);

    // Only resize if significantly different to avoid infinite loops
    if (Math.abs(canvas.width - width) > 2 || Math.abs(canvas.height - height) > 2) {
      canvas.width = width;
      canvas.height = height;
    }

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h * i) / 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Vertical grid lines
    for (let i = 1; i < 4; i++) {
      const x = (w * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    if (!imageData) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = `${11 * dpr}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Load an image to see histogram", w / 2, h / 2);
      return;
    }

    const data = imageData.data;
    const hasCurve = curvePoints && curvePoints.length === 256;
    const isIdentityCurve = hasCurve && curvePoints!.every((v, i) => v === i);

    // Build histograms — apply tone curve if provided and non-trivial
    const histR = new Uint32Array(256);
    const histG = new Uint32Array(256);
    const histB = new Uint32Array(256);
    const histL = new Uint32Array(256);

    // Use sampling for very large images to avoid jank
    const totalPixels = data.length / 4;
    const sampleStep = totalPixels > 500000 ? Math.max(1, Math.floor(totalPixels / 500000)) * 4 : 4;

    for (let i = 0; i < data.length; i += sampleStep) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply tone curve if it's non-trivial
      if (hasCurve && !isIdentityCurve) {
        r = curvePoints![r];
        g = curvePoints![g];
        b = curvePoints![b];
      }

      histR[r]++;
      histG[g]++;
      histB[b]++;
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      histL[Math.min(255, lum)]++;
    }

    // Find max for normalization (skip extreme outliers at 0 and 255)
    let maxVal = 1;
    for (let i = 2; i < 254; i++) {
      if (rgbChannels.r && histR[i] > maxVal) maxVal = histR[i];
      if (rgbChannels.g && histG[i] > maxVal) maxVal = histG[i];
      if (rgbChannels.b && histB[i] > maxVal) maxVal = histB[i];
      if (histL[i] > maxVal) maxVal = histL[i];
    }

    const drawChannel = (hist: Uint32Array, color: string, active: boolean) => {
      if (!active) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2 * dpr;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();

      const barWidth = w / 256;
      for (let i = 0; i < 256; i++) {
        const x = i * barWidth;
        const barHeight = (hist[i] / maxVal) * (h - 4 * dpr);
        if (i === 0) {
          ctx.moveTo(x, h - barHeight);
        } else {
          ctx.lineTo(x, h - barHeight);
        }
      }
      ctx.stroke();

      // Fill area
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    drawChannel(histR, "#ff4444", rgbChannels.r);
    drawChannel(histG, "#44ff44", rgbChannels.g);
    drawChannel(histB, "#4488ff", rgbChannels.b);

    // Always draw luminance as a subtle overlay
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 0.8 * dpr;
    ctx.beginPath();
    const barWidth = w / 256;
    for (let i = 0; i < 256; i++) {
      const x = i * barWidth;
      const barHeight = (histL[i] / maxVal) * (h - 4 * dpr);
      if (i === 0) {
        ctx.moveTo(x, h - barHeight);
      } else {
        ctx.lineTo(x, h - barHeight);
      }
    }
    ctx.stroke();

    // Draw quarter markers at 25%, 50%, 75%
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (const pct of [0.25, 0.5, 0.75]) {
      const x = pct * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

  }, [imageData, rgbChannels, curvePoints]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={100}
      className="w-full rounded-md"
      style={{ imageRendering: "auto", aspectRatio: "280/100", minHeight: "60px" }}
    />
  );
}
