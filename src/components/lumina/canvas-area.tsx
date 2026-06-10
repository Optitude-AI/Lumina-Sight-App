"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { Upload, ShieldCheck } from "lucide-react";
import type { AnalysisMode } from "./image-analyzer";
import { applyAnalysis, render3DTerrain } from "./image-analyzer";
import type { GuideConfig } from "./guide-renderer";
import { drawGuides } from "./guide-renderer";
import { getColorAtPixel, type ColorInfo } from "./color-picker";

export interface CanvasAreaProps {
  image: HTMLImageElement | null;
  imageData: ImageData | null;
  onImageLoad: (img: HTMLImageElement, data: ImageData) => void;
  onImageReset: () => void;
  analysisMode: AnalysisMode;
  opacity: number;
  sensitivity: number;
  guides: GuideConfig;
  pipetteActive: boolean;
  onPickColor: (color: ColorInfo | null) => void;
  compareMode: "original" | "analysis";
  terrain3D: boolean;
  analysisActive: boolean;
  guidesActive: boolean;
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function CanvasArea({
  image,
  imageData,
  onImageLoad,
  onImageReset,
  analysisMode,
  opacity,
  sensitivity,
  guides,
  pipetteActive,
  onPickColor,
  compareMode,
  terrain3D,
  analysisActive,
  guidesActive,
  mainCanvasRef,
}: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = mainCanvasRef;
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const originalDataRef = useRef<ImageData | null>(null);

  // Track container size via state
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Compute canvas display style from state
  const canvasStyle = image
    ? (() => {
        const maxW = containerSize.width - 32;
        const maxH = containerSize.height - 32;
        if (maxW <= 0 || maxH <= 0) return {};
        const scale = Math.min(maxW / image.width, maxH / image.height, 1);
        return {
          width: `${image.width * scale}px`,
          height: `${image.height * scale}px`,
        };
      })()
    : {};

  // Handle file selection
  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          const tempCtx = tempCanvas.getContext("2d");
          if (!tempCtx) return;
          tempCtx.drawImage(img, 0, 0);
          const data = tempCtx.getImageData(0, 0, img.width, img.height);
          originalDataRef.current = new ImageData(
            new Uint8ClampedArray(data.data),
            data.width,
            data.height
          );
          onImageLoad(img, data);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [onImageLoad]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!image) {
      fileInputRef.current?.click();
    }
  }, [image]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // Canvas click for pipette
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!pipetteActive || !imageData) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      const color = getColorAtPixel(imageData, x, y);
      onPickColor(color);
    },
    [pipetteActive, imageData, onPickColor, canvasRef]
  );

  // Mouse move for live color preview
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!pipetteActive || !imageData) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      const color = getColorAtPixel(imageData, x, y);
      onPickColor(color);
    },
    [pipetteActive, imageData, onPickColor, canvasRef]
  );

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const ctx = canvas.getContext("2d");
    const octx = overlay.getContext("2d");
    if (!ctx || !octx) return;

    if (!image || !imageData) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }

    // 3D Terrain mode
    if (terrain3D && originalDataRef.current) {
      canvas.width = containerSize.width || image.width;
      canvas.height = containerSize.height || image.height;
      overlay.width = canvas.width;
      overlay.height = canvas.height;
      render3DTerrain(
        ctx,
        originalDataRef.current,
        image.width,
        image.height,
        canvas.width,
        canvas.height
      );
      octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }

    // Size canvases to image
    canvas.width = image.width;
    canvas.height = image.height;
    overlay.width = image.width;
    overlay.height = image.height;

    // Draw base image or analysis
    if (compareMode === "original" || !analysisActive) {
      ctx.drawImage(image, 0, 0);
    } else {
      // Apply analysis
      const analyzed = applyAnalysis(
        originalDataRef.current || imageData,
        analysisMode,
        opacity / 100,
        sensitivity
      );
      ctx.putImageData(analyzed, 0, 0);
    }

    // Draw guides on overlay
    octx.clearRect(0, 0, overlay.width, overlay.height);
    if (guidesActive) {
      drawGuides(octx, image.width, image.height, guides);
    }
  }, [
    image,
    imageData,
    analysisMode,
    opacity,
    sensitivity,
    guides,
    compareMode,
    terrain3D,
    analysisActive,
    guidesActive,
    containerSize,
  ]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex items-center justify-center relative overflow-hidden ${
        isDragOver ? "bg-orange-500/5" : ""
      } ${pipetteActive ? "cursor-crosshair" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />

      {!image ? (
        // Drop zone
        <div
          className={`flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-xl transition-colors ${
            isDragOver
              ? "border-orange-500 bg-orange-500/10"
              : "border-border hover:border-orange-500/50"
          }`}
        >
          <div className="size-16 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Upload className="size-8 text-orange-500" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">
              Drop an image here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              All processing happens locally in your browser
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-500">
            <ShieldCheck className="size-3" />
            <span>No data leaves your device</span>
          </div>
        </div>
      ) : (
        // Canvas area
        <div className="relative" style={canvasStyle}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: "auto" }}
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ imageRendering: "auto" }}
          />
          {/* Interactive overlay for pipette tool */}
          <div
            className="absolute inset-0"
            style={{ cursor: pipetteActive ? "crosshair" : "default" }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
          />
        </div>
      )}
    </div>
  );
}
