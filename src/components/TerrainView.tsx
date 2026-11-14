import { useEffect, useRef, useState } from "react";
import { assetUrl } from "../lib/assets";
import { cellToWorld, inBounds, worldToCell, type Cell } from "../lib/geo";
import { mineralTexturePath, SURFACE_TEXTURES } from "../lib/gale";
import { assertThreeLoaded, THREE } from "../lib/three";
import { sampleTraverse } from "../lib/traverse";
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
  progress: number;
  onPick: (cell: Cell) => void;
  onHover: (cell: Cell | null) => void;
  onWaypointSelect: (id: string) => void;
  onGeologyLoaded?: (info: GeologyInfo) => void;
}

interface SceneState {
  // The vendored r128 global is intentionally isolated to this rendering boundary.
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
  reliefGroup: any;
  contourGroup: any;
  routeSamples: ReturnType<typeof sampleTraverse>;
  routePoints: any[];
  traveller: any;
  flyTo: (position: any, target: any) => void;
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
    const child = group.children[0];
    group.remove(child);
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

function rebuildRoute(
  state: SceneState,
  terrain: GaleTerrain,
  route: GaleRouteResult | null,
  exaggeration: number,
): void {
  clearGroup(state.routeGroup);
  state.routeSamples = sampleTraverse(terrain, route);
  state.routePoints = [];
  state.traveller = null;
  if (!route || !route.ok || route.path.length < 2) return;
  const points = state.routeSamples.map(sample => {
    const world = cellToWorld(sample.y, sample.x, terrain.patch);
    return new THREE.Vector3(world.x, (sample.elevation - terrain.minElevation) * exaggeration + 22, world.z);
  });
  state.routePoints = points;
  // Piecewise linear path preserves the computed cell corridor; no spline shortcuts.
  const curve = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) curve.add(new THREE.LineCurve3(points[i - 1], points[i]));
  for (const [radius, opacity] of [[18, 0.12], [6, 0.95]]) {
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 2, radius, 5, false),
      new THREE.MeshBasicMaterial({ color: 0x65e3ce, transparent: true, opacity, depthTest: false, depthWrite: false }));
    tube.renderOrder = 30;
    state.routeGroup.add(tube);
  }
  for (let i = 0; i < 5; i++) {
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe1fff7, depthTest: false }));
    pulse.userData.flow = i / 5;
    pulse.renderOrder = 32;
    state.routeGroup.add(pulse);
  }
  const traveller = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(36), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
  core.position.y = 40;
  core.renderOrder = 36;
  traveller.add(core);
  const ring = new THREE.Mesh(new THREE.RingGeometry(55, 63, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthTest: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 36;
  traveller.add(ring);
  state.traveller = traveller;
  state.routeGroup.add(traveller);
}

function positionOnRoute(state: SceneState, progress: number, target: any): void {
  const samples = state.routeSamples;
  if (samples.length < 2) return;
  const distance = progress * samples[samples.length - 1].distanceM;
  let next = samples.findIndex(sample => sample.distanceM >= distance);
  next = Math.max(1, next < 0 ? samples.length - 1 : next);
  const previous = samples[next - 1];
  const t = (distance - previous.distanceM) / Math.max(0.001, samples[next].distanceM - previous.distanceM);
  target.copy(state.routePoints[next - 1]).lerp(state.routePoints[next], t);
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

  for (const [markerIndex, waypoint] of waypoints.entries()) {
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

    const beacon = new THREE.Group();
    beacon.position.set(world.x, baseY + 12, world.z);
    beacon.userData.phase = markerIndex * 0.7;
    const sphere = new THREE.Mesh(
      new THREE.OctahedronGeometry(isSelected ? 43 : 28),
      new THREE.MeshBasicMaterial({ color, depthTest: false }),
    );
    sphere.position.set(0, 165, 0);
    sphere.userData.bob = true;
    sphere.renderOrder = 35;
    sphere.userData.waypointId = waypoint.id;
    beacon.add(sphere);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 145, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthTest: false }));
    stem.position.y = 75;
    stem.renderOrder = 34;
    beacon.add(stem);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(54, i ? 57 : 62, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 4;
      ring.userData.pulse = i;
      ring.renderOrder = 34;
      beacon.add(ring);
    }

    const labelColor = blocked ? "#ff8b8b" : isSelected ? "#ffffff" : "#d8e2ec";
    const label = makeLabel(waypoint.label, labelColor);
    if (label) {
      label.scale.set(390, 195, 1);
      label.position.set(0, 315, 0);
      label.userData.waypointId = waypoint.id;
      beacon.add(label);
    }
    beacon.traverse((node: any) => { node.userData.waypointId = waypoint.id; });
    state.markerGroup.add(beacon);
  }
  // Picked cells also receive visible endpoints, even when they are not named waypoints.
  for (const [cell, color, name] of [[start, 0x65e3ce, "START"], [goal, 0xffd260, "GOAL"]] as const) {
    if (!cell || waypoints.some(w => w.row === cell.row && w.col === cell.col)) continue;
    const world = cellToWorld(cell.row, cell.col, terrain.patch);
    const y = (terrain.elevation[cell.row * width + cell.col] - terrain.minElevation) * exaggeration;
    const pin = new THREE.Mesh(new THREE.ConeGeometry(35, 100, 5), new THREE.MeshBasicMaterial({ color, depthTest: false }));
    pin.rotation.z = Math.PI;
    pin.position.set(world.x, y + 80, world.z);
    pin.renderOrder = 35;
    state.markerGroup.add(pin);
    const label = makeLabel(name, "#ffffff");
    if (label) { label.position.set(world.x, y + 210, world.z); state.markerGroup.add(label); }
  }
}

