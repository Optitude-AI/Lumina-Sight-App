"use client";

import { useTheme } from "next-themes";
import { useState } from "react";
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
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
  tooltip,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "default" : "ghost"}
          size="icon"
          className={`size-9 ${active ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
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
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <header className="h-12 flex items-center gap-1 px-2 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
      {/* Left side — always visible */}
      <div className="flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={onToggleSidebar}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Toggle Controls</TooltipContent>
        </Tooltip>

        {/* Logo */}
        <div className="flex items-center gap-2 px-1 sm:px-2">
          <div className="size-6 rounded bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
            <Eye className="size-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight hidden sm:inline">
            Lumina Sight 2
          </span>
        </div>

        <Separator orientation="vertical" className="h-6 mx-0.5 sm:mx-1" />

        {/* Primary actions — visible on all screens */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={analysisActive ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-2 gap-1 ${analysisActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                onClick={onToggleAnalysis}
                disabled={!hasImage}
              >
                <Eye className="size-3.5" />
                <span className="text-xs hidden md:inline">Analysis</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Analysis</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={guidesActive ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-2 gap-1 ${guidesActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                onClick={onToggleGuides}
                disabled={!hasImage}
              >
                <Grid3X3 className="size-3.5" />
                <span className="text-xs hidden md:inline">Guides</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Guides</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={terrain3D ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-2 gap-1 ${terrain3D ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                onClick={onToggleTerrain}
                disabled={!hasImage}
              >
                <Mountain className="size-3.5" />
                <span className="text-xs hidden md:inline">3D</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">3D Terrain</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-0.5 sm:mx-1" />

        {/* Tool buttons — visible on md+ screens */}
        <div className="hidden md:flex items-center gap-0.5">
          <ToolButton icon={Pipette} label="Pipette" active={pipetteActive} onClick={onTogglePipette} disabled={!hasImage} tooltip="Pipette" />
          <ToolButton icon={Focus} label="Focus" active={focusActive} onClick={onToggleFocus} disabled={!hasImage} tooltip="Focus" />
          <ToolButton icon={ScanSearch} label="Scan" active={scanActive} onClick={onToggleScan} disabled={!hasImage} tooltip="Scan Search" />
          <ToolButton icon={Palette} label="Palette" active={paletteActive} onClick={onTogglePalette} disabled={!hasImage} tooltip="Palette" />
          <ToolButton icon={ArrowLeftRight} label="Compare" active={compareActive} onClick={onToggleCompare} disabled={!hasImage} tooltip="Compare" />
        </div>

        <Separator orientation="vertical" className="h-6 mx-0.5 hidden md:block" />

        {/* Undo/Redo — visible on md+ */}
        <div className="hidden md:flex items-center gap-0.5">
          <ToolButton icon={Undo2} label="Undo" onClick={onUndo} disabled={!canUndo || !hasImage} tooltip="Undo (Ctrl+Z)" />
          <ToolButton icon={Redo2} label="Redo" onClick={onRedo} disabled={!canRedo || !hasImage} tooltip="Redo (Ctrl+Shift+Z)" />
        </div>

        <Separator orientation="vertical" className="h-6 mx-0.5 hidden md:block" />

        {/* Crop & Rotate — visible on md+ */}
        <div className="hidden md:flex items-center gap-0.5">
          <ToolButton icon={Crop} label="Crop" active={cropActive} onClick={onToggleCrop} disabled={!hasImage} tooltip="Crop" />
          <ToolButton icon={RotateCw} label="Rotate" onClick={onRotate90} disabled={!hasImage} tooltip="Rotate 90°" />
          <ToolButton icon={Sparkles} label="AI" onClick={onAIAnalyze} disabled={!hasImage} tooltip="AI Analysis" />
        </div>

        {/* More tools — mobile only */}
        <div className="flex md:hidden items-center">
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9">
                <MoreHorizontal className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground px-2 pt-1 pb-2 font-medium">Tools</p>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                    pipetteActive ? "bg-orange-500/20 text-orange-400" : "hover:bg-accent"
                  }`}
                  onClick={() => { onTogglePipette(); setMoreOpen(false); }}
                >
                  <Pipette className="size-4" /> Pipette
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                    focusActive ? "bg-orange-500/20 text-orange-400" : "hover:bg-accent"
                  }`}
                  onClick={() => { onToggleFocus(); setMoreOpen(false); }}
                >
                  <Focus className="size-4" /> Focus
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                    scanActive ? "bg-orange-500/20 text-orange-400" : "hover:bg-accent"
                  }`}
                  onClick={() => { onToggleScan(); setMoreOpen(false); }}
                >
                  <ScanSearch className="size-4" /> Scan Search
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                    paletteActive ? "bg-orange-500/20 text-orange-400" : "hover:bg-accent"
                  }`}
                  onClick={() => { onTogglePalette(); setMoreOpen(false); }}
                >
                  <Palette className="size-4" /> Palette
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                    compareActive ? "bg-orange-500/20 text-orange-400" : "hover:bg-accent"
                  }`}
                  onClick={() => { onToggleCompare(); setMoreOpen(false); }}
                >
                  <ArrowLeftRight className="size-4" /> Compare
                </button>

                <Separator className="my-1" />
                <p className="text-xs text-muted-foreground px-2 pt-1 pb-2 font-medium">Edit</p>

                <button
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                    !canUndo || !hasImage ? "opacity-40" : "hover:bg-accent"
                  }`}
                  onClick={() => { onUndo(); setMoreOpen(false); }}
                  disabled={!canUndo || !hasImage}
                >
                  <Undo2 className="size-4" /> Undo
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                    !canRedo || !hasImage ? "opacity-40" : "hover:bg-accent"
                  }`}
                  onClick={() => { onRedo(); setMoreOpen(false); }}
                  disabled={!canRedo || !hasImage}
                >
                  <Redo2 className="size-4" /> Redo
                </button>

                <Separator className="my-1" />
                <p className="text-xs text-muted-foreground px-2 pt-1 pb-2 font-medium">Transform</p>

                <button
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                    cropActive ? "bg-orange-500/20 text-orange-400" : "hover:bg-accent"
                  }`}
                  onClick={() => { onToggleCrop(); setMoreOpen(false); }}
                >
                  <Crop className="size-4" /> Crop
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                    !hasImage ? "opacity-40" : "hover:bg-accent"
                  }`}
                  onClick={() => { onRotate90(); setMoreOpen(false); }}
                  disabled={!hasImage}
                >
                  <RotateCw className="size-4" /> Rotate 90°
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                    !hasImage ? "opacity-40" : "hover:bg-accent"
                  }`}
                  onClick={() => { onAIAnalyze(); setMoreOpen(false); }}
                  disabled={!hasImage}
                >
                  <Sparkles className="size-4" /> AI Analysis
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
        <Badge
          variant="outline"
          className="gap-1.5 text-green-500 border-green-500/30 bg-green-500/10 px-1.5 py-0.5 sm:px-2"
        >
          <ShieldCheck className="size-3" />
          <span className="text-xs font-medium hidden sm:inline">Local only</span>
        </Badge>

        {/* Zoom indicator */}
        {hasImage && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-xs"
              onClick={() => onZoomChange(Math.max(10, zoom - 10))}
            >
              −
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums w-9 text-center">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-xs"
              onClick={() => onZoomChange(Math.min(400, zoom + 10))}
            >
              +
            </Button>
          </div>
        )}

        <Separator orientation="vertical" className="h-6 mx-0.5 hidden sm:block" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
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
              className="size-9"
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
              className="size-9"
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
