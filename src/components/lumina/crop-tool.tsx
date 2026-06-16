"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface CropToolProps {
  imageWidth: number;
  imageHeight: number;
  displayWidth: number;
  displayHeight: number;
  onCropApply: (region: CropRegion) => void;
  onCropCancel: () => void;
  isActive: boolean;
}

type AspectRatio = "free" | "1:1" | "4:3" | "3:2" | "16:9" | "golden";

const ASPECT_RATIOS: { key: AspectRatio; label: string; ratio: number | null }[] = [
  { key: "free", label: "Free", ratio: null },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "4:3", label: "4:3", ratio: 4 / 3 },
  { key: "3:2", label: "3:2", ratio: 3 / 2 },
  { key: "16:9", label: "16:9", ratio: 16 / 9 },
  { key: "golden", label: "Golden", ratio: 1.618 },
];

type DragHandle = "move" | "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r" | null;

export default function CropTool({
  imageWidth,
  imageHeight,
  displayWidth,
  displayHeight,
  onCropApply,
  onCropCancel,
  isActive,
}: CropToolProps) {
  // Crop region in display coordinates
  const [crop, setCrop] = useState({ x: 0, y: 0, width: displayWidth, height: displayHeight });
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("free");
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Track previous active state to reset crop on activation
  const prevActiveRef = useRef(false);
  const wasActivated = isActive && !prevActiveRef.current;

  useEffect(() => {
    if (wasActivated) {
      const margin = 0.1;
      const w = displayWidth * (1 - margin * 2);
      const h = displayHeight * (1 - margin * 2);
      setCrop({ x: displayWidth * margin, y: displayHeight * margin, width: w, height: h });
      setRotation(0);
      setAspectRatio("free");
    }
    prevActiveRef.current = isActive;
  }, [isActive, wasActivated, displayWidth, displayHeight]);

  const applyAspectRatio = useCallback(
    (newCrop: { x: number; y: number; width: number; height: number }, ratio: number | null) => {
      if (ratio === null) return newCrop;
      const currentRatio = newCrop.width / newCrop.height;
      if (currentRatio > ratio) {
        // Too wide, reduce width
        const newWidth = newCrop.height * ratio;
        const diff = newCrop.width - newWidth;
        return { ...newCrop, x: newCrop.x + diff / 2, width: newWidth };
      } else {
        // Too tall, reduce height
        const newHeight = newCrop.width / ratio;
        const diff = newCrop.height - newHeight;
        return { ...newCrop, y: newCrop.y + diff / 2, height: newHeight };
      }
    },
    []
  );

  // Compute new crop from drag delta
  const computeDragCrop = useCallback(
    (dx: number, dy: number) => {
      const ratio = ASPECT_RATIOS.find((a) => a.key === aspectRatio)?.ratio ?? null;
      let newCrop = { ...cropStart };

      switch (dragHandle) {
        case "move":
          newCrop.x = Math.max(0, Math.min(displayWidth - newCrop.width, cropStart.x + dx));
          newCrop.y = Math.max(0, Math.min(displayHeight - newCrop.height, cropStart.y + dy));
          break;
        case "br":
          newCrop.width = Math.max(20, Math.min(displayWidth - newCrop.x, cropStart.width + dx));
          newCrop.height = Math.max(20, Math.min(displayHeight - newCrop.y, cropStart.height + dy));
          if (ratio) {
            newCrop = applyAspectRatio(newCrop, ratio);
          }
          break;
        case "bl":
          newCrop.x = Math.max(0, cropStart.x + dx);
          newCrop.width = Math.max(20, cropStart.width - dx);
          newCrop.height = Math.max(20, Math.min(displayHeight - newCrop.y, cropStart.height + dy));
          if (ratio) {
            newCrop = applyAspectRatio(newCrop, ratio);
          }
          break;
        case "tr":
          newCrop.width = Math.max(20, Math.min(displayWidth - newCrop.x, cropStart.width + dx));
          newCrop.y = Math.max(0, cropStart.y + dy);
          newCrop.height = Math.max(20, cropStart.height - dy);
          if (ratio) {
            newCrop = applyAspectRatio(newCrop, ratio);
          }
          break;
        case "tl":
          newCrop.x = Math.max(0, cropStart.x + dx);
          newCrop.width = Math.max(20, cropStart.width - dx);
          newCrop.y = Math.max(0, cropStart.y + dy);
          newCrop.height = Math.max(20, cropStart.height - dy);
          if (ratio) {
            newCrop = applyAspectRatio(newCrop, ratio);
          }
          break;
        case "t":
          newCrop.y = Math.max(0, cropStart.y + dy);
          newCrop.height = Math.max(20, cropStart.height - dy);
          break;
        case "b":
          newCrop.height = Math.max(20, Math.min(displayHeight - newCrop.y, cropStart.height + dy));
          break;
        case "l":
          newCrop.x = Math.max(0, cropStart.x + dx);
          newCrop.width = Math.max(20, cropStart.width - dx);
          break;
        case "r":
          newCrop.width = Math.max(20, Math.min(displayWidth - newCrop.x, cropStart.width + dx));
          break;
      }

      // Clamp to bounds
      newCrop.width = Math.min(newCrop.width, displayWidth - newCrop.x);
      newCrop.height = Math.min(newCrop.height, displayHeight - newCrop.y);

      return newCrop;
    },
    [dragHandle, cropStart, displayWidth, displayHeight, aspectRatio, applyAspectRatio]
  );

  // Start drag from client coordinates
  const startDrag = useCallback(
    (handle: DragHandle, clientX: number, clientY: number) => {
      setDragHandle(handle);
      setDragStart({ x: clientX, y: clientY });
      setCropStart({ ...crop });
    },
    [crop]
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (handle: DragHandle, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startDrag(handle, e.clientX, e.clientY);
    },
    [startDrag]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragHandle) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setCrop(computeDragCrop(dx, dy));
    },
    [dragHandle, dragStart, computeDragCrop]
  );

  const handleMouseUp = useCallback(() => {
    setDragHandle(null);
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback(
    (handle: DragHandle, e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches[0]) {
        startDrag(handle, e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [startDrag]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragHandle || !e.touches[0]) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;
      setCrop(computeDragCrop(dx, dy));
    },
    [dragHandle, dragStart, computeDragCrop]
  );

  const handleTouchEnd = useCallback(() => {
    setDragHandle(null);
  }, []);

  // Convert display crop to image coordinates
  const handleApply = useCallback(() => {
    const scaleX = imageWidth / displayWidth;
    const scaleY = imageHeight / displayHeight;
    const region: CropRegion = {
      x: Math.round(crop.x * scaleX),
      y: Math.round(crop.y * scaleY),
      width: Math.round(crop.width * scaleX),
      height: Math.round(crop.height * scaleY),
      rotation,
    };
    onCropApply(region);
  }, [crop, rotation, imageWidth, imageHeight, displayWidth, displayHeight, onCropApply]);

  const handleRotate90 = useCallback(() => {
    setRotation((prev) => ((prev + 90) % 360) as number);
  }, []);

  const handleAspectRatioChange = useCallback(
    (key: AspectRatio) => {
      setAspectRatio(key);
      const ratio = ASPECT_RATIOS.find((a) => a.key === key)?.ratio ?? null;
      if (ratio) {
        setCrop((prev) => applyAspectRatio(prev, ratio));
      }
    },
    [applyAspectRatio]
  );

  if (!isActive) return null;

  // Crop dimensions info
  const scaleX = imageWidth / displayWidth;
  const scaleY = imageHeight / displayHeight;
  const cropW = Math.round(crop.width * scaleX);
  const cropH = Math.round(crop.height * scaleY);

  // Third lines for rule of thirds grid
  const thirdLines = [
    { x1: crop.x + crop.width / 3, y1: crop.y, x2: crop.x + crop.width / 3, y2: crop.y + crop.height },
    { x1: crop.x + (crop.width * 2) / 3, y1: crop.y, x2: crop.x + (crop.width * 2) / 3, y2: crop.y + crop.height },
    { x1: crop.x, y1: crop.y + crop.height / 3, x2: crop.x + crop.width, y2: crop.y + crop.height / 3 },
    { x1: crop.x, y1: crop.y + (crop.height * 2) / 3, x2: crop.x + crop.width, y2: crop.y + (crop.height * 2) / 3 },
  ];

  const handleSize = 12; // Larger handles for mobile touch (was 8)

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      style={{ touchAction: "none" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dark overlay - top */}
      <div
        className="absolute bg-black/60"
        style={{ left: 0, top: 0, width: "100%", height: crop.y }}
      />
      {/* Dark overlay - bottom */}
      <div
        className="absolute bg-black/60"
        style={{ left: 0, top: crop.y + crop.height, width: "100%", height: `calc(100% - ${crop.y + crop.height}px)` }}
      />
      {/* Dark overlay - left */}
      <div
        className="absolute bg-black/60"
        style={{ left: 0, top: crop.y, width: crop.x, height: crop.height }}
      />
      {/* Dark overlay - right */}
      <div
        className="absolute bg-black/60"
        style={{ left: crop.x + crop.width, top: crop.y, width: `calc(100% - ${crop.x + crop.width}px)`, height: crop.height }}
      />

      {/* Crop border */}
      <div
        className="absolute border-2 border-white/90"
        style={{
          left: crop.x,
          top: crop.y,
          width: crop.width,
          height: crop.height,
          cursor: "move",
        }}
        onMouseDown={(e) => handleMouseDown("move", e)}
        onTouchStart={(e) => handleTouchStart("move", e)}
      >
        {/* Rule of thirds grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {thirdLines.map((line, i) => (
            <line
              key={i}
              x1={line.x1 - crop.x}
              y1={line.y1 - crop.y}
              x2={line.x2 - crop.x}
              y2={line.y2 - crop.y}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
            />
          ))}
        </svg>

        {/* Corner handles — larger for touch */}
        {/* Top-left */}
        <div
          className="absolute bg-white border border-white/80 rounded-sm"
          style={{ left: -handleSize / 2, top: -handleSize / 2, width: handleSize, height: handleSize, cursor: "nw-resize" }}
          onMouseDown={(e) => handleMouseDown("tl", e)}
          onTouchStart={(e) => handleTouchStart("tl", e)}
        />
        {/* Top-right */}
        <div
          className="absolute bg-white border border-white/80 rounded-sm"
          style={{ right: -handleSize / 2, top: -handleSize / 2, width: handleSize, height: handleSize, cursor: "ne-resize" }}
          onMouseDown={(e) => handleMouseDown("tr", e)}
          onTouchStart={(e) => handleTouchStart("tr", e)}
        />
        {/* Bottom-left */}
        <div
          className="absolute bg-white border border-white/80 rounded-sm"
          style={{ left: -handleSize / 2, bottom: -handleSize / 2, width: handleSize, height: handleSize, cursor: "sw-resize" }}
          onMouseDown={(e) => handleMouseDown("bl", e)}
          onTouchStart={(e) => handleTouchStart("bl", e)}
        />
        {/* Bottom-right */}
        <div
          className="absolute bg-white border border-white/80 rounded-sm"
          style={{ right: -handleSize / 2, bottom: -handleSize / 2, width: handleSize, height: handleSize, cursor: "se-resize" }}
          onMouseDown={(e) => handleMouseDown("br", e)}
          onTouchStart={(e) => handleTouchStart("br", e)}
        />

        {/* Edge handles — wider for touch */}
        {/* Top */}
        <div
          className="absolute bg-white/80 rounded-sm"
          style={{ left: "50%", top: -4, width: 32, height: 8, transform: "translateX(-50%)", cursor: "n-resize" }}
          onMouseDown={(e) => handleMouseDown("t", e)}
          onTouchStart={(e) => handleTouchStart("t", e)}
        />
        {/* Bottom */}
        <div
          className="absolute bg-white/80 rounded-sm"
          style={{ left: "50%", bottom: -4, width: 32, height: 8, transform: "translateX(-50%)", cursor: "s-resize" }}
          onMouseDown={(e) => handleMouseDown("b", e)}
          onTouchStart={(e) => handleTouchStart("b", e)}
        />
        {/* Left */}
        <div
          className="absolute bg-white/80 rounded-sm"
          style={{ left: -4, top: "50%", width: 8, height: 32, transform: "translateY(-50%)", cursor: "w-resize" }}
          onMouseDown={(e) => handleMouseDown("l", e)}
          onTouchStart={(e) => handleTouchStart("l", e)}
        />
        {/* Right */}
        <div
          className="absolute bg-white/80 rounded-sm"
          style={{ right: -4, top: "50%", width: 8, height: 32, transform: "translateY(-50%)", cursor: "e-resize" }}
          onMouseDown={(e) => handleMouseDown("r", e)}
          onTouchStart={(e) => handleTouchStart("r", e)}
        />
      </div>

      {/* Crop toolbar — responsive: wraps on mobile */}
      <div className="absolute bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex flex-wrap items-center justify-center gap-1.5 px-3 py-2 bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 z-10">
        {/* Aspect ratio buttons */}
        <div className="flex flex-wrap items-center gap-1">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.key}
              className={`px-2.5 py-1.5 text-xs rounded transition-colors min-h-[36px] ${
                aspectRatio === ar.key
                  ? "bg-orange-500 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => handleAspectRatioChange(ar.key)}
            >
              {ar.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-white/20 hidden sm:block" />

        {/* Rotation slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">Rotate</span>
          <input
            type="range"
            min={-45}
            max={45}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="w-16 sm:w-20 h-1 accent-orange-500"
          />
          <span className="text-xs text-white/70 w-8 text-center">{rotation}°</span>
          <button
            className="px-2 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors min-h-[36px]"
            onClick={handleRotate90}
            title="Rotate 90°"
          >
            90°
          </button>
        </div>

        <div className="w-px h-6 bg-white/20 hidden sm:block" />

        {/* Dimension info */}
        <span className="text-xs text-white/50 tabular-nums">
          {cropW} × {cropH}
        </span>

        <div className="w-px h-6 bg-white/20 hidden sm:block" />

        {/* Apply/Cancel */}
        <div className="flex items-center gap-1.5">
          <button
            className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors font-medium min-h-[36px]"
            onClick={handleApply}
          >
            Apply
          </button>
          <button
            className="px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors min-h-[36px]"
            onClick={onCropCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
