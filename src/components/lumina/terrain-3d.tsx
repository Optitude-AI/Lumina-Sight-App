"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

// ─── Types ───────────────────────────────────────────────────────────

export interface Terrain3DConfig {
  elevationScale: number;
  resolution: number;
  colorMode: "splices" | "original" | "luminance" | "heatmap" | "topo";
  darksCeiling: number;
  midtonesCeiling: number;
  darksElevation: number;
  midtonesElevation: number;
  highlightsElevation: number;
  scaleGrid: boolean;
  wireframe: boolean;
  autoRotate: boolean;
  contourLines: boolean;
}

export const DEFAULT_TERRAIN_CONFIG: Terrain3DConfig = {
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

// ─── Heightmap computation ───────────────────────────────────────────

interface HeightmapResult {
  heights: Float32Array;
  tonalZone: Uint8Array;
  colors: Float32Array;
}

function computeHeightmap(
  sourceData: ImageData,
  imageWidth: number,
  imageHeight: number,
  resolution: number,
  config: Terrain3DConfig
): HeightmapResult {
  const res = resolution;
  const heights = new Float32Array(res * res);
  const tonalZone = new Uint8Array(res * res);
  const colors = new Float32Array(res * res * 3);

  const darksMax = config.darksCeiling / 100;
  const midMax = config.midtonesCeiling / 100;

  for (let gy = 0; gy < res; gy++) {
    for (let gx = 0; gx < res; gx++) {
      const srcX = Math.min(imageWidth - 1, Math.floor((gx / (res - 1)) * imageWidth));
      const srcY = Math.min(imageHeight - 1, Math.floor((gy / (res - 1)) * imageHeight));
      const idx = (srcY * imageWidth + srcX) * 4;
      const r = sourceData.data[idx];
      const g = sourceData.data[idx + 1];
      const b = sourceData.data[idx + 2];

      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

      let scale = 1;
      if (luminance < darksMax) {
        tonalZone[gy * res + gx] = 0;
        scale = config.darksElevation;
      } else if (luminance < midMax) {
        tonalZone[gy * res + gx] = 1;
        scale = config.midtonesElevation;
      } else {
        tonalZone[gy * res + gx] = 2;
        scale = config.highlightsElevation;
      }

      heights[gy * res + gx] = luminance * scale;

      const ci = (gy * res + gx) * 3;
      const [cr, cg, cb] = computeTerrainColor(luminance, r / 255, g / 255, b / 255, config);
      colors[ci] = cr;
      colors[ci + 1] = cg;
      colors[ci + 2] = cb;
    }
  }

  return { heights, tonalZone, colors };
}

function computeTerrainColor(
  lum: number,
  r: number,
  g: number,
  b: number,
  config: Terrain3DConfig
): [number, number, number] {
  const darksMax = config.darksCeiling / 100;
  const midMax = config.midtonesCeiling / 100;

  switch (config.colorMode) {
    case "original":
      return [r, g, b];
    case "luminance":
      return [lum, lum, lum];
    case "heatmap":
      return heatmapColor(lum);
    case "splices": {
      const zoneColors: [number, number, number][] = [
        [0.1, 0.06, 0.42],
        [0.9, 0.58, 0.08],
        [1.0, 0.97, 0.85],
      ];
      let zone: number;
      if (lum < darksMax) zone = 0;
      else if (lum < midMax) zone = 1;
      else zone = 2;
      const [zr, zg, zb] = zoneColors[zone];
      return [zr * 0.7 + r * 0.3, zg * 0.7 + g * 0.3, zb * 0.7 + b * 0.3];
    }
    case "topo": {
      const contourSpacing = 0.08;
      const contourDarken = Math.abs(Math.sin(lum * Math.PI / contourSpacing));
      const factor = 0.6 + 0.4 * contourDarken;
      return [lum * factor * 0.85, lum * factor * 0.82, Math.min(1, lum * factor + 0.15)];
    }
    default:
      return [r, g, b];
  }
}

function heatmapColor(lum: number): [number, number, number] {
  if (lum < 0.25) return [0, lum * 4, 1];
  else if (lum < 0.5) return [0, 1, 1 - (lum - 0.25) * 4];
  else if (lum < 0.75) return [(lum - 0.5) * 4, 1, 0];
  else return [1, 1 - (lum - 0.75) * 4, 0];
}

// ─── Terrain Mesh ────────────────────────────────────────────────────

interface TerrainMeshProps {
  sourceData: ImageData;
  imageWidth: number;
  imageHeight: number;
  config: Terrain3DConfig;
}

function TerrainMesh({ sourceData, imageWidth, imageHeight, config }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const res = config.resolution;

  const { heights, colors } = useMemo(
    () => computeHeightmap(sourceData, imageWidth, imageHeight, res, config),
    [sourceData, imageWidth, imageHeight, res, config.colorMode,
     config.darksCeiling, config.midtonesCeiling,
     config.darksElevation, config.midtonesElevation, config.highlightsElevation]
  );

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(4, 4, res - 1, res - 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colorArr = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const col = i % res;
      const row = Math.floor(i / res);
      const hIdx = row * res + col;
      const h = heights[hIdx] || 0;
      pos.setZ(i, h * config.elevationScale);
      colorArr[i * 3] = colors[hIdx * 3] || 0.5;
      colorArr[i * 3 + 1] = colors[hIdx * 3 + 1] || 0.5;
      colorArr[i * 3 + 2] = colors[hIdx * 3 + 2] || 0.5;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colorArr, 3));
    geo.computeVertexNormals();
    return geo;
  }, [heights, colors, config.elevationScale, res]);

  useFrame((_, delta) => {
    if (meshRef.current && config.autoRotate) {
      meshRef.current.rotation.z += 0.15 * delta;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2.5, 0, 0]}
      position={[0, 0, 0]}
    >
      <meshStandardMaterial
        vertexColors
        wireframe={config.wireframe}
        side={THREE.DoubleSide}
        roughness={0.6}
        metalness={0.1}
        flatShading={false}
      />
    </mesh>
  );
}

