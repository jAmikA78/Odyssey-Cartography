import { useEffect, useRef, useState } from "react";
import { assetUrl } from "../lib/assets";
import { cellToWorld, inBounds, worldToCell, type Cell } from "../lib/geo";
import { mineralTexturePath, SURFACE_TEXTURES } from "../lib/gale";
import { assertThreeLoaded, THREE } from "../lib/three";
import type {
  GaleRouteResult,
  GaleTerrain,
  GaleWaypoint,
  GeologyInfo,
  TerrainSurface,
} from "../types";

export interface TerrainViewProps {
  terrain: GaleTerrain;
  surface: TerrainSurface;
  exaggeration: number;
  route: GaleRouteResult | null;
  waypoints: GaleWaypoint[];
  start: Cell | null;
  goal: Cell | null;
  selectedWaypointId: string | null;
  maxSlopeDeg: number;
  showRoute: boolean;
  resetViewKey: number;
  mineralBand: string | null;
  showGeology: boolean;
  onPick: (cell: Cell) => void;
  onHover: (cell: Cell | null) => void;
  onWaypointSelect: (id: string) => void;

  onGeologyLoaded?: (info: GeologyInfo) => void;

  onInspect: (cell: Cell) => void;
  inspectCell: Cell | null;
  walkPlaying: boolean;
  walkResetKey: number;
  onWalkProgress: (progress: number | null) => void;

}

interface SceneState {
  renderer: any;
  scene: any;
  camera: any;
  controls: any;
  terrainMesh: any;
  decorGroup: any;
  routeGroup: any;
  markerGroup: any;
  materials: Record<TerrainSurface, any>;
  mineralMaterial: any;
  geologyGroup: any;
  inspectGroup: any;
  astronaut: any;
  traveled: any;
  traveledIndexCount: number;
  pathPoints: any[];
  pathCum: number[];
  pathLength: number;
  walkDist: number;
  walkLastSent: number;
  resetView: () => void;
}

function disposeObject(object: any): void {
  const disposeNode = (node: any): void => {
    if (node.geometry) node.geometry.dispose();
    const materials: any[] = Array.isArray(node.material)
      ? node.material
      : node.material
        ? [node.material]
        : [];
    for (const material of materials) {
      if (material.map) material.map.dispose();
      material.dispose();
    }
  };
  if (typeof object.traverse === "function") object.traverse(disposeNode);
  else disposeNode(object);
}

function clearGroup(group: any): void {
  while (group.children.length > 0) {
    const child = group.children.pop();
    disposeObject(child);
  }
}

function applySurface(state: SceneState, surface: TerrainSurface): void {
  state.terrainMesh.material = state.materials[surface];
}

function buildGeologyGroup(terrain: GaleTerrain): any {
  const group = new THREE.Group();
  const width = terrain.meta.width;
  const height = terrain.meta.height;
  const points: any[] = [];
  const edge = (row: number, col: number): any => {
    const world = cellToWorld(row, col, terrain.patch);
    const y = terrain.elevation[row * width + col] - terrain.minElevation + 15;
    return new THREE.Vector3(world.x, y, world.z);
  };
  for (let col = 0; col < width; col += 1) points.push(edge(0, col));
  for (let row = 1; row < height; row += 1) points.push(edge(row, width - 1));
  for (let col = width - 2; col >= 0; col -= 1) points.push(edge(height - 1, col));
  for (let row = height - 2; row >= 1; row -= 1) points.push(edge(row, 0));
  points.push(points[0].clone());
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xff66ff,
    depthTest: false,
    transparent: true,
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 25;
  group.add(line);
  group.visible = false;
  return group;
}

function makeLabel(text: string, color: string): any {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.font = "bold 64px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  const material = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(260, 130, 1);
  sprite.renderOrder = 40;
  return sprite;
}


