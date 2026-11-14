import { useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "../lib/assets";
import { cellLabel, type Cell } from "../lib/geo";
import { formatDose, formatHours } from "../lib/format";
import { computeWalkBackEnvelope } from "../lib/walkback";
import type {
  GaleRouteResult,
  GaleTerrain,
  GaleWaypoint,
  SafetyConfig,
  SafetyEvaluation,
  TerrainSurface,
} from "../types";
import "./c2-extras.css";

interface HelmetHudProps {
  terrain: GaleTerrain | null;
  route: GaleRouteResult | null;
  safety: SafetyEvaluation | null;
  config: SafetyConfig;
  waypoints: GaleWaypoint[];
  start: Cell | null;
  goal: Cell | null;
}

const EYE_HEIGHT_M = 2.2;
const EXAGGERATION = 1.5;

function compassDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

function createMartianSoilTextures(THREE: any) {
  const size = 512;
  const heightField = new Float32Array(size * size);

  let seed = 7391;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let y = 0; y < size; y += 1) {
    const ripple = Math.sin((y / size) * Math.PI * 28) * 0.14;
    for (let x = 0; x < size; x += 1) {
      const wave =
        Math.sin(((x + y * 0.35) / size) * Math.PI * 16) * 0.1 + ripple;
      heightField[y * size + x] = 0.45 + wave + (rand() - 0.5) * 0.22;
    }
  }

  for (let p = 0; p < 2200; p += 1) {
    const cx = Math.floor(rand() * size);
    const cy = Math.floor(rand() * size);
    const rx = 1.5 + rand() * 5.5;
    const ry = 1.2 + rand() * 4.2;
    const peak = rand() > 0.25 ? 0.35 + rand() * 0.45 : -0.3;
    const minX = Math.floor(cx - rx - 1);
    const maxX = Math.ceil(cx + rx + 1);
    const minY = Math.floor(cy - ry - 1);
    const maxY = Math.ceil(cy + ry + 1);

    for (let yy = minY; yy <= maxY; yy += 1) {
      const wy = ((yy % size) + size) % size;
      const dy = (yy - cy) / ry;
      for (let xx = minX; xx <= maxX; xx += 1) {
        const wx = ((xx % size) + size) % size;
        const dx = (xx - cx) / rx;
        const d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          heightField[wy * size + wx] += peak * (1 - d2);
        }
      }
    }
  }

  const albedoCanvas = document.createElement("canvas");
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext("2d");
  if (aCtx) {
    const aImg = aCtx.createImageData(size, size);
    for (let i = 0; i < size * size; i += 1) {
      const h = Math.max(0, Math.min(1, heightField[i]));
      const isRock = h > 0.68;
      const r = isRock ? 128 + h * 55 : 178 + h * 65;
      const g = isRock ? 72 + h * 34 : 92 + h * 42;
      const b = isRock ? 50 + h * 22 : 52 + h * 26;
      const idx = i * 4;
      aImg.data[idx] = Math.min(255, r);
      aImg.data[idx + 1] = Math.min(255, g);
      aImg.data[idx + 2] = Math.min(255, b);
      aImg.data[idx + 3] = 255;
    }
    aCtx.putImageData(aImg, 0, 0);
  }

  const normCanvas = document.createElement("canvas");
  normCanvas.width = size;
  normCanvas.height = size;
  const nCtx = normCanvas.getContext("2d");
  if (nCtx) {
    const nImg = nCtx.createImageData(size, size);
    const strength = 3.2;
    for (let y = 0; y < size; y += 1) {
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      for (let x = 0; x < size; x += 1) {
        const xm = (x - 1 + size) % size;
        const xp = (x + 1) % size;

        const dX =
          (heightField[y * size + xp] - heightField[y * size + xm]) * strength;
        const dY =
          (heightField[yp * size + x] - heightField[ym * size + x]) * strength;
        const invLen = 1 / Math.sqrt(dX * dX + dY * dY + 1);

        const idx = (y * size + x) * 4;
        nImg.data[idx] = Math.round((-dX * invLen * 0.5 + 0.5) * 255);
        nImg.data[idx + 1] = Math.round((-dY * invLen * 0.5 + 0.5) * 255);
        nImg.data[idx + 2] = Math.round((invLen * 0.5 + 0.5) * 255);
        nImg.data[idx + 3] = 255;
      }
    }
    nCtx.putImageData(nImg, 0, 0);
  }

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;
  albedoMap.repeat.set(320, 320);
  albedoMap.needsUpdate = true;

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(320, 320);
  normalMap.needsUpdate = true;

  return { albedoMap, normalMap };
}

