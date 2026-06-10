"use client";

import { useState, useCallback, useRef } from "react";
import Header from "@/components/lumina/header";
import Sidebar from "@/components/lumina/sidebar";
import CanvasArea from "@/components/lumina/canvas-area";
import type { AnalysisMode } from "@/components/lumina/image-analyzer";
import type { GuideConfig } from "@/components/lumina/guide-renderer";
import type { ColorInfo } from "@/components/lumina/color-picker";
import { type Terrain3DConfig, DEFAULT_TERRAIN_CONFIG } from "@/components/lumina/terrain-3d";
import { type ToneCurveConfig, DEFAULT_TONE_CONFIG, generateCurveFromSliders } from "@/components/lumina/tone-editor";

const initialTerrainConfig: Terrain3DConfig = {
  elevationScale: 3,
  resolution: 128,
  colorMode: "splices",
  darksCeiling: 25,
  midtonesCeiling: 65,
  darksElevation: 1.0,
  midtonesElevation: 1.0,
  highlightsElevation: 1.0,
  scaleGrid: true,
  wireframe: false,
  autoRotate: false,
  contourLines: false,
};

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
  const [guideConfig, setGuideConfig] = useState<GuideConfig>({
    activeGuide: null,
    thickness: 1.5,
    guideColor: "#ffffff",
  });

  // Tone state
  const [toneConfig, setToneConfig] = useState<ToneCurveConfig>({ ...DEFAULT_TONE_CONFIG });

  // Color state
  const [pickedColor, setPickedColor] = useState<ColorInfo | null>(null);
  const [rgbChannels, setRgbChannels] = useState({ r: true, g: true, b: true });
  const [palette, setPalette] = useState<ColorInfo[]>([]);

  // 3D Terrain state
  const [terrainConfig, setTerrainConfig] = useState<Terrain3DConfig>(initialTerrainConfig);

  // Tool states
  const [pipetteActive, setPipetteActive] = useState(false);
  const [focusActive, setFocusActive] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const [paletteActive, setPaletteActive] = useState(false);
  const [compareActive, setCompareActive] = useState(false);

  // Active section states
  const [analysisActive, setAnalysisActive] = useState(true);
  const [guidesActive, setGuidesActive] = useState(false);

  // Compare state — "analysis" = showing analysis (default when analysis active), "original" = showing original
  const [compareMode, setCompareMode] = useState<"original" | "analysis">("analysis");

  // Zoom state
  const [zoom, setZoom] = useState(100);

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
    setCompareActive(false);
    setAnalysisActive(true);
    setGuidesActive(false);
    setZoom(100);
    setGuideConfig({ activeGuide: null, thickness: 1.5, guideColor: "#ffffff" });
    setToneConfig({ ...DEFAULT_TONE_CONFIG });
    setTerrainConfig(initialTerrainConfig);
    setPalette([]);
    setCompareMode("analysis");
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
    if (pipetteActive) return;
    setFocusActive(false);
    setScanActive(false);
    setPaletteActive(false);
  }, [pipetteActive]);

  const handleToggleFocus = useCallback(() => {
    setFocusActive((prev) => !prev);
    if (focusActive) return;
    setPipetteActive(false);
    setScanActive(false);
    setPaletteActive(false);
  }, [focusActive]);

  const handleToggleScan = useCallback(() => {
    setScanActive((prev) => !prev);
    if (scanActive) return;
    setPipetteActive(false);
    setFocusActive(false);
    setPaletteActive(false);
  }, [scanActive]);

  const handleTogglePalette = useCallback(() => {
    setPaletteActive((prev) => !prev);
    if (paletteActive) return;
    setPipetteActive(false);
    setFocusActive(false);
    setScanActive(false);
  }, [paletteActive]);

  const handleToggleCompare = useCallback(() => {
    setCompareActive((prev) => !prev);
    setCompareMode((prev) => prev === "original" ? "analysis" : "original");
  }, []);

  const handleToggleTerrain = useCallback(() => {
    setTerrain3D((prev) => !prev);
  }, []);

  // Handle tone config changes from sidebar SLIDERS — regenerate curve from slider values
  const handleToneSliderChange = useCallback((newConfig: ToneCurveConfig) => {
    const newCurve = generateCurveFromSliders(
      newConfig.brightness,
      newConfig.contrast,
      newConfig.shadows,
      newConfig.highlights
    );
    setToneConfig({ ...newConfig, curvePoints: newCurve });
  }, []);

  // Handle tone config changes from PRESETS or CURVE DRAG — preserve the curve points as-is
  const handleToneCurveChange = useCallback((newConfig: ToneCurveConfig) => {
    setToneConfig(newConfig);
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
        zoom={zoom}
        onZoomChange={setZoom}
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
          imageData={imageData}
          rgbChannels={rgbChannels}
          onRgbChannelsChange={setRgbChannels}
          guideConfig={guideConfig}
          onGuideConfigChange={setGuideConfig}
          toneConfig={toneConfig}
          onToneSliderChange={handleToneSliderChange}
          onToneCurveChange={handleToneCurveChange}
          pickedColor={pickedColor}
          palette={palette}
          onPaletteChange={setPalette}
          onPickColor={setPickedColor}
          terrainConfig={terrainConfig}
          onTerrainConfigChange={setTerrainConfig}
          hasImage={!!image}
        />

        <CanvasArea
          image={image}
          imageData={imageData}
          onImageLoad={handleImageLoad}
          onImageReset={handleImageReset}
          analysisMode={analysisMode}
          opacity={opacity}
          sensitivity={sensitivity}
          guideConfig={guideConfig}
          pipetteActive={pipetteActive}
          onPickColor={setPickedColor}
          compareMode={compareMode}
          terrain3D={terrain3D}
          analysisActive={analysisActive}
          guidesActive={guidesActive}
          mainCanvasRef={canvasRef}
          toneConfig={toneConfig}
          terrainConfig={terrainConfig}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      </div>
    </div>
  );
}