function drawPolygonRing(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  bounds: [number, number, number, number],
  size: number,
): void {
  const [west, south, east, north] = bounds;
  const lonSpan = Math.max(1e-9, east - west);
  const latSpan = Math.max(1e-9, north - south);
  ring.forEach((coord, idx) => {
    const u = (coord[0] - west) / lonSpan;
    const v = 1 - (coord[1] - south) / latSpan;
    const x = u * size;
    const y = v * size;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function buildGeologyCanvas(
  geojson: any,
  bounds: [number, number, number, number],
  unitCode: string,
  unitName: string,
): HTMLCanvasElement {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#5a4636";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let step = 64; step < size; step += 64) {
    ctx.beginPath();
    ctx.moveTo(step, 0);
    ctx.lineTo(step, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, step);
    ctx.lineTo(size, step);
    ctx.stroke();
  }

  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  for (const feature of features) {
    const geom = feature?.geometry;
    if (!geom) continue;
    ctx.beginPath();
    if (geom.type === "Polygon" && Array.isArray(geom.coordinates)) {
      for (const ring of geom.coordinates) {
        drawPolygonRing(ctx, ring, bounds, size);
      }
    } else if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates)) {
      for (const poly of geom.coordinates) {
        for (const ring of poly) {
          drawPolygonRing(ctx, ring, bounds, size);
        }
      }
    }
    ctx.fillStyle = "rgba(218, 138, 62, 0.55)";
    ctx.fill("evenodd");
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffbe6b";
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(15, 22, 34, 0.72)";
  ctx.fillRect(14, 14, size - 28, 52);
  ctx.fillStyle = "#ffbe6b";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillText(`USGS SIM 3292 · Unit ${unitCode}`, 24, 36);
  ctx.fillStyle = "#e6edf3";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(`${unitName} (1:20M regional context)`, 24, 55);

  return canvas;
}

function makeAstronaut(): any {
  const group = new THREE.Group();
  const suit = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(13, 15, 44, 10), suit);
  body.position.y = 30;
  group.add(body);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(15, 14, 10), suit);
  helmet.position.y = 66;
  group.add(helmet);
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(16, 26, 10),
    new THREE.MeshBasicMaterial({ color: 0xd8e2ec, depthTest: false }),
  );
  pack.position.set(0, 36, 15);
  group.add(pack);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(8, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x18242f, depthTest: false }),
  );
  visor.position.set(0, 68, -10);
  group.add(visor);
  group.traverse((node: any) => {
    node.renderOrder = 36;
  });
  group.scale.set(2.2, 2.2, 2.2);
  return group;
}

function positionAstronaut(state: SceneState): void {
  if (!state.astronaut || state.pathPoints.length === 0) return;
  const dist = Math.min(Math.max(state.walkDist, 0), state.pathLength);
  let lo = 0;
  let hi = state.pathCum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (state.pathCum[mid] < dist) lo = mid + 1;
    else hi = mid;
  }
  const i1 = Math.max(1, lo);
  const i0 = i1 - 1;
  const d0 = state.pathCum[i0];
  const d1 = state.pathCum[i1];
  const t = d1 > d0 ? (dist - d0) / (d1 - d0) : 0;
  const p0 = state.pathPoints[i0];
  const p1 = state.pathPoints[i1];
  const bob = Math.sin(dist * 0.045) * 3;
  state.astronaut.position.set(
    p0.x + (p1.x - p0.x) * t,
    p0.y + (p1.y - p0.y) * t + 8 + bob,
    p0.z + (p1.z - p0.z) * t,
  );
  state.astronaut.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z);
  if (state.traveled && state.pathLength > 0) {
    const fraction = Math.min(Math.max(dist / state.pathLength, 0), 1);
    state.traveled.geometry.setDrawRange(
      0,
      Math.floor(state.traveledIndexCount * fraction),
    );
  }

}

