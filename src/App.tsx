import { useEffect, useMemo, useState } from "react";
import { CaveatBanner } from "./components/CaveatBanner";
import { Legend } from "./components/Legend";
import { MissionCard } from "./components/MissionCard";
import { HelmetHud } from "./components/HelmetHud";
import { PovGallery } from "./components/PovGallery";
import { RoutePanel } from "./components/RoutePanel";
import { SafetyPanel } from "./components/SafetyPanel";
import { SourcesPanel } from "./components/SourcesPanel";
import { TerrainControls } from "./components/TerrainControls";
import { TerrainView } from "./components/TerrainView";
import { WaypointCard } from "./components/WaypointCard";
import { TraverseProfile } from "./components/TraverseProfile";
import { RouteComparison } from "./components/RouteComparison";
import {
  loadGaleTerrain,
  loadGeologyUnit,
  loadMineralBandValues,
  loadMineralsCatalog,
  loadMineralsMask,
} from "./lib/gale";
import { cellLabel, type Cell } from "./lib/geo";
import { planRoute, type RouteMode } from "./lib/route";
import {
  formatDegrees,
  formatHours,
  formatKm,
  formatMeters,
  formatPercent,
} from "./lib/format";
import {
  DEFAULT_SAFETY,
  evaluateSafety,
  loadSafetyConfig,
} from "./lib/safety";
import { loadGaleWaypoints } from "./lib/waypoints";
import type {
  GaleRouteResult,
  GaleTerrain,
  GaleWaypoint,
  GeologyUnit,
  MineralsCatalog,
  GeologyInfo,
  SafetyConfig,
  TerrainSurface,
} from "./types";

const ROUTE_MODES: Array<{ id: RouteMode; label: string; hint: string }> = [
  {
    id: "balanced",
    label: "Balanced",
    hint: "Balances short distance, minimal uphill climb, and gentle slopes.",
  },
  {
    id: "shortest",
    label: "Distance",
    hint: "Prioritizes shorter routes while retaining slope and climb penalties.",
  },
  {
    id: "gentler",
    label: "Gentler",
    hint: "Distance-first like Shortest, but steers away from steep slopes.",
  },
  {
    id: "safest",
    label: "Safest",
    hint: "Strongly avoids steep slopes (>15°) and heavy climbs.",
  },
];

type ToolId =
  | "route"
  | "layers"
  | "minerals"
  | "waypoints"
  | "mission"
  | "visor"
  | "gallery"
  | "safety"
  | "sources";

const TOOLS: Array<{
  id: ToolId;
  group: "Tools" | "Reference";
  label: string;
  sub: string;
}> = [
  { id: "route", group: "Tools", label: "Route Planner", sub: "modes, start & goal, walk" },
  { id: "layers", group: "Tools", label: "Map Layers", sub: "CTX, hillshade, slope, geology" },
  { id: "minerals", group: "Tools", label: "Minerals (CRISM)", sub: "21 spectral indices" },
  { id: "waypoints", group: "Tools", label: "Demo Waypoints", sub: "WP1 - WP5" },
  { id: "mission", group: "Tools", label: "Mission Card", sub: "printable brief" },
  { id: "visor", group: "Tools", label: "First-person Visor", sub: "3D helmet view" },
  { id: "gallery", group: "Tools", label: "Curiosity Gallery", sub: "3 real Mastcam photos" },
  { id: "safety", group: "Reference", label: "Safety Screening", sub: "estimates + assumptions" },
  { id: "sources", group: "Reference", label: "Sources & Assumptions", sub: "data provenance" },
];