// ─── Tonal Zone Planes ───────────────────────────────────────────────

function TonalZonePlanes({ config }: { config: Terrain3DConfig }) {
  const darksMax = config.darksCeiling / 100;
  const midMax = config.midtonesCeiling / 100;
  const elevation = config.elevationScale;

  const darksY = darksMax * config.darksElevation * elevation;
  const midsY = midMax * config.midtonesElevation * elevation;
  const highsY = 1.0 * config.highlightsElevation * elevation;

  return (
    <group>
      <mesh position={[0, darksY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.1, 4.1]} />
        <meshBasicMaterial color="#1a0d66" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments position={[0, darksY, 0.001]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(4.1, 4.1)]} />
        <lineBasicMaterial color="#4422cc" transparent opacity={0.5} />
      </lineSegments>

      <mesh position={[0, midsY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.1, 4.1]} />
        <meshBasicMaterial color="#cc8800" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments position={[0, midsY, 0.001]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(4.1, 4.1)]} />
        <lineBasicMaterial color="#cc8800" transparent opacity={0.4} />
      </lineSegments>

      <mesh position={[0, highsY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.1, 4.1]} />
        <meshBasicMaterial color="#fff5dd" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments position={[0, highsY, 0.001]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(4.1, 4.1)]} />
        <lineBasicMaterial color="#ffeecc" transparent opacity={0.3} />
      </lineSegments>
    </group>
  );
}

// ─── Contour Lines ───────────────────────────────────────────────────

