"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Upload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisMode } from "./image-analyzer";
import { applyAnalysis } from "./image-analyzer";
import type { GuideConfig } from "./guide-renderer";
import { drawGuides } from "./guide-renderer";
import { getColorAtPixel, type ColorInfo } from "./color-picker";
import type { Terrain3DConfig } from "./terrain-3d";
import { applyToneCurve, type ToneCurveConfig } from "./tone-editor";
import CropTool, { type CropRegion } from "./crop-tool";

// Dynamic import for R3F terrain — no SSR
const Terrain3DView = dynamic(() => import("./terrain-3d"), { ssr: false });

export interface CanvasAreaProps {
  image: HTMLImageElement | null;
  imageData: ImageData | null;
  onImageLoad: (img: HTMLImageElement, data: ImageData) => void;
  onImageReset: () => void;
  analysisMode: AnalysisMode;
  opacity: number;
  sensitivity: number;
  guideConfig: GuideConfig;
  pipetteActive: boolean;
  onPickColor: (color: ColorInfo | null) => void;
  compareMode: "original" | "analysis";
  terrain3D: boolean;
  analysisActive: boolean;
  guidesActive: boolean;
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  toneConfig: ToneCurveConfig;
  terrainConfig: Terrain3DConfig;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  // Crop
  cropActive: boolean;
  onCropApply: (region: CropRegion) => void;
  onCropCancel: () => void;
  // Export - expose overlay ref
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function CanvasArea({
  image,
  imageData,
  onImageLoad,
  onImageReset: _onImageReset,
  analysisMode,
  opacity,
  sensitivity,
  guideConfig,
  pipetteActive,
  onPickColor,
  compareMode,
  terrain3D,
  analysisActive,
  guidesActive,
  mainCanvasRef,
  toneConfig,
  terrainConfig,
  zoom,
  onZoomChange,
  cropActive,
  onCropApply,
  onCropCancel,
  overlayCanvasRef,
}: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = mainCanvasRef;
  const overlayRef = overlayCanvasRef;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const originalDataRef = useRef<ImageData | null>(null);

  // Track container size via state
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Pinch-to-zoom state
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

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
        const scale = Math.min(maxW / image.width, maxH / image.height, 1) * (zoom / 100);
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

  // Pick color at given client coordinates (shared by mouse and touch)
  const pickColorAtClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!pipetteActive || !imageData) return;
      if (cropActive) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((clientX - rect.left) * scaleX);
      const y = Math.floor((clientY - rect.top) * scaleY);

