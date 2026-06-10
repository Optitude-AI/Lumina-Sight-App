"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Image,
  Layers,
  Monitor,
  FileImage,
  Columns,
  FileText,
  Loader2,
} from "lucide-react";
import type { ToneCurveConfig } from "./tone-editor";
import type { AnalysisMode } from "./image-analyzer";
import type { GuideConfig } from "./guide-renderer";
import type { ColorInfo } from "./color-picker";

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // References for canvas export
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  image: HTMLImageElement | null;
  imageData: ImageData | null;
  toneConfig: ToneCurveConfig;
  guideConfig: GuideConfig;
  analysisMode: AnalysisMode;
  opacity: number;
  sensitivity: number;
  analysisActive: boolean;
  guidesActive: boolean;
  compareMode: "original" | "analysis";
  palette: ColorInfo[];
}

type ExportType = "currentView" | "original" | "withTone" | "overlayOnly" | "sideBySide" | "pdfReport";

interface ExportOption {
  key: ExportType;
  label: string;
  description: string;
  icon: React.ElementType;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { key: "currentView", label: "Current View", description: "What's currently visible on canvas (analysis + guides)", icon: Monitor },
  { key: "original", label: "Original Image", description: "The original image without any modifications", icon: Image },
  { key: "withTone", label: "With Tone Curve", description: "Image with tone curve applied, no analysis overlay", icon: Layers },
  { key: "overlayOnly", label: "Overlay Only", description: "Just the analysis overlay on transparent background", icon: FileImage },
  { key: "sideBySide", label: "Side-by-Side", description: "Original and analysis view side by side", icon: Columns },
  { key: "pdfReport", label: "Analysis Report", description: "Comprehensive report with thumbnail, histogram, palette", icon: FileText },
];

