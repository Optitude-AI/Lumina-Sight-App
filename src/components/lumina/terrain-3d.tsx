"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ─── Types ───────────────────────────────────────────────────────────

export interface Terrain3DConfig {
  elevationScale: number;
  resolution: number;
  colorMode: "splices" | "original" | "luminance" | "heatmap" | "topo";
  darksCeiling: number;       // 0–100 %
  midtonesCeiling: number;    // 0–100 %
  darksElevation: number;     // multiplier
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
  tonalZone: Uint8Array; // 0=darks, 1=midtones, 2=highlights
  colors: Float32Array;  // r,g,b per vertex (0–1)
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

  // Sample image at resolution×resolution grid
  for (let gy = 0; gy < res; gy++) {
    for (let gx = 0; gx < res; gx++) {
      const srcX = Math.min(imageWidth - 1, Math.floor((gx / (res - 1)) * imageWidth));
      const srcY = Math.min(imageHeight - 1, Math.floor((gy / (res - 1)) * imageHeight));
      const idx = (srcY * imageWidth + srcX) * 4;
      const r = sourceData.data[idx];
      const g = sourceData.data[idx + 1];
      const b = sourceData.data[idx + 2];

      // Rec.709 luminance
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

      // Compute color based on mode
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

    case "luminance": {
      return [lum, lum, lum];
    }

    case "heatmap":
      return heatmapColor(lum);

    case "splices": {
      // Tonal zone base colors matching original
      const zoneColors: [number, number, number][] = [
        [0.1, 0.06, 0.42],   // darks — deep blue
        [0.9, 0.58, 0.08],   // midtones — amber
        [1.0, 0.97, 0.85],   // highlights — warm white
      ];
      let zone: number;
      if (lum < darksMax) zone = 0;
      else if (lum < midMax) zone = 1;
      else zone = 2;

      const [zr, zg, zb] = zoneColors[zone];
      // 70% zone color + 30% image color
      return [
        zr * 0.7 + r * 0.3,
        zg * 0.7 + g * 0.3,
        zb * 0.7 + b * 0.3,
      ];
    }

    case "topo": {
      // Topographic with contour darkening
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
  if (lum < 0.25) {
    return [0, lum * 4, 1];
  } else if (lum < 0.5) {
    return [0, 1, 1 - (lum - 0.25) * 4];
  } else if (lum < 0.75) {
    return [(lum - 0.5) * 4, 1, 0];
  } else {
    return [1, 1 - (lum - 0.75) * 4, 0];
  }
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

  // Auto-rotate
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
      {/* Darks plane */}
      <mesh position={[0, darksY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.1, 4.1]} />
        <meshBasicMaterial color="#1a0d66" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Darks border */}
      <lineSegments position={[0, darksY, 0.001]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(4.1, 4.1)]} />
        <lineBasicMaterial color="#4422cc" transparent opacity={0.5} />
      </lineSegments>

      {/* Midtones plane */}
      <mesh position={[0, midsY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.1, 4.1]} />
        <meshBasicMaterial color="#cc8800" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments position={[0, midsY, 0.001]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(4.1, 4.1)]} />
        <lineBasicMaterial color="#cc8800" transparent opacity={0.4} />
      </lineSegments>

      {/* Highlights plane */}
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

    // Find min/max
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