function createMarsSkyDome(THREE: any) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, "#24140e");
    grad.addColorStop(0.28, "#6e3722");
    grad.addColorStop(0.48, "#c86d42");
    grad.addColorStop(0.55, "#e08a56");
    grad.addColorStop(0.72, "#9e5130");
    grad.addColorStop(1.0, "#472112");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const geom = new THREE.SphereGeometry(6400, 32, 20);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  return new THREE.Mesh(geom, mat);
}

function createScienceRover(THREE: any) {
  const rover = new THREE.Group();

  const whiteChassisMat = new THREE.MeshStandardMaterial({
    color: 0xd9dde2,
    roughness: 0.42,
    metalness: 0.25,
  });
  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xd4942a,
    roughness: 0.32,
    metalness: 0.78,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x262b33,
    roughness: 0.6,
    metalness: 0.5,
  });

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 20),
    new THREE.MeshBasicMaterial({
      color: 0x1a0a04,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.06;
  rover.add(shadowDisc);

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.72, 2.55),
    whiteChassisMat,
  );
  chassis.position.set(0, 1.05, 0);
  rover.add(chassis);

  const topDeck = new THREE.Mesh(
    new THREE.BoxGeometry(1.88, 0.14, 2.65),
    goldFoilMat,
  );
  topDeck.position.set(0, 1.44, 0);
  rover.add(topDeck);

  const rtg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.34, 1.05, 12),
    whiteChassisMat,
  );
  rtg.rotation.x = -0.52;
  rtg.position.set(0, 1.38, -1.45);
  rover.add(rtg);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.12, 1.25, 10),
    whiteChassisMat,
  );
  mast.position.set(0.45, 2.05, 0.85);
  rover.add(mast);

  const camHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.3, 0.36),
    whiteChassisMat,
  );
  camHead.position.set(0.45, 2.72, 0.88);
  rover.add(camHead);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12),
    new THREE.MeshBasicMaterial({ color: 0x49ffe2 }),
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.45, 2.72, 1.07);
  rover.add(lens);

  const armBoom = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 1.1),
    darkMetalMat,
  );
  armBoom.rotation.x = 0.35;
  armBoom.position.set(-0.35, 1.15, 1.55);
  rover.add(armBoom);

  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.24, 10),
    goldFoilMat,
  );
  turret.position.set(-0.35, 0.92, 2.02);
  rover.add(turret);

  const wheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 16);
  wheelGeom.rotateZ(Math.PI / 2);

  for (const side of [-1, 1]) {
    const wx = side * 1.15;
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 2.2),
      darkMetalMat,
    );
    strut.position.set(side * 0.98, 0.72, 0);
    rover.add(strut);

    for (const wz of [-1.05, 0, 1.05]) {
      const wheel = new THREE.Mesh(wheelGeom, darkMetalMat);
      wheel.position.set(wx, 0.38, wz);
      rover.add(wheel);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.34, 10),
        goldFoilMat,
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, 0.38, wz);
      rover.add(hub);
    }
  }

  return rover;
}