function rebuildRoute(
  state: SceneState,
  terrain: GaleTerrain,
  route: GaleRouteResult | null,
  exaggeration: number,
): void {
  clearGroup(state.routeGroup);
  state.astronaut = null;
  state.traveled = null;
  state.traveledIndexCount = 0;
  state.pathPoints = [];
  state.pathCum = [];
  state.pathLength = 0;
  state.walkDist = 0;
  if (!route || !route.ok || route.path.length < 2) return;

  const width = terrain.meta.width;
  const points: any[] = [];
  for (let i = 1; i < route.path.length; i += 1) {
    const previous = route.path[i - 1];
    const current = route.path[i];
    const steps =
      Math.max(
        Math.abs(current.y - previous.y),
        Math.abs(current.x - previous.x),
      ) * 2;
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const row = Math.round(previous.y + (current.y - previous.y) * t);
      const col = Math.round(previous.x + (current.x - previous.x) * t);
      const world = cellToWorld(row, col, terrain.patch);
      const elevation = terrain.elevation[row * width + col] - terrain.minElevation;
      points.push(
        new THREE.Vector3(world.x, elevation * exaggeration + 28, world.z),
      );
    }
  }

  state.pathPoints = points;
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    cum.push(cum[i - 1] + points[i].distanceTo(points[i - 1]));
  }
  state.pathCum = cum;
  state.pathLength = cum[cum.length - 1] ?? 0;

  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(
    curve,
    Math.min(points.length * 2, 3000),
    5,
    6,
    false,
  );
  const material = new THREE.MeshBasicMaterial({
    color: 0x49ffe2,
    depthTest: false,
    transparent: true,
  });
  const tube = new THREE.Mesh(geometry, material);
  tube.renderOrder = 30;
  state.routeGroup.add(tube);

  const glowGeometry = new THREE.TubeGeometry(
    curve,
    Math.min(points.length * 2, 3000),
    12,
    6,
    false,
  );
  const glow = new THREE.Mesh(
    glowGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x49ffe2,
      depthTest: false,
      transparent: true,
      opacity: 0.22,
    }),
  );
  glow.renderOrder = 29;
  state.routeGroup.add(glow);

  const traveledGeometry = new THREE.TubeGeometry(
    curve,
    Math.min(points.length * 2, 3000),
    6.4,
    6,
    false,
  );
  traveledGeometry.setDrawRange(0, 0);
  const traveled = new THREE.Mesh(
    traveledGeometry,
    new THREE.MeshBasicMaterial({
      color: 0xffb84d,
      depthTest: false,
      transparent: true,
    }),
  );
  traveled.renderOrder = 31;
  state.routeGroup.add(traveled);
  state.traveled = traveled;
  const traveledIndex = traveledGeometry.getIndex();
  state.traveledIndexCount = traveledIndex ? traveledIndex.count : 0;

  state.astronaut = makeAstronaut();
  positionAstronaut(state);
  state.routeGroup.add(state.astronaut);
}

function rebuildMarkers(
  state: SceneState,
  terrain: GaleTerrain,
  waypoints: GaleWaypoint[],
  start: Cell | null,
  goal: Cell | null,
  selectedWaypointId: string | null,
  maxSlopeDeg: number,
  exaggeration: number,
): void {
  clearGroup(state.markerGroup);
  const width = terrain.meta.width;
  const height = terrain.meta.height;

  for (const waypoint of waypoints) {
    if (!inBounds(waypoint.row, waypoint.col, width, height)) continue;
    const world = cellToWorld(waypoint.row, waypoint.col, terrain.patch);
    const baseY =
      (terrain.elevation[waypoint.row * width + waypoint.col] -
        terrain.minElevation) *
      exaggeration;
    const blocked = waypoint.slopeDeg > maxSlopeDeg;
    const isStart =
      start?.row === waypoint.row && start?.col === waypoint.col;
    const isGoal = goal?.row === waypoint.row && goal?.col === waypoint.col;
    const isSelected = waypoint.id === selectedWaypointId;

    const color = blocked
      ? 0xff5c5c
      : isStart
        ? 0x49ffe2
        : isGoal
          ? 0xffd260
          : isSelected
            ? 0xffffff
            : 0xb9c7d6;

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(isSelected ? 46 : 34, 16, 12),
      new THREE.MeshBasicMaterial({ color, depthTest: false }),
    );
    sphere.position.set(world.x, baseY + 36, world.z);
    sphere.renderOrder = 35;
    sphere.userData.waypointId = waypoint.id;
    state.markerGroup.add(sphere);

    const labelColor = blocked ? "#ff8b8b" : isSelected ? "#ffffff" : "#d8e2ec";
    const label = makeLabel(waypoint.label, labelColor);
    if (label) {
      label.scale.set(360, 180, 1);
      label.position.set(world.x, baseY + 180, world.z);
      label.userData.waypointId = waypoint.id;
      state.markerGroup.add(label);
    }
  }
}

