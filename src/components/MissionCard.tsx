import { useState } from "react";
import type {
  GaleRouteResult,
  GaleWaypoint,
  GeologyInfo,
  SafetyConfig,
  SafetyEvaluation,
  TerrainSurface,
} from "../types";
import { cellLabel, type Cell } from "../lib/geo";
import { formatDose, formatHours } from "../lib/format";
import "./c2-extras.css";

interface MissionCardProps {
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

export function MissionCard({
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

  return (
    <section className="panel" aria-labelledby="mission-card-title">
      <div className="panel-heading">
        <h2 id="mission-card-title">Mission card</h2>
        <span className="panel-tag">Printable EVA brief</span>
      </div>
      <p className="panel-note">
        Generate a printable summary of the selected traverse, safety thresholds,
        and NASA/USGS data sources.
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
                <span>Distance &amp; Max Slope</span>
                <strong>
                  {route.distanceKm.toFixed(2)} km · Max {route.maxSlope.toFixed(1)}°
                </strong>
              </div>
              <div className="mission-card-box">
                <span>Walk Time &amp; Suit-Hours</span>
                <strong>
                  {formatHours(safety.walkHours)} · {formatHours(safety.requiredSuitHours)} suit-h
                </strong>
              </div>
              <div className="mission-card-box">
                <span>Estimated EVA Radiation Dose</span>
                <strong>
                  {formatDose(safety.doseMsV)} / {config.doseBudgetMsV} mSv budget
                </strong>
              </div>
              <div className="mission-card-box">
                <span>Active Layer &amp; Regional Unit</span>
                <strong>
                  {surface.toUpperCase()}
                  {geologyInfo ? ` · USGS ${geologyInfo.unitCode}` : ""}
                </strong>
              </div>
            </div>

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
              <strong>Data Credits &amp; Citations:</strong> NASA/JPL/USGS Gale
              Merged DEM (Calef &amp; Parker, 2016), Mars Trek CTX Mosaic, USGS
              SIM 3292 (Tanaka et al., 2014), MSL RAD baseline reference (Hassler
              et al., 2014, <em>Science</em>). SIMULATION ONLY — illustrative
              hackathon estimates, not safety-certified.
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