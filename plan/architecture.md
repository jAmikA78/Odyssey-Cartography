# Architecture

Last updated: 2026-11-13

## Overview

Odyssey is a static single-page application. A Python preprocessing step converts Mars source data into local layer images and a 256×256 terrain/hazard grid. The React client renders those layers with Leaflet, accepts waypoint clicks, runs A* in the browser, and presents route and safety results.

There is no backend and no database. The public demo must remain functional with only the repository's local assets.

## System Context

```text
NASA / USGS sources
        |
        v
scripts/preprocess.py
  - download or export source assets
  - crop to AOI
  - resize layer images
  - build elevation/slope/hazard grid
  - write JSON contracts
        |
        v
public/layers/*.jpg  +  public/data/*.json  +  public/pov/*.jpg
        |
        v
Vite + React + TypeScript + Leaflet
  - local image overlays
  - waypoint selection
  - A* route planning
  - safety panel
  - POV modal
  - mission card
        |
        v
static GitHub Pages
```

## Runtime Constraints

- Target static hosting only; no server-side API.
- Initial route computation under one second on a typical laptop.
- Critical assets local; external fetches are optional enhancements.
- Desktop and 390 px mobile width must both work.
- The map must not require an external tile server during the demo.

## Map and Coordinates

- Leaflet CRS: `L.CRS.EPSG4326`.
- Rendering: local `L.imageOverlay` layers, not Web Mercator tiles.
- Every layer uses the same AOI bounds and pixel registration.
- AOI: illustrative 20 km square centered near 4.95°S, 137.45°E.
- The bounding box is generated from the center and size during preprocessing and stored in grid metadata.
- Coordinate conversions live only in `src/lib/geo.ts`:
  - latitude/longitude to grid cell,
  - grid cell to latitude/longitude,
  - grid cell to local pixel coordinates.
- Local equirectangular distance is acceptable inside the small AOI; document the approximation.
- Route output stays in grid coordinates and is converted at the UI boundary.

## Grid and Routing

### Grid

- Dimensions: 256×256, row-major.
- Cell size: approximately 78 m for a 20 km AOI.
- Arrays: elevation, slope, hazard, and no-go.
- Elevation source: MOLA 463 m DEM, resampled to the AOI grid.
- Slope: computed from the DEM with a documented neighborhood method such as Horn.
- Hazard: normalized slope plus optional roughness; not a substitute for rover-scale sensing.
- No-go: slope above 20° or invalid data.

### A*

- Eight-neighbor search over traversable cells.
- Step cost includes distance and slope/hazard penalties.
- Heuristic: Euclidean distance to the goal.
- Returns no route when the goal is unreachable.
- Route stats: distance, duration, maximum slope, average slope, hazard exposure, and warnings.
- Walking speed: 1.2 km/h assumption; suit-hours include a 25% reserve.
- Maximum traversable slope: 20°.

Routing logic must remain pure and testable under `src/lib/route.ts` and `src/lib/hazard.ts`.

## Safety Model

The client reads `public/data/safety.json` and evaluates:

- estimated radiation dose from a cited baseline rate and EVA duration,
- required suit-hours versus rated capacity,
- maximum slope versus the 20° limit,
- walk time versus nominal and maximum EVA durations,
- dose budget versus the configured mission limit.

The safety model is illustrative and must be labeled as such. See [../docs/safety-model.md](../docs/safety-model.md).

## Data and Runtime Contracts

Contracts are frozen once published. Changes require owner agreement and a plan update.

### `GridMeta`

```ts
interface GridMeta {
  width: number;
  height: number;
  bbox: [west: number, south: number, east: number, north: number];
  center: [lat: number, lon: number];
  metersPerCell: number;
  source: string;
}
```

### `GaleGrid`

```ts
interface GaleGrid {
  meta: GridMeta;
  elevation: number[];
  slope: number[];
  hazard: number[];
  noGo: boolean[];
}
```

Arrays are flattened row-major with `index = y * width + x`.

### `Waypoint`

```ts
interface Waypoint {
  id: string;
  label: string;
  lat: number;
  lon: number;
  povId?: string;
}
```

### `Pov`

```ts
interface Pov {
  id: string;
  waypointId: string;
  image: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  sol?: number;
}
```

### `RouteResult`

```ts
interface RouteResult {
  ok: boolean;
  path: Array<{ x: number; y: number }>;
  distanceKm: number;
  durationH: number;
  maxSlope: number;
  avgSlope: number;
  hazard: number;
  warnings: string[];
}
```

### `LayerConfig`

```ts
interface LayerConfig {
  id: string;
  label: string;
  image: string;
  bounds: [west: number, south: number, east: number, north: number];
  attribution: string;
  opacity: number;
  description: string;
  available: boolean;
}
```

### `SafetyConfig`

```ts
interface SafetyConfig {
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
```

## File Layout

```text
src/
  App.tsx
  main.tsx
  styles.css
  types.ts
  lib/
    geo.ts
    hazard.ts
    route.ts
    safety.ts
  components/
    MapView.tsx
    LayerControl.tsx
    RoutePanel.tsx
    SafetyPanel.tsx
    PovModal.tsx
    MissionCard.tsx
    Legend.tsx
    SourceList.tsx
scripts/preprocess.py
public/data/
  gale_grid.json
  layers.json
  waypoints.json
  pov.json
  safety.json
public/layers/
public/pov/
.github/workflows/deploy.yml
```

## Data Pipeline

`scripts/preprocess.py` is owned by D and follows this order:

1. Define the AOI center, size, and grid dimensions.
2. Export or download CTX, MOLA, THEMIS, and optional geology assets.
3. Crop and resize layer images to the same AOI and pixel grid.
4. Parse the DEM, resample to 256×256, and compute slope.
5. Build hazard and no-go arrays.
6. Write `gale_grid.json`, `layers.json`, `waypoints.json`, `pov.json`, and `safety.json`.
7. Resize POV images and record credits.
8. Print a summary of resolutions, bounds, and checksums.

Current environment has `numpy`, `scipy`, `Pillow`, and `requests`; it does not have `rasterio`, `tifffile`, `pyproj`, or `shapely`. Prefer PNG/JSON exports where possible. Add a lightweight parser only if the chosen DEM export requires it, and document the dependency.

## External Services and Fallback

- Local assets are the demo path.
- Optional services such as NOAA Kp may be fetched at runtime.
- A failed optional fetch must show a neutral fallback and must not block the map.
- No runtime service may require an API key.
- No analytics, telemetry, or login.

## Deployment

- GitHub Actions builds with Vite and publishes the static artifact to GitHub Pages.
- Vite `base` must be `/Odyssey-Cartography/`.
- A verifies the production preview under the base path before merge.
- Only A merges deployment changes to `main`.

## Open Items

- Verify the exact Gale boxwork AOI and replace the illustrative coordinates if needed.
- Confirm the DEM export format and whether a parser dependency is required.
- Select at least three Gale POV images with clear credits.
- Verify the radiation baseline against a citable source.
- Confirm the official challenge wording and submission requirements.
