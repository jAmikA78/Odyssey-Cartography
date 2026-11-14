import type { GeologyInfo, TerrainSurface } from "../types";
import "./c2-extras.css";

interface LegendProps {
  surface: TerrainSurface;
  maxSlopeDeg: number;
  geologyInfo: GeologyInfo | null;
  mineralBand?: string | null;
}

const SURFACE_NAMES: Record<TerrainSurface, string> = {
  ctx: "CTX Optical Mosaic (~10.2 m/px)",
  hillshade: "DEM Synthetic Hillshade (Az 315°)",
  slope: "Terrain Slope Ramp (0° – 45°+)",
  geology: "USGS SIM 3292 Geologic Unit (1:20M)",
};

export function Legend({ surface, maxSlopeDeg, geologyInfo, mineralBand }: LegendProps) {
  return (
    <div className="map-legend" aria-label="Map legend and attribution">
      <div className="map-legend-title">Legend · {mineralBand ? `CRISM ${mineralBand} spectral index` : SURFACE_NAMES[surface]}</div>

      <div className="legend-row">
        <span className="legend-line" />
        <span>Computed A* Traverse (limit ≤ {maxSlopeDeg}°)</span>
      </div>

      {!mineralBand && surface === "slope" && (
        <div>
          <div className="legend-slope-bar" />
          <div className="legend-slope-labels">
            <span>0° Flat</span>
            <span>{maxSlopeDeg}° Limit</span>
            <span>45°+ Steep</span>
          </div>
        </div>
      )}

      {!mineralBand && surface === "geology" && (
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
        {mineralBand ? "CRISM FRT000058A3 · candidate signatures, not abundance. Gap-filled cells flagged on hover." : "NASA/JPL/USGS DEM · CTX · stylized relief. Contours: 100 m. Cutaway is decorative."}
      </div>
    </div>
  );
}
