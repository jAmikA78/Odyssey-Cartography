import type { GaleRouteResult } from "../types";
import { cellLabel, type Cell } from "../lib/geo";
import {
  formatDegrees,
  formatHours,
  formatKm,
  formatMeters,
  formatPercent,
} from "../lib/format";

interface RoutePanelProps {
  start: Cell | null;
  goal: Cell | null;
  pickMode: "inspect" | "start" | "goal";
  onPickModeChange: (mode: "inspect" | "start" | "goal") => void;
  walkPlaying: boolean;
  walkProgress: number | null;
  onToggleWalk: () => void;
  onRestartWalk: () => void;
  maxSlopeDeg: number;
  onMaxSlopeChange: (value: number) => void;
  route: GaleRouteResult | null;
  showRoute: boolean;
  onShowRouteChange: (value: boolean) => void;
  onUseDemo: () => void;
  onClear: () => void;
}

export function RoutePanel({
  start,
  goal,
  pickMode,
  onPickModeChange,
  maxSlopeDeg,
  onMaxSlopeChange,
  route,
  showRoute,
  onShowRouteChange,
  onUseDemo,
  onClear,
  walkPlaying,
  walkProgress,
  onToggleWalk,
  onRestartWalk,
}: RoutePanelProps) {
  return (
    <section className="panel" aria-labelledby="route-panel-title">
      <div className="panel-heading">
        <h2 id="route-panel-title">Traverse</h2>
        <span className="panel-tag">A* slope route</span>
      </div>

      <div className="segmented" role="group" aria-label="Map click mode">
        <button
          type="button"
          className={pickMode === "start" ? "active" : ""}
          aria-pressed={pickMode === "start"}
          onClick={() =>
            onPickModeChange(pickMode === "start" ? "inspect" : "start")
          }
        >
          Set start
        </button>
        <button
          type="button"
          className={pickMode === "goal" ? "active" : ""}
          aria-pressed={pickMode === "goal"}
          onClick={() =>
            onPickModeChange(pickMode === "goal" ? "inspect" : "goal")
          }
        >
          Set destination
        </button>
      </div>
      <p className="mode-hint">
        {pickMode === "start"
          ? "Start placement armed: click the terrain to place the start."
          : pickMode === "goal"
            ? "Destination placement armed: click the terrain to place the destination."
            : "Clicking the terrain pins an info card and never moves the route."}
      </p>

      <dl className="cell-pair">
        <div>
          <dt>Start</dt>
          <dd>{start ? cellLabel(start) : "click the terrain"}</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>{goal ? cellLabel(goal) : "click the terrain"}</dd>
        </div>
      </dl>

      <label className="slider-label" htmlFor="max-slope">
        Maximum traversable slope · {maxSlopeDeg}°
      </label>
      <input
        id="max-slope"
        type="range"
        min="10"
        max="30"
        step="1"
        value={maxSlopeDeg}
        onChange={(event) => onMaxSlopeChange(Number(event.target.value))}
      />
      <p className="panel-note">
        The project rule is 20°; the slider is a screening experiment. Above the
        limit is no-go.
      </p>

      {!route ? (
        <p className="panel-empty">Select a start and destination to plan.</p>
      ) : route.ok ? (
        <>
          <div className="status-row status-ok">
            <span className="status-dot" /> Route found
          </div>
          <div className="walk-block">
            <div className="walk-row">
              <button
                type="button"
                className="walk-button"
                onClick={onToggleWalk}
              >
                {walkPlaying ? "Pause walk" : "Walk the route"}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={onRestartWalk}
              >
                Restart
              </button>
              {walkProgress !== null ? (
                <span className="walk-progress">
                  {Math.round(walkProgress * 100)}%
                </span>
              ) : null}
            </div>
            <p className="walk-note">
              Compressed playback · estimated real walk {formatHours(route.durationH)}
              {" "}· traveled path turns gold
            </p>
          </div>
          <dl className="stat-grid">
            <div>
              <dt>Distance</dt>
              <dd>{formatKm(route.distanceKm)}</dd>
            </div>
            <div>
              <dt>Walk time</dt>
              <dd>{formatHours(route.durationH)}</dd>
            </div>
            <div>
              <dt>Max slope</dt>
              <dd>{formatDegrees(route.maxSlope)}</dd>
            </div>
            <div>
              <dt>Mean slope</dt>
              <dd>{formatDegrees(route.avgSlope)}</dd>
            </div>
            <div>
              <dt>Climb</dt>
              <dd>{formatMeters(route.elevationGainM)}</dd>
            </div>
            <div>
              <dt>Descent</dt>
              <dd>{formatMeters(route.elevationLossM)}</dd>
            </div>
            <div>
              <dt>Above 15°</dt>
              <dd>{formatPercent(route.steepFraction)}</dd>
            </div>
            <div>
              <dt>Path cells</dt>
              <dd>{route.path.length}</dd>
            </div>
          </dl>
          {route.warnings.length > 0 ? (
            <ul className="warning-list">
              {route.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <>
          <div className="status-row status-blocked">
            <span className="status-dot" /> Blocked
          </div>
          <ul className="warning-list">
            {route.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </>
      )}

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={showRoute}
          onChange={(event) => onShowRouteChange(event.target.checked)}
        />
        Show route line
      </label>

      <div className="button-row">
        <button type="button" className="ghost-button" onClick={onUseDemo}>
          Use WP2 → WP5 demo
        </button>
        <button type="button" className="ghost-button" onClick={onClear}>
          Clear points
        </button>
      </div>
    </section>
  );
}