function addDecor(
  scene: any,
  widthMeters: number,
  depthMeters: number,
): any {
  const group = new THREE.Group();
  const y = 220;

  const barZ = depthMeters / 2 - 220;
  const barGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-250, y, barZ),
    new THREE.Vector3(250, y, barZ),
  ]);
  const barLine = new THREE.Line(
    barGeometry,
    new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false }),
  );
  barLine.renderOrder = 45;
  group.add(barLine);

  for (const x of [-250, 250]) {
    const tickGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y - 60, barZ),
      new THREE.Vector3(x, y + 60, barZ),
    ]);
    const tick = new THREE.Line(
      tickGeometry,
      new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false }),
    );
    tick.renderOrder = 45;
    group.add(tick);
  }

  const barLabel = makeLabel("500 m", "#ffffff");
  if (barLabel) {
    barLabel.scale.set(330, 165, 1);
    barLabel.position.set(0, y + 150, barZ);
    group.add(barLabel);
  }

  const arrowOrigin = new THREE.Vector3(
    -widthMeters / 2 + 480,
    y,
    -depthMeters / 2 + 480,
  );
  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, -1),
    arrowOrigin,
    820,
    0xff7777,
    240,
    120,
  );
  arrow.line.material.depthTest = false;
  arrow.cone.material.depthTest = false;
  arrow.line.renderOrder = 45;
  arrow.cone.renderOrder = 45;
  group.add(arrow);

  const northLabel = makeLabel("N", "#ff7777");
  if (northLabel) {
    northLabel.scale.set(220, 110, 1);
    northLabel.position.set(arrowOrigin.x, y + 170, arrowOrigin.z - 930);
    group.add(northLabel);
  }

  scene.add(group);
  return group;
}

