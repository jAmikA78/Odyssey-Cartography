import type {
  GaleTerrain,
  GeologyUnit,
  MineralsCatalog,
  GeologyInfo,
  TerrainSurface,
} from "../types";
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
  minerals: MineralsCatalog | null;
  mineralBand: string | null;
  onMineralBandChange: (band: string | null) => void;
  mineralValues: Float32Array | null;
  mineralMask: Float32Array | null;
  showGeology: boolean;
  onShowGeologyChange: (show: boolean) => void;
  geologyUnit: GeologyUnit | null;
  geologyInfo: GeologyInfo | null;
}

const SURFACES: Array<{ id: TerrainSurface; label: string }> = [
  { id: "ctx", label: "CTX" },
  { id: "hillshade", label: "Hillshade" },
  { id: "slope", label: "Slope" },
  { id: "geology", label: "Geology" },
];

const SURFACE_NOTES: Record<TerrainSurface, string> = {
  ctx: "CTX mosaic · visual context only",
  hillshade: "Hillshade · sun azimuth 315°, altitude 45°",
  slope: "Slope degrees · 0–45° display clamp",
  geology: "USGS SIM 3292 · 1:20M regional geologic map (broad context)",
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
  minerals,
  mineralBand,
  onMineralBandChange,
  mineralValues,
  mineralMask,
  showGeology,
  onShowGeologyChange,
  geologyUnit,
  geologyInfo,
}: TerrainControlsProps) {
  const index = hoverCell
    ? hoverCell.row * terrain.meta.width + hoverCell.col
    : -1;
  const hoverElevation = index >= 0 ? terrain.elevation[index] : null;
  const hoverSlope = index >= 0 ? terrain.slope[index] : null;
  const activeBandMeta =
    minerals && mineralBand ? (minerals.bands[mineralBand] ?? null) : null;
  const hoverMineral =
    index >= 0 && mineralBand && mineralValues && mineralValues.length > index
      ? mineralValues[index]
      : null;
  const hoverMineralFilled =
    index >= 0 && mineralMask && mineralMask.length > index
      ? mineralMask[index] === 0
      : false;

  return (
    <details className="terrain-controls">
      <summary><span aria-hidden="true">▱</span> Layers & terrain <span className="layer-current">{mineralBand ?? surface}</span></summary>
      <div className="layer-drawer">
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
        <p className="control-note">
          {mineralBand
            ? "Mineral overlay active. Choose a surface above to return to the base map."
            : surface === "geology" && geologyInfo
              ? `USGS SIM 3292 · Unit ${geologyInfo.unitCode} (${geologyInfo.unitName})`
              : SURFACE_NOTES[surface]}
        </p>
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="mineral">
          Mineral layer (CRISM spectral indices)
        </label>
        <select
          id="mineral"
          value={mineralBand ?? ""}
          onChange={(event) =>
            onMineralBandChange(event.target.value || null)
          }
        >
          <option value="">Off</option>
          {minerals
            ? Object.entries(minerals.bands).map(([band, meta]) => (
                <option key={band} value={band}>
                  {band} - {meta.title}
                </option>
              ))
            : null}
        </select>
        {activeBandMeta ? (
          <p className="control-note" id="mineral-note">
            {activeBandMeta.title}: {activeBandMeta.description} Range in
            patch: {activeBandMeta.patch_min.toPrecision(3)} to{" "}
            {activeBandMeta.patch_max.toPrecision(3)}. Dark = low, bright =
            high (2-98% stretch).
          </p>
        ) : (
          <p className="control-note" id="mineral-note">
            Orbital spectral indices from one 2007 CRISM observation; candidate
            signatures, not abundances or soil chemistry. A west/southwest
            wedge (2.8% of cells) is gap-filled, not measured; hovering those
            cells says so instead of showing a value.
          </p>
        )}
      </div>

      <div className="control-block">
        <label className="control-label" htmlFor="geology">
          <input
            id="geology"
            type="checkbox"
            checked={showGeology}
            onChange={(event) => onShowGeologyChange(event.target.checked)}
          />{" "}
          Geology overlay (USGS SIM3292, regional 1:20M)
        </label>
        {showGeology ? (
          <p className="control-note" id="geology-note">
            {geologyUnit
              ? `${geologyUnit.unit} - ${geologyUnit.unitdesc}. The whole patch falls inside this one regional unit; broad context, not local hazards.`
              : "Regional geology unit boundary. Broad context, not local hazards."}
          </p>
        ) : null}

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
              {hoverMineral !== null && mineralBand
                ? hoverMineralFilled
                  ? ` · ${mineralBand} no measurement (gap-filled)`
                  : ` · ${mineralBand} ${hoverMineral.toPrecision(3)}`
                : ""}
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
          {(((terrain.meta.width - 1) * terrain.meta.metersPerCell) / 1000).toFixed(2)}{" "}
          km across
        </p>
      </div>
      </div>
    </details>
  );
}