export default function ExportDialog({
  open,
  onOpenChange,
  mainCanvasRef,
  overlayCanvasRef,
  image,
  imageData,
  toneConfig,
  guideConfig,
  analysisMode,
  opacity,
  sensitivity,
  analysisActive,
  guidesActive,
  compareMode,
  palette,
}: ExportDialogProps) {
  const [quality, setQuality] = useState(95);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [selectedType, setSelectedType] = useState<ExportType>("currentView");
  const [exporting, setExporting] = useState(false);

  const downloadCanvas = useCallback(
    (canvas: HTMLCanvasElement, filename: string, format: string = "image/png") => {
      const link = document.createElement("a");
      link.download = filename;
      if (format === "image/jpeg") {
        link.href = canvas.toDataURL("image/jpeg", quality / 100);
      } else {
        link.href = canvas.toDataURL("image/png");
      }
      link.click();
    },
    [quality]
  );

  const handleExport = useCallback(async () => {
    if (!image || !imageData) return;
    setExporting(true);

    try {
      const mainCanvas = mainCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      switch (selectedType) {
        case "currentView": {
          if (!mainCanvas) break;
          // Create a composite of main canvas + overlay
          const compCanvas = document.createElement("canvas");
          compCanvas.width = mainCanvas.width;
          compCanvas.height = mainCanvas.height;
          const ctx = compCanvas.getContext("2d")!;
          ctx.drawImage(mainCanvas, 0, 0);
          if (overlayCanvas) {
            ctx.drawImage(overlayCanvas, 0, 0);
          }
          downloadCanvas(compCanvas, "lumina-sight-current-view.png");
          break;
        }

        case "original": {
          const origCanvas = document.createElement("canvas");
          origCanvas.width = image.width;
          origCanvas.height = image.height;
          const ctx = origCanvas.getContext("2d")!;
          ctx.drawImage(image, 0, 0);
          downloadCanvas(origCanvas, "lumina-sight-original.png");
          break;
        }

        case "withTone": {
          const toneCanvas = document.createElement("canvas");
          toneCanvas.width = image.width;
          toneCanvas.height = image.height;
          const ctx = toneCanvas.getContext("2d")!;
          ctx.drawImage(image, 0, 0);
          // Apply tone curve to the drawn image
          const drawnData = ctx.getImageData(0, 0, image.width, image.height);
          const isDefaultCurve =
            toneConfig.curvePoints.every((v, i) => v === i) &&
            toneConfig.brightness === 0 &&
            toneConfig.contrast === 0 &&
            toneConfig.shadows === 0 &&
            toneConfig.highlights === 0;
          if (!isDefaultCurve) {
            const { applyToneCurve } = await import("./tone-editor");
            const toned = applyToneCurve(drawnData, toneConfig.curvePoints);
            ctx.putImageData(toned, 0, 0);
          }
          downloadCanvas(toneCanvas, "lumina-sight-with-tone.png");
          break;
        }

        case "overlayOnly": {
          if (!overlayCanvas) break;
          downloadCanvas(overlayCanvas, "lumina-sight-overlay.png");
          break;
        }

        case "sideBySide": {
          if (!mainCanvas) break;
          const sideCanvas = document.createElement("canvas");
          sideCanvas.width = image.width * 2 + 20;
          sideCanvas.height = image.height + 60;
          const ctx = sideCanvas.getContext("2d")!;

          // Background
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(0, 0, sideCanvas.width, sideCanvas.height);

          // Labels
          ctx.fillStyle = "#ffffff";
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Original", image.width / 2, 20);
          ctx.fillText("Analysis", image.width + 20 + image.width / 2, 20);

          // Original
          ctx.drawImage(image, 0, 30);

          // Analysis view (current canvas)
          ctx.drawImage(mainCanvas, image.width + 20, 30);
          if (overlayCanvas) {
            ctx.drawImage(overlayCanvas, image.width + 20, 30);
          }

          downloadCanvas(sideCanvas, "lumina-sight-side-by-side.png");
          break;
        }

        case "pdfReport": {
          // Create a comprehensive report as a PNG canvas
          const reportWidth = 1200;
          const reportHeight = 900;
          const reportCanvas = document.createElement("canvas");
          reportCanvas.width = reportWidth;
          reportCanvas.height = reportHeight;
          const ctx = reportCanvas.getContext("2d")!;

          // Background
          ctx.fillStyle = "#0f0f0f";
          ctx.fillRect(0, 0, reportWidth, reportHeight);

          // Title
          ctx.fillStyle = "#f97316";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("Lumina Sight 2 — Analysis Report", 40, 45);

          // Divider
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(40, 60);
          ctx.lineTo(reportWidth - 40, 60);
          ctx.stroke();

          // Image thumbnail
          const thumbMaxW = 480;
          const thumbMaxH = 340;
          const thumbScale = Math.min(thumbMaxW / image.width, thumbMaxH / image.height);
          const thumbW = image.width * thumbScale;
          const thumbH = image.height * thumbScale;

          // Draw thumbnail border
          ctx.strokeStyle = "#444";
          ctx.lineWidth = 1;
          ctx.strokeRect(38, 74, thumbW + 4, thumbH + 4);

          // Draw image
          ctx.drawImage(image, 40, 76, thumbW, thumbH);

          // Draw analysis overlay on thumbnail if available
          if (mainCanvas && overlayCanvas) {
            ctx.globalAlpha = opacity / 100;
            ctx.drawImage(mainCanvas, 40, 76, thumbW, thumbH);
            ctx.drawImage(overlayCanvas, 40, 76, thumbW, thumbH);
            ctx.globalAlpha = 1;
          }

          // Right panel - Settings summary
          const rpX = 40 + thumbW + 30;
          let rpY = 90;

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText("Settings Summary", rpX, rpY);
          rpY += 28;

          ctx.font = "13px sans-serif";
          const settingsLines = [
            `Analysis Mode: ${analysisMode}`,
            `Analysis Active: ${analysisActive ? "Yes" : "No"}`,
            `Opacity: ${opacity}%`,
            `Sensitivity: ${sensitivity}`,
            `Guide: ${guideConfig.activeGuide || "None"}`,
            `Guide Color: ${guideConfig.guideColor}`,
            `Guide Thickness: ${guideConfig.thickness}`,
            `Guides Active: ${guidesActive ? "Yes" : "No"}`,
            `Compare Mode: ${compareMode}`,
            `Brightness: ${toneConfig.brightness}`,
            `Contrast: ${toneConfig.contrast}`,
            `Shadows: ${toneConfig.shadows}`,
            `Highlights: ${toneConfig.highlights}`,
            `Image Size: ${image.width} × ${image.height}`,
          ];

          for (const line of settingsLines) {
            ctx.fillStyle = "#999";
            const [label, value] = line.split(": ");
            ctx.fillText(`${label}: `, rpX, rpY);
            const labelWidth = ctx.measureText(`${label}: `).width;
            ctx.fillStyle = "#fff";
            ctx.fillText(value, rpX + labelWidth, rpY);
            rpY += 20;
          }

          // Color palette section
          rpY += 15;
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText("Color Palette", rpX, rpY);
          rpY += 20;

          if (palette.length > 0) {
            for (let i = 0; i < Math.min(palette.length, 8); i++) {
              const c = palette[i];
              ctx.fillStyle = c.hex;
              ctx.fillRect(rpX + i * 50, rpY, 44, 30);
              ctx.strokeStyle = "#444";
              ctx.strokeRect(rpX + i * 50, rpY, 44, 30);
              ctx.fillStyle = "#888";
              ctx.font = "9px monospace";
              ctx.textAlign = "center";
              ctx.fillText(c.hex, rpX + i * 50 + 22, rpY + 44);
              ctx.textAlign = "left";
            }
          }

          // Tone curve visualization
          const tcX = 40;
          const tcY = 76 + thumbH + 40;
          const tcW = 260;
          const tcH = 160;

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 16px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("Tone Curve", tcX, tcY - 8);

          // Tone curve background
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(tcX, tcY, tcW, tcH);

          // Draw diagonal reference
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(tcX, tcY + tcH);
          ctx.lineTo(tcX + tcW, tcY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw curve
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 256; i++) {
            const x = tcX + (i / 255) * tcW;
            const y = tcY + tcH - (toneConfig.curvePoints[i] / 255) * tcH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Histogram section
          const histX = tcX + tcW + 40;
          const histW = 460;
          const histH = 160;

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 16px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("Histogram", histX, tcY - 8);

          if (imageData) {
            const histR = new Uint32Array(256);
            const histG = new Uint32Array(256);
            const histB = new Uint32Array(256);
            const data = imageData.data;
            const sampleStep = Math.max(1, Math.floor(data.length / 4 / 100000)) * 4;
            for (let i = 0; i < data.length; i += sampleStep) {
              histR[data[i]]++;
              histG[data[i + 1]]++;
              histB[data[i + 2]]++;
            }
            let maxVal = 1;
            for (let i = 2; i < 254; i++) {
              if (histR[i] > maxVal) maxVal = histR[i];
              if (histG[i] > maxVal) maxVal = histG[i];
              if (histB[i] > maxVal) maxVal = histB[i];
            }

            const drawHist = (hist: Uint32Array, color: string) => {
              ctx.strokeStyle = color;
              ctx.lineWidth = 1;
              ctx.globalAlpha = 0.7;
              ctx.beginPath();
              const barW = histW / 256;
              for (let i = 0; i < 256; i++) {
                const x = histX + i * barW;
                const h = (hist[i] / maxVal) * histH;
                if (i === 0) ctx.moveTo(x, tcY + histH - h);
                else ctx.lineTo(x, tcY + histH - h);
              }
              ctx.stroke();
              ctx.globalAlpha = 1;
            };

            // Background
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(histX, tcY, histW, histH);

            drawHist(histR, "#ff4444");
            drawHist(histG, "#44ff44");
            drawHist(histB, "#4488ff");
          }

          // Footer
          ctx.fillStyle = "#666";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            `Generated by Lumina Sight 2 · ${new Date().toLocaleString()}`,
            reportWidth / 2,
            reportHeight - 20
          );

          if (includeMetadata) {
            ctx.fillText(
              `Mode: ${analysisMode} · Opacity: ${opacity}% · Sensitivity: ${sensitivity}`,
              reportWidth / 2,
              reportHeight - 6
            );
          }

          downloadCanvas(reportCanvas, "lumina-sight-report.png");
          break;
        }
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
      onOpenChange(false);
    }
  }, [
    selectedType,
    image,
    imageData,
    mainCanvasRef,
    overlayCanvasRef,
    toneConfig,
    guideConfig,
    analysisMode,
    opacity,
    sensitivity,
    analysisActive,
    guidesActive,
    compareMode,
    palette,
    quality,
    includeMetadata,
    downloadCanvas,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5 text-orange-500" />
            Export
          </DialogTitle>
          <DialogDescription>
            Choose an export format and options
          </DialogDescription>
        </DialogHeader>

        {/* Export type selection */}
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {EXPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-colors ${
                  selectedType === option.key
                    ? "border-orange-500 bg-orange-500/10 text-foreground"
                    : "border-border hover:border-orange-500/40 hover:bg-accent/50 text-muted-foreground"
                }`}
                onClick={() => setSelectedType(option.key)}
              >
                <Icon
                  className={`size-4 mt-0.5 shrink-0 ${
                    selectedType === option.key ? "text-orange-500" : "text-muted-foreground"
                  }`}
                />
                <div>
                  <div className={`text-xs font-medium ${selectedType === option.key ? "text-foreground" : ""}`}>
                    {option.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {option.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Separator />

        {/* Quality and metadata options */}
        <div className="space-y-3">
          {(selectedType === "currentView" || selectedType === "original" || selectedType === "withTone" || selectedType === "sideBySide" || selectedType === "pdfReport") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Quality</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{quality}%</span>
              </div>
              <Slider
                value={[quality]}
                min={10}
                max={100}
                step={5}
                onValueChange={([v]) => setQuality(v)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label className="text-xs">Include metadata in export</Label>
            <Switch
              checked={includeMetadata}
              onCheckedChange={setIncludeMetadata}
            />
          </div>
        </div>

        <Separator />

        {/* Export button */}
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          onClick={handleExport}
          disabled={exporting || !image}
        >
          {exporting ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="size-4 mr-2" />
              Export {EXPORT_OPTIONS.find((o) => o.key === selectedType)?.label}
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
