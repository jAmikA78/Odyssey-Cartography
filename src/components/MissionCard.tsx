import { useMemo, useState } from "react";
import type {
  GaleRouteResult,
  GaleTerrain,
  GaleWaypoint,
  GeologyInfo,
  SafetyConfig,
  SafetyEvaluation,
  TerrainSurface,
} from "../types";
import { cellLabel, type Cell } from "../lib/geo";
import { formatDose, formatHours } from "../lib/format";
import { computeWalkBackEnvelope, type WalkBackStatus } from "../lib/walkback";
import "./c2-extras.css";

interface MissionCardProps {
  terrain: GaleTerrain | null;
  start: Cell | null;
  goal: Cell | null;
  waypoints: GaleWaypoint[];
  route: GaleRouteResult | null;
  safety: SafetyEvaluation | null;
  config: SafetyConfig;
  surface: TerrainSurface;
  geologyInfo: GeologyInfo | null;
}

function findWaypointName(cell: Cell | null, waypoints: GaleWaypoint[]): string {
  if (!cell) return "Not selected";
  const match = waypoints.find((w) => w.row === cell.row && w.col === cell.col);
  return match ? `${match.label} (${cellLabel(cell)})` : cellLabel(cell);
}

function walkBackColor(status: WalkBackStatus): string {
  if (status === "beyond-ponr") return "#ff5c5c";
  if (status === "caution") return "#ffb020";
  return "#2ea043";
}

interface ProfileSample {
  x: number;
  y: number;
  elev: number;
  slope: number;
  wbStatus: WalkBackStatus;
  label?: string;
}

