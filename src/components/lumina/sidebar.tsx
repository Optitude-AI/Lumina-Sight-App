"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Eye,
  ChartColumn,
  Grid3X3,
  Palette,
  Mountain,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
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
import { drawColorWheel, extractPalette, type ColorInfo } from "./color-picker";
import { drawToneCurve, TONE_PRESETS, handleCurveDrag, type ToneCurveConfig } from "./tone-editor";
import type { Terrain3DConfig } from "./terrain-3d";
import type { AnalysisMode } from "./image-analyzer";
import type { GuideType, GuideConfig } from "./guide-renderer";

export interface SidebarProps {
  open: boolean;
  // Analysis
  analysisMode: AnalysisMode;
  onAnalysisModeChange: (mode: AnalysisMode) => void;
  opacity: number;
  onOpacityChange: (value: number) => void;
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  // Histogram
  imageData: ImageData | null;
  rgbChannels: { r: boolean; g: boolean; b: boolean };
  onRgbChannelsChange: (channels: { r: boolean; g: boolean; b: boolean }) => void;
  // Composition
  guideConfig: GuideConfig;
  onGuideConfigChange: (config: GuideConfig) => void;
  // Tone
  toneConfig: ToneCurveConfig;
  onToneConfigChange: (config: ToneCurveConfig) => void;
  // Colour
  pickedColor: ColorInfo | null;
  palette: ColorInfo[];
  onPaletteChange: (palette: ColorInfo[]) => void;
  // 3D Terrain
  terrainConfig: Terrain3DConfig;
  onTerrainConfigChange: (config: Terrain3DConfig) => void;
  // State flags
  hasImage: boolean;
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

const GUIDE_OPTIONS: { key: GuideType; label: string }[] = [
  { key: "thirds", label: "Thirds" },
  { key: "goldenRatio", label: "Golden Ratio" },
  { key: "spiral", label: "Spiral" },
  { key: "diagonals", label: "Diagonals" },
  { key: "center", label: "Center" },
  { key: "dynamic", label: "Dynamic" },
];

const GUIDE_PRESET_COLORS = [
  { label: "White", color: "#ffffff" },
  { label: "Yellow", color: "#ffff00" },
  { label: "Cyan", color: "#00ffff" },
  { label: "Green", color: "#00ff00" },
  { label: "Orange", color: "#f97316" },
  { label: "Red", color: "#ff0000" },
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
  imageData,
  rgbChannels,
  onRgbChannelsChange,
  guideConfig,
  onGuideConfigChange,
  toneConfig,
  onToneConfigChange,
  pickedColor,
  palette,
  onPaletteChange,
  terrainConfig,
  onTerrainConfigChange,
  hasImage,
}: SidebarProps) {
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [histogramOpen, setHistogramOpen] = useState(true);
  const [compositionOpen, setCompositionOpen] = useState(true);
  const [toneOpen, setToneOpen] = useState(true);
  const [colorOpen, setColorOpen] = useState(true);
  const [terrainOpen, setTerrainOpen] = useState(true);

  const colorWheelRef = useRef<HTMLCanvasElement>(null);
  const toneCurveRef = useRef<HTMLCanvasElement>(null);
  const [toneDragging, setToneDragging] = useState(false);

  // Draw color wheel
  useEffect(() => {
    const canvas = colorWheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawColorWheel(ctx, canvas.width);
  }, []);

  // Draw tone curve
  useEffect(() => {
    const canvas = toneCurveRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawToneCurve(ctx, canvas.width, canvas.height, toneConfig.curvePoints, toneDragging);
  }, [toneConfig.curvePoints, toneDragging]);

  // Extract palette when imageData changes
  useEffect(() => {
    if (!imageData) {
      onPaletteChange([]);
      return;
    }
    const colors = extractPalette(imageData, 8);
    onPaletteChange(colors);
  }, [imageData, onPaletteChange]);

  // Tone curve mouse handlers
  const handleToneMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setToneDragging(true);
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newCurve = handleCurveDrag(x, y, canvas.width, canvas.height, toneConfig.curvePoints);
    onToneConfigChange({ ...toneConfig, curvePoints: newCurve });
  }, [toneConfig, onToneConfigChange]);

  const handleToneMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!toneDragging) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newCurve = handleCurveDrag(x, y, canvas.width, canvas.height, toneConfig.curvePoints);
    onToneConfigChange({ ...toneConfig, curvePoints: newCurve });
  }, [toneDragging, toneConfig, onToneConfigChange]);

  const handleToneMouseUp = useCallback(() => {
    setToneDragging(false);
  }, []);

  if (!open) return null;

  return (
    <aside className="w-80 border-r border-border bg-card/30 flex flex-col shrink-0 overflow-y-auto">
      {/* 1. Analysis Section */}
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

      {/* 2. Histogram Section */}
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

      {/* 3. Composition Section */}
      <Collapsible open={compositionOpen} onOpenChange={setCompositionOpen}>
        <div className="px-2 pt-2">
          <SectionHeader
            icon={Grid3X3}
            label="Composition"
            open={compositionOpen}
            onToggle={() => setCompositionOpen(!compositionOpen)}
          />
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Guide buttons grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {GUIDE_OPTIONS.map(({ key, label }) => (
                <Button
                  key={key}
                  variant={guideConfig.activeGuide === key ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-xs ${
                    guideConfig.activeGuide === key
                      ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                      : ""
                  }`}
                  onClick={() =>
                    onGuideConfigChange({
                      ...guideConfig,
                      activeGuide: guideConfig.activeGuide === key ? null : key,
                    })
                  }
                >
                  {label}
                </Button>
              ))}
            </div>

            <Separator />

            {/* Thickness slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Thickness</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{guideConfig.thickness.toFixed(1)}</span>
              </div>
              <Slider
                value={[guideConfig.thickness * 10]}
                min={5}
                max={50}
                step={1}
                onValueChange={([v]) => onGuideConfigChange({ ...guideConfig, thickness: v / 10 })}
                className="slider-orange"
              />
            </div>

            {/* Guide Color picker */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Guide Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={guideConfig.guideColor}
                  onChange={(e) => onGuideConfigChange({ ...guideConfig, guideColor: e.target.value })}
                  className="size-7 rounded border border-border cursor-pointer bg-transparent"
                />
                <span className="text-xs text-muted-foreground font-mono">{guideConfig.guideColor}</span>
              </div>
              {/* Preset color buttons */}
              <div className="flex items-center gap-1.5">
                {GUIDE_PRESET_COLORS.map(({ label, color }) => (
                  <button
                    key={label}
                    className={`size-6 rounded border-2 transition-colors ${
                      guideConfig.guideColor === color ? "border-orange-500" : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => onGuideConfigChange({ ...guideConfig, guideColor: color })}
                    title={label}
                  />
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* 4. Tone Section */}
      <Collapsible open={toneOpen} onOpenChange={setToneOpen}>
        <div className="px-2 pt-2">
          <SectionHeader
            icon={SlidersHorizontal}
            label="Tone"
            open={toneOpen}
            onToggle={() => setToneOpen(!toneOpen)}
            color="text-orange-500"
          />
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Tone curve canvas */}
            <canvas
              ref={toneCurveRef}
              width={260}
              height={160}
              className="w-full rounded-md cursor-crosshair"
              style={{ imageRendering: "auto" }}
              onMouseDown={handleToneMouseDown}
              onMouseMove={handleToneMouseMove}
              onMouseUp={handleToneMouseUp}
              onMouseLeave={handleToneMouseUp}
            />

            {/* Preset tone curve buttons */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Presets</Label>
              <div className="flex flex-wrap gap-1.5">
                {TONE_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => onToneConfigChange({ ...toneConfig, curvePoints: [...preset.curve] })}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Brightness slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Brightness</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{toneConfig.brightness}</span>
              </div>
              <Slider
                value={[toneConfig.brightness + 100]}
                min={0}
                max={200}
                step={1}
                onValueChange={([v]) => onToneConfigChange({ ...toneConfig, brightness: v - 100 })}
                className="slider-orange"
              />
            </div>

            {/* Contrast slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Contrast</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{toneConfig.contrast}</span>
              </div>
              <Slider
                value={[toneConfig.contrast + 100]}
                min={0}
                max={200}
                step={1}
                onValueChange={([v]) => onToneConfigChange({ ...toneConfig, contrast: v - 100 })}
                className="slider-orange"
              />
            </div>

            {/* Shadows slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Shadows</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{toneConfig.shadows}</span>
              </div>
              <Slider
                value={[toneConfig.shadows + 100]}
                min={0}
                max={200}
                step={1}
                onValueChange={([v]) => onToneConfigChange({ ...toneConfig, shadows: v - 100 })}
                className="slider-orange"
              />
            </div>

            {/* Highlights slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Highlights</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{toneConfig.highlights}</span>
              </div>
              <Slider
                value={[toneConfig.highlights + 100]}
                min={0}
                max={200}
                step={1}
                onValueChange={([v]) => onToneConfigChange({ ...toneConfig, highlights: v - 100 })}
                className="slider-orange"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* 5. Colour Section */}
      <Collapsible open={colorOpen} onOpenChange={setColorOpen}>
        <div className="px-2 pt-2">
          <SectionHeader
            icon={Palette}
            label="Colour"
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

            {/* Extracted color palette */}
            {palette.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Extracted Palette</Label>
                <div className="flex flex-wrap gap-1.5">
                  {palette.map((color, i) => (
                    <div key={i} className="group relative">
                      <div
                        className="size-7 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: color.hex }}
                        title={`${color.hex} — Lum: ${Math.round(color.luminance)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* 6. 3D Terrain Section */}
      <Collapsible open={terrainOpen} onOpenChange={setTerrainOpen}>
        <div className="px-2 pt-2">
          <SectionHeader
            icon={Mountain}
            label="3D Terrain"
            open={terrainOpen}
            onToggle={() => setTerrainOpen(!terrainOpen)}
            color="text-orange-500"
          />
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Elevation Scale slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Elevation Scale</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{terrainConfig.elevationScale.toFixed(1)}</span>
              </div>
              <Slider
                value={[terrainConfig.elevationScale * 10]}
                min={5}
                max={100}
                step={1}
                onValueChange={([v]) => onTerrainConfigChange({ ...terrainConfig, elevationScale: v / 10 })}
                className="slider-orange"
              />
            </div>

            {/* Resolution slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Resolution</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{terrainConfig.resolution}</span>
              </div>
              <Slider
                value={[terrainConfig.resolution]}
                min={16}
                max={256}
                step={8}
                onValueChange={([v]) => onTerrainConfigChange({ ...terrainConfig, resolution: v })}
                className="slider-orange"
              />
            </div>

            <Separator />

            {/* Color Mode buttons */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Color Mode</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["splices", "original", "luminance", "heatmap", "topo"] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={terrainConfig.colorMode === mode ? "default" : "outline"}
                    size="sm"
                    className={`h-6 text-xs capitalize ${
                      terrainConfig.colorMode === mode
                        ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                        : ""
                    }`}
                    onClick={() => onTerrainConfigChange({ ...terrainConfig, colorMode: mode })}
                  >
                    {mode === "topo" ? "Topo Map" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Splice Boundaries */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Splice Boundaries</Label>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Darks ceiling</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">{terrainConfig.darksCeiling}%</span>
                </div>
                <Slider
                  value={[terrainConfig.darksCeiling]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) => onTerrainConfigChange({ ...terrainConfig, darksCeiling: v })}
                  className="slider-orange"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Midtones ceiling</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">{terrainConfig.midtonesCeiling}%</span>
                </div>
                <Slider
                  value={[terrainConfig.midtonesCeiling]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) => onTerrainConfigChange({ ...terrainConfig, midtonesCeiling: v })}
                  className="slider-orange"
                />
              </div>
            </div>

            <Separator />

            {/* Tonal Splice Elevation */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tonal Splice Elevation</Label>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Darks (0–{terrainConfig.darksCeiling}%)</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">{terrainConfig.darksElevation.toFixed(1)}×</span>
                </div>
                <Slider
                  value={[terrainConfig.darksElevation * 10]}
                  min={1}
                  max={30}
                  step={1}
                  onValueChange={([v]) => onTerrainConfigChange({ ...terrainConfig, darksElevation: v / 10 })}
                  className="slider-orange"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Midtones ({terrainConfig.darksCeiling}–{terrainConfig.midtonesCeiling}%)</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">{terrainConfig.midtonesElevation.toFixed(1)}×</span>
                </div>
                <Slider
                  value={[terrainConfig.midtonesElevation * 10]}
                  min={1}
                  max={30}
                  step={1}
                  onValueChange={([v]) => onTerrainConfigChange({ ...terrainConfig, midtonesElevation: v / 10 })}
                  className="slider-orange"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Highlights ({terrainConfig.midtonesCeiling}–100%)</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">{terrainConfig.highlightsElevation.toFixed(1)}×</span>
                </div>
                <Slider
                  value={[terrainConfig.highlightsElevation * 10]}
                  min={1}
                  max={30}
                  step={1}
                  onValueChange={([v]) => onTerrainConfigChange({ ...terrainConfig, highlightsElevation: v / 10 })}
                  className="slider-orange"
                />
              </div>
            </div>

            <Separator />

            {/* Switches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Scale Grid</Label>
                <Switch
                  checked={terrainConfig.scaleGrid}
                  onCheckedChange={(checked) => onTerrainConfigChange({ ...terrainConfig, scaleGrid: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Wireframe</Label>
                <Switch
                  checked={terrainConfig.wireframe}
                  onCheckedChange={(checked) => onTerrainConfigChange({ ...terrainConfig, wireframe: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto Rotate</Label>
                <Switch
                  checked={terrainConfig.autoRotate}
                  onCheckedChange={(checked) => onTerrainConfigChange({ ...terrainConfig, autoRotate: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Contour Lines</Label>
                <Switch
                  checked={terrainConfig.contourLines}
                  onCheckedChange={(checked) => onTerrainConfigChange({ ...terrainConfig, contourLines: checked })}
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}