          // Top edge
          if ((v00 < threshold) !== (v10 < threshold)) {
            const t = (threshold - v00) / (v10 - v00);
            const worldX = -2 + (x + t) * (4 / (res - 1));
            const worldZ = -2 + y * (4 / (res - 1));
            edgePoints.push([worldX, (v00 + t * (v10 - v00)) * elevation, worldZ]);
          }
          // Right edge
          if ((v10 < threshold) !== (v11 < threshold)) {
            const t = (threshold - v10) / (v11 - v10);
            const worldX = -2 + (x + 1) * (4 / (res - 1));
            const worldZ = -2 + (y + t) * (4 / (res - 1));
            edgePoints.push([worldX, (v10 + t * (v11 - v10)) * elevation, worldZ]);
          }
          // Bottom edge
          if ((v01 < threshold) !== (v11 < threshold)) {
            const t = (threshold - v01) / (v11 - v01);
            const worldX = -2 + (x + t) * (4 / (res - 1));
            const worldZ = -2 + (y + 1) * (4 / (res - 1));
            edgePoints.push([worldX, (v01 + t * (v11 - v01)) * elevation, worldZ]);
          }
          // Left edge
          if ((v00 < threshold) !== (v01 < threshold)) {
            const t = (threshold - v00) / (v01 - v00);
            const worldX = -2 + x * (4 / (res - 1));
            const worldZ = -2 + (y + t) * (4 / (res - 1));
            edgePoints.push([worldX, (v00 + t * (v01 - v00)) * elevation, worldZ]);
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

// ─── Floor Grid ──────────────────────────────────────────────────────

function TerrainGrid({ config }: { config: Terrain3DConfig }) {
  const elevation = config.elevationScale;

  if (!config.scaleGrid) return null;

  const gridLines: THREE.Vector3[] = [];
  const gridColor = new THREE.Color("#444466");

  // Floor grid lines
  const gridCount = 10;
  const gridExtent = 2.2;
  for (let i = 0; i <= gridCount; i++) {
    const t = -gridExtent + (2 * gridExtent * i) / gridCount;
    // X-parallel
    gridLines.push(
      new THREE.Vector3(-gridExtent, 0, t),
      new THREE.Vector3(gridExtent, 0, t)
    );
    // Z-parallel
    gridLines.push(
      new THREE.Vector3(t, 0, -gridExtent),
      new THREE.Vector3(t, 0, gridExtent)
    );
  }

  // Y-axis
  const axisHeight = 1.3 * elevation;
  const axisLines: THREE.Vector3[] = [
    new THREE.Vector3(-2.2, 0, -2.2),
    new THREE.Vector3(-2.2, axisHeight, -2.2),
  ];

  // Elevation step lines on Y-axis
  const elevationLines: THREE.Vector3[] = [];
  const elevSteps = 5;
  for (let i = 1; i <= elevSteps; i++) {
    const y = (axisHeight * i) / elevSteps;
    elevationLines.push(
      new THREE.Vector3(-2.2, y, -2.2),
      new THREE.Vector3(-2.0, y, -2.2)
    );
  }

  return (
    <group>
      <lineSegments geometry={new THREE.BufferGeometry().setFromPoints(gridLines)}>
        <lineBasicMaterial color={gridColor} transparent opacity={0.3} />
      </lineSegments>
      <lineSegments geometry={new THREE.BufferGeometry().setFromPoints(axisLines)}>
        <lineBasicMaterial color="#888888" transparent opacity={0.5} />
      </lineSegments>
      <lineSegments geometry={new THREE.BufferGeometry().setFromPoints(elevationLines)}>
        <lineBasicMaterial color="#888888" transparent opacity={0.3} />
      </lineSegments>
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
      <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground/60 pointer-events-none select-none">
        Drag to rotate · Scroll to zoom · Right-click to pan
      </div>

      {/* Tonal splice legend */}
      {config.colorMode === "splices" && (
        <div className="absolute top-3 right-3 flex flex-col gap-1 text-[10px] pointer-events-none select-none">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#1a0d66" }} />
            <span className="text-muted-foreground/70">Darks (0–{config.darksCeiling}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#cc8800" }} />
            <span className="text-muted-foreground/70">Midtones ({config.darksCeiling}–{config.midtonesCeiling}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#fff5dd" }} />
            <span className="text-muted-foreground/70">Highlights ({config.midtonesCeiling}–100%)</span>
          </div>
        </div>
      )}
    </div>
  );
}