export function MissionCard({
  terrain,
  start,
  goal,
  waypoints,
  route,
  safety,
  config,
  surface,
  geologyInfo,
}: MissionCardProps) {
  const [open, setOpen] = useState(false);

  const canGenerate = Boolean(start && goal && safety && route);

  const walkBack = useMemo(() => {
    if (!terrain || !route || !route.ok) return null;
    return computeWalkBackEnvelope(terrain, route, config);
  }, [terrain, route, config]);

  const profile = useMemo(() => {
    if (!terrain || !route || !route.ok || route.path.length < 2) return null;
    const width = terrain.meta.width;
    const raw = route.path.map((pt, i) => {
      const idx = pt.y * width + pt.x;
      return {
        row: pt.y,
        col: pt.x,
        elev: terrain.elevation[idx] ?? terrain.minElevation,
        slope: terrain.slope[idx] ?? 0,
        wbStatus: walkBack?.steps[i]?.status ?? "safe",
      };
    });

    let minE = Infinity;
    let maxE = -Infinity;
    for (const s of raw) {
      if (s.elev < minE) minE = s.elev;
      if (s.elev > maxE) maxE = s.elev;
    }
    const spanE = Math.max(1, maxE - minE);

    const left = 46;
    const right = 545;
    const top = 16;
    const bottom = 100;
    const plotW = right - left;
    const plotH = bottom - top;

    const samples: ProfileSample[] = raw.map((s, i) => {
      const nearWp = waypoints.find(
        (w) => Math.abs(w.row - s.row) <= 1 && Math.abs(w.col - s.col) <= 1,
      );
      return {
        x: left + (i / (raw.length - 1)) * plotW,
        y: bottom - ((s.elev - minE) / spanE) * plotH,
        elev: s.elev,
        slope: s.slope,
        wbStatus: s.wbStatus,
        label: nearWp?.label,
      };
    });

    const ponrSample =
      walkBack?.pointOfNoReturnIndex !== null &&
      walkBack?.pointOfNoReturnIndex !== undefined
        ? samples[walkBack.pointOfNoReturnIndex] ?? null
        : null;

    const areaPoints = [
      `${left},${bottom}`,
      ...samples.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`),
      `${right},${bottom}`,
    ].join(" ");

    return { samples, areaPoints, minE, maxE, left, right, top, bottom, ponrSample };
  }, [terrain, route, waypoints, walkBack]);

  return (
    <section className="panel" aria-labelledby="mission-card-title">
      <div className="panel-heading">
        <h2 id="mission-card-title">Mission card</h2>
        <span className="panel-tag">Printable EVA brief</span>
      </div>
      <p className="panel-note">
        Generate a printable EVA flight brief with elevation cross-section,
        walk-back safety envelope, and NASA/USGS citations.
      </p>
      <div className="mission-actions">
        <button
          type="button"
          className="mission-btn"
          disabled={!canGenerate}
          onClick={() => setOpen(true)}
        >
          {canGenerate ? "Open Printable Mission Card" : "Compute a route first"}
        </button>
      </div>

      {open && safety && route && (
        <div
          className="mission-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Printable Mission Card"
        >
          <div className="mission-card-sheet">
            <div className="mission-card-header">
              <div>
                <h3>Odyssey — EVA Traverse Mission Card</h3>
                <div className="mission-card-meta">
                  Gale Crater / NW Mount Sharp Patch (4.72 × 4.72 km · 20 m DEM)
                </div>
              </div>
              <strong>Status: {safety.status.toUpperCase()}</strong>
            </div>

            <div className="mission-card-grid">
              <div className="mission-card-box">
                <span>Start Point</span>
                <strong>{findWaypointName(start, waypoints)}</strong>
              </div>
              <div className="mission-card-box">
                <span>Destination</span>
                <strong>{findWaypointName(goal, waypoints)}</strong>
              </div>
              <div className="mission-card-box">
                <span>Distance &amp; Elevation Change</span>
                <strong>
                  {route.distanceKm.toFixed(2)} km · +{Math.round(route.elevationGainM)} m / -
                  {Math.round(route.elevationLossM)} m
                </strong>
              </div>
              <div className="mission-card-box">
                <span>Max / Mean Slope</span>
                <strong>
                  {route.maxSlope.toFixed(1)}° max · {route.avgSlope.toFixed(1)}° mean (limit ≤{" "}
                  {config.maxSlopeDeg}°)
                </strong>
              </div>
              <div className="mission-card-box">
                <span>Outbound Walk &amp; Suit-Hours</span>
                <strong>
                  {formatHours(safety.walkHours)} · {formatHours(safety.requiredSuitHours)} suit-h
                </strong>
              </div>
              <div className="mission-card-box">
                <span>Walk-Back Limit (Scenario Assumption)</span>
                <strong>
                  {walkBack
                    ? walkBack.pointOfNoReturnKm !== null
                      ? `PONR at ${walkBack.pointOfNoReturnKm.toFixed(2)} km (Goal margin ${walkBack.goalMarginHours.toFixed(1)} h)`
                      : `Within envelope · Return ${formatHours(walkBack.goalReturnHours)} (+${formatHours(walkBack.goalMarginHours)} margin)`
                    : `${formatDose(safety.doseMsV)} / ${config.doseBudgetMsV} mSv`}
                </strong>
              </div>
            </div>

            {profile && (
              <div className="profile-card">
                <div className="profile-header">
                  <strong>Elevation Cross-Section &amp; Walk-Back Envelope</strong>
                  <div className="profile-legend-inline">
                    <span style={{ color: "#49ffe2" }}>● ≤ 15°</span>
                    <span style={{ color: "#ffb020" }}>● &gt; 15° Steep</span>
                    <span style={{ color: "#2ea043" }}>■ Safe Walk-Back</span>
                    <span style={{ color: "#ff5c5c" }}>■ Beyond PONR</span>
                  </div>
                </div>
                <svg
                  viewBox="0 0 565 138"
                  style={{ width: "100%", height: "auto", display: "block" }}
                  role="img"
                  aria-label="Route elevation and walk-back profile chart"
                >
                  <line
                    x1={profile.left}
                    y1={profile.top}
                    x2={profile.right}
                    y2={profile.top}
                    stroke="#24313d"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={profile.left}
                    y1={profile.bottom}
                    x2={profile.right}
                    y2={profile.bottom}
                    stroke="#24313d"
                  />
                  <polygon points={profile.areaPoints} fill="rgba(73, 255, 226, 0.1)" />

                  {profile.samples.map((s, idx) => {
                    if (idx === 0) return null;
                    const prev = profile.samples[idx - 1];
                    const steep = s.slope > 15 || prev.slope > 15;
                    return (
                      <g key={idx}>
                        <line
                          x1={prev.x}
                          y1={prev.y}
                          x2={s.x}
                          y2={s.y}
                          stroke={steep ? "#ffb020" : "#49ffe2"}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        {/* Walk-back safety envelope strip along bottom */}
                        <line
                          x1={prev.x}
                          y1={profile.bottom + 8}
                          x2={s.x}
                          y2={profile.bottom + 8}
                          stroke={walkBackColor(s.wbStatus)}
                          strokeWidth="5"
                        />
                      </g>
                    );
                  })}

                  {profile.ponrSample && (
                    <g>
                      <line
                        x1={profile.ponrSample.x}
                        y1={profile.top}
                        x2={profile.ponrSample.x}
                        y2={profile.bottom + 11}
                        stroke="#ff5c5c"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                      <text
                        x={profile.ponrSample.x}
                        y={profile.top + 9}
                        textAnchor="middle"
                        fill="#ff5c5c"
                        fontSize="8.5"
                        fontWeight="bold"
                      >
                        POINT OF NO RETURN
                      </text>
                    </g>
                  )}

                  {profile.samples.map((s, idx) => {
                    if (!s.label) return null;
                    return (
                      <g key={`wp-${idx}`}>
                        <circle cx={s.x} cy={s.y} r="3.5" fill="#ffffff" />
                        <text
                          x={s.x}
                          y={Math.max(11, s.y - 7)}
                          textAnchor="middle"
                          fill="#e6edf3"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {s.label}
                        </text>
                      </g>
                    );
                  })}

                  <text x={40} y={profile.top + 4} textAnchor="end" fill="#93a4b5" fontSize="9">
                    {Math.round(profile.maxE)}m
                  </text>
                  <text x={40} y={profile.bottom} textAnchor="end" fill="#93a4b5" fontSize="9">
                    {Math.round(profile.minE)}m
                  </text>
                  <text x={profile.left} y={131} textAnchor="start" fill="#93a4b5" fontSize="9">
                    0.0 km (Habitat)
                  </text>
                  <text
                    x={(profile.left + profile.right) / 2}
                    y={131}
                    textAnchor="middle"
                    fill="#93a4b5"
                    fontSize="9"
                  >
                    Walk-Back Envelope ({Math.round((1 - (walkBack?.reserveFraction ?? 0.25)) * 100)}% usable of {config.maxEvaHours} h)
                  </text>
                  <text x={profile.right} y={131} textAnchor="end" fill="#93a4b5" fontSize="9">
                    {route.distanceKm.toFixed(2)} km (Goal)
                  </text>
                </svg>
              </div>
            )}

            {safety.warnings.length > 0 && (
              <div>
                <strong>Active Warnings:</strong>
                <ul className="warning-list">
                  {safety.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="panel-note">
              <strong>Data Credits &amp; Scenario Caveat:</strong> NASA/JPL/USGS
              Gale Merged DEM (Calef &amp; Parker, 2016), Mars Trek CTX Mosaic,
              USGS SIM 3292 (Tanaka et al., 2014). Walk-back envelope assumes
              symmetric return at {config.walkSpeedKmH} km/h within{" "}
              {Math.round((1 - (walkBack?.reserveFraction ?? 0.25)) * 100)}% of{" "}
              {config.maxEvaHours} h max EVA — illustrative hackathon scenario
              assumption only. Surface layer: {surface.toUpperCase()}
              {geologyInfo ? ` · USGS ${geologyInfo.unitCode}` : ""}.
            </p>

            <div className="mission-card-footer-buttons no-print">
              <button
                type="button"
                className="mission-btn"
                onClick={() => window.print()}
              >
                Print / Save as PDF
              </button>
              <button
                type="button"
                className="mission-btn"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}   