export function TerrainView(props: TerrainViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [error, setError] = useState<string | null>(null);
  const [textureError, setTextureError] = useState<string | null>(null);

  useEffect(() => {
    try {
      assertThreeLoaded();
    } catch (threeError) {
      setError(
        threeError instanceof Error
          ? threeError.message
          : "Three.js vendor scripts did not load.",
      );
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const { terrain } = propsRef.current;
    const [dx, dy] = terrain.patch.cell_size_m;
    const widthMeters = (terrain.meta.width - 1) * dx;
    const depthMeters = (terrain.meta.height - 1) * dy;
    let disposed = false;

    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (renderError) {
      setError(
        renderError instanceof Error
          ? renderError.message
          : "WebGL is not available in this browser.",
      );
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.className = "terrain-canvas";
    container.insertBefore(renderer.domElement, container.firstChild);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f14);
    const camera = new THREE.PerspectiveCamera(42, 1, 5, 40000);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 500;
    controls.maxDistance = 22000;

    const resetView = (): void => {
      const aspect = container.clientWidth / Math.max(1, container.clientHeight);
      const portrait = aspect < 1;
      const scale = portrait ? 1.45 : 1;
      camera.position.set(
        widthMeters * (portrait ? 0.55 : 0.58) * scale,
        widthMeters * (portrait ? 1.05 : 0.62) * scale,
        depthMeters * (portrait ? 1.0 : 0.78) * scale,
      );
      controls.target.set(0, portrait ? 0 : 200, 0);
      controls.update();
    };
    resetView();

    scene.add(new THREE.AmbientLight(0xffffff, 0.78));
    const sun = new THREE.DirectionalLight(0xffead2, 0.65);
    sun.position.set(-4000, 7000, -4000);
    scene.add(sun);

    const geometry = new THREE.PlaneGeometry(
      widthMeters,
      depthMeters,
      terrain.meta.width - 1,
      terrain.meta.height - 1,
    );
    const positions = geometry.attributes.position;
    for (let i = 0; i < terrain.elevation.length; i += 1) {
      const planeY = positions.getY(i);
      positions.setXYZ(
        i,
        positions.getX(i),
        terrain.elevation[i] - terrain.minElevation,
        -planeY,
      );
    }
    const uvs = geometry.attributes.uv;
    for (let row = 0; row < terrain.meta.height; row += 1) {
      for (let col = 0; col < terrain.meta.width; col += 1) {
        uvs.setXY(
          row * terrain.meta.width + col,
          (col + 0.5) / terrain.meta.width,
          1 - (row + 0.5) / terrain.meta.height,
        );
      }
    }
    geometry.computeVertexNormals();

    const materials: Record<TerrainSurface, any> = {
      ctx: new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
      hillshade: new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      slope: new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      geology: new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
    };
    const terrainMesh = new THREE.Mesh(geometry, materials.ctx);
    scene.add(terrainMesh);

    const mineralMaterial = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
    });
    const geologyGroup = buildGeologyGroup(terrain);
    scene.add(geologyGroup);

    const decorGroup = addDecor(scene, widthMeters, depthMeters);
    const routeGroup = new THREE.Group();
    const markerGroup = new THREE.Group();
    const inspectGroup = new THREE.Group();
    scene.add(routeGroup);
    scene.add(markerGroup);
    scene.add(inspectGroup);

    const state: SceneState = {
      renderer,
      scene,
      camera,
      controls,
      terrainMesh,
      decorGroup,
      routeGroup,
      markerGroup,
      materials,
      mineralMaterial,
      geologyGroup,
      inspectGroup,
      astronaut: null,
      traveled: null,
      traveledIndexCount: 0,
      pathPoints: [],
      pathCum: [],
      pathLength: 0,
      walkDist: 0,
      walkLastSent: 0,
      resetView,
    };
    sceneRef.current = state;

    const loader = new THREE.TextureLoader();
    const rasterSurfaces: Array<"ctx" | "hillshade" | "slope"> = [
      "ctx",
      "hillshade",
      "slope",
    ];
    for (const surface of rasterSurfaces) {
      loader.load(
        assetUrl(SURFACE_TEXTURES[surface]),
        (texture: any) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.encoding = THREE.sRGBEncoding;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          materials[surface].map = texture;
          materials[surface].needsUpdate = true;
        },
        undefined,
        () => {
          if (!disposed) setTextureError(surface);
        },
      );
    }

    void fetch(assetUrl("data/gale/data/geology.geojson"))
      .then((res) => (res.ok ? res.json() : null))
      .then((geojson) => {
        if (disposed || !geojson) return;
        const featureProps = geojson?.features?.[0]?.properties ?? {};
        const unitCode = String(
          featureProps.Unit ?? featureProps.unit ?? featureProps.UNIT ?? "HNt",
        );
        const unitName = String(
          featureProps.Unit_Name ??
            featureProps.unit_name ??
            featureProps.Name ??
            "Hesperian-Noachian transition unit",
        );
        const period = String(
          featureProps.Period ?? featureProps.Era ?? "Hesperian / Noachian",
        );
        const description = String(
          featureProps.Description ??
            featureProps.Unit_Desc ??
            "Regional geologic unit clipped from USGS SIM 3292 (1:20,000,000).",
        );

        const canvas = buildGeologyCanvas(
          geojson,
          terrain.patch.bounds_lonlat_deg,
          unitCode,
          unitName,
        );
        const geoTex = new THREE.CanvasTexture(canvas);
        geoTex.encoding = THREE.sRGBEncoding;
        materials.geology.map = geoTex;
        materials.geology.needsUpdate = true;

        propsRef.current.onGeologyLoaded?.({
          unitCode,
          unitName,
          period,
          description,
        });
      })
      .catch(() => {
        if (!disposed) setTextureError("geology");
      });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pickAt = (
      clientX: number,
      clientY: number,
      includeMarkers: boolean,
    ): { cell?: Cell; waypointId?: string } | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      if (includeMarkers) {
        const hits = raycaster.intersectObjects(markerGroup.children, true);
        for (const hit of hits) {
          const id = hit.object.userData.waypointId;
          if (typeof id === "string") return { waypointId: id };
        }
      }

      const hits = raycaster.intersectObject(terrainMesh, false);
      if (hits.length > 0) {
        const point = hits[0].point;
        const cell = worldToCell(point.x, point.z, terrain.patch);
        if (
          inBounds(cell.row, cell.col, terrain.meta.width, terrain.meta.height)
        ) {
          return { cell };
        }
      }
      return null;
    };

    let pointerDown: { x: number; y: number; time: number } | null = null;
    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      pointerDown = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      };
    };
    const onPointerUp = (event: PointerEvent): void => {
      if (!pointerDown || event.button !== 0) return;
      const moved = Math.hypot(
        event.clientX - pointerDown.x,
        event.clientY - pointerDown.y,
      );
      const elapsed = performance.now() - pointerDown.time;
      pointerDown = null;
      if (moved > 6 || elapsed > 650) return;
      const result = pickAt(event.clientX, event.clientY, true);
      if (!result) return;
      if (result.waypointId) propsRef.current.onWaypointSelect(result.waypointId);
      else if (result.cell) {
        propsRef.current.onPick(result.cell);
        propsRef.current.onInspect(result.cell);
      }
    };
    const onPointerCancel = (): void => {
      pointerDown = null;
    };

    let hoverFrame = 0;
    let pendingHover: { x: number; y: number } | null = null;
    let lastHoverIndex = -2;
    const runHover = (): void => {
      hoverFrame = 0;
      if (!pendingHover) return;
      const result = pickAt(pendingHover.x, pendingHover.y, false);
      const cell = result?.cell ?? null;
      const index = cell
        ? cell.row * terrain.meta.width + cell.col
        : -1;
      if (index !== lastHoverIndex) {
        lastHoverIndex = index;
        propsRef.current.onHover(cell);
      }
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (pointerDown) return;
      pendingHover = { x: event.clientX, y: event.clientY };
      if (hoverFrame === 0) {
        hoverFrame = requestAnimationFrame(runHover);
      }
    };
    const onPointerLeave = (): void => {
      pendingHover = null;
      lastHoverIndex = -2;
      propsRef.current.onHover(null);
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    const resize = (): void => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let frame = 0;
    let lastTick = performance.now();
    const animate = (): void => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTick) / 1000, 0.1);
      lastTick = now;
      if (
        propsRef.current.walkPlaying &&
        state.astronaut &&
        state.pathLength > 0
      ) {
        state.walkDist = Math.min(
          state.walkDist + dt * (state.pathLength / 18),
          state.pathLength,
        );
        positionAstronaut(state);
      }
      if (state.pathLength > 0) {
        const progress = state.walkDist / state.pathLength;
        if (
          Math.abs(progress - state.walkLastSent) > 0.005 ||
          (progress >= 1 && state.walkLastSent < 1)
        ) {
          state.walkLastSent = progress;
          propsRef.current.onWalkProgress(progress);
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);

    const onContextLost = (event: Event): void => {
      event.preventDefault();
      setError("WebGL context lost. Reload the page to continue.");
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      if (hoverFrame !== 0) cancelAnimationFrame(hoverFrame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      controls.dispose();
      clearGroup(routeGroup);
      clearGroup(markerGroup);
      clearGroup(inspectGroup);
      disposeObject(terrainMesh);
      clearGroup(decorGroup);
      clearGroup(geologyGroup);
      if (mineralMaterial.map) mineralMaterial.map.dispose();
      mineralMaterial.dispose();
      for (const material of Object.values(materials)) {
        if (material.map) material.map.dispose();
        material.dispose();
      }
      renderer.dispose();
      renderer.forceContextLoss();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = sceneRef.current;
    if (state && !props.mineralBand) applySurface(state, props.surface);
  }, [props.surface, props.mineralBand]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    const band = props.mineralBand;
    if (!band) {
      applySurface(state, propsRef.current.surface);
      return;
    }
    let cancelled = false;
    new THREE.TextureLoader().load(
      assetUrl(mineralTexturePath(band)),
      (texture: any) => {
        if (cancelled || !sceneRef.current) {
          texture.dispose();
          return;
        }
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = state.renderer.capabilities.getMaxAnisotropy();
        if (state.mineralMaterial.map) state.mineralMaterial.map.dispose();
        state.mineralMaterial.map = texture;
        state.mineralMaterial.needsUpdate = true;
        state.terrainMesh.material = state.mineralMaterial;
      },
      undefined,
      () => {
        if (!cancelled) setTextureError(`mineral ${band}`);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [props.mineralBand]);

  useEffect(() => {
    const state = sceneRef.current;
    if (state) state.geologyGroup.visible = props.showGeology;
  }, [props.showGeology]);

  useEffect(() => {
    const state = sceneRef.current;
    if (state) {
      state.terrainMesh.scale.y = props.exaggeration;
      state.geologyGroup.scale.y = props.exaggeration;
    }
  }, [props.exaggeration]);

  useEffect(() => {
    const state = sceneRef.current;
    if (state) {
      rebuildRoute(state, props.terrain, props.route, props.exaggeration);
      state.walkLastSent = 0;
      props.onWalkProgress(props.route && props.route.ok ? 0 : null);
    }
  }, [props.terrain, props.route, props.exaggeration]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state || props.walkResetKey === 0) return;
    state.walkDist = 0;
    state.walkLastSent = 0;
    positionAstronaut(state);
    props.onWalkProgress(state.pathLength > 0 ? 0 : null);
  }, [props.walkResetKey]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    clearGroup(state.inspectGroup);
    const cell = props.inspectCell;
    if (!cell) return;
    const { terrain, exaggeration } = props;
    const width = terrain.meta.width;
    if (!inBounds(cell.row, cell.col, width, terrain.meta.height)) return;
    const world = cellToWorld(cell.row, cell.col, terrain.patch);
    const topY =
      (terrain.elevation[cell.row * width + cell.col] - terrain.minElevation) *
      exaggeration;
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(22, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }),
    );
    pin.position.set(world.x, topY + 70, world.z);
    pin.renderOrder = 34;
    state.inspectGroup.add(pin);
    const stemGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(world.x, topY + 2, world.z),
      new THREE.Vector3(world.x, topY + 52, world.z),
    ]);
    const stem = new THREE.Line(
      stemGeometry,
      new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false }),
    );
    stem.renderOrder = 34;
    state.inspectGroup.add(stem);
  }, [props.inspectCell, props.terrain, props.exaggeration]);

  useEffect(() => {
    const state = sceneRef.current;
    if (state) {
      rebuildMarkers(
        state,
        props.terrain,
        props.waypoints,
        props.start,
        props.goal,
        props.selectedWaypointId,
        props.maxSlopeDeg,
        props.exaggeration,
      );
    }
  }, [
    props.terrain,
    props.waypoints,
    props.start,
    props.goal,
    props.selectedWaypointId,
    props.maxSlopeDeg,
    props.exaggeration,
  ]);

  useEffect(() => {
    const state = sceneRef.current;
    if (state) state.routeGroup.visible = props.showRoute;
  }, [props.showRoute]);

  useEffect(() => {
    const state = sceneRef.current;
    if (state && props.resetViewKey > 0) state.resetView();
  }, [props.resetViewKey]);

  return (
    <div className="terrain-view" ref={containerRef} aria-label="3D Gale Crater terrain">
      {error ? (
        <div className="terrain-error" role="alert">
          <strong>3D terrain unavailable.</strong>
          <span>{error}</span>
        </div>
      ) : null}
      {textureError ? (
        <div className="terrain-warning" role="status">
          The {textureError} surface texture did not load. Terrain is shown
          untextured.
        </div>
      ) : null}
      {!error ? (
        <div className="terrain-hint">
          Drag to orbit · scroll to zoom · click terrain to pin an info card
        </div>
      ) : null}
    </div>
  );
}
