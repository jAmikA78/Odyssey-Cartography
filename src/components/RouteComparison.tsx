import { useMemo } from "react";
import { planRoute, type RouteMode } from "../lib/route";
import { formatHours } from "../lib/format";
import type { GaleTerrain, SafetyConfig } from "../types";
import type { Cell } from "../lib/geo";

interface Props {
  terrain: GaleTerrain | null;
  start: Cell | null;
  goal: Cell | null;
  config: SafetyConfig;
  mode: RouteMode;
  onMode: (mode: RouteMode) => void;
}

const modes: Array<{ id: RouteMode; name: string; description: string }> = [
  { id: "balanced", name: "Balanced", description: "Distance, slope and climb" },
  { id: "shortest", name: "Distance priority", description: "Shorter path emphasis" },
  { id: "safest", name: "Gentler slopes", description: "Stronger slope and climb penalties" },
];

export function RouteComparison({ terrain, start, goal, config, mode, onMode }: Props) {
  const alternatives = useMemo(() => terrain && start && goal
    ? modes.map(item => ({ ...item, result: planRoute(terrain, start, goal, { mode: item.id, maxSlopeDeg: config.maxSlopeDeg, safetyConfig: config }) }))
    : [], [terrain, start, goal, config]);

  return <section className="panel route-comparison" aria-labelledby="compare-title">
    <div className="panel-heading"><h2 id="compare-title">Compare approaches</h2><span className="panel-tag">Same slope limit</span></div>
    <p className="panel-note">Explore how the route changes when the planner emphasizes distance or gentler terrain. These are screening options, not safety ratings.</p>
    {alternatives.length ? <div className="comparison-grid">{alternatives.map(item => <button key={item.id} className="comparison-option" aria-pressed={mode === item.id} onClick={() => onMode(item.id)}>
      <span className="comparison-name"><span className="comparison-radio" />{item.name}</span>
      <span className="comparison-description">{item.description}</span>
      {item.result.ok ? <span className="comparison-metrics"><span><strong>{item.result.distanceKm.toFixed(2)}</strong> km</span><span><strong>{formatHours(item.result.durationH)}</strong> walk</span><span><strong>{Math.round(item.result.elevationGainM)}</strong> m climb</span><span><strong>{item.result.maxSlope.toFixed(1)}°</strong> max</span></span>
        : <span className="comparison-blocked">No route under the current limit</span>}
    </button>)}</div> : <p className="panel-empty">Set a start and destination to compare routes.</p>}
    <p className="comparison-caveat">Distance priority retains slope and climb penalties; it does not guarantee the geometrically shortest path. Times use the scenario walking speed.</p>
  </section>;
}
