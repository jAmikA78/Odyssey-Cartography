import { useEffect, useMemo, useState } from "react";
import { CaveatBanner } from "./components/CaveatBanner";
import { Legend } from "./components/Legend";
import { MissionCard } from "./components/MissionCard";
import { PovGallery } from "./components/PovGallery";
import { RoutePanel } from "./components/RoutePanel";
import { SafetyPanel } from "./components/SafetyPanel";
import { SourcesPanel } from "./components/SourcesPanel";
import { TerrainControls } from "./components/TerrainControls";
import { TerrainView } from "./components/TerrainView";
import { WaypointCard } from "./components/WaypointCard";
import { loadGaleTerrain } from "./lib/gale";
import { cellLabel, type Cell } from "./lib/geo";
import { planRoute } from "./lib/route";
import {
  DEFAULT_SAFETY,
  evaluateSafety,
  loadSafetyConfig,
} from "./lib/safety";
import { loadGaleWaypoints } from "./lib/waypoints";
import type {
  GaleTerrain,
  GaleWaypoint,
  GeologyInfo,
  SafetyConfig,
  TerrainSurface,
} from "./types";

function App() {
  const [terrain, setTerrain] = useState<GaleTerrain | null>(null);
  const [waypoints, setWaypoints] = useState<GaleWaypoint[]>([]);
  const [safetyConfig, setSafetyConfig] = useState<SafetyConfig>(DEFAULT_SAFETY);
  const [geologyInfo, setGeologyInfo] = useState<GeologyInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [surface, setSurface] = useState<TerrainSurface>("ctx");
  const [exaggeration, setExaggeration] = useState(1.5);
  const [maxSlopeDeg, setMaxSlopeDeg] = useState(DEFAULT_SAFETY.maxSlopeDeg);
  const [start, setStart] = useState<Cell | null>(null);
  const [goal, setGoal] = useState<Cell | null>(null);
  const [pickMode, setPickMode] = useState<"start" | "goal">("start");
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(
    null,
  );
  const [hoverCell, setHoverCell] = useState<Cell | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [resetViewKey, setResetViewKey] = useState(0);

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

  const effectiveSafetyConfig = useMemo(
    () => ({ ...safetyConfig, maxSlopeDeg }),
    [safetyConfig, maxSlopeDeg],
  );

  const route = useMemo(() => {
    if (!terrain || !start || !goal) return null;
    return planRoute(terrain, start, goal, {
      maxSlopeDeg,
      safetyConfig: effectiveSafetyConfig,
    });
  }, [terrain, start, goal, maxSlopeDeg, effectiveSafetyConfig]);

  const safety = useMemo(
    () => (route ? evaluateSafety(route, effectiveSafetyConfig) : null),
    [route, effectiveSafetyConfig],
  );

  const handlePick = (cell: Cell): void => {
    const waypoint = waypoints.find(
      (candidate) =>
        candidate.row === cell.row && candidate.col === cell.col,
    );
    if (waypoint) setSelectedWaypointId(waypoint.id);
    if (pickMode === "start") {
      setStart(cell);
      setPickMode("goal");
    } else {
      setGoal(cell);
    }
  };

  const handleWaypointSelect = (id: string): void => {
    setSelectedWaypointId(id);
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
    }
  };

  const handleClear = (): void => {
    setStart(null);
    setGoal(null);
    setSelectedWaypointId(null);
    setPickMode("start");
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <h1>Odyssey</h1>
          <p>Gale Crater Marswalk Planner</p>
        </div>
        <span className="app-badge">Offline 3D demo</span>
      </header>

      <CaveatBanner />

      <main className="app-main">
        <section className="map-stage" aria-label="Mars map">
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
                onPick={handlePick}
                onHover={setHoverCell}
                onWaypointSelect={handleWaypointSelect}
                onGeologyLoaded={setGeologyInfo}
              />
              <TerrainControls
                terrain={terrain}
                surface={surface}
                onSurfaceChange={setSurface}
                exaggeration={exaggeration}
                onExaggerationChange={setExaggeration}
                onResetView={() => setResetViewKey((key) => key + 1)}
                hoverCell={hoverCell}
                maxSlopeDeg={maxSlopeDeg}
                geologyInfo={geologyInfo}
              />
              <Legend
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
        </section>

        <aside className="side-panel" aria-label="Route and safety panels">
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

          <PovGallery />

          <SourcesPanel />
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