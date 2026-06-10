"use client";

import { useState, useCallback, useRef } from "react";
import Header from "@/components/lumina/header";
import Sidebar from "@/components/lumina/sidebar";
import CanvasArea from "@/components/lumina/canvas-area";
import type { AnalysisMode } from "@/components/lumina/image-analyzer";
import type { GuideConfig } from "@/components/lumina/guide-renderer";
import type { ColorInfo } from "@/components/lumina/color-picker";

export default function Home() {
  // Image state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [terrain3D, setTerrain3D] = useState(false);

  // Analysis state
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("luminance");
  const [opacity, setOpacity] = useState(70);
  const [sensitivity, setSensitivity] = useState(5);

  // Guide state
  const [guides, setGuides] = useState<GuideConfig>({
    thirds: false,
    goldenRatio: false,
    goldenSpiral: false,
    diagonals: false,
    center: false,
    symmetry: false,
  });

  // Tool states
  const [pipetteActive, setPipetteActive] = useState(false);
  const [focusActive, setFocusActive] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const [paletteActive, setPaletteActive] = useState(false);
  const [compareActive, setCompareActive] = useState(false);

  // Active section states
  const [analysisActive, setAnalysisActive] = useState(true);
  const [guidesActive, setGuidesActive] = useState(false);

  // Color state
  const [pickedColor, setPickedColor] = useState<ColorInfo | null>(null);
  const [rgbChannels, setRgbChannels] = useState({ r: true, g: true, b: true });

  // Compare state
  const [compareMode, setCompareMode] = useState<"original" | "analysis">("original");

  // Handle image load
  const handleImageLoad = useCallback((img: HTMLImageElement, data: ImageData) => {
    setImage(img);
    setImageData(data);
  }, []);

  // Handle image reset
  const handleImageReset = useCallback(() => {
    setImage(null);
    setImageData(null);
    setPickedColor(null);
    setTerrain3D(false);
    setPipetteActive(false);
    setFocusActive(false);
    setScanActive(false);
    setPaletteActive(false);
  }, []);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "lumina-sight-analysis.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }, []);

  // Toggle handlers
  const handleToggleAnalysis = useCallback(() => {
    setAnalysisActive((prev) => !prev);
  }, []);

  const handleToggleGuides = useCallback(() => {
    setGuidesActive((prev) => !prev);
  }, []);

  const handleTogglePipette = useCallback(() => {
    setPipetteActive((prev) => !prev);
    if (!pipetteActive) {
      setFocusActive(false);
      setScanActive(false);
      setPaletteActive(false);
    }
  }, [pipetteActive]);

  const handleToggleFocus = useCallback(() => {
    setFocusActive((prev) => !prev);
    if (!focusActive) {
      setPipetteActive(false);
      setScanActive(false);
      setPaletteActive(false);
    }
  }, [focusActive]);

  const handleToggleScan = useCallback(() => {
    setScanActive((prev) => !prev);
    if (!scanActive) {
      setPipetteActive(false);
      setFocusActive(false);
      setPaletteActive(false);
    }
  }, [scanActive]);

  const handleTogglePalette = useCallback(() => {
    setPaletteActive((prev) => !prev);
    if (!paletteActive) {
      setPipetteActive(false);
      setFocusActive(false);
      setScanActive(false);
    }
  }, [paletteActive]);

  const handleToggleCompare = useCallback(() => {
    setCompareActive((prev) => !prev);
  }, []);

  const handleToggleTerrain = useCallback(() => {
    setTerrain3D((prev) => !prev);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        terrain3D={terrain3D}
        onToggleTerrain={handleToggleTerrain}
        analysisActive={analysisActive}
        onToggleAnalysis={handleToggleAnalysis}
        guidesActive={guidesActive}
        onToggleGuides={handleToggleGuides}
        pipetteActive={pipetteActive}
        onTogglePipette={handleTogglePipette}
        focusActive={focusActive}
        onToggleFocus={handleToggleFocus}
        scanActive={scanActive}
        onToggleScan={handleToggleScan}
        paletteActive={paletteActive}
        onTogglePalette={handleTogglePalette}
        compareActive={compareActive}
        onToggleCompare={handleToggleCompare}
        hasImage={!!image}
        onReset={handleImageReset}
        onDownload={handleDownload}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          open={sidebarOpen}
          analysisMode={analysisMode}
          onAnalysisModeChange={setAnalysisMode}
          opacity={opacity}
          onOpacityChange={setOpacity}
          sensitivity={sensitivity}
          onSensitivityChange={setSensitivity}
          guides={guides}
          onGuidesChange={setGuides}
          imageData={imageData}
          rgbChannels={rgbChannels}
          onRgbChannelsChange={setRgbChannels}
          pickedColor={pickedColor}
          compareMode={compareMode}
          onCompareModeChange={setCompareMode}
          analysisActive={analysisActive}
          guidesActive={guidesActive}
          paletteActive={paletteActive}
          compareActive={compareActive}
        />

        <CanvasArea
          image={image}
          imageData={imageData}
          onImageLoad={handleImageLoad}
          onImageReset={handleImageReset}
          analysisMode={analysisMode}
          opacity={opacity}
          sensitivity={sensitivity}
          guides={guides}
          pipetteActive={pipetteActive}
          onPickColor={setPickedColor}
          compareMode={compareMode}
          terrain3D={terrain3D}
          analysisActive={analysisActive}
          guidesActive={guidesActive}
          mainCanvasRef={canvasRef}
        />
      </div>
    </div>
  );
}
