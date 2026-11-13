import type { GaleTerrain, TerrainSurface } from "../types";
import { cellLabel, type Cell } from "../lib/geo";

interface TerrainControlsProps {
  terrain: GaleTerrain;
  surface: TerrainSurface;
  onSurfaceChange: (surface: TerrainSurface) => void;
  exaggeration: number;
  onExaggerationChange: (value: number) => void;
  onResetView: () => void;
  hoverCell: Cell | null;
  maxSlopeDeg: number;
}

const SURFACES: Array<{ id: TerrainSurface; label: string }> = [
  { id: "ctx", label: "CTX" },
  { id: "hillshade", label: "Hillshade" },
  { id: "slope", label: "Slope" },
];

const SURFACE_NOTES: Record<TerrainSurface, string> = {
  ctx: "CTX mosaic · visual context only",
  hillshade: "Hillshade · sun azimuth 315°, altitude 45°",
  slope: "Slope degrees · 0–45° display clamp",
};

export function TerrainControls({
  terrain,
  surface,
  onSurfaceChange,
  exaggeration,
  onExaggerationChange,
  onResetView,
  hoverCell,
  maxSlopeDeg,
}: TerrainControlsProps) {
  const index = hoverCell
    ? hoverCell.row * terrain.meta.width + hoverCell.col
    : -1;
  const hoverElevation = index >= 0 ? terrain.elevation[index] : null;
  const hoverSlope = index >= 0 ? terrain.slope[index] : null;

  return (
    <div className="terrain-controls">
      <div className="control-block">
        <span className="control-label">Surface</span>
        <div className="segmented" role="group" aria-label="Terrain surface">
          {SURFACES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={surface === item.id ? "active" : ""}
              aria-pressed={surface === item.id}
              onClick={() => onSurfaceChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="control-note">{SURFACE_NOTES[surface]}</p>
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="exaggeration">
          Vertical exaggeration · {exaggeration.toFixed(1)}×
        </label>
        <input
          id="exaggeration"
          type="range"
          min="1"
          max="3"
          step="0.5"
          value={exaggeration}
          onChange={(event) => onExaggerationChange(Number(event.target.value))}
        />
        <button type="button" className="ghost-button" onClick={onResetView}>
          Reset view
        </button>
      </div>

      <div className="control-block readout">
        {hoverCell && hoverElevation !== null && hoverSlope !== null ? (
          <>
            <span className="control-label">Cursor</span>
            <p>
              {cellLabel(hoverCell)} · {Math.round(hoverElevation)} m ·{" "}
              {hoverSlope.toFixed(1)}°
            </p>
            <p className="control-note">
              {hoverSlope > maxSlopeDeg
                ? `No-go above the ${maxSlopeDeg}° limit at this point.`
                : "Within the current slope limit."}
            </p>
          </>
        ) : (
          <p className="control-note">Move over the terrain to inspect a cell.</p>
        )}
      </div>

      <div className="control-block patch-meta">
        <span className="control-label">Patch</span>
        <p>
          {terrain.meta.width} × {terrain.meta.height} cells ·{" "}
          {terrain.meta.metersPerCell.toFixed(2)} m
        </p>
        <p className="control-note">
          {Math.round(terrain.minElevation)} to{" "}
          {Math.round(terrain.maxElevation)} m ·{" "}
          {((terrain.meta.width - 1) * terrain.meta.metersPerCell / 1000).toFixed(2)} km
          across
        </p>
      </div>
    </div>
  );
}