function App() {
  const [terrain, setTerrain] = useState<GaleTerrain | null>(null);
  const [waypoints, setWaypoints] = useState<GaleWaypoint[]>([]);
  const [safetyConfig, setSafetyConfig] = useState<SafetyConfig>(DEFAULT_SAFETY);
  const [geologyInfo, setGeologyInfo] = useState<GeologyInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [surface, setSurface] = useState<TerrainSurface>("ctx");
  const [exaggeration, setExaggeration] = useState(1.5);
  const [maxSlopeDeg, setMaxSlopeDeg] = useState(DEFAULT_SAFETY.maxSlopeDeg);

  const [routeMode, setRouteMode] = useState<RouteMode>("shortest");

  const [start, setStart] = useState<Cell | null>(null);
  const [goal, setGoal] = useState<Cell | null>(null);
  const [pickMode, setPickMode] = useState<"inspect" | "start" | "goal">("inspect");
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(
    null,
  );
  const [hoverCell, setHoverCell] = useState<Cell | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [resetViewKey, setResetViewKey] = useState(0);
  const [minerals, setMinerals] = useState<MineralsCatalog | null>(null);
  const [mineralBand, setMineralBand] = useState<string | null>(null);
  const [mineralValues, setMineralValues] = useState<Float32Array | null>(
    null,
  );
  const [mineralMask, setMineralMask] = useState<Float32Array | null>(null);
  const [showGeology, setShowGeology] = useState(false);
  const [geologyUnit, setGeologyUnit] = useState<GeologyUnit | null>(null);
  const [progress, setProgress] = useState(0);
  const [walkPlaying, setWalkPlaying] = useState(false);
  const [walkProgress, setWalkProgress] = useState<number | null>(null);
  const [walkResetKey, setWalkResetKey] = useState(0);
  const [inspectCell, setInspectCell] = useState<Cell | null>(null);
  const [activeTool, setActiveTool] = useState<ToolId>("route");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [nextTerrain, config] = await Promise.all([
          loadGaleTerrain(),
          loadSafetyConfig(),
        ]);
        const nextWaypoints = await loadGaleWaypoints(nextTerrain.patch);
        if (cancelled) return;

        setTerrain(nextTerrain);
        setSafetyConfig(config);
        setWaypoints(nextWaypoints);
        setMaxSlopeDeg(config.maxSlopeDeg);

        try {
          const [catalog, geology, mask] = await Promise.all([
            loadMineralsCatalog(),
            loadGeologyUnit(),
            loadMineralsMask(),
          ]);
          if (cancelled) return;
          setMinerals(catalog);
          setGeologyUnit(geology);
          setMineralMask(mask);
        } catch {
          // Mineral and geology layers stay unavailable; terrain still works.
        }

        const startWaypoint =
          nextWaypoints.find((waypoint) => waypoint.label === "WP2") ??
          nextWaypoints[1];
        const goalWaypoint =
          nextWaypoints.find((waypoint) => waypoint.label === "WP5") ??
          nextWaypoints[4];
        if (startWaypoint && goalWaypoint) {
          setStart({ row: startWaypoint.row, col: startWaypoint.col });
          setGoal({ row: goalWaypoint.row, col: goalWaypoint.col });
          setSelectedWaypointId(startWaypoint.id);
        }
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load the offline terrain pack.",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mineralBand) {
      setMineralValues(null);
      return;
    }
    let cancelled = false;
    loadMineralBandValues(mineralBand)
      .then((values) => {
        if (!cancelled) setMineralValues(values);
      })
      .catch(() => {
        if (!cancelled) setMineralValues(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mineralBand]);




  const effectiveSafetyConfig = useMemo(
    () => ({ ...safetyConfig, maxSlopeDeg }),
    [safetyConfig, maxSlopeDeg],
  );

  const route = useMemo(() => {
    if (!terrain || !start || !goal) return null;
    return planRoute(terrain, start, goal, {
      maxSlopeDeg,
      safetyConfig: effectiveSafetyConfig,
      mode: routeMode,
    });
  }, [terrain, start, goal, maxSlopeDeg, effectiveSafetyConfig, routeMode]);

  const safety = useMemo(
    () => (route ? evaluateSafety(route, effectiveSafetyConfig) : null),
    [route, effectiveSafetyConfig],
  );

  useEffect(() => { setProgress(0); setWalkProgress(0); setWalkPlaying(false); }, [route]);
  const handleWalkProgress = (next: number | null): void => {
    setWalkProgress(next);
    if (next !== null) setProgress(next);
    if (next !== null && next >= 1) setWalkPlaying(false);
  };

  const handlePick = (cell: Cell): void => {
    const waypoint = waypoints.find(
      (candidate) =>
        candidate.row === cell.row && candidate.col === cell.col,
    );
    setSelectedWaypointId(waypoint?.id ?? null);
    if (pickMode === "start") {
      setWalkPlaying(false);
      setStart(cell);
      setPickMode("inspect");
    } else if (pickMode === "goal") {
      setWalkPlaying(false);
      setGoal(cell);
      setPickMode("inspect");
    }
    // inspect mode: pin + info card only, route untouched
  };

  const handleWaypointSelect = (id: string): void => {
    setSelectedWaypointId(id);
    setActiveTool("waypoints");
  };

  const handleSetStart = (waypoint: GaleWaypoint): void => {
    setWalkPlaying(false);
    setStart({ row: waypoint.row, col: waypoint.col });
    setSelectedWaypointId(waypoint.id);
    setPickMode("inspect");
  };

  const handleSetGoal = (waypoint: GaleWaypoint): void => {
    setWalkPlaying(false);
    setGoal({ row: waypoint.row, col: waypoint.col });
    setSelectedWaypointId(waypoint.id);
  };

  const handleUseDemo = (): void => {
    setWalkPlaying(false);
    const demoStart =
      waypoints.find((waypoint) => waypoint.label === "WP2") ?? waypoints[1];
    const demoGoal =
      waypoints.find((waypoint) => waypoint.label === "WP5") ?? waypoints[4];
    if (demoStart && demoGoal) {
      setStart({ row: demoStart.row, col: demoStart.col });
      setGoal({ row: demoGoal.row, col: demoGoal.col });
      setSelectedWaypointId(demoStart.id);
      setMaxSlopeDeg(20);
      setRouteMode("shortest");
    }
  };

  const handleClear = (): void => {
    setWalkPlaying(false);
    setStart(null);
    setGoal(null);
    setSelectedWaypointId(null);
    setPickMode("inspect");
  };

  const activeModeHint =
    ROUTE_MODES.find((m) => m.id === routeMode)?.hint ?? "";

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="brand-orbit" aria-hidden="true">◒</span>
          <div><h1>ODYSSEY<span> / </span></h1><p>Beyond the horizon.</p></div>
        </div>
        <div className="header-location"><span className="eyebrow">Mars exploration atlas</span><span>Gale Crater <b> / </b> Northwest Mount Sharp</span></div>
        <span className="app-badge"><i /> Local data · offline ready</span>
      </header>

      <CaveatBanner />

      <main className="app-main">
        <nav className="feature-rail" aria-label="Tools">
          {(["Tools", "Reference"] as const).map((group) => (
            <div key={group} className="rail-group">
              <span className="rail-label">{group}</span>
              {TOOLS.filter((tool) => tool.group === group).map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className={`rail-item${activeTool === tool.id ? " active" : ""}`}
                  aria-pressed={activeTool === tool.id}
                  onClick={() => setActiveTool(tool.id)}
                >
                  <span className="rail-dot" aria-hidden="true" />
                  <span>
                    {tool.label}
                    <small>{tool.sub}</small>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <aside className="tool-panel" aria-label="Active tool">
          {activeTool === "route" ? (
            <>
              <div className="steps-flow" aria-label="Route steps">
                <span className={`step${start ? " done" : ""}`}>
                  1 {start ? "\u2713 " : ""}Start
                </span>
                <span className={`step${goal ? " done" : ""}`}>
                  2 {goal ? "\u2713 " : ""}Destination
                </span>
                <span className={`step${route?.ok ? " now" : ""}`}>
                  3 Route ready
                </span>
              </div>
              <section className="panel" aria-labelledby="route-priority-title">
                <div className="panel-heading">
                  <h2 id="route-priority-title">Route optimization</h2>
                  <span className="panel-tag">A* multi-factor</span>
                </div>
                <div
                  className="segmented"
                  role="group"
                  aria-label="Route optimization mode"
                >
                  {ROUTE_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={routeMode === m.id ? "active" : ""}
                      aria-pressed={routeMode === m.id}
                      onClick={() => setRouteMode(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="panel-note">{activeModeHint}</p>
              </section>
              <RoutePanel
                start={start}
                goal={goal}
                pickMode={pickMode}
                onPickModeChange={setPickMode}
                walkPlaying={walkPlaying}
                walkProgress={walkProgress}
                onToggleWalk={() => { if (progress >= 1) { setProgress(0); setWalkResetKey((key) => key + 1); } setWalkPlaying((playing) => !playing); }}
                onRestartWalk={() => {
                  setWalkPlaying(false);
                  setProgress(0);
                  setWalkResetKey((key) => key + 1);
                }}
                maxSlopeDeg={maxSlopeDeg}
                onMaxSlopeChange={(value) => {
                  setWalkPlaying(false);
                  setMaxSlopeDeg(value);
                }}
                route={route}
                showRoute={showRoute}
                onShowRouteChange={setShowRoute}
                onUseDemo={handleUseDemo}
                onClear={handleClear}
                hideStats
              />
              <RouteComparison
                terrain={terrain}
                start={start}
                goal={goal}
                config={effectiveSafetyConfig}
                mode={routeMode}
                onMode={setRouteMode}
              />
            </>
          ) : null}

          {activeTool === "layers" || activeTool === "minerals" ? (
            terrain ? (
              <TerrainControls
                sections={
                  activeTool === "layers"
                    ? ["surface", "geology", "view", "readout", "patch"]
                    : ["mineral", "readout"]
                }
                terrain={terrain}
                surface={surface}
                onSurfaceChange={(value) => { setSurface(value); setMineralBand(null); }}
                exaggeration={exaggeration}
                onExaggerationChange={setExaggeration}
                onResetView={() => setResetViewKey((key) => key + 1)}
                hoverCell={hoverCell}
                maxSlopeDeg={maxSlopeDeg}
                minerals={minerals}
                mineralBand={mineralBand}
                onMineralBandChange={setMineralBand}
                mineralValues={mineralValues}
                mineralMask={mineralMask}
                showGeology={showGeology}
                onShowGeologyChange={setShowGeology}
                geologyUnit={geologyUnit}
                geologyInfo={geologyInfo}
              />
            ) : (
              <p className="panel-empty">Loading the terrain…</p>
            )
          ) : null}

          {activeTool === "waypoints" ? (
            <section className="panel" aria-labelledby="waypoints-title">
              <div className="panel-heading">
                <h2 id="waypoints-title">Demo waypoints</h2>
                <span className="panel-tag">Synthetic</span>
              </div>
              <p className="panel-note">
                Click a marker or card. WP1 is a blocked example at 20°; WP2
                and WP5 are the default demo traverse.
              </p>
              {waypoints.length > 0 ? (
                <div className="waypoint-list">
                  {waypoints.map((waypoint) => (
                    <WaypointCard
                      key={waypoint.id}
                      waypoint={waypoint}
                      maxSlopeDeg={maxSlopeDeg}
                      isStart={
                        start?.row === waypoint.row &&
                        start?.col === waypoint.col
                      }
                      isGoal={
                        goal?.row === waypoint.row && goal?.col === waypoint.col
                      }
                      isSelected={selectedWaypointId === waypoint.id}
                      onSelect={() => handleWaypointSelect(waypoint.id)}
                      onSetStart={() => handleSetStart(waypoint)}
                      onSetGoal={() => handleSetGoal(waypoint)}
                    />
                  ))}
                </div>
              ) : (
                <p className="panel-empty">Waypoint GeoJSON is not loaded.</p>
              )}
              {start && goal ? (
                <p className="panel-note">
                  Selected traverse: {cellLabel(start)} → {cellLabel(goal)}.
                </p>
              ) : null}
            </section>
          ) : null}

          {activeTool === "mission" ? (
            <MissionCard
              terrain={terrain}
              start={start}
              goal={goal}
              waypoints={waypoints}
              route={route}
              safety={safety}
              config={effectiveSafetyConfig}
              surface={surface}
              geologyInfo={geologyInfo}
            />
          ) : null}

          {activeTool === "visor" ? (
            <HelmetHud
              terrain={terrain}
              route={route}
              safety={safety}
              config={effectiveSafetyConfig}
              waypoints={waypoints}
              start={start}
              goal={goal}
            />
          ) : null}

          {activeTool === "gallery" ? <PovGallery /> : null}

          {activeTool === "safety" ? (
            <SafetyPanel
              safety={safety}
              route={route}
              config={effectiveSafetyConfig}
            />
          ) : null}

          {activeTool === "sources" ? <SourcesPanel /> : null}
        </aside>

        <section className={`map-stage${walkPlaying ? " walking" : ""}`} aria-label="Mars map">
          <div className="terrain-viewport">
          <div className="map-title"><span className="eyebrow">Surface operations / Gale demo patch</span><h2>A new perspective.</h2><p>Explore the terrain. Trace your next step.</p></div>
          {terrain ? (
            <>
              <TerrainView
                terrain={terrain}
                surface={surface}
                exaggeration={exaggeration}
                route={route}
                waypoints={waypoints}
                start={start}
                goal={goal}
                selectedWaypointId={selectedWaypointId}
                maxSlopeDeg={maxSlopeDeg}
                showRoute={showRoute}
                resetViewKey={resetViewKey}
                mineralBand={mineralBand}
                showGeology={showGeology}
                onPick={handlePick}
                onHover={setHoverCell}
                onWaypointSelect={handleWaypointSelect}

                onGeologyLoaded={setGeologyInfo}
                progress={progress}
                onInspect={setInspectCell}
                inspectCell={inspectCell}
                walkPlaying={walkPlaying}
                walkResetKey={walkResetKey}
                onWalkProgress={handleWalkProgress}
              />
              {inspectCell ? (
                <InspectCard
                  cell={inspectCell}
                  terrain={terrain}
                  mineralBand={mineralBand}
                  mineralValues={mineralValues}
                  mineralMask={mineralMask}
                  maxSlopeDeg={maxSlopeDeg}
                  onClose={() => setInspectCell(null)}
                />
              ) : null}
              <Legend
                mineralBand={mineralBand}
                surface={surface}
                maxSlopeDeg={maxSlopeDeg}
                geologyInfo={geologyInfo}
              />
            </>
          ) : loadError ? (
            <div className="placeholder" role="alert">
              <p>Could not load the offline Gale 3D pack.</p>
              <p className="placeholder-note">{loadError}</p>
              <p className="placeholder-note">
                Serve the built app with Vite or a local static server so the
                local JSON and binary assets are available.
              </p>
            </div>
          ) : (
            <div className="placeholder" role="status">
              <p>Loading the offline Gale terrain…</p>
              <p className="placeholder-note">
                238 × 238 cells · local DEM, textures, and vendored Three.js.
              </p>
            </div>
          )}
          </div>
          {terrain && <TraverseProfile terrain={terrain} route={route} progress={progress} playing={walkPlaying}
            onProgress={value => { setWalkPlaying(false); setProgress(value); }}
            onPlay={() => { setShowRoute(true); if (progress >= 1) { setProgress(0); setWalkResetKey(key => key + 1); } setWalkPlaying(value => !value); }} />}
        </section>

      </main>

      <RouteStatsBar route={route} />

      <footer className="app-footer">
        <p>
          Illustrative hackathon prototype. Not operational mission planning.
          Sources and demo assumptions are listed in the panels and local source
          notes. AI tools were used for planning and code assistance; all claims
          and numbers remain the team&apos;s responsibility to verify.
        </p>
      </footer>
    </div>
  );
}


function RouteStatsBar({ route }: { route: GaleRouteResult | null }) {
  if (!route || !route.ok) {
    return (
      <div className="stats-bar" aria-label="Route statistics">
        <p className="stats-bar-empty">
          Plan a route to see its key numbers here.
        </p>
      </div>
    );
  }
  const items: Array<{ value: string; label: string }> = [
    { value: formatKm(route.distanceKm), label: "Distance" },
    { value: formatHours(route.durationH), label: "Walk time (est.)" },
    { value: formatDegrees(route.maxSlope), label: "Max slope" },
    { value: formatDegrees(route.avgSlope), label: "Mean slope" },
    { value: formatMeters(route.elevationGainM), label: "Climb" },
    { value: formatMeters(route.elevationLossM), label: "Descent" },
    { value: formatPercent(route.steepFraction), label: "Above 15\u00b0" },
    { value: String(route.path.length), label: "Path cells" },
  ];
  return (
    <dl className="stats-bar" aria-label="Route statistics">
      {items.map((item) => (
        <div key={item.label}>
          <dd>{item.value}</dd>
          <dt>{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

interface InspectCardProps {
  cell: Cell;
  terrain: GaleTerrain;
  mineralBand: string | null;
  mineralValues: Float32Array | null;
  mineralMask: Float32Array | null;
  maxSlopeDeg: number;
  onClose: () => void;
}

function InspectCard({
  cell,
  terrain,
  mineralBand,
  mineralValues,
  mineralMask,
  maxSlopeDeg,
  onClose,
}: InspectCardProps) {
  const index = cell.row * terrain.meta.width + cell.col;
  const elevation = terrain.elevation[index];
  const slope = terrain.slope[index];
  const mineralValue =
    mineralBand && mineralValues && mineralValues.length > index
      ? mineralValues[index]
      : null;
  const mineralFilled =
    mineralMask && mineralMask.length > index ? mineralMask[index] === 0 : false;

  return (
    <div className="inspect-card" role="status">
      <button
        type="button"
        className="inspect-close"
        aria-label="Close pinned point"
        onClick={onClose}
      >
        ×
      </button>
      <span className="control-label">Pinned point</span>
      <p className="inspect-line">{cellLabel(cell)}</p>
      <p className="inspect-line">
        Elevation {Math.round(elevation)} m · Slope {slope.toFixed(1)}°
      </p>
      {mineralBand ? (
        <p className="inspect-line">
          {mineralBand}:{" "}
          {mineralFilled
            ? "no measurement (gap-filled)"
            : mineralValue !== null
              ? mineralValue.toPrecision(3)
              : "loading…"}
        </p>
      ) : (
        <p className="inspect-note">
          Pick a mineral layer to read its index here.
        </p>
      )}
      <p className="inspect-note">
        {slope > maxSlopeDeg
          ? `No-go above the ${maxSlopeDeg}° limit at this point.`
          : "Within the current slope limit."}{" "}
        Click anywhere else to move the pin.
      </p>
    </div>
  );
}

export default App;
