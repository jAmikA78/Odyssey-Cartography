import { useEffect, useMemo, useState } from "react";
import { assetUrl } from "../lib/assets";
import { cellLabel, type Cell } from "../lib/geo";
import { formatDose, formatHours } from "../lib/format";
import type {
  GaleRouteResult,
  GaleTerrain,
  GaleWaypoint,
  SafetyConfig,
  SafetyEvaluation,
} from "../types";
import "./c2-extras.css";

interface HelmetHudProps {
  terrain: GaleTerrain | null;
  route: GaleRouteResult | null;
  safety: SafetyEvaluation | null;
  config: SafetyConfig;
  waypoints: GaleWaypoint[];
  start: Cell | null;
  goal: Cell | null;
}

function compassDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return dirs[idx];
}

export function HelmetHud({
  terrain,
  route,
  safety,
  config,
  waypoints,
  start,
  goal,
}: HelmetHudProps) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [crewMode, setCrewMode] = useState<"pair-rover" | "solo">("pair-rover");

  const ready = Boolean(terrain && route && route.ok && route.path.length > 1 && safety);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setPlaying(false);
          return 100;
        }
        return Math.min(100, prev + 2);
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [playing]);

  const stepData = useMemo(() => {
    if (!terrain || !route || !route.ok || route.path.length < 2 || !safety) {
      return null;
    }
    const maxIdx = route.path.length - 1;
    const idx = Math.min(maxIdx, Math.round((progress / 100) * maxIdx));
    const pt = route.path[idx];
    const nextPt = route.path[Math.min(maxIdx, idx + 1)];
    const width = terrain.meta.width;
    const cellIdx = pt.y * width + pt.x;

    const elev = terrain.elevation[cellIdx] ?? terrain.minElevation;
    const slope = terrain.slope[cellIdx] ?? 0;

    const dx = nextPt.x - pt.x;
    const dy = nextPt.y - pt.y;
    const headingDeg =
      dx === 0 && dy === 0
        ? 0
        : (Math.atan2(dx, -dy) * (180 / Math.PI) + 360) % 360;

    const fraction = progress / 100;
    const coveredKm = route.distanceKm * fraction;
    const remainingKm = Math.max(0, route.distanceKm - coveredKm);

    const roverEfficiency = crewMode === "pair-rover" ? 0.85 : 1.0;
    const elapsedHours = safety.walkHours * fraction;
    const suitUsedHours = safety.requiredSuitHours * fraction * roverEfficiency;
    const suitRemainingPct = Math.max(
      0,
      Math.round(100 - (suitUsedHours / config.maxEvaHours) * 100),
    );
    const doseAccMsV = safety.doseMsV * fraction;

    let analogPov = {
      file: "pov/pia19039.jpg",
      id: "PIA19039",
      label: "Pahrump Hills Outcrop Traverse Context",
    };
    if (slope > 14) {
      analogPov = {
        file: "pov/pia21041.jpg",
        id: "PIA21041",
        label: "Caution: Steep Talus Slope Analog (Murray Buttes)",
      };
    } else if (fraction > 0.65) {
      analogPov = {
        file: "pov/pia23137.jpg",
        id: "PIA23137",
        label: "Approaching Clay-Bearing Unit Analog (Glen Torridon)",
      };
    }

    return {
      pt,
      elev,
      slope,
      headingDeg,
      coveredKm,
      remainingKm,
      elapsedHours,
      suitRemainingPct,
      doseAccMsV,
      analogPov,
    };
  }, [terrain, route, safety, progress, crewMode, config.maxEvaHours]);

  const handleOpen = (): void => {
    setProgress(0);
    setPlaying(true);
    setOpen(true);
  };

  return (
    <section className="panel hud-launch-panel" aria-labelledby="hud-panel-title">
      <div className="panel-heading">
        <h2 id="hud-panel-title">Spacesuit visor HUD</h2>
        <span className="panel-tag">Crew + Rover Sim</span>
      </div>
      <p className="panel-note">
        Preview the computed traverse from inside an astronaut helmet visor
        HUD with a 2-crew pair and robotic cargo rover companion.
      </p>
      <div className="mission-actions">
        <button
          type="button"
          className="hud-launch-btn"
          disabled={!ready}
          onClick={handleOpen}
        >
          {ready ? "Launch Helmet Visor HUD" : "Compute a route first"}
        </button>
      </div>

      {open && terrain && route && stepData && (
        <div
          className="mission-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Astronaut Helmet Visor HUD"
          onClick={() => {
            setPlaying(false);
            setOpen(false);
          }}
        >
          <div className="visor-shell" onClick={(e) => e.stopPropagation()}>
            <div className="visor-top-bar">
              <div>
                <span className="visor-badge">EVA HELMET VISOR HUD · GALE CRATER</span>
                <div className="visor-sub">
                  {start ? cellLabel(start) : ""} → {goal ? cellLabel(goal) : ""} ·{" "}
                  {crewMode === "pair-rover"
                    ? "2-Astronaut Pair + Cargo Rover"
                    : "Solo Astronaut Carry"}
                </div>
              </div>
              <div className="visor-top-actions">
                <button
                  type="button"
                  className={crewMode === "pair-rover" ? "visor-pill active" : "visor-pill"}
                  onClick={() => setCrewMode("pair-rover")}
                >
                  Pair + Rover (-15% Suit Load)
                </button>
                <button
                  type="button"
                  className={crewMode === "solo" ? "visor-pill active" : "visor-pill"}
                  onClick={() => setCrewMode("solo")}
                >
                  Solo Carry
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setPlaying(false);
                    setOpen(false);
                  }}
                >
                  Exit HUD
                </button>
              </div>
            </div>

            <div className="visor-telemetry-strip">
              <div className="visor-metric">
                <span>HEADING</span>
                <strong>
                  {Math.round(stepData.headingDeg)}° {compassDirection(stepData.headingDeg)}
                </strong>
              </div>
              <div className="visor-metric">
                <span>ELEVATION</span>
                <strong>{Math.round(stepData.elev)} m</strong>
              </div>
              <div className={stepData.slope > 15 ? "visor-metric warn" : "visor-metric"}>
                <span>LOCAL SLOPE</span>
                <strong>{stepData.slope.toFixed(1)}°</strong>
              </div>
              <div className="visor-metric">
                <span>SUIT O₂ RESERVE</span>
                <strong>{stepData.suitRemainingPct}%</strong>
              </div>
              <div className="visor-metric">
                <span>CUMULATIVE DOSE</span>
                <strong>{formatDose(stepData.doseAccMsV)}</strong>
              </div>
              <div className="visor-metric">
                <span>REMAINING</span>
                <strong>
                  {stepData.remainingKm.toFixed(2)} km ({formatHours(stepData.elapsedHours)} elapsed)
                </strong>
              </div>
            </div>

            <div className="visor-main-grid">
              <div className="visor-radar-box">
                <div className="visor-box-title">
                  Tactical Traverse Radar · {cellLabel({ row: stepData.pt.y, col: stepData.pt.x })}
                </div>
                <svg
                  viewBox={`0 0 ${terrain.meta.width} ${terrain.meta.height}`}
                  className="visor-radar-svg"
                  role="img"
                  aria-label="Live EVA traverse radar"
                >
                  <rect
                    x="0"
                    y="0"
                    width={terrain.meta.width}
                    height={terrain.meta.height}
                    fill="#09111c"
                  />
                  <polyline
                    fill="none"
                    stroke="rgba(73, 255, 226, 0.35)"
                    strokeWidth="3"
                    points={route.path.map((p) => `${p.x},${p.y}`).join(" ")}
                  />
                  {waypoints.map((wp) => (
                    <g key={wp.id}>
                      <circle
                        cx={wp.col}
                        cy={wp.row}
                        r="4"
                        fill={wp.slopeDeg > config.maxSlopeDeg ? "#ff5c5c" : "#ffd260"}
                      />
                      <text
                        x={wp.col + 6}
                        y={wp.row + 3}
                        fill="#b9c7d6"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {wp.label}
                      </text>
                    </g>
                  ))}
                  {crewMode === "pair-rover" && (
                    <circle
                      cx={Math.max(4, stepData.pt.x - 5)}
                      cy={Math.min(terrain.meta.height - 4, stepData.pt.y + 4)}
                      r="4.5"
                      fill="#ffb020"
                    />
                  )}
                  <circle
                    cx={stepData.pt.x}
                    cy={stepData.pt.y}
                    r="6"
                    fill="#49ffe2"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </svg>
                <div className="visor-radar-legend">
                  <span style={{ color: "#49ffe2" }}>● EVA Crew Pair</span>
                  {crewMode === "pair-rover" && (
                    <span style={{ color: "#ffb020" }}>● Cargo Rover (Tools)</span>
                  )}
                  <span style={{ color: "#ffd260" }}>● Waypoints</span>
                </div>
              </div>

              <div className="visor-pov-box">
                <div className="visor-box-title">
                  Gale Crater Analog Surface View ({stepData.analogPov.id})
                </div>
                <img
                  src={assetUrl(stepData.analogPov.file)}
                  alt={stepData.analogPov.label}
                  className="visor-pov-img"
                />
                <div className="visor-pov-caption">{stepData.analogPov.label}</div>
                <div className="visor-crew-roles">
                  <div>
                    <strong>EVA-1 (Lead):</strong> Terrain slope &amp; hazard verification
                  </div>
                  <div>
                    <strong>EVA-2 (Science):</strong> Stratigraphy &amp; sample tagging
                  </div>
                  <div>
                    <strong>Robotic Rover:</strong>{" "}
                    {crewMode === "pair-rover"
                      ? "Active — hauling 45 kg drill & spectrometer payload"
                      : "Standby — crew carrying manual toolkit"}
                  </div>
                </div>
              </div>
            </div>

            <div className="visor-scrubber">
              <button
                type="button"
                className="mission-btn"
                style={{ width: "auto", minWidth: "120px" }}
                onClick={() => {
                  if (progress >= 100) setProgress(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? "Pause EVA" : progress >= 100 ? "Replay EVA" : "Play EVA"}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => {
                  setPlaying(false);
                  setProgress(Number(e.target.value));
                }}
                aria-label="Traverse progress percentage"
                style={{ flex: 1 }}
              />
              <strong style={{ minWidth: "82px", textAlign: "right" }}>
                {progress}% ({stepData.coveredKm.toFixed(2)} km)
              </strong>
            </div>

            <p className="panel-note" style={{ marginTop: "0.5rem" }}>
              Simulated HUD readout derived from local 20 m DEM and A* path.
              Surface imagery shows analog NASA Mastcam Gale Crater context, not
              live rover video.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}