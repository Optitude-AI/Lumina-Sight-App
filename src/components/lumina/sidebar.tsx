"use client";

import { useState, useEffect, useRef } from "react";
import {
  Eye,
  ChartColumn,
  Grid3X3,
  Palette,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Histogram from "./histogram";
import { drawColorWheel } from "./color-picker";
import type { ColorInfo } from "./color-picker";
import type { AnalysisMode } from "./image-analyzer";
import type { GuideConfig } from "./guide-renderer";

export interface SidebarProps {
  open: boolean;
  analysisMode: AnalysisMode;
  onAnalysisModeChange: (mode: AnalysisMode) => void;
  opacity: number;
  onOpacityChange: (value: number) => void;
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  guides: GuideConfig;
  onGuidesChange: (guides: GuideConfig) => void;
  imageData: ImageData | null;
  rgbChannels: { r: boolean; g: boolean; b: boolean };
  onRgbChannelsChange: (channels: { r: boolean; g: boolean; b: boolean }) => void;
  pickedColor: ColorInfo | null;
  compareMode: "original" | "analysis";
  onCompareModeChange: (mode: "original" | "analysis") => void;
  analysisActive: boolean;
  guidesActive: boolean;
  paletteActive: boolean;
  compareActive: boolean;
}

const ANALYSIS_MODES: { mode: AnalysisMode; label: string; icon: string }[] = [
  { mode: "luminance", label: "Luminance", icon: "◐" },
  { mode: "chroma", label: "Chroma", icon: "◑" },
  { mode: "hybrid", label: "Hybrid", icon: "◒" },
  { mode: "squint", label: "Squint", icon: "◔" },
  { mode: "focus", label: "Focus Map", icon: "◎" },
  { mode: "attention", label: "Attention", icon: "◉" },
  { mode: "journey", label: "Journey", icon: "↝" },
  { mode: "negspace", label: "Neg Space", icon: "◻" },
];

const GUIDE_OPTIONS: { key: keyof GuideConfig; label: string }[] = [
  { key: "thirds", label: "Rule of Thirds" },
  { key: "goldenRatio", label: "Golden Ratio" },
  { key: "goldenSpiral", label: "Golden Spiral" },
  { key: "diagonals", label: "Diagonals" },
  { key: "center", label: "Center" },
  { key: "symmetry", label: "Symmetry" },
];

function SectionHeader({
  icon: Icon,
  label,
  open,
  onToggle,
  color = "text-orange-500",
}: {
  icon: React.ElementType;
  label: string;
  open: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <CollapsibleTrigger asChild>
      <button
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent/50 rounded-md transition-colors"
        onClick={onToggle}
      >
        <Icon className={`size-4 ${color}`} />
        <span className="text-sm font-medium flex-1 text-left">{label}</span>
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
      </button>
    </CollapsibleTrigger>
  );
}

export default function Sidebar({
  open,
  analysisMode,
  onAnalysisModeChange,
  opacity,
  onOpacityChange,
  sensitivity,
  onSensitivityChange,
  guides,
  onGuidesChange,
  imageData,
  rgbChannels,
  onRgbChannelsChange,
  pickedColor,
  compareMode,
  onCompareModeChange,
  analysisActive,
  guidesActive,
  paletteActive,
  compareActive,
}: SidebarProps) {
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [histogramOpen, setHistogramOpen] = useState(true);
  const [guidesOpen, setGuidesOpen] = useState(true);
  const [colorOpen, setColorOpen] = useState(true);
  const [compareOpen, setCompareOpen] = useState(true);

  const colorWheelRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = colorWheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawColorWheel(ctx, canvas.width);
  }, []);

  if (!open) return null;

  return (
    <aside className="w-80 border-r border-border bg-card/30 flex flex-col shrink-0 overflow-y-auto">
      {/* Analysis Section */}
      <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <div className="px-2 pt-2">
          <SectionHeader
            icon={Eye}
            label="Analysis"
            open={analysisOpen}
            onToggle={() => setAnalysisOpen(!analysisOpen)}
          />
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Mode buttons grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {ANALYSIS_MODES.map(({ mode, label, icon }) => (
                <Button
                  key={mode}
                  variant={analysisMode === mode ? "default" : "outline"}
                  size="sm"
                  className={`h-8 text-xs justify-start gap-1.5 ${
                    analysisMode === mode
                      ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                      : ""
                  }`}
                  onClick={() => onAnalysisModeChange(mode)}
                >
                  <span className="text-sm">{icon}</span>
                  {label}
                </Button>
              ))}
            </div>

            <Separator />

            {/* Opacity slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Opacity</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{opacity}%</span>
              </div>
              <Slider
                value={[opacity]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => onOpacityChange(v)}
                className="slider-orange"
              />
            </div>

            {/* Sensitivity slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Sensitivity</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{sensitivity}</span>
              </div>
              <Slider
                value={[sensitivity]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => onSensitivityChange(v)}
                className="slider-orange"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Histogram Section */}
      <Collapsible open={histogramOpen} onOpenChange={setHistogramOpen}>
        <div className="px-2 pt-2">
          <SectionHeader
            icon={ChartColumn}
            label="Histogram"
            open={histogramOpen}
            onToggle={() => setHistogramOpen(!histogramOpen)}
          />
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            <Histogram imageData={imageData} rgbChannels={rgbChannels} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Guides Section */}
      <Collapsible open={guidesOpen} onOpenChange={setGuidesOpen}>
        <div className="px-2 pt-2">
          <SectionHeader
            icon={Grid3X3}
            label="Guides"
            open={guidesOpen}
            onToggle={() => setGuidesOpen(!guidesOpen)}
          />
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {GUIDE_OPTIONS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`guide-${key}`}
                  checked={guides[key]}
                  onCheckedChange={(checked) =>
                    onGuidesChange({ ...guides, [key]: !!checked })
                  }
                  className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                />
                <Label
                  htmlFor={`guide-${key}`}
                  className="text-xs cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Color Section */}
      <Collapsible open={colorOpen} onOpenChange={setColorOpen}>
        <div className="px-2 pt-2">
          <SectionHeader
            icon={Palette}
            label="Color"
            open={colorOpen}
            onToggle={() => setColorOpen(!colorOpen)}
            color="text-orange-500"
          />
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Color wheel */}
            <div className="flex justify-center">
              <canvas
                ref={colorWheelRef}
                width={120}
                height={120}
                className="rounded-full"
              />
            </div>

            {/* RGB channel checkboxes */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="ch-r"
                  checked={rgbChannels.r}
                  onCheckedChange={(checked) =>
                    onRgbChannelsChange({ ...rgbChannels, r: !!checked })
                  }
                  className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
                <Label htmlFor="ch-r" className="text-xs text-red-400 cursor-pointer">
                  R
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="ch-g"
                  checked={rgbChannels.g}
                  onCheckedChange={(checked) =>
                    onRgbChannelsChange({ ...rgbChannels, g: !!checked })
                  }
                  className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <Label htmlFor="ch-g" className="text-xs text-green-400 cursor-pointer">
                  G
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="ch-b"
                  checked={rgbChannels.b}
                  onCheckedChange={(checked) =>
                    onRgbChannelsChange({ ...rgbChannels, b: !!checked })
                  }
                  className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                <Label htmlFor="ch-b" className="text-xs text-blue-400 cursor-pointer">
                  B
                </Label>
              </div>
            </div>

            {/* Picked color info */}
            {pickedColor ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="size-8 rounded border border-border"
                    style={{ backgroundColor: pickedColor.hex }}
                  />
                  <div className="text-xs space-y-0.5">
                    <div className="font-mono">{pickedColor.hex.toUpperCase()}</div>
                    <div className="text-muted-foreground">
                      RGB({pickedColor.r}, {pickedColor.g}, {pickedColor.b})
                    </div>
                    <div className="text-muted-foreground">
                      HSL({pickedColor.hsl.h}, {pickedColor.hsl.s}%, {pickedColor.hsl.l}%)
                    </div>
                    <div className="text-muted-foreground">
                      Lum: {Math.round(pickedColor.luminance)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Use the pipette tool to pick colors
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Compare Section */}
      <Collapsible open={compareOpen} onOpenChange={setCompareOpen}>
        <div className="px-2 pt-2">
          <SectionHeader
            icon={ArrowLeftRight}
            label="Compare"
            open={compareOpen}
            onToggle={() => setCompareOpen(!compareOpen)}
          />
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Original</Label>
              <Switch
                checked={compareMode === "analysis"}
                onCheckedChange={(checked) =>
                  onCompareModeChange(checked ? "analysis" : "original")
                }
              />
              <Label className="text-xs">Analysis</Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}