function createGeologyOverlayTexture(
  geoJson: {
    features?: Array<{
      properties?: { UNIT?: string; unit?: string };
      geometry?: { type?: string; coordinates?: unknown };
    }>;
  },
  lonLatBounds: [number, number, number, number],
  THREE: any,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#6e3824";
  ctx.fillRect(0, 0, 512, 512);

  const [west, south, east, north] = lonLatBounds;
  const lonSpan = Math.max(1e-6, east - west);
  const latSpan = Math.max(1e-6, north - south);

  const palette: Record<string, string> = {
    AHv: "#c86d3b",
    Hesperian: "#b5522a",
    Noachian: "#8d4332",
    Amazonian: "#d88a4e",
  };

  const drawRing = (ring: number[][]) => {
    ring.forEach(([lon, lat], i) => {
      const x = ((lon - west) / lonSpan) * 512;
      const y = ((north - lat) / latSpan) * 512;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };

  for (const feat of geoJson.features ?? []) {
    const code = feat.properties?.UNIT ?? feat.properties?.unit ?? "Unit";
    ctx.fillStyle = palette[code] ?? "#b86439";
    ctx.strokeStyle = "rgba(255, 220, 170, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const geom = feat.geometry;
    if (geom?.type === "Polygon" && Array.isArray(geom.coordinates)) {
      for (const ring of geom.coordinates as number[][][]) drawRing(ring);
    } else if (geom?.type === "MultiPolygon" && Array.isArray(geom.coordinates)) {
      for (const poly of geom.coordinates as number[][][][]) {
        for (const ring of poly) drawRing(ring);
      }
    }
    ctx.fill();
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function HelmetHud({
  terrain,
  route,
  safety,
  config,
  waypoints,
  start,
  goal,
}: HelmetHudProps) {
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visorSurface, setVisorSurface] = useState<TerrainSurface>("ctx");
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [crewMode, setCrewMode] = useState<"pair-rover" | "solo">("pair-rover");
  const [yawDeg, setYawDeg] = useState(0);
  const [pitchDeg, setPitchDeg] = useState(-4);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sceneStateRef = useRef<{
    camera: any;
    terrainMesh: any;
    textures: Partial<Record<TerrainSurface, any>>;
    roverGroup: any;
    yawRad: number;
    pitchRad: number;
    syncCamera: () => void;
    sampleWorldY: (x: number, z: number) => number;
  } | null>(null);

  const ready = Boolean(
    terrain && route && route.ok && route.path.length > 1 && safety,
  );
  const maxStep = route && route.ok ? Math.max(0, route.path.length - 1) : 0;

  const walkBack = useMemo(() => {
    if (!terrain || !route || !route.ok) return null;
    return computeWalkBackEnvelope(terrain, route, config);
  }, [terrain, route, config]);

  useEffect(() => {
    if (!playing || !open) return;
    const timer = window.setInterval(() => {
      setStepIdx((prev) => {
        if (prev >= maxStep) {
          setPlaying(false);
          return maxStep;
        }
        return prev + 1;
      });
    }, 320);
    return () => window.clearInterval(timer);
  }, [playing, open, maxStep]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        setPlaying(false);
        setStepIdx((s) => Math.min(maxStep, s + 1));
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        setPlaying(false);
        setStepIdx((s) => Math.max(0, s - 1));
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        const st = sceneStateRef.current;
        if (st) {
          st.yawRad += 0.14;
          setYawDeg(Math.round(((-st.yawRad * 180) / Math.PI + 360) % 360));
          st.syncCamera();
        }
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        const st = sceneStateRef.current;
        if (st) {
          st.yawRad -= 0.14;
          setYawDeg(Math.round(((-st.yawRad * 180) / Math.PI + 360) % 360));
          st.syncCamera();
        }
      } else if (e.key === "Escape") {
        setPlaying(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, maxStep]);

  useEffect(() => {
    if (!open || !terrain || !route || !route.ok || !viewportRef.current) return;
    const THREE = (window as unknown as { THREE?: any }).THREE;
    if (!THREE) return;

    const container = viewportRef.current;
    const width = terrain.meta.width;
    const height = terrain.meta.height;
    const cellM = terrain.meta.metersPerCell;

    const cellToWorld = (row: number, col: number) => {
      const r = Math.max(0, Math.min(height - 1, row));
      const c = Math.max(0, Math.min(width - 1, col));
      const x = (c - (width - 1) / 2) * cellM;
      const z = (r - (height - 1) / 2) * cellM;
      const elev = terrain.elevation[r * width + c] ?? terrain.minElevation;
      const y = (elev - terrain.minElevation) * EXAGGERATION;
      return new THREE.Vector3(x, y, z);
    };

    const sampleWorldY = (x: number, z: number): number => {
      const cFloat = Math.max(0, Math.min(width - 1.001, x / cellM + (width - 1) / 2));
      const rFloat = Math.max(0, Math.min(height - 1.001, z / cellM + (height - 1) / 2));
      const c0 = Math.floor(cFloat);
      const r0 = Math.floor(rFloat);
      const c1 = Math.min(width - 1, c0 + 1);
      const r1 = Math.min(height - 1, r0 + 1);
      const tx = cFloat - c0;
      const tz = rFloat - r0;

      const e00 = terrain.elevation[r0 * width + c0] ?? terrain.minElevation;
      const e10 = terrain.elevation[r0 * width + c1] ?? terrain.minElevation;
      const e01 = terrain.elevation[r1 * width + c0] ?? terrain.minElevation;
      const e11 = terrain.elevation[r1 * width + c1] ?? terrain.minElevation;

      const elev =
        e00 * (1 - tx) * (1 - tz) +
        e10 * tx * (1 - tz) +
        e01 * (1 - tx) * tz +
        e11 * tx * tz;
      return (elev - terrain.minElevation) * EXAGGERATION;
    };

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xc46b43, 0.00032);
    scene.add(createMarsSkyDome(THREE));

    const camera = new THREE.PerspectiveCamera(
      68,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.4,
      9000,
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Balanced Martian daylight so shaded slopes stay clearly legible
    const hemiLight = new THREE.HemisphereLight(0xffcba4, 0x783922, 0.95);
    scene.add(hemiLight);
    const sunLight = new THREE.DirectionalLight(0xffe6cf, 1.45);
    sunLight.position.set(-2200, 1100, -1600);
    scene.add(sunLight);

    const geom = new THREE.PlaneGeometry(
      (width - 1) * cellM,
      (height - 1) * cellM,
      width - 1,
      height - 1,
    );
    geom.rotateX(-Math.PI / 2);
    const pos = geom.attributes.position;
    for (let r = 0; r < height; r += 1) {
      for (let c = 0; c < width; c += 1) {
        const idx = r * width + c;
        const y = (terrain.elevation[idx] - terrain.minElevation) * EXAGGERATION;
        pos.setY(idx, y);
      }
    }
    geom.computeVertexNormals();

    const loader = new THREE.TextureLoader();
    const textures: Partial<Record<TerrainSurface, any>> = {
      ctx: loader.load(assetUrl("data/gale/data/texture_ctx.jpg")),
      hillshade: loader.load(assetUrl("data/gale/data/hillshade.png")),
      slope: loader.load(assetUrl("data/gale/data/slope_preview.png")),
    };
    const { albedoMap, normalMap } = createMartianSoilTextures(THREE);

    const isScientificFalseColor =
      visorSurface === "slope" || visorSurface === "geology";

    const mat = new THREE.MeshStandardMaterial({
      map: textures[visorSurface] ?? textures.ctx,
      color: isScientificFalseColor ? 0xffffff : 0xe3764b,
      normalMap,
      normalScale: new THREE.Vector2(1.8, 1.8),
      roughnessMap: albedoMap,
      roughness: 0.93,
      metalness: 0.03,
    });
    const terrainMesh = new THREE.Mesh(geom, mat);
    scene.add(terrainMesh);

    fetch(assetUrl("data/gale/data/geology.geojson"))
      .then((res) => (res.ok ? res.json() : null))
      .then((geo) => {
        if (!geo) return;
        const geoTex = createGeologyOverlayTexture(
          geo,
          terrain.patch.bounds_lonlat_deg,
          THREE,
        );
        if (geoTex) {
          textures.geology = geoTex;
          if (visorSurface === "geology") {
            mat.map = geoTex;
            mat.color.setHex(0xffffff);
            mat.needsUpdate = true;
          }
        }
      })
      .catch(() => {});

    // Decorative/illustrative basalt boulders grounded via bilinear height sampling
    const rockGeom = new THREE.DodecahedronGeometry(1, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x874128,
      normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 0.95,
    });
    const rockGroup = new THREE.Group();
    let rSeed = 91;
    const nextR = () => {
      rSeed = (rSeed * 16807) % 2147483647;
      return (rSeed - 1) / 2147483646;
    };
    for (let r = 4; r < height - 4; r += 4) {
      for (let c = 4; c < width - 4; c += 4) {
        const sDeg = terrain.slope[r * width + c] ?? 0;
        if (sDeg > 9 && nextR() > 0.3) {
          const base = cellToWorld(r, c);
          const rx = base.x + (nextR() - 0.5) * 16;
          const rz = base.z + (nextR() - 0.5) * 16;
          const groundY = sampleWorldY(rx, rz);
          const rock = new THREE.Mesh(rockGeom, rockMat);
          const scale = 0.45 + nextR() * 1.1;
          rock.scale.set(scale * 1.45, scale * 0.55, scale * 1.1);
          rock.rotation.set(nextR() * 0.5, nextR() * Math.PI, nextR() * 0.5);
          rock.position.set(rx, groundY + scale * 0.12, rz);
          rockGroup.add(rock);
        }
      }
    }
    scene.add(rockGroup);

    // Subtle Martian dust motes
    const dustCount = 380;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i += 1) {
      dustPositions[i * 3] = (nextR() - 0.5) * 260;
      dustPositions[i * 3 + 1] = 0.5 + nextR() * 26;
      dustPositions[i * 3 + 2] = (nextR() - 0.5) * 260;
    }
    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dustPoints = new THREE.Points(
      dustGeom,
      new THREE.PointsMaterial({
        color: 0xf2a779,
        size: 0.2,
        transparent: true,
        opacity: 0.4,
      }),
    );
    scene.add(dustPoints);

    // Ground-hugging AR traverse path
    const pathVectors = route.path.map((pt) => {
      const w = cellToWorld(pt.y, pt.x);
      return new THREE.Vector3(w.x, w.y + 0.22, w.z);
    });
    const pathGeom = new THREE.BufferGeometry().setFromPoints(pathVectors);
    const pathLine = new THREE.Line(
      pathGeom,
      new THREE.LineBasicMaterial({
        color: 0x49ffe2,
        transparent: true,
        opacity: 0.85,
      }),
    );
    scene.add(pathLine);

    const chevronGroup = new THREE.Group();
    const chevronShape = new THREE.ConeGeometry(0.42, 1.1, 3);
    chevronShape.rotateX(Math.PI / 2);

    for (let i = 1; i < route.path.length - 1; i += 2) {
      const pt = route.path[i];
      const next = route.path[i + 1];
      const pWorld = cellToWorld(pt.y, pt.x);
      const nWorld = cellToWorld(next.y, next.x);
      const cellSlope = terrain.slope[pt.y * width + pt.x] ?? 0;

      const chev = new THREE.Mesh(
        chevronShape,
        new THREE.MeshBasicMaterial({
          color: cellSlope > 15 ? 0xff9f1c : 0x49ffe2,
          transparent: true,
          opacity: 0.82,
        }),
      );
      chev.position.set(pWorld.x, pWorld.y + 0.28, pWorld.z);
      chev.lookAt(nWorld.x, nWorld.y + 0.28, nWorld.z);
      chevronGroup.add(chev);
    }
    scene.add(chevronGroup);

    for (const wp of waypoints) {
      const wPos = cellToWorld(wp.row, wp.col);
      const blocked = wp.slopeDeg > config.maxSlopeDeg;
      const ringGeom = new THREE.RingGeometry(2.0, 2.7, 24);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: blocked ? 0xff4d4d : 0xffd260,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.set(wPos.x, wPos.y + 0.35, wPos.z);
      scene.add(ring);
    }

    const roverGroup = createScienceRover(THREE);
    scene.add(roverGroup);

    const p0 = cellToWorld(route.path[0].y, route.path[0].x);
    const p1 = cellToWorld(route.path[1].y, route.path[1].x);
    const initYaw = Math.atan2(-(p1.x - p0.x), -(p1.z - p0.z));

    const state = {
      camera,
      terrainMesh,
      textures,
      roverGroup,
      yawRad: initYaw,
      pitchRad: -0.07,
      syncCamera() {
        camera.rotation.order = "YXZ";
        camera.rotation.y = state.yawRad;
        camera.rotation.x = state.pitchRad;
      },
      sampleWorldY,
    };
    sceneStateRef.current = state;
    setYawDeg(Math.round(((-initYaw * 180) / Math.PI + 360) % 360));
    setPitchDeg(-4);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      state.yawRad += dx * 0.0045;
      state.pitchRad = Math.max(
        -1.15,
        Math.min(1.15, state.pitchRad + dy * 0.0045),
      );
      state.syncCamera();
      setYawDeg(Math.round(((-state.yawRad * 180) / Math.PI + 360) % 360));
      setPitchDeg(Math.round((state.pitchRad * 180) / Math.PI));
    };
    const onPointerUp = () => {
      dragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const onResize = () => {
      if (!container) return;
      camera.aspect =
        Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      dustPoints.position.set(
        camera.position.x,
        camera.position.y - 2,
        camera.position.z,
      );
      dustPoints.rotation.y += 0.0008;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
      geom.dispose();
      mat.dispose();
      renderer.dispose();
      sceneStateRef.current = null;
    };
  }, [open, terrain, route, waypoints, config.maxSlopeDeg]);

  useEffect(() => {
    if (!open || !terrain || !route || !route.ok || !sceneStateRef.current) return;
    const st = sceneStateRef.current;
    const width = terrain.meta.width;
    const height = terrain.meta.height;
    const cellM = terrain.meta.metersPerCell;

    const toWorld = (row: number, col: number) => {
      const r = Math.max(0, Math.min(height - 1, row));
      const c = Math.max(0, Math.min(width - 1, col));
      const x = (c - (width - 1) / 2) * cellM;
      const z = (r - (height - 1) / 2) * cellM;
      const y = st.sampleWorldY(x, z);
      return { x, y, z };
    };

    const idx = Math.min(route.path.length - 1, Math.max(0, stepIdx));
    const pt = route.path[idx];
    const eye = toWorld(pt.y, pt.x);
    st.camera.position.set(eye.x, eye.y + EYE_HEIGHT_M, eye.z);

    if (idx < route.path.length - 1) {
      const next = route.path[idx + 1];
      const nxt = toWorld(next.y, next.x);
      const pathYaw = Math.atan2(-(nxt.x - eye.x), -(nxt.z - eye.z));
      st.yawRad = pathYaw;
      st.syncCamera();
      setYawDeg(Math.round(((-pathYaw * 180) / Math.PI + 360) % 360));
    }

    st.roverGroup.visible = crewMode === "pair-rover";
    const roverIdx = Math.min(route.path.length - 1, idx + 2);
    const rPt = route.path[roverIdx];
    const rPos = toWorld(rPt.y, rPt.x);
    const rx = rPos.x + 2.4;
    const rz = rPos.z + 2.4;
    const ry = st.sampleWorldY(rx, rz);
    st.roverGroup.position.set(rx, ry, rz);
    if (roverIdx < route.path.length - 1) {
      const rNext = route.path[roverIdx + 1];
      const rnPos = toWorld(rNext.y, rNext.x);
      st.roverGroup.lookAt(
        rnPos.x + 2.4,
        st.sampleWorldY(rnPos.x + 2.4, rnPos.z + 2.4),
        rnPos.z + 2.4,
      );
    }
  }, [open, stepIdx, crewMode, terrain, route]);

  useEffect(() => {
    const st = sceneStateRef.current;
    if (!st || !st.terrainMesh) return;
    const tex = st.textures[visorSurface] ?? st.textures.ctx;
    const isFalseColor = visorSurface === "slope" || visorSurface === "geology";
    if (tex) {
      st.terrainMesh.material.map = tex;
      st.terrainMesh.material.color.setHex(isFalseColor ? 0xffffff : 0xe3764b);
      st.terrainMesh.material.needsUpdate = true;
    }
  }, [visorSurface]);

  const telemetry = useMemo(() => {
    if (!terrain || !route || !route.ok || route.path.length < 2 || !safety) {
      return null;
    }
    const maxIdx = route.path.length - 1;
    const idx = Math.min(maxIdx, Math.max(0, stepIdx));
    const pt = route.path[idx];
    const width = terrain.meta.width;
    const cellIdx = pt.y * width + pt.x;

    const elev = terrain.elevation[cellIdx] ?? terrain.minElevation;
    const slope = terrain.slope[cellIdx] ?? 0;

    let aheadMaxSlope = 0;
    let aheadDistM = 0;
    for (let look = 1; look <= 5; look += 1) {
      const fIdx = Math.min(maxIdx, idx + look);
      const fPt = route.path[fIdx];
      const fSlope = terrain.slope[fPt.y * width + fPt.x] ?? 0;
      if (fSlope > aheadMaxSlope) {
        aheadMaxSlope = fSlope;
        aheadDistM = look * Math.round(terrain.meta.metersPerCell);
      }
    }

    const fraction = maxIdx > 0 ? idx / maxIdx : 0;
    const coveredKm = route.distanceKm * fraction;
    const remainingKm = Math.max(0, route.distanceKm - coveredKm);

    const roverFactor = crewMode === "pair-rover" ? 0.85 : 1.0;
    const elapsedHours = safety.walkHours * fraction;
    const suitUsedHours = safety.requiredSuitHours * fraction * roverFactor;
    const suitRemainingPct = Math.max(
      0,
      Math.round(100 - (suitUsedHours / config.maxEvaHours) * 100),
    );
    const doseAccMsV = safety.doseMsV * fraction;
    const ambientRateMsVHr =
      safety.walkHours > 0 ? safety.doseMsV / safety.walkHours : 0.64 / 24;

    const wbStep = walkBack?.steps[idx] ?? null;

    return {
      pt,
      elev,
      slope,
      aheadMaxSlope,
      aheadDistM,
      coveredKm,
      remainingKm,
      elapsedHours,
      suitRemainingPct,
      doseAccMsV,
      ambientRateMsVHr,
      wbStep,
      progressPct: Math.round(fraction * 100),
    };
  }, [terrain, route, safety, stepIdx, crewMode, config, walkBack]);

  const handleOpen = () => {
    setStepIdx(0);
    setPlaying(false);
    setShowMiniMap(false);
    setOpen(true);
  };

  return (
    <section className="panel hud-launch-panel" aria-labelledby="hud-panel-title">
      <div className="panel-heading">
        <h2 id="hud-panel-title">First-person visor view</h2>
        <span className="panel-tag">3D Mars Street-View</span>
      </div>
      <p className="panel-note">
        Step onto the 3D Martian surface inside an astronaut helmet visor: look
        around 360°, walk the path chevrons, inspect layer color keys, and
        monitor walk-back safety margins.
      </p>
      <div className="mission-actions">
        <button
          type="button"
          className="hud-launch-btn"
          disabled={!ready}
          onClick={handleOpen}
        >
          {ready ? "Enter 3D Helmet Visor View" : "Compute a route first"}
        </button>
      </div>

      {open && terrain && route && telemetry && (
        <div
          className="visor-fullscreen-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="3D First-Person Mars Helmet Visor"
        >
          <div ref={viewportRef} className="visor-3d-canvas" />

          {/* Clean AR Corner Brackets (unobstructed full-brightness viewport) */}
          <div className="visor-ar-frame" aria-hidden="true" />

          {/* Center Horizon Reticle */}
          <div className="visor-reticle" aria-hidden="true">
            <div className="visor-reticle-line left" />
            <div className="visor-reticle-dot" />
            <div className="visor-reticle-line right" />
          </div>

          <div className="visor-hud-top">
            <div className="visor-hud-cluster">
              <span className="visor-badge">EVA HELMET VISOR · GALE CRATER</span>
              <div className="visor-sub">
                {start ? cellLabel(start) : ""} → {goal ? cellLabel(goal) : ""} ·
                Drag screen to look 360° ({yawDeg}° {compassDirection(yawDeg)} · Pitch {pitchDeg}°)
              </div>
            </div>

            <div className="visor-layer-bar" role="group" aria-label="Visor surface layer">
              {(["ctx", "slope", "geology", "hillshade"] as TerrainSurface[]).map(
                (layer) => (
                  <button
                    key={layer}
                    type="button"
                    className={
                      visorSurface === layer ? "visor-pill active" : "visor-pill"
                    }
                    onClick={() => setVisorSurface(layer)}
                  >
                    {layer === "ctx" ? "CTX (tinted)" : layer.toUpperCase()}
                  </button>
                ),
              )}
              <button
                type="button"
                className={
                  crewMode === "pair-rover" ? "visor-pill active" : "visor-pill"
                }
                onClick={() =>
                  setCrewMode((m) => (m === "pair-rover" ? "solo" : "pair-rover"))
                }
              >
                {crewMode === "pair-rover" ? "Rover: ON" : "Rover: OFF"}
              </button>
              <button
                type="button"
                className={showMiniMap ? "visor-pill active" : "visor-pill"}
                onClick={() => setShowMiniMap((v) => !v)}
              >
                {showMiniMap ? "Hide Mini-Map" : "Mini-Map"}
              </button>
              <button
                type="button"
                className="visor-exit-btn"
                onClick={() => {
                  setPlaying(false);
                  setOpen(false);
                }}
              >
                Exit Visor
              </button>
            </div>
          </div>

          {/* Dynamic In-Visor Layer Color Legend */}
          <div className="visor-color-legend">
            <div className="visor-box-title">
              Layer Color Key ·{" "}
              {visorSurface === "ctx" ? "CTX (Tinted)" : visorSurface.toUpperCase()}
            </div>
            {visorSurface === "slope" && (
              <>
                <div className="legend-slope-bar" />
                <div className="legend-slope-labels">
                  <span>0° Safe</span>
                  <span>15° Caution</span>
                  <span>20°–45°+ No-Go</span>
                </div>
              </>
            )}
            {visorSurface === "geology" && (
              <div className="visor-legend-items">
                <span><i style={{ background: "#c86d3b" }} /> AHv (Amazonian-Hesperian veneer)</span>
                <span><i style={{ background: "#b5522a" }} /> Hesperian layered units</span>
                <span><i style={{ background: "#8d4332" }} /> Noachian crater rim units</span>
              </div>
            )}
            {visorSurface === "ctx" && (
              <div className="visor-legend-items">
                <span><i style={{ background: "#e3764b" }} /> Grayscale CTX mosaic (~10.2 m/px) with iron-oxide tint</span>
                <span><i style={{ background: "#49ffe2" }} /> Path ≤ 15° · <i style={{ background: "#ff9f1c" }} /> &gt; 15° caution</span>
              </div>
            )}
            {visorSurface === "hillshade" && (
              <div className="visor-legend-items">
                <span><i style={{ background: "#d9825b" }} /> Sun-facing ridges (315° azimuth)</span>
                <span><i style={{ background: "#5c2b19" }} /> Shaded scarps &amp; troughs</span>
              </div>
            )}
          </div>

          {(telemetry.slope > 15 || telemetry.aheadMaxSlope > 15) && (
            <div className="visor-warning-triangle" role="alert">
              <svg width="34" height="30" viewBox="0 0 36 32" aria-hidden="true">
                <polygon
                  points="18,2 34,30 2,30"
                  fill="rgba(255, 176, 32, 0.25)"
                  stroke="#ffb020"
                  strokeWidth="2.5"
                />
                <text
                  x="18"
                  y="25"
                  textAnchor="middle"
                  fill="#ffb020"
                  fontSize="16"
                  fontWeight="bold"
                >
                  !
                </text>
              </svg>
              <div>
                <strong>STEEP SLOPE HAZARD</strong>
                <div>
                  {telemetry.slope > 15
                    ? `Underfoot slope ${telemetry.slope.toFixed(1)}° (> 15° caution)`
                    : `${telemetry.aheadMaxSlope.toFixed(1)}° incline ~${telemetry.aheadDistM} m ahead`}
                </div>
              </div>
            </div>
          )}

          {showMiniMap && (
            <div className="visor-minimap-card">
              <div className="visor-box-title">
                Tactical Mini-Map · {cellLabel({ row: telemetry.pt.y, col: telemetry.pt.x })}
              </div>
              <svg
                viewBox={`0 0 ${terrain.meta.width} ${terrain.meta.height}`}
                className="visor-minimap-svg"
              >
                <rect
                  x="0"
                  y="0"
                  width={terrain.meta.width}
                  height={terrain.meta.height}
                  fill="#09111c"
                />
                <polyline
                  fill="none"
                  stroke="#49ffe2"
                  strokeWidth="3.5"
                  points={route.path.map((p) => `${p.x},${p.y}`).join(" ")}
                />
                {waypoints.map((wp) => (
                  <g key={wp.id}>
                    <circle
                      cx={wp.col}
                      cy={wp.row}
                      r="4.5"
                      fill={wp.slopeDeg > config.maxSlopeDeg ? "#ff5c5c" : "#ffd260"}
                    />
                    <text
                      x={wp.col + 6}
                      y={wp.row + 3}
                      fill="#e6edf3"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {wp.label}
                    </text>
                  </g>
                ))}
                <circle
                  cx={telemetry.pt.x}
                  cy={telemetry.pt.y}
                  r="6"
                  fill="#ffffff"
                  stroke="#49ffe2"
                  strokeWidth="2.5"
                />
              </svg>
              <div className="visor-minimap-meta">
                <span>Radiation: {telemetry.ambientRateMsVHr.toFixed(3)} mSv/h</span>
                <span>Slope: {telemetry.slope.toFixed(1)}°</span>
              </div>
            </div>
          )}

          <div className="visor-hud-bottom">
            <div className="visor-bottom-metrics">
              <div
                className={
                  telemetry.wbStep?.status === "beyond-ponr"
                    ? "visor-stat danger"
                    : telemetry.wbStep?.status === "caution"
                      ? "visor-stat warn"
                      : "visor-stat"
                }
              >
                <span>WALK-BACK TO HABITAT</span>
                <strong>
                  {telemetry.wbStep
                    ? telemetry.wbStep.marginHours >= 0
                      ? `${formatHours(telemetry.wbStep.returnHours)} · margin +${formatHours(telemetry.wbStep.marginHours)}`
                      : `BEYOND LIMIT (${formatHours(Math.abs(telemetry.wbStep.marginHours))} over)`
                    : "—"}
                </strong>
              </div>
              <div className="visor-stat">
                <span>RADIATION (AMBIENT / ACCUM)</span>
                <strong>
                  {telemetry.ambientRateMsVHr.toFixed(3)} mSv/h ·{" "}
                  {formatDose(telemetry.doseAccMsV)}
                </strong>
              </div>
              <div className={telemetry.slope > 15 ? "visor-stat warn" : "visor-stat"}>
                <span>GROUND SLOPE / ELEV</span>
                <strong>
                  {telemetry.slope.toFixed(1)}° · {Math.round(telemetry.elev)} m
                </strong>
              </div>
              <div className="visor-stat">
                <span>SUIT O₂ / REMAINING</span>
                <strong>
                  {telemetry.suitRemainingPct}% · {telemetry.remainingKm.toFixed(2)} km
                </strong>
              </div>
            </div>

            <div className="visor-walk-controls">
              <button
                type="button"
                className="visor-step-btn"
                disabled={stepIdx <= 0}
                onClick={() => {
                  setPlaying(false);
                  setStepIdx((s) => Math.max(0, s - 1));
                }}
              >
                ▼ Step Back
              </button>
              <button
                type="button"
                className="visor-step-btn primary"
                disabled={stepIdx >= maxStep}
                onClick={() => {
                  setPlaying(false);
                  setStepIdx((s) => Math.min(maxStep, s + 1));
                }}
              >
                ▲ Step Forward
              </button>
              <button
                type="button"
                className="visor-step-btn"
                onClick={() => {
                  if (stepIdx >= maxStep) setStepIdx(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? "Pause Walk" : "Auto-Walk"}
              </button>
              <input
                type="range"
                min={0}
                max={maxStep}
                value={stepIdx}
                onChange={(e) => {
                  setPlaying(false);
                  setStepIdx(Number(e.target.value));
                }}
                aria-label="Traverse step slider"
                style={{ flex: 1, minWidth: "110px" }}
              />
              <strong style={{ fontSize: "0.82rem", minWidth: "85px", textAlign: "right" }}>
                {telemetry.progressPct}% ({telemetry.coveredKm.toFixed(2)} km)
              </strong>
            </div>
            <div className="visor-caveat-strip">
              20 m DEM terrain · Decorative close-up regolith/rocks for scale only · Walk-back assumes symmetric return within suit reserve.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}