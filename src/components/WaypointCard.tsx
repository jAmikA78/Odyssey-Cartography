import type { GaleWaypoint } from "../types";
import { cellLabel } from "../lib/geo";
import { formatDegrees, formatLatLon } from "../lib/format";

interface WaypointCardProps {
  waypoint: GaleWaypoint;
  maxSlopeDeg: number;
  isStart: boolean;
  isGoal: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onSetStart: () => void;
  onSetGoal: () => void;
}

export function WaypointCard({
  waypoint,
  maxSlopeDeg,
  isStart,
  isGoal,
  isSelected,
  onSelect,
  onSetStart,
  onSetGoal,
}: WaypointCardProps) {
  const blocked = waypoint.slopeDeg > maxSlopeDeg;
  const className = [
    "waypoint-card",
    isSelected ? "selected" : "",
    isStart ? "is-start" : "",
    isGoal ? "is-goal" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={className}
    >
      <div className="waypoint-heading">
        <button className="waypoint-select" type="button" aria-pressed={isSelected} onClick={onSelect}>
          {waypoint.label} · {waypoint.name}
        </button>
        <span className={blocked ? "chip chip-blocked" : "chip"}>
          {blocked ? "No-go" : "Traversable"}
        </span>
      </div>
      <p className="waypoint-meta">
        {cellLabel(waypoint)} · {Math.round(waypoint.elevationM)} m ·{" "}
        {formatDegrees(waypoint.slopeDeg)}
      </p>
      <p className="waypoint-meta">
        {formatLatLon(waypoint.lat, "lat")}, {formatLatLon(waypoint.lon, "lon")}
      </p>
      <div className="waypoint-badges">
        {waypoint.synthetic ? <span className="chip chip-demo">Synthetic</span> : null}
        {isStart ? <span className="chip chip-start">Start</span> : null}
        {isGoal ? <span className="chip chip-goal">Destination</span> : null}
      </div>
      <div className="button-row">
        <button
          type="button"
          className="ghost-button"
          onClick={(event) => {
            event.stopPropagation();
            onSetStart();
          }}
        >
          Set start
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={(event) => {
            event.stopPropagation();
            onSetGoal();
          }}
        >
          Set destination
        </button>
      </div>
    </article>
  );
}
