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
  DEFAULT_SAFETY,
  evaluateSafety,
  loadSafetyConfig,
} from "./lib/safety";
import { loadGaleWaypoints } from "./lib/waypoints";
import type {
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
    id: "safest",
    label: "Gentler slopes",
    hint: "Strongly avoids steep slopes (>15°) and heavy climbs.",
  },
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
  const [routeMode, setRouteMode] = useState<RouteMode>("balanced");
  const [start, setStart] = useState<Cell | null>(null);
  const [goal, setGoal] = useState<Cell | null>(null);
  const [pickMode, setPickMode] = useState<"start" | "goal">("start");
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
  const [panel, setPanel] = useState<"plan" | "waypoints" | "explore">("plan");
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);

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

  useEffect(() => { setProgress(0); setPlaying(false); }, [route]);
  useEffect(() => {
    if (!playing || !route?.ok) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, 100) / 24000;
      last = now;
      if (!document.hidden) setProgress(value => Math.min(1, value + delta));
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing, route]);
  useEffect(() => { if (progress >= 1) setPlaying(false); }, [progress]);

  const handlePick = (cell: Cell): void => {
    const waypoint = waypoints.find(
      (candidate) =>
        candidate.row === cell.row && candidate.col === cell.col,
    );
    setSelectedWaypointId(waypoint?.id ?? null);
    if (pickMode === "start") {
      setStart(cell);
      setPickMode("goal");
    } else {
      setGoal(cell);
    }
  };

  const handleWaypointSelect = (id: string): void => {
    setSelectedWaypointId(id);
    setPanel("waypoints");
  };

  const handleSetStart = (waypoint: GaleWaypoint): void => {
    setStart({ row: waypoint.row, col: waypoint.col });
    setSelectedWaypointId(waypoint.id);
    setPickMode("goal");
  };

  const handleSetGoal = (waypoint: GaleWaypoint): void => {
    setGoal({ row: waypoint.row, col: waypoint.col });
    setSelectedWaypointId(waypoint.id);
  };

  const handleUseDemo = (): void => {
    const demoStart =
      waypoints.find((waypoint) => waypoint.label === "WP2") ?? waypoints[1];
    const demoGoal =
      waypoints.find((waypoint) => waypoint.label === "WP5") ?? waypoints[4];
    if (demoStart && demoGoal) {
      setStart({ row: demoStart.row, col: demoStart.col });
      setGoal({ row: demoGoal.row, col: demoGoal.col });
      setSelectedWaypointId(demoStart.id);
      setMaxSlopeDeg(20);
      setRouteMode("balanced");
    }
  };

  const handleClear = (): void => {
    setStart(null);
    setGoal(null);
    setSelectedWaypointId(null);
    setPickMode("start");
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
        <section className="map-stage" aria-label="Mars map">
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
              />
              <TerrainControls
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
          {terrain && <TraverseProfile terrain={terrain} route={route} progress={progress} playing={playing}
            onProgress={value => { setPlaying(false); setProgress(value); }}
            onPlay={() => { setShowRoute(true); if (progress >= 1) setProgress(0); setPlaying(value => !value); }} />}
        </section>

        <aside className="side-panel" aria-label="Route and safety panels">
          <div className="mission-heading"><span className="eyebrow">Your expedition</span><h2>Make the next move.</h2><p>A small step. A considered route.</p></div>
          <nav className="mission-tabs" aria-label="Expedition panels">
            {([ ["plan", "01", "Plan"], ["waypoints", "02", "Waypoints"], ["explore", "03", "Discover"] ] as const).map(([id, number, label]) => <button key={id} aria-pressed={panel === id} onClick={() => setPanel(id)}><span>{number}</span>{label}</button>)}
          </nav>
          <div className="panel-stack" hidden={panel !== "plan"}>
          <section className="panel" aria-labelledby="route-priority-title">
            <div className="panel-heading">
              <h2 id="route-priority-title">Route optimization</h2>
              <span className="panel-tag">A* multi-factor</span>
            </div>
            <div className="segmented" role="group" aria-label="Route optimization mode">
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
            maxSlopeDeg={maxSlopeDeg}
            onMaxSlopeChange={setMaxSlopeDeg}
            route={route}
            showRoute={showRoute}
            onShowRouteChange={setShowRoute}
            onUseDemo={handleUseDemo}
            onClear={handleClear}
          />

          <SafetyPanel safety={safety} route={route} config={effectiveSafetyConfig} />
          <RouteComparison terrain={terrain} start={start} goal={goal} config={effectiveSafetyConfig} mode={routeMode} onMode={setRouteMode} />
          </div>
          <div className="panel-stack" hidden={panel !== "explore"}>
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
    
           <HelmetHud
         terrain={terrain}
         route={route}
         safety={safety}
         config={effectiveSafetyConfig}
         waypoints={waypoints}
         start={start}
         goal={goal}
           />
          </div>
          <div className="panel-stack" hidden={panel !== "waypoints"}>
          <section className="panel" aria-labelledby="waypoints-title">
            <div className="panel-heading">
              <h2 id="waypoints-title">Demo waypoints</h2>
              <span className="panel-tag">Synthetic</span>
            </div>
            <p className="panel-note">
              Click a marker or card. WP1 is a blocked example at 20°; WP2 and
              WP5 are the default demo traverse.
            </p>
            {waypoints.length > 0 ? (
              <div className="waypoint-list">
                {waypoints.map((waypoint) => (
                  <WaypointCard
                    key={waypoint.id}
                    waypoint={waypoint}
                    maxSlopeDeg={maxSlopeDeg}
                    isStart={
                      start?.row === waypoint.row && start?.col === waypoint.col
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
          </div>
          <div className="panel-stack" hidden={panel !== "explore"}>
          <PovGallery />

          <SourcesPanel />
          </div>
        </aside>
      </main>

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

export default App;
