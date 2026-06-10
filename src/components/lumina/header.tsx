"use client";

import { useTheme } from "next-themes";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Mountain,
  Eye,
  Grid3X3,
  Pipette,
  Focus,
  ScanSearch,
  Palette,
  ArrowLeftRight,
  ShieldCheck,
  RotateCcw,
  Download,
  Sun,
  Moon,
  Undo2,
  Redo2,
  Crop,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  terrain3D: boolean;
  onToggleTerrain: () => void;
  analysisActive: boolean;
  onToggleAnalysis: () => void;
  guidesActive: boolean;
  onToggleGuides: () => void;
  pipetteActive: boolean;
  onTogglePipette: () => void;
  focusActive: boolean;
  onToggleFocus: () => void;
  scanActive: boolean;
  onToggleScan: () => void;
  paletteActive: boolean;
  onTogglePalette: () => void;
  compareActive: boolean;
  onToggleCompare: () => void;
  hasImage: boolean;
  onReset: () => void;
  onDownload: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Crop & Rotate
  cropActive: boolean;
  onToggleCrop: () => void;
  onRotate90: () => void;
  // AI Analysis
  onAIAnalyze: () => void;
  // Export
  onExport: () => void;
}

export default function Header({
  sidebarOpen,
  onToggleSidebar,
  terrain3D,
  onToggleTerrain,
  analysisActive,
  onToggleAnalysis,
  guidesActive,
  onToggleGuides,
  pipetteActive,
  onTogglePipette,
  focusActive,
  onToggleFocus,
  scanActive,
  onToggleScan,
  paletteActive,
  onTogglePalette,
  compareActive,
  onToggleCompare,
  hasImage,
  onReset,
  onDownload,
  zoom,
  onZoomChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  cropActive,
  onToggleCrop,
  onRotate90,
  onAIAnalyze,
  onExport,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-12 flex items-center gap-1 px-2 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onToggleSidebar}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Toggle Sidebar</TooltipContent>
        </Tooltip>

        {/* Logo */}
        <div className="flex items-center gap-2 px-2">
          <div className="size-6 rounded bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
            <Eye className="size-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight hidden sm:inline">
            Lumina Sight 2
          </span>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* 3D Terrain */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={terrain3D ? "default" : "ghost"}
              size="sm"
              className={`h-7 px-2 gap-1.5 ${terrain3D ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleTerrain}
              disabled={!hasImage}
            >
              <Mountain className="size-3.5" />
              <span className="text-xs hidden sm:inline">3D Terrain</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">3D Terrain</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Analysis & Guides */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={analysisActive ? "default" : "ghost"}
              size="sm"
              className={`h-7 px-2 gap-1.5 ${analysisActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleAnalysis}
              disabled={!hasImage}
            >
              <Eye className="size-3.5" />
              <span className="text-xs hidden sm:inline">Analysis</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Analysis</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={guidesActive ? "default" : "ghost"}
              size="sm"
              className={`h-7 px-2 gap-1.5 ${guidesActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleGuides}
              disabled={!hasImage}
            >
              <Grid3X3 className="size-3.5" />
              <span className="text-xs hidden sm:inline">Guides</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Guides</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Tool buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={pipetteActive ? "default" : "ghost"}
              size="icon"
              className={`size-8 ${pipetteActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onTogglePipette}
              disabled={!hasImage}
            >
              <Pipette className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Pipette</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={focusActive ? "default" : "ghost"}
              size="icon"
              className={`size-8 ${focusActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleFocus}
              disabled={!hasImage}
            >
              <Focus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Focus</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={scanActive ? "default" : "ghost"}
              size="icon"
              className={`size-8 ${scanActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleScan}
              disabled={!hasImage}
            >
              <ScanSearch className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Scan Search</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={paletteActive ? "default" : "ghost"}
              size="icon"
              className={`size-8 ${paletteActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onTogglePalette}
              disabled={!hasImage}
            >
              <Palette className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Palette</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={compareActive ? "default" : "ghost"}
              size="icon"
              className={`size-8 ${compareActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleCompare}
              disabled={!hasImage}
            >
              <ArrowLeftRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Compare</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onUndo}
              disabled={!canUndo || !hasImage}
            >
              <Undo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onRedo}
              disabled={!canRedo || !hasImage}
            >
              <Redo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Crop & Rotate */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={cropActive ? "default" : "ghost"}
              size="icon"
              className={`size-8 ${cropActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleCrop}
              disabled={!hasImage}
            >
              <Crop className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Crop</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onRotate90}
              disabled={!hasImage}
            >
              <RotateCw className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Rotate 90°</TooltipContent>
        </Tooltip>

        {/* AI Analysis */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onAIAnalyze}
              disabled={!hasImage}
            >
              <Sparkles className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">AI Analysis</TooltipContent>
        </Tooltip>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <Badge
          variant="outline"
          className="gap-1.5 text-green-500 border-green-500/30 bg-green-500/10 px-2 py-0.5"
        >
          <ShieldCheck className="size-3" />
          <span className="text-xs font-medium hidden sm:inline">Local only</span>
        </Badge>

        {/* Zoom indicator */}
        {hasImage && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-xs"
              onClick={() => onZoomChange(Math.max(10, zoom - 10))}
            >
              −
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-xs"
              onClick={() => onZoomChange(Math.min(400, zoom + 10))}
            >
              +
            </Button>
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onReset}
              disabled={!hasImage}
            >
              <RotateCcw className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Reset</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onExport}
              disabled={!hasImage}
            >
              <Download className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Export</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Toggle Theme</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
