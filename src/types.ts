export interface GridMeta {
  width: number;
  height: number;
  bbox: [west: number, south: number, east: number, north: number];
  center: [lat: number, lon: number];
  metersPerCell: number;
  source: string;
}

export interface GaleGrid {
  meta: GridMeta;
  elevation: number[];
  slope: number[];
  hazard: number[];
  noGo: boolean[];
}

export interface Waypoint {
  id: string;
  label: string;
  lat: number;
  lon: number;
  povId?: string;
}

export interface Pov {
  id: string;
  waypointId: string;
  image: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  sol?: number;
}

export interface RoutePoint {
  x: number;
  y: number;
}

export interface RouteResult {
  ok: boolean;
  path: RoutePoint[];
  distanceKm: number;
  durationH: number;
  maxSlope: number;
  avgSlope: number;
  hazard: number;
  warnings: string[];
}

export interface LayerConfig {
  id: string;
  label: string;
  image: string;
  bounds: [west: number, south: number, east: number, north: number];
  attribution: string;
  opacity: number;
  description: string;
  available: boolean;
}

export interface SafetyConfig {
  baselineDoseRatePerDay: number;
  nominalEvaHours: number;
  maxEvaHours: number;
  walkSpeedKmH: number;
  suitReserve: number;
  maxSlopeDeg: number;
  doseBudgetMsV: number;
  sources: string[];
  notes: string[];
}

export interface GalePatchMetadata {
  title: string;
  prepared: string;
  bounds_lonlat_deg: [number, number, number, number];
  width: number;
  height: number;
  cell_size_m: [number, number];
  extent_projected_m: [number, number, number, number];
  affine_gdal: [number, number, number, number, number, number];
  crs_wkt: string;
  crs_proj4: string;
  mars_radius_m: number;
  vertical_units: string;
  min_elevation_m: number;
  max_elevation_m: number;
  grid_order: string;
  nodata_present: boolean;
  elevation_source: string;
  resolution_note: string;
  slope_method: string;
  hillshade_method: {
    azimuth_deg_clockwise_from_north: number;
    sun_altitude_deg: number;
    range: [number, number];
  };
  texture: {
    bounds_lonlat: [number, number, number, number];
    width: number;
    height: number;
    zoom: number;
    sources: Array<{ url: string; bytes: number }>;
  };
  route: string;
  geology_note: string;
  boxwork_note: string;
}

export interface GaleTerrain {
  meta: GridMeta;
  patch: GalePatchMetadata;
  elevation: Float32Array;
  slope: Float32Array;
  noGo: Uint8Array;
  minElevation: number;
  maxElevation: number;
}

export interface GaleWaypoint extends Waypoint {
  name: string;
  row: number;
  col: number;
  elevationM: number;
  slopeDeg: number;
  synthetic: boolean;
}

export interface GaleRouteResult extends RouteResult {
  start: RoutePoint;
  goal: RoutePoint;
  elevationGainM: number;
  elevationLossM: number;
  steepFraction: number;
}

export type SafetyStatus = "normal" | "caution" | "blocked";

export interface SafetyEvaluation {
  status: SafetyStatus;
  doseMsV: number;
  walkHours: number;
  requiredSuitHours: number;
  warnings: string[];
  assumptions: string[];
}

export interface GeologyInfo {
  unitCode: string;
  unitName: string;
  period: string;
  description: string;
}

export type TerrainSurface = "ctx" | "hillshade" | "slope" | "geology";

export interface TerrainPick {
  row: number;
  col: number;
}

export interface MineralBandMeta {
  title: string;
  description: string;
  units: string;
  file_f32: string;
  file_png: string;
  patch_min: number;
  patch_max: number;
  png_stretch: [number, number];
  coverage_pct: number;
}

export interface MineralsCatalog {
  crs: string;
  grid: string;
  source_observation: string;
  source_url: string;
  citation: string;
  warning: string;
  bands: Record<string, MineralBandMeta>;
}

export interface GeologyUnit {
  unit: string;
  unitdesc: string;
  note: string;
}