function TerrainContours({
  sourceData,
  imageWidth,
  imageHeight,
  config,
}: {
  sourceData: ImageData;
  imageWidth: number;
  imageHeight: number;
  config: Terrain3DConfig;
}) {
  const res = config.resolution;
  const elevation = config.elevationScale;

  const contourLines = useMemo(() => {
    if (!config.contourLines) return [];

    const { heights } = computeHeightmap(sourceData, imageWidth, imageHeight, res, config);
    let minH = Infinity, maxH = -Infinity;
    for (let i = 0; i < heights.length; i++) {
      if (heights[i] < minH) minH = heights[i];
      if (heights[i] > maxH) maxH = heights[i];
    }

    const levels = 12;
    const lines: { points: THREE.Vector3[]; color: string }[] = [];
    const range = (maxH - minH) || 1;
    const step = range / levels;

    for (let level = 1; level < levels; level++) {
      const threshold = minH + step * level;
      const hue = (level / levels) * 0.6;
      const colorHSL = `hsl(${hue * 360}, 80%, 50%)`;
      const levelPoints: THREE.Vector3[] = [];

      for (let y = 0; y < res - 1; y++) {
        for (let x = 0; x < res - 1; x++) {
          const v00 = heights[y * res + x];
          const v10 = heights[y * res + x + 1];
          const v01 = heights[(y + 1) * res + x];
          const v11 = heights[(y + 1) * res + x + 1];

          const edgePoints: [number, number, number][] = [];

          if ((v00 < threshold) !== (v10 < threshold)) {
            const t = (threshold - v00) / (v10 - v00);
            edgePoints.push([-2 + (x + t) * (4 / (res - 1)), (v00 + t * (v10 - v00)) * elevation, -2 + y * (4 / (res - 1))]);
          }
          if ((v10 < threshold) !== (v11 < threshold)) {
            const t = (threshold - v10) / (v11 - v10);
            edgePoints.push([-2 + (x + 1) * (4 / (res - 1)), (v10 + t * (v11 - v10)) * elevation, -2 + (y + t) * (4 / (res - 1))]);
          }
          if ((v01 < threshold) !== (v11 < threshold)) {
            const t = (threshold - v01) / (v11 - v01);
            edgePoints.push([-2 + (x + t) * (4 / (res - 1)), (v01 + t * (v11 - v01)) * elevation, -2 + (y + 1) * (4 / (res - 1))]);
          }
          if ((v00 < threshold) !== (v01 < threshold)) {
            const t = (threshold - v00) / (v01 - v00);
            edgePoints.push([-2 + x * (4 / (res - 1)), (v00 + t * (v01 - v00)) * elevation, -2 + (y + t) * (4 / (res - 1))]);
          }

          if (edgePoints.length >= 2) {
            levelPoints.push(
              new THREE.Vector3(edgePoints[0][0], edgePoints[0][1], edgePoints[0][2]),
              new THREE.Vector3(edgePoints[1][0], edgePoints[1][1], edgePoints[1][2])
            );
          }
        }
      }

      if (levelPoints.length > 0) {
        lines.push({ points: levelPoints, color: colorHSL });
      }
    }

    return lines;
  }, [config.contourLines, sourceData, imageWidth, imageHeight, res, elevation]);

  if (!config.contourLines || contourLines.length === 0) return null;

  return (
    <group>
      {contourLines.map((line, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints(line.points);
        return (
          <lineSegments key={i} geometry={geo}>
            <lineBasicMaterial color={line.color} transparent opacity={0.6} linewidth={1} />
          </lineSegments>
        );
      })}
    </group>
  );
}

// ─── Floor Grid with Elevation Axis ──────────────────────────────────

