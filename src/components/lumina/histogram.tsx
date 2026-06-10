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

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const y = (height * i) / 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!imageData) {
      // Draw placeholder text
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "11px var(--font-geist-sans), sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Load an image to see histogram", width / 2, height / 2);
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

    // Find max for normalization
    let maxVal = 1;
    for (let i = 0; i < 256; i++) {
      if (rgbChannels.r && histR[i] > maxVal) maxVal = histR[i];
      if (rgbChannels.g && histG[i] > maxVal) maxVal = histG[i];
      if (rgbChannels.b && histB[i] > maxVal) maxVal = histB[i];
    }

    const drawChannel = (hist: Uint32Array, color: string, active: boolean) => {
      if (!active) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();

      const barWidth = width / 256;
      for (let i = 0; i < 256; i++) {
        const x = i * barWidth;
        const barHeight = (hist[i] / maxVal) * (height - 4);
        if (i === 0) {
          ctx.moveTo(x, height - barHeight);
        } else {
          ctx.lineTo(x, height - barHeight);
        }
      }
      ctx.stroke();

      // Fill area
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const barWidth = width / 256;
    for (let i = 0; i < 256; i++) {
      const x = i * barWidth;
      const barHeight = (histL[i] / maxVal) * (height - 4);
      if (i === 0) {
        ctx.moveTo(x, height - barHeight);
      } else {
        ctx.lineTo(x, height - barHeight);
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
      style={{ imageRendering: "auto" }}
    />
  );
}
