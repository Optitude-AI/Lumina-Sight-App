"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Header from "@/components/lumina/header";
import Sidebar from "@/components/lumina/sidebar";
import CanvasArea from "@/components/lumina/canvas-area";
import ExportDialog from "@/components/lumina/export-dialog";
import type { AnalysisMode } from "@/components/lumina/image-analyzer";
import type { GuideConfig } from "@/components/lumina/guide-renderer";
import type { ColorInfo } from "@/components/lumina/color-picker";
import { type Terrain3DConfig, DEFAULT_TERRAIN_CONFIG } from "@/components/lumina/terrain-3d";
import { type ToneCurveConfig, DEFAULT_TONE_CONFIG, generateCurveFromSliders } from "@/components/lumina/tone-editor";
import { useHistory, type HistorySnapshot } from "@/components/lumina/use-history";
import type { CropRegion } from "@/components/lumina/crop-tool";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // UI state
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile, user opens via Sheet
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

  // Crop state
  const [cropActive, setCropActive] = useState(false);

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisType, setAiAnalysisType] = useState("full");

  // Export dialog state
  const [exportOpen, setExportOpen] = useState(false);

  // Undo/Redo history
  const history = useHistory();

  // Get current history snapshot
  const getCurrentSnapshot = useCallback((): HistorySnapshot => {
    return {
      toneConfig,
      guideConfig,
      analysisMode,
      opacity,
      sensitivity,
      compareMode,
      analysisActive,
      guidesActive,
    };
  }, [toneConfig, guideConfig, analysisMode, opacity, sensitivity, compareMode, analysisActive, guidesActive]);

  // Apply a history snapshot
  const applySnapshot = useCallback((snapshot: HistorySnapshot) => {
    setToneConfig(snapshot.toneConfig);
    setGuideConfig(snapshot.guideConfig);
    setAnalysisMode(snapshot.analysisMode);
    setOpacity(snapshot.opacity);
    setSensitivity(snapshot.sensitivity);
    setCompareMode(snapshot.compareMode);
    setAnalysisActive(snapshot.analysisActive);
    setGuidesActive(snapshot.guidesActive);
  }, []);

  // Handle undo
  const handleUndo = useCallback(() => {
    const snapshot = history.undo(getCurrentSnapshot());
    if (snapshot) applySnapshot(snapshot);
  }, [history, getCurrentSnapshot, applySnapshot]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const snapshot = history.redo(getCurrentSnapshot());
    if (snapshot) applySnapshot(snapshot);
  }, [history, getCurrentSnapshot, applySnapshot]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Push history before state changes
  const pushHistory = useCallback(() => {
    history.push(getCurrentSnapshot());
  }, [history, getCurrentSnapshot]);

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
    setCropActive(false);
    setAiAnalysis("");
    setAiAnalysisType("full");
    history.reset();
  }, [history]);

  // Handle download (opens export dialog)
  const handleDownload = useCallback(() => {
    setExportOpen(true);
  }, []);

  // Toggle handlers with history
  const handleToggleAnalysis = useCallback(() => {
    pushHistory();
    setAnalysisActive((prev) => !prev);
  }, [pushHistory]);

  const handleToggleGuides = useCallback(() => {
    pushHistory();
    setGuidesActive((prev) => !prev);
  }, [pushHistory]);

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
    pushHistory();
    setCompareActive((prev) => !prev);
    setCompareMode((prev) => prev === "original" ? "analysis" : "original");
  }, [pushHistory]);

  const handleToggleTerrain = useCallback(() => {
    setTerrain3D((prev) => !prev);
  }, []);

  // Handle tone config changes from sidebar SLIDERS — regenerate curve from slider values
  const handleToneSliderChange = useCallback((newConfig: ToneCurveConfig) => {
    pushHistory();
    const newCurve = generateCurveFromSliders(
      newConfig.brightness,
      newConfig.contrast,
      newConfig.shadows,
      newConfig.highlights
    );
    setToneConfig({ ...newConfig, curvePoints: newCurve });
  }, [pushHistory]);

  // Handle tone config changes from PRESETS or CURVE DRAG — preserve the curve points as-is
  const handleToneCurveChange = useCallback((newConfig: ToneCurveConfig) => {
    pushHistory();
    setToneConfig(newConfig);
  }, [pushHistory]);

  // Analysis mode change with history
  const handleAnalysisModeChange = useCallback((mode: AnalysisMode) => {
    pushHistory();
    setAnalysisMode(mode);
  }, [pushHistory]);

  // Opacity change with history (debounced via slider)
  const handleOpacityChange = useCallback((value: number) => {
    pushHistory();
    setOpacity(value);
  }, [pushHistory]);

  // Sensitivity change with history
  const handleSensitivityChange = useCallback((value: number) => {
    pushHistory();
    setSensitivity(value);
  }, [pushHistory]);

  // Guide config change with history
  const handleGuideConfigChange = useCallback((config: GuideConfig) => {
    pushHistory();
    setGuideConfig(config);
  }, [pushHistory]);

  // Crop handlers
  const handleToggleCrop = useCallback(() => {
    setCropActive((prev) => !prev);
  }, []);

  const handleCropCancel = useCallback(() => {
    setCropActive(false);
  }, []);

  const handleCropApply = useCallback((region: CropRegion) => {
    if (!image || !imageData) return;

    // Create a new canvas with the cropped region
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = region.width;
    cropCanvas.height = region.height;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return;

    // If rotation is applied, we need to handle it
    if (region.rotation !== 0) {
      cropCtx.save();
      cropCtx.translate(region.width / 2, region.height / 2);
      cropCtx.rotate((region.rotation * Math.PI) / 180);
      cropCtx.drawImage(image, -region.width / 2, -region.height / 2, region.width, region.height);
      cropCtx.restore();
    } else {
      cropCtx.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
    }

    // Create new image from cropped canvas
    const newImg = new Image();
    newImg.onload = () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = newImg.width;
      tempCanvas.height = newImg.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;
      tempCtx.drawImage(newImg, 0, 0);
      const newData = tempCtx.getImageData(0, 0, newImg.width, newImg.height);
      setImage(newImg);
      setImageData(newData);
    };
    newImg.src = cropCanvas.toDataURL("image/png");

    setCropActive(false);
  }, [image, imageData]);

  // Rotate 90° handler
  const handleRotate90 = useCallback(() => {
    if (!image || !imageData) return;

    const rotCanvas = document.createElement("canvas");
    rotCanvas.width = image.height;
    rotCanvas.height = image.width;
    const rotCtx = rotCanvas.getContext("2d");
    if (!rotCtx) return;

    rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
    rotCtx.rotate(Math.PI / 2);
    rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

    const newImg = new Image();
    newImg.onload = () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = newImg.width;
      tempCanvas.height = newImg.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;
      tempCtx.drawImage(newImg, 0, 0);
      const newData = tempCtx.getImageData(0, 0, newImg.width, newImg.height);
      setImage(newImg);
      setImageData(newData);
    };
    newImg.src = rotCanvas.toDataURL("image/png");
  }, [image, imageData]);

  // AI Analysis handler
  const handleAIAnalyze = useCallback(async () => {
    if (!image || !imageData) return;

    setAiAnalysisLoading(true);
    setAiAnalysis("");

    try {
      // Convert image to base64
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;
      tempCtx.drawImage(image, 0, 0);
      const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.8);
      const base64 = dataUrl.split(",")[1];

      // Try the local API route first
      let response: Response | null = null;
      let data: any = null;

      try {
        response = await fetch("/api/ai-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            analysisType: aiAnalysisType,
          }),
        });
        data = await response.json();
      } catch {
        // Local API failed, try the dev server proxy
      }

      // If local API failed or returned an error, try the dev server proxy
      if (!data || data.error) {
        try {
          const proxyResponse = await fetch("https://lumina-sight2.space-z.ai/api/ai-proxy", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Proxy-Key": "lumina-ai-proxy-2026",
            },
            body: JSON.stringify({
              imageBase64: base64,
              analysisType: aiAnalysisType,
            }),
          });
          if (proxyResponse.ok) {
            data = await proxyResponse.json();
          }
        } catch {
          // Dev server proxy also failed
        }
      }

      if (data?.error) {
        setAiAnalysis(`⚠ AI service unavailable. The analysis engine requires the development server. Please try again later or use the app at lumina-sight2.space-z.ai for full AI features.`);
      } else if (data?.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        setAiAnalysis("AI analysis is currently unavailable. Please try again later.");
      }
    } catch (err) {
      setAiAnalysis("Failed to connect to AI service. Please try again.");
    } finally {
      setAiAnalysisLoading(false);
    }
  }, [image, imageData, aiAnalysisType]);

  // AI analysis from header — scroll sidebar to AI section
  const handleAIAnalyzeFromHeader = useCallback(() => {
    handleAIAnalyze();
  }, [handleAIAnalyze]);

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
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        cropActive={cropActive}
        onToggleCrop={handleToggleCrop}
        onRotate90={handleRotate90}
        onAIAnalyze={handleAIAnalyzeFromHeader}
        onExport={() => setExportOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          analysisMode={analysisMode}
          onAnalysisModeChange={handleAnalysisModeChange}
          opacity={opacity}
          onOpacityChange={handleOpacityChange}
          sensitivity={sensitivity}
          onSensitivityChange={handleSensitivityChange}
          imageData={imageData}
          rgbChannels={rgbChannels}
          onRgbChannelsChange={setRgbChannels}
          guideConfig={guideConfig}
          onGuideConfigChange={handleGuideConfigChange}
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
          aiAnalysis={aiAnalysis}
          aiAnalysisLoading={aiAnalysisLoading}
          aiAnalysisType={aiAnalysisType}
          onAIAnalysisTypeChange={setAiAnalysisType}
          onAIAnalyze={handleAIAnalyze}
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
          cropActive={cropActive}
          onCropApply={handleCropApply}
          onCropCancel={handleCropCancel}
          overlayCanvasRef={overlayCanvasRef}
        />
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        mainCanvasRef={canvasRef}
        overlayCanvasRef={overlayCanvasRef}
        image={image}
        imageData={imageData}
        toneConfig={toneConfig}
        guideConfig={guideConfig}
        analysisMode={analysisMode}
        opacity={opacity}
        sensitivity={sensitivity}
        analysisActive={analysisActive}
        guidesActive={guidesActive}
        compareMode={compareMode}
        palette={palette}
      />
    </div>
  );
}
