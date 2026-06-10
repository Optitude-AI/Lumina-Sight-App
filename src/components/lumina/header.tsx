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
              className={`size-8 ${terrain3D ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleTerrain}
              disabled={!hasImage}
            >
              <Mountain className="size-4" />
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
              className={`size-8 ${analysisActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleAnalysis}
            >
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Analysis</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={guidesActive ? "default" : "ghost"}
              size="sm"
              className={`size-8 ${guidesActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleGuides}
            >
              <Grid3X3 className="size-4" />
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
              size="sm"
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
              size="sm"
              className={`size-8 ${focusActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleFocus}
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
              size="sm"
              className={`size-8 ${scanActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleScan}
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
              size="sm"
              className={`size-8 ${paletteActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onTogglePalette}
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
              size="sm"
              className={`size-8 ${compareActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
              onClick={onToggleCompare}
            >
              <ArrowLeftRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Compare</TooltipContent>
        </Tooltip>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <Badge
          variant="outline"
          className="gap-1.5 text-green-500 border-green-500/30 bg-green-500/10 px-2 py-0.5"
        >
          <ShieldCheck className="size-3" />
          <span className="text-xs font-medium">Local only</span>
        </Badge>

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
              onClick={onDownload}
              disabled={!hasImage}
            >
              <Download className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Download</TooltipContent>
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