function TerrainGrid({ config }: { config: Terrain3DConfig }) {
  const elevation = config.elevationScale;

  if (!config.scaleGrid) return null;

  const gridLines: THREE.Vector3[] = [];
  const gridCount = 10;
  const gridExtent = 2.2;

  for (let i = 0; i <= gridCount; i++) {
    const t = -gridExtent + (2 * gridExtent * i) / gridCount;
    gridLines.push(new THREE.Vector3(-gridExtent, 0, t), new THREE.Vector3(gridExtent, 0, t));
    gridLines.push(new THREE.Vector3(t, 0, -gridExtent), new THREE.Vector3(t, 0, gridExtent));
  }

  // Y-axis
  const axisHeight = 1.3 * elevation;
  const axisLines: THREE.Vector3[] = [
    new THREE.Vector3(-2.2, 0, -2.2),
    new THREE.Vector3(-2.2, axisHeight, -2.2),
  ];

  // Elevation step tick marks on Y-axis
  const elevationTicks: THREE.Vector3[] = [];
  const elevSteps = 5;
  for (let i = 1; i <= elevSteps; i++) {
    const y = (axisHeight * i) / elevSteps;
    elevationTicks.push(
      new THREE.Vector3(-2.2, y, -2.2),
      new THREE.Vector3(-2.05, y, -2.2)
    );
  }

  // Tonal zone indicator bands on the side axis
  const darksMax = config.darksCeiling / 100;
  const midMax = config.midtonesCeiling / 100;
  const darksY = darksMax * config.darksElevation * elevation;
  const midsY = midMax * config.midtonesElevation * elevation;
  const highsY = 1.0 * config.highlightsElevation * elevation;

  // Zone band lines (horizontal lines on the axis side showing zone boundaries)
  const zoneLines: THREE.Vector3[] = [];
  zoneLines.push(new THREE.Vector3(-2.2, darksY, -2.15), new THREE.Vector3(-2.2, darksY, 2.15));
  zoneLines.push(new THREE.Vector3(-2.2, midsY, -2.15), new THREE.Vector3(-2.2, midsY, 2.15));
  zoneLines.push(new THREE.Vector3(-2.2, highsY, -2.15), new THREE.Vector3(-2.2, highsY, 2.15));

  // Elevation labels positioned along the Y-axis
  const elevationLabels = [];
  for (let i = 0; i <= elevSteps; i++) {
    const yFrac = i / elevSteps;
    const lumVal = Math.round(yFrac * 100);
    const yPos = axisHeight * yFrac;
    elevationLabels.push({ lumVal, yPos });
  }

  // Tonal zone labels positioned at zone boundary heights
  const zoneLabels = [
    { label: "Darks", y: darksY / 2, color: "#8866dd" },
    { label: "Midtones", y: (darksY + midsY) / 2, color: "#cc9900" },
    { label: "Highlights", y: (midsY + highsY) / 2, color: "#ffeecc" },
  ];

  return (
    <group>
      {/* Floor grid */}
      <lineSegments geometry={new THREE.BufferGeometry().setFromPoints(gridLines)}>
        <lineBasicMaterial color="#444466" transparent opacity={0.3} />
      </lineSegments>
      {/* Y-axis */}
      <lineSegments geometry={new THREE.BufferGeometry().setFromPoints(axisLines)}>
        <lineBasicMaterial color="#aaaaaa" transparent opacity={0.7} />
      </lineSegments>
      {/* Elevation tick marks */}
      <lineSegments geometry={new THREE.BufferGeometry().setFromPoints(elevationTicks)}>
        <lineBasicMaterial color="#aaaaaa" transparent opacity={0.5} />
      </lineSegments>
      {/* Zone boundary lines */}
      <lineSegments geometry={new THREE.BufferGeometry().setFromPoints(zoneLines)}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
      </lineSegments>

      {/* Elevation labels on Y-axis */}
      {elevationLabels.map(({ lumVal, yPos }) => (
        <Text
          key={`elev-${lumVal}`}
          position={[-2.55, yPos, -2.2]}
          rotation={[0, 0, 0]}
          fontSize={0.1}
          color="#999999"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {`${lumVal}%`}
        </Text>
      ))}

      {/* Axis title */}
      <Text
        position={[-2.7, axisHeight / 2, -2.2]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={0.09}
        color="#777777"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        LUMINANCE
      </Text>

      {/* Tonal zone labels on the side */}
      {zoneLabels.map(({ label, y, color }) => (
        <Text
          key={`zone-${label}`}
          position={[2.55, y, -2.2]}
          rotation={[0, 0, 0]}
          fontSize={0.1}
          color={color}
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {label}
        </Text>
      ))}

      {/* X-axis label */}
      <Text
        position={[0, -0.15, -2.4]}
        rotation={[0, 0, 0]}
        fontSize={0.09}
        color="#777777"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        IMAGE WIDTH
      </Text>

      {/* Z-axis label */}
      <Text
        position={[-2.4, -0.15, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.09}
        color="#777777"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        IMAGE HEIGHT
      </Text>
    </group>
  );
}

// ─── Camera Controller ───────────────────────────────────────────────

function CameraController({ elevation }: { elevation: number }) {
  const { camera } = useThree();

  useEffect(() => {
    const dist = Math.max(4, 1.5 * elevation + 3);
    camera.position.set(0, dist, dist);
    camera.lookAt(0, 0.3 * elevation, 0);
  }, [camera, elevation]);

  return null;
}

// ─── HTML Scale Overlay ──────────────────────────────────────────────

function ScaleOverlay({ config }: { config: Terrain3DConfig }) {
  const elevation = config.elevationScale;
  const darksMax = config.darksCeiling / 100;
  const midMax = config.midtonesCeiling / 100;

  const darksY = darksMax * config.darksElevation * elevation;
  const midsY = midMax * config.midtonesElevation * elevation;
  const highsY = 1.0 * config.highlightsElevation * elevation;
  const axisHeight = 1.3 * elevation;

  // Elevation step labels
  const elevSteps = 5;
  const elevationLabels = [];
  for (let i = 0; i <= elevSteps; i++) {
    const yFrac = i / elevSteps;
    const lumVal = Math.round(yFrac * 100);
    const bottomPct = 82 - yFrac * 65; // map to screen position (rough)
    elevationLabels.push({ lumVal, bottomPct });
  }

  return (
    <div className="absolute left-3 top-3 bottom-3 pointer-events-none select-none flex">
      {/* Elevation axis labels */}
      <div className="relative w-10 flex-shrink-0" style={{ height: "100%" }}>
        {/* Axis title */}
        <div
          className="absolute text-[9px] font-medium text-muted-foreground/50"
          style={{ top: 0, left: 0, writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          LUMINANCE
        </div>

        {/* Elevation values */}
        {elevationLabels.map(({ lumVal, bottomPct }) => (
          <div
            key={lumVal}
            className="absolute text-[8px] text-muted-foreground/40 tabular-nums"
            style={{ bottom: `${bottomPct}%`, left: 0 }}
          >
            {lumVal}
          </div>
        ))}

        {/* Tonal zone indicators */}
        <div className="absolute right-0 top-[15%] bottom-[18%] w-1.5 rounded-full overflow-hidden flex flex-col">
          <div className="flex-1 bg-[#fff5dd]/20" style={{ flex: highsY - midsY }} title="Highlights" />
          <div className="flex-1 bg-[#cc8800]/20" style={{ flex: midsY - darksY }} title="Midtones" />
          <div className="flex-1 bg-[#1a0d66]/30" style={{ flex: darksY }} title="Darks" />
        </div>
      </div>

      {/* Zone labels */}
      <div className="relative w-20 flex-shrink-0 ml-1" style={{ height: "100%" }}>
        {/* These are positioned approximately where the zone planes are */}
        <div
          className="absolute text-[8px] font-semibold flex items-center gap-1"
          style={{
            bottom: `${18 + (darksY / axisHeight) * 65}%`,
            color: "#6644cc",
          }}
        >
          <span className="inline-block w-2 h-0.5 bg-[#4422cc]" />
          Darks
        </div>
        <div
          className="absolute text-[8px] font-semibold flex items-center gap-1"
          style={{
            bottom: `${18 + (midsY / axisHeight) * 65}%`,
            color: "#cc8800",
          }}
        >
          <span className="inline-block w-2 h-0.5 bg-[#cc8800]" />
          Midtones
        </div>
        <div
          className="absolute text-[8px] font-semibold flex items-center gap-1"
          style={{
            bottom: `${18 + (highsY / axisHeight) * 65}%`,
            color: "#ffeecc",
          }}
        >
          <span className="inline-block w-2 h-0.5 bg-[#ffeecc]" />
          Highlights
        </div>
      </div>
    </div>
  );
}

// ─── Scale Bar ───────────────────────────────────────────────────────

function ScaleBar({ config, imageWidth, imageHeight }: { config: Terrain3DConfig; imageWidth: number; imageHeight: number }) {
  // The terrain is 4×4 world units = the full image
  // Show image dimensions and pixel scale
  const pixelScale = Math.max(imageWidth, imageHeight) / 4;

  return (
    <div className="absolute bottom-3 right-3 pointer-events-none select-none flex flex-col items-end gap-1">
      {/* Image dimensions */}
      <div className="text-[9px] text-muted-foreground/50 tabular-nums">
        {imageWidth} × {imageHeight} px
      </div>
      {/* Scale bar */}
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col items-end">
          <span className="text-[8px] text-muted-foreground/40">{Math.round(pixelScale)} px/unit</span>
        </div>
        <div className="w-16 h-1 border border-muted-foreground/30 relative">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-muted-foreground/50" />
          <div className="absolute right-0 top-0 bottom-0 w-px bg-muted-foreground/50" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/30" />
        </div>
      </div>
      {/* Elevation info */}
      <div className="text-[8px] text-muted-foreground/40">
        Elevation: {config.elevationScale.toFixed(1)}× · Resolution: {config.resolution}
      </div>
    </div>
  );
}

// ─── Status Bar ──────────────────────────────────────────────────────

function StatusBar({ config }: { config: Terrain3DConfig }) {
  const modeLabels: Record<string, string> = {
    splices: "Tonal Splices",
    original: "Original Colors",
    luminance: "Luminance",
    heatmap: "Heatmap",
    topo: "Topographic",
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none select-none">
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background/60 backdrop-blur-sm border border-border/50">
        <span className="text-[10px] font-medium text-foreground/70">
          {modeLabels[config.colorMode] || config.colorMode}
        </span>
        {config.wireframe && (
          <span className="text-[9px] text-orange-400/80 border border-orange-400/30 rounded px-1">Wire</span>
        )}
        {config.contourLines && (
          <span className="text-[9px] text-green-400/80 border border-green-400/30 rounded px-1">Contours</span>
        )}
        {config.autoRotate && (
          <span className="text-[9px] text-blue-400/80 border border-blue-400/30 rounded px-1">Auto</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────

interface Terrain3DViewProps {
  sourceData: ImageData;
  imageWidth: number;
  imageHeight: number;
  config: Terrain3DConfig;
}

export default function Terrain3DView({
  sourceData,
  imageWidth,
  imageHeight,
  config,
}: Terrain3DViewProps) {
  const elevation = config.elevationScale;
  const camDist = Math.max(4, 1.5 * elevation + 3);

  return (
    <div className="w-full h-full relative" style={{ background: "#08080c" }}>
      <Canvas
        camera={{
          position: [0, camDist, camDist],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#08080c" }}
      >
        <color attach="background" args={["#08080c"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 4, -2]} intensity={0.3} />
        <hemisphereLight args={["#b1e1ff", "#b97a20", 0.2]} />

        <TerrainMesh
          sourceData={sourceData}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          config={config}
        />
        <TonalZonePlanes config={config} />
        <TerrainContours
          sourceData={sourceData}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          config={config}
        />
        <TerrainGrid config={config} />
        <CameraController elevation={elevation} />

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={1.5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.1}
          enablePan
          panSpeed={0.5}
          rotateSpeed={0.6}
          target={[0, 0.3 * elevation, 0]}
        />
      </Canvas>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/40 pointer-events-none select-none">
        Drag to rotate · Scroll to zoom · Right-click to pan
      </div>

      {/* Visual Scale Overlay (left side) */}
      {config.scaleGrid && <ScaleOverlay config={config} />}

      {/* Scale Bar (bottom-right) */}
      <ScaleBar config={config} imageWidth={imageWidth} imageHeight={imageHeight} />

      {/* Status Bar (top center) */}
      <StatusBar config={config} />

      {/* Tonal splice legend (top-right, only in splices mode) */}
      {config.colorMode === "splices" && (
        <div className="absolute top-10 right-3 flex flex-col gap-1.5 text-[9px] pointer-events-none select-none bg-background/40 backdrop-blur-sm rounded-md px-2.5 py-2 border border-border/30">
          <div className="text-[8px] text-muted-foreground/50 uppercase tracking-wider font-medium mb-0.5">Tonal Zones</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2.5 rounded-sm border border-[#4422cc]/50" style={{ backgroundColor: "#1a0d66" }} />
            <span className="text-muted-foreground/70">Darks <span className="text-muted-foreground/40">(0–{config.darksCeiling}%)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2.5 rounded-sm border border-[#cc8800]/50" style={{ backgroundColor: "#cc8800" }} />
            <span className="text-muted-foreground/70">Midtones <span className="text-muted-foreground/40">({config.darksCeiling}–{config.midtonesCeiling}%)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2.5 rounded-sm border border-[#ffeecc]/50" style={{ backgroundColor: "#fff5dd" }} />
            <span className="text-muted-foreground/70">Highlights <span className="text-muted-foreground/40">({config.midtonesCeiling}–100%)</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
