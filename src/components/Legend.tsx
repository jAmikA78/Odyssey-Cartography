import type { GeologyInfo, TerrainSurface } from "../types";
import "./c2-extras.css";

interface LegendProps {
  surface: TerrainSurface;
  maxSlopeDeg: number;
  geologyInfo: GeologyInfo | null;
}

const SURFACE_NAMES: Record<TerrainSurface, string> = {
  ctx: "CTX Optical Mosaic (~10.2 m/px)",
  hillshade: "DEM Synthetic Hillshade (Az 315°)",
  slope: "Terrain Slope Ramp (0° – 45°+)",
  geology: "USGS SIM 3292 Geologic Unit (1:20M)",
};

export function Legend({ surface, maxSlopeDeg, geologyInfo }: LegendProps) {
  return (
    <div className="map-legend" aria-label="Map legend and attribution">
      <div className="map-legend-title">Legend · {SURFACE_NAMES[surface]}</div>

      <div className="legend-row">
        <span className="legend-line" />
        <span>Computed A* Traverse (limit ≤ {maxSlopeDeg}°)</span>
      </div>

      {surface === "slope" && (
        <div>
          <div className="legend-slope-bar" />
          <div className="legend-slope-labels">
            <span>0° Flat</span>
            <span>{maxSlopeDeg}° Limit</span>
            <span>45°+ Steep</span>
          </div>
        </div>
      )}

      {surface === "geology" && (
        <div className="legend-row">
          <span className="legend-swatch-geology" />
          <span>
            {geologyInfo
              ? `Unit ${geologyInfo.unitCode}: ${geologyInfo.unitName} (${geologyInfo.period})`
              : "Regional geologic polygon (broad context only)"}
          </span>
        </div>
      )}

      <div className="legend-attribution">
        Data: NASA/JPL/USGS Gale DEM (20 m) · Mars Trek CTX · USGS SIM 3292.
      </div>
    </div>
  );
}