"use client";

import { useEffect, useRef } from "react";

export interface HistogramProps {
  imageData: ImageData | null;
  rgbChannels: { r: boolean; g: boolean; b: boolean };
}

export default function Histogram({ imageData, rgbChannels }: HistogramProps) {
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

    // Build histograms
    const histR = new Uint32Array(256);
    const histG = new Uint32Array(256);
    const histB = new Uint32Array(256);
    const histL = new Uint32Array(256);

    for (let i = 0; i < data.length; i += 4) {
      histR[data[i]]++;
      histG[data[i + 1]]++;
      histB[data[i + 2]]++;
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histL[Math.min(255, lum)]++;
    }

    // Find max for normalization (skip extreme outliers at 0 and 255)
    let maxVal = 1;
    for (let i = 2; i < 254; i++) {
      if (rgbChannels.r && histR[i] > maxVal) maxVal = histR[i];
      if (rgbChannels.g && histG[i] > maxVal) maxVal = histG[i];
      if (rgbChannels.b && histB[i] > maxVal) maxVal = histB[i];
    }

    const drawChannel = (hist: Uint32Array, color: string, active: boolean) => {
      if (!active) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 * dpr;
      ctx.globalAlpha = 0.7;
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
  }, [imageData, rgbChannels]);

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
