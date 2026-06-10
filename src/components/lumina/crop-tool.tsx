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

  const handleMouseDown = useCallback(
    (handle: DragHandle, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragHandle(handle);
      setDragStart({ x: e.clientX, y: e.clientY });
      setCropStart({ ...crop });
    },
    [crop]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragHandle) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
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

      setCrop(newCrop);
    },
    [dragHandle, dragStart, cropStart, displayWidth, displayHeight, aspectRatio, applyAspectRatio]
  );

  const handleMouseUp = useCallback(() => {
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

  const handleSize = 8;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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

        {/* Corner handles */}
        {/* Top-left */}
        <div
          className="absolute bg-white border border-white"
          style={{ left: -handleSize / 2, top: -handleSize / 2, width: handleSize, height: handleSize, cursor: "nw-resize" }}
          onMouseDown={(e) => handleMouseDown("tl", e)}
        />
        {/* Top-right */}
        <div
          className="absolute bg-white border border-white"
          style={{ right: -handleSize / 2, top: -handleSize / 2, width: handleSize, height: handleSize, cursor: "ne-resize" }}
          onMouseDown={(e) => handleMouseDown("tr", e)}
        />
        {/* Bottom-left */}
        <div
          className="absolute bg-white border border-white"
          style={{ left: -handleSize / 2, bottom: -handleSize / 2, width: handleSize, height: handleSize, cursor: "sw-resize" }}
          onMouseDown={(e) => handleMouseDown("bl", e)}
        />
        {/* Bottom-right */}
        <div
          className="absolute bg-white border border-white"
          style={{ right: -handleSize / 2, bottom: -handleSize / 2, width: handleSize, height: handleSize, cursor: "se-resize" }}
          onMouseDown={(e) => handleMouseDown("br", e)}
        />

        {/* Edge handles */}
        {/* Top */}
        <div
          className="absolute bg-white/80"
          style={{ left: "50%", top: -3, width: 24, height: 6, transform: "translateX(-50%)", cursor: "n-resize" }}
          onMouseDown={(e) => handleMouseDown("t", e)}
        />
        {/* Bottom */}
        <div
          className="absolute bg-white/80"
          style={{ left: "50%", bottom: -3, width: 24, height: 6, transform: "translateX(-50%)", cursor: "s-resize" }}
          onMouseDown={(e) => handleMouseDown("b", e)}
        />
        {/* Left */}
        <div
          className="absolute bg-white/80"
          style={{ left: -3, top: "50%", width: 6, height: 24, transform: "translateY(-50%)", cursor: "w-resize" }}
          onMouseDown={(e) => handleMouseDown("l", e)}
        />
        {/* Right */}
        <div
          className="absolute bg-white/80"
          style={{ right: -3, top: "50%", width: 6, height: 24, transform: "translateY(-50%)", cursor: "e-resize" }}
          onMouseDown={(e) => handleMouseDown("r", e)}
        />
      </div>

      {/* Crop toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 z-10">
        {/* Aspect ratio buttons */}
        {ASPECT_RATIOS.map((ar) => (
          <button
            key={ar.key}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              aspectRatio === ar.key
                ? "bg-orange-500 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            onClick={() => handleAspectRatioChange(ar.key)}
          >
            {ar.label}
          </button>
        ))}

        <div className="w-px h-6 bg-white/20" />

        {/* Rotation slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">Rotate</span>
          <input
            type="range"
            min={-45}
            max={45}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="w-20 h-1 accent-orange-500"
          />
          <span className="text-xs text-white/70 w-8 text-center">{rotation}°</span>
          <button
            className="px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            onClick={handleRotate90}
            title="Rotate 90°"
          >
            90°
          </button>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Dimension info */}
        <span className="text-xs text-white/50 tabular-nums">
          {cropW} × {cropH}
        </span>

        <div className="w-px h-6 bg-white/20" />

        {/* Apply/Cancel */}
        <button
          className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors font-medium"
          onClick={handleApply}
        >
          Apply
        </button>
        <button
          className="px-3 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          onClick={onCropCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