function buildRelief(terrain: GaleTerrain): { relief: any; contours: any } {
  const relief = new THREE.Group();
  const contours = new THREE.Group();
  const { width, height } = terrain.meta;
  const point = (row: number, col: number) => {
    const world = cellToWorld(row, col, terrain.patch);
    return new THREE.Vector3(world.x, terrain.elevation[row * width + col] - terrain.minElevation, world.z);
  };
  const edge: any[] = [];
  for (let col = 0; col < width; col++) edge.push(point(0, col));
  for (let row = 1; row < height; row++) edge.push(point(row, width - 1));
  for (let col = width - 2; col >= 0; col--) edge.push(point(height - 1, col));
  for (let row = height - 2; row >= 0; row--) edge.push(point(row, 0));
  const vertices: number[] = [];
  for (let i = 1; i < edge.length; i++) {
    const a = edge[i - 1], b = edge[i];
    vertices.push(a.x,a.y,a.z, a.x,-180,a.z, b.x,b.y,b.z, b.x,b.y,b.z, a.x,-180,a.z, b.x,-180,b.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  const colors: number[] = [];
  const bottomColor = new THREE.Color(0x101d24);
  const topColor = new THREE.Color(0x584333);
  for (let i = 1; i < vertices.length; i += 3) {
    const color = bottomColor.clone().lerp(topColor, Math.min(1, Math.max(0, (vertices[i] + 180) / 1200)));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  relief.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })));
  const rim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge.map(p => p.clone().add(new THREE.Vector3(0, 3, 0)))), new THREE.LineBasicMaterial({ color: 0xe6ab7d, transparent: true, opacity: 0.3 }));
  relief.add(rim);
  // Contours interpolate the same two triangles used by PlaneGeometry, every 100 m.
  const segments: number[] = [];
  const intersectTriangle = (a: any, b: any, c: any) => {
    const min = Math.min(a.y, b.y, c.y) + terrain.minElevation;
    const max = Math.max(a.y, b.y, c.y) + terrain.minElevation;
    for (let level = Math.ceil(min / 100) * 100; level <= max; level += 100) {
      const y = level - terrain.minElevation;
      const hits: any[] = [];
      for (const [p, q] of [[a,b],[b,c],[c,a]]) {
        if ((p.y <= y && q.y > y) || (q.y <= y && p.y > y)) hits.push(p.clone().lerp(q, (y - p.y) / (q.y - p.y)));
      }
      if (hits.length === 2) for (const hit of hits) segments.push(hit.x, hit.y + 4, hit.z);
    }
  };
  for (let row = 0; row < height - 1; row++) for (let col = 0; col < width - 1; col++) {
    const a = point(row, col), b = point(row + 1, col), c = point(row + 1, col + 1), d = point(row, col + 1);
    intersectTriangle(a,b,d); intersectTriangle(b,c,d);
  }
  const contourGeometry = new THREE.BufferGeometry();
  contourGeometry.setAttribute("position", new THREE.Float32BufferAttribute(segments, 3));
  contours.add(new THREE.LineSegments(contourGeometry, new THREE.LineBasicMaterial({ color: 0xf7dbad, transparent: true, opacity: 0.18, depthWrite: false })));
  return { relief, contours };
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
  const [motion, setMotion] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [orbit, setOrbit] = useState(false);
  const [contours, setContours] = useState(true);
  const motionRef = useRef(motion);
  const orbitRef = useRef(orbit);
  motionRef.current = motion;
  orbitRef.current = orbit;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { setMotion(!preference.matches); setOrbit(false); };
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);

  const cameraPreset = (preset: "overview" | "top" | "focus") => {
    const state = sceneRef.current;
    if (!state) return;
    setOrbit(false);
    if (preset === "overview") { state.resetView(); return; }
    if (preset === "top") {
      const width = (props.terrain.meta.width - 1) * props.terrain.patch.cell_size_m[0];
      state.flyTo(new THREE.Vector3(0, width * (state.camera.aspect < 1 ? 2.2 : 1.65), 1), new THREE.Vector3(0, 0, 0));
      return;
    }
    const waypoint = props.waypoints.find(w => w.id === props.selectedWaypointId);
    if (!waypoint) return;
    const world = cellToWorld(waypoint.row, waypoint.col, props.terrain.patch);
    const y = (props.terrain.elevation[waypoint.row * props.terrain.meta.width + waypoint.col] - props.terrain.minElevation) * props.exaggeration;
    const target = new THREE.Vector3(world.x, y, world.z);
    state.flyTo(target.clone().add(new THREE.Vector3(900, 1000, 1300)), target);
  };

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
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
    scene.fog = new THREE.FogExp2(0x111a20, 0.000025);
    const camera = new THREE.PerspectiveCamera(42, 1, 5, 40000);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 500;
    controls.maxDistance = 22000;

    let flight: { from: any; to: any; fromTarget: any; toTarget: any; start: number } | null = null;
    const flyTo = (position: any, target: any): void => {
      if (!motionRef.current) { camera.position.copy(position); controls.target.copy(target); controls.update(); return; }
      flight = { from: camera.position.clone(), to: position, fromTarget: controls.target.clone(), toTarget: target, start: performance.now() };
    };
    const resetView = (): void => {
      const aspect = container.clientWidth / Math.max(1, container.clientHeight);
      const portrait = aspect < 1;
      const scale = portrait ? 1.7 : 1;
      flyTo(new THREE.Vector3(
        widthMeters * (portrait ? 0.45 : 0.77) * scale,
        widthMeters * (portrait ? 1.05 : 0.92) * scale,
        depthMeters * (portrait ? 0.9 : 1.10) * scale,
      ), new THREE.Vector3(0, portrait ? 150 : 350, 0));
    };
    camera.position.set(widthMeters * 0.8, widthMeters, depthMeters * 1.3);
    resetView();

    scene.add(new THREE.HemisphereLight(0xc9e4ef, 0x5a2b1d, 0.65));
    const sun = new THREE.DirectionalLight(0xffddb7, 1.25);
    sun.position.set(-4000, 7000, -4000);
    scene.add(sun);
    const rimLight = new THREE.DirectionalLight(0x7ab5c7, 0.35);
    rimLight.position.set(4000, 2000, 3000);
    scene.add(rimLight);

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
      ctx: new THREE.MeshStandardMaterial({ color: 0xd8b49b, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
      hillshade: new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      slope: new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      geology: new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
    };
    const terrainMesh = new THREE.Mesh(geometry, materials.ctx);
    scene.add(terrainMesh);
    const { relief: reliefGroup, contours: contourGroup } = buildRelief(terrain);
    scene.add(reliefGroup, contourGroup);

    const mineralMaterial = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
    });
    const geologyGroup = buildGeologyGroup(terrain);
    scene.add(geologyGroup);

    const decorGroup = addDecor(scene, widthMeters, depthMeters);
    const grid = new THREE.GridHelper(widthMeters * 2.8, 40, 0x34484c, 0x253339);
    grid.position.y = -560;
    grid.material.transparent = true;
    grid.material.opacity = 0.12;
    decorGroup.add(grid);
    const routeGroup = new THREE.Group();
    const markerGroup = new THREE.Group();
    scene.add(routeGroup);
    scene.add(markerGroup);

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
      reliefGroup,
      contourGroup,
      routeSamples: [],
      routePoints: [],
      traveller: null,
      flyTo,
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
            featureProps.unitdesc ??
            featureProps.Name ??
            "Unit name not provided",
        );
        const period = String(
          featureProps.Period ?? featureProps.Era ?? "period not provided in local pack",
        );
        const description = String(
          featureProps.Description ??
            featureProps.Unit_Desc ??
            featureProps.unitdesc ??
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
      flight = null;
      setOrbit(false);
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
      else if (result.cell) propsRef.current.onPick(result.cell);
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
      const wasPortrait = camera.aspect < 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (wasPortrait !== (camera.aspect < 1)) resetView();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let frame = 0;
    let previousTime = performance.now();
    let motionTime = 0;
    const animate = (time: number): void => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      if (document.hidden) return;
      if (motionRef.current) motionTime += delta;
      controls.autoRotate = orbitRef.current && motionRef.current && !flight;
      controls.autoRotateSpeed = 0.38 * delta * 60;
      if (flight) {
        const t = motionRef.current ? Math.min(1, (time - flight.start) / 1400) : 1;
        const ease = t * t * (3 - 2 * t);
        camera.position.lerpVectors(flight.from, flight.to, ease);
        controls.target.lerpVectors(flight.fromTarget, flight.toTarget, ease);
        if (t === 1) flight = null;
      }
      for (const beacon of markerGroup.children) {
        if (beacon.userData.phase === undefined) continue;
        for (const node of beacon.children) {
          if (node.userData.bob) {
            node.position.y = 165 + Math.sin(motionTime * 1.8 + beacon.userData.phase) * 13;
            node.rotation.y = motionTime * 0.4;
          }
          if (node.userData.pulse !== undefined) {
            const pulse = node.userData.pulse;
            const phase = (motionTime * 0.45 + pulse / 2 + beacon.userData.phase) % 1;
            node.scale.setScalar(pulse === 0 ? 1 : 1 + phase * 2.2);
            node.material.opacity = pulse === 0 ? 0.8 : (1 - phase) * 0.42;
          }
        }
      }
      for (const node of routeGroup.children) {
        if (node.userData.flow !== undefined) positionOnRoute(state, (motionTime * 0.065 + node.userData.flow) % 1, node.position);
      }
      if (state.traveller) positionOnRoute(state, propsRef.current.progress, state.traveller.position);
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
      disposeObject(terrainMesh);
      clearGroup(decorGroup);
      clearGroup(geologyGroup);
      clearGroup(reliefGroup);
      clearGroup(contourGroup);
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
      state.reliefGroup.scale.y = props.exaggeration;
      state.contourGroup.scale.y = props.exaggeration;
    }
  }, [props.exaggeration]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.contourGroup.visible = contours && !props.mineralBand && (props.surface === "ctx" || props.surface === "hillshade");
  }, [contours, props.surface, props.mineralBand]);

  useEffect(() => {
    const state = sceneRef.current;
    if (state) {
      rebuildRoute(state, props.terrain, props.route, props.exaggeration);
    }
  }, [props.terrain, props.route, props.exaggeration]);

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
        <>
        <div className="scene-toolbar" aria-label="3D viewing controls">
          <div className="camera-buttons">
            <button onClick={() => cameraPreset("overview")} title="Return to overview">↗ <span>Overview</span></button>
            <button onClick={() => cameraPreset("top")} title="North-up overhead view">⊞ <span>Top view</span></button>
            <button disabled={!props.selectedWaypointId} onClick={() => cameraPreset("focus")} title="Fly to the selected waypoint">⌖ <span>Focus point</span></button>
          </div>
          <div className="scene-toggles">
            <button aria-pressed={orbit} disabled={!motion} onClick={() => setOrbit(v => !v)}>Orbit</button>
            <button aria-pressed={contours} onClick={() => setContours(v => !v)} title="Derived 100 m elevation contours">Contours</button>
            <button aria-pressed={motion} onClick={() => { setMotion(v => !v); setOrbit(false); }}>Motion {motion ? "on" : "off"}</button>
          </div>
        </div>
        <div className="terrain-hint">
          Drag to orbit · scroll to zoom · click to place a point
        </div>
        </>
      ) : null}
    </div>
  );
}