      const color = getColorAtPixel(imageData, x, y);
      onPickColor(color);
    },
    [pipetteActive, imageData, onPickColor, canvasRef, cropActive]
  );

  // Canvas click for pipette (mouse)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      pickColorAtClient(e.clientX, e.clientY);
    },
    [pickColorAtClient]
  );

  // Mouse move for live color preview
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      pickColorAtClient(e.clientX, e.clientY);
    },
    [pickColorAtClient]
  );

  // Touch start for pipette
  const handleCanvasTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!pipetteActive) return;
      e.preventDefault();
      if (e.touches[0]) {
        pickColorAtClient(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [pipetteActive, pickColorAtClient]
  );

  // Touch move for pipette
  const handleCanvasTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pipetteActive) return;
      e.preventDefault();
      if (e.touches[0]) {
        pickColorAtClient(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [pipetteActive, pickColorAtClient]
  );

  // Mouse wheel for zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!image) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      onZoomChange(Math.max(10, Math.min(400, zoom + delta)));
    },
    [image, zoom, onZoomChange]
  );

  // Pinch-to-zoom: touch start
  const handlePinchTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        pinchStartRef.current = { dist, zoom };
      }
    },
    [zoom]
  );

  // Pinch-to-zoom: touch move
  const handlePinchTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStartRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / pinchStartRef.current.dist;
        onZoomChange(Math.max(10, Math.min(400, Math.round(pinchStartRef.current.zoom * scale))));
      }
    },
    [onZoomChange]
  );

  // Pinch-to-zoom: touch end
  const handlePinchTouchEnd = useCallback(() => {
    pinchStartRef.current = null;
  }, []);

  // Combined container touch handler for pinch zoom
  const handleContainerTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!image || terrain3D) return;
      // If pipette is active and single touch, handle pipette
      if (pipetteActive && e.touches.length === 1) {
        handleCanvasTouchStart(e);
      }
      // If two touches, handle pinch zoom
      if (e.touches.length === 2) {
        handlePinchTouchStart(e);
      }
    },
    [image, terrain3D, pipetteActive, handleCanvasTouchStart, handlePinchTouchStart]
  );

  const handleContainerTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!image || terrain3D) return;
      if (pipetteActive && e.touches.length === 1) {
        handleCanvasTouchMove(e);
      }
      if (e.touches.length === 2) {
        handlePinchTouchMove(e);
      }
    },
    [image, terrain3D, pipetteActive, handleCanvasTouchMove, handlePinchTouchMove]
  );

  const handleContainerTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      handlePinchTouchEnd();
    },
    [handlePinchTouchEnd]
  );

  // Render 2D canvas (non-terrain mode) — debounced with requestAnimationFrame
  useEffect(() => {
    if (terrain3D && image) return; // 3D terrain handled by R3F

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    let cancelled = false;

    // Use requestAnimationFrame to debounce rapid state changes
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;

      const ctx = canvas.getContext("2d");
      const octx = overlay.getContext("2d");
      if (!ctx || !octx) return;

      if (!image || !imageData) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        octx.clearRect(0, 0, overlay.width, overlay.height);
        return;
      }

      // Size canvases to image
      canvas.width = image.width;
      canvas.height = image.height;
      overlay.width = image.width;
      overlay.height = image.height;

      // Draw base image or analysis
      // Show analysis when: analysisActive AND compareMode === "analysis"
      // Show original when: !analysisActive OR compareMode === "original"
      const showAnalysis = analysisActive && compareMode === "analysis";

      if (showAnalysis) {
        let sourceData = originalDataRef.current || imageData;
        if (toneConfig && originalDataRef.current) {
          const isDefaultCurve = toneConfig.curvePoints.every((v, i) => v === i) &&
            toneConfig.brightness === 0 &&
            toneConfig.contrast === 0 &&
            toneConfig.shadows === 0 &&
            toneConfig.highlights === 0;

          if (!isDefaultCurve) {
            sourceData = applyToneCurve(originalDataRef.current, toneConfig.curvePoints);
          }
        }
        const analyzed = applyAnalysis(
          sourceData,
          analysisMode,
          opacity / 100,
          sensitivity
        );
        ctx.putImageData(analyzed, 0, 0);
      } else {
        // Show original image (possibly with tone curve)
        if (toneConfig && originalDataRef.current) {
          const isDefaultCurve = toneConfig.curvePoints.every((v, i) => v === i) &&
            toneConfig.brightness === 0 &&
            toneConfig.contrast === 0 &&
            toneConfig.shadows === 0 &&
            toneConfig.highlights === 0;

          if (isDefaultCurve) {
            ctx.drawImage(image, 0, 0);
          } else {
            const toned = applyToneCurve(originalDataRef.current, toneConfig.curvePoints);
            ctx.putImageData(toned, 0, 0);
          }
        } else {
          ctx.drawImage(image, 0, 0);
        }
      }

      // Draw guides on overlay
      octx.clearRect(0, 0, overlay.width, overlay.height);
      if (guidesActive && guideConfig.activeGuide) {
        drawGuides(octx, image.width, image.height, guideConfig, originalDataRef.current);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [
    image,
    imageData,
    analysisMode,
    opacity,
    sensitivity,
    guideConfig,
    compareMode,
    terrain3D,
    analysisActive,
    guidesActive,
    containerSize,
    toneConfig,
    canvasRef,
    overlayRef,
  ]);

  // Compute display dimensions for crop tool
  const displayWidth = image
    ? (() => {
        const maxW = containerSize.width - 32;
        const maxH = containerSize.height - 32;
        if (maxW <= 0 || maxH <= 0) return 0;
        const scale = Math.min(maxW / image.width, maxH / image.height, 1) * (zoom / 100);
        return image.width * scale;
      })()
    : 0;

  const displayHeight = image
    ? (() => {
        const maxW = containerSize.width - 32;
        const maxH = containerSize.height - 32;
        if (maxW <= 0 || maxH <= 0) return 0;
        const scale = Math.min(maxW / image.width, maxH / image.height, 1) * (zoom / 100);
        return image.height * scale;
      })()
    : 0;

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex items-center justify-center relative overflow-hidden ${
        isDragOver ? "bg-orange-500/5" : ""
      } ${pipetteActive && !terrain3D && !cropActive ? "cursor-crosshair" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={!terrain3D && !cropActive ? handleClick : undefined}
      onWheel={!terrain3D ? handleWheel : undefined}
      onTouchStart={handleContainerTouchStart}
      onTouchMove={handleContainerTouchMove}
      onTouchEnd={handleContainerTouchEnd}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />

      {!image ? (
        // Drop zone / upload area
        <div
          className={`flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-xl transition-colors max-w-sm mx-4 ${
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
              Drop an image here
            </p>
            <p className="text-xs text-muted-foreground">
              or tap the button below
            </p>
          </div>
          {/* Visible upload button for mobile */}
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white min-h-[48px] px-6"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <Upload className="size-4 mr-2" />
            Browse Files
          </Button>
          <p className="text-xs text-muted-foreground">
            Supports JPG, PNG, WebP, GIF, BMP
          </p>
          <div className="flex items-center gap-1.5 text-xs text-green-500">
            <ShieldCheck className="size-3" />
            <span>All processing is local</span>
          </div>
        </div>
      ) : terrain3D && originalDataRef.current ? (
        // 3D terrain — R3F canvas
        <div className="absolute inset-0">
          <Terrain3DView
            sourceData={originalDataRef.current}
            imageWidth={image.width}
            imageHeight={image.height}
            config={terrainConfig}
          />
        </div>
      ) : (
        // 2D Canvas area
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
          {!cropActive && (
            <div
              className="absolute inset-0"
              style={{ cursor: pipetteActive ? "crosshair" : "default", touchAction: pipetteActive ? "none" : "auto" }}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
            />
          )}

          {/* Crop tool overlay */}
          <CropTool
            imageWidth={image.width}
            imageHeight={image.height}
            displayWidth={displayWidth}
            displayHeight={displayHeight}
            onCropApply={onCropApply}
            onCropCancel={onCropCancel}
            isActive={cropActive}
          />
        </div>
      )}
    </div>
  );
}
