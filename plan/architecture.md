# Architecture

Last updated: 2026-11-14

## Overview

Odyssey is a static single-page application. A pre-baked offline pack provides a Gale Crater DEM, slope raster, CTX texture, derived surfaces, synthetic waypoints, and vendor scripts. The React client loads that pack, renders a 3D terrain with Three.js, runs A* in the browser, and presents route and safety results.

There is no backend, database, login, or required external request. The public demo remains functional with only the repository's local assets.

## System Context

```text
NASA / USGS sources
        |
        v
public/data/gale/  (pre-baked, checksummed offline pack)
  data/metadata.json
  data/elevation.f32
  data/slope.f32
  data/texture_ctx.jpg
  data/hillshade.png
  data/slope_preview.png
  data/example_route.geojson
  vendor/three.min.js
        |
        v
Vite build (GitHub Pages base)
        |
        v
Browser
  React app
  TerrainView (Three.js r128)
  A* route + safety screening
        |
        v
Static GitHub Pages
```

The pack is the runtime source of truth. `gale-3d-offline.zip` is a local source archive only and is ignored by Git. The original full-AOI CTX/MOLA/THEMIS preprocessing pipeline is deferred; no root `scripts/preprocess.py` exists.

## AOI and CRS

| Property | Value |
| --- | --- |
| Patch | Northwest Mount Sharp demo patch, Gale Crater |
| Bounds (lon/lat) | 137.36000069143637–137.44000109967354°E; 4.839992225631115–4.759991817393932°S |
| Size | 4.72 km across cell centers; 4.74 km edge-to-edge |
| CRS | Mars 2000 equidistant cylindrical / equirectangular, ESRI:103885 |
| Radius | 3,396,190 m |
| Central longitude / standard parallel | 0° / 0° |
| Grid | 238 × 238 |
| Cell size | 19.924 m |
| Raster order | Row-major, north-to-south rows, little-endian float32 |
| Elevation range | −4066.285 to −3094.734 m |
| Slope range | 0.05–50.54° |

The patch is **not verified** as the challenge's boxwork location.

## Runtime Flow

1. `src/App.tsx` mounts and loads terrain, safety constants, and waypoints in parallel.
2. `loadGaleTerrain()` fetches `metadata.json`, `elevation.f32`, and `slope.f32` via `assetUrl()`, checks raster lengths, computes min/max elevation, and builds the 20° no-go mask.
3. `loadSafetyConfig()` fetches `public/data/safety.json` and falls back to `DEFAULT_SAFETY` if unavailable.
4. `loadWaypoints()` parses `example_route.geojson` into `GaleWaypoint[]`.
5. `TerrainView.tsx` builds the Three.js scene, terrain mesh, surfaces, route line, and waypoint markers.
6. Selecting a start and goal calls `planRoute()`; the result is passed to `evaluateSafety()`.
7. Panels render distance, walk time, slope, climb/descent, safety status, warnings, caveats, and sources.

## Core Modules

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Data loading, selection state, surface/exaggeration state, route orchestration |
| `src/lib/assets.ts` | `assetUrl(path)` using `import.meta.env.BASE_URL` |
| `src/lib/gale.ts` | Metadata/raster loading, `buildNoGo()`, `DEFAULT_MAX_SLOPE_DEG`, surface URLs |
| `src/lib/geo.ts` | `Cell`, `gridIndex`, `inBounds`, cell↔world, cell↔lat/lon, step distances |
| `src/lib/route.ts` | A* `planRoute()`, route metrics, route warnings |
| `src/lib/safety.ts` | Safety constants, config loading, `evaluateSafety()` |
| `src/lib/waypoints.ts` | GeoJSON parsing and waypoint validation |
| `src/lib/three.ts` | Isolated vendored `THREE` global boundary |
| `src/lib/format.ts` | Number, distance, duration, and coordinate formatting |
| `src/components/TerrainView.tsx` | Scene, terrain mesh, surfaces, picking, route line, markers, cleanup |
| `src/components/TerrainControls.tsx` | Surface switch, exaggeration, reset, hover, patch HUD |
| `src/components/RoutePanel.tsx` | Route distance/time/slope/climb/descent and blocked state |
| `src/components/SafetyPanel.tsx` | Safety status, dose, suit-hours, limits, warnings, assumptions |
| `src/components/WaypointCard.tsx` | Waypoint details and set-start/set-destination actions |
| `src/components/CaveatBanner.tsx` | Persistent synthetic-data and screening-resolution caveat |
| `src/components/SourcesPanel.tsx` | Local sources, attributions, and limitations |

## Coordinate Rules

- Grid coordinates: `x = col`, `y = row`, with row 0 at the north edge.
- Scene coordinates: `x` east, `y` up, `z` south, in metres.
- `y = (elevation − minElevation) × verticalExaggeration`.
- Latitude/longitude values in the pack are planetocentric degrees on Mars.
- All conversions between lat/lon, cell, and scene coordinates live in `src/lib/geo.ts`.
- Route output stays in grid coordinates; rendering and UI convert at the boundary.
- All surfaces must share the same bounds, registration, and UV mapping.
- Do not use Earth `EPSG:4326`, Web Mercator, Earth radius, or Earth scale-bar values.

## Terrain and Surfaces

| Surface | File | Role |
| --- | --- | --- |
| CTX | `data/texture_ctx.jpg` (466 × 466) | Optical context, color-mapped as RGB |
| Visor CTX detail | `data/texture_ctx_detail.jpg` (932 × 932) | Separate optical context in the first-person visor; not used for CRISM registration or routing |
| Hillshade | `data/hillshade.png` (238 × 238) | Shaded relief, azimuth 315°, altitude 45° |
| Slope | `data/slope_preview.png` (238 × 238) | Slope screening display, clamped at 45° |

The slope raster is derived from the DEM as `atan(hypot(dz/dx, dz/dsouth))`, with gradients in metres and one-sided differences at the edges. The hillshade is a display product, not an independent observation. The CTX texture is visual context; it is not used to infer slope or trafficability.

## Routing

`planRoute(terrain, start, goal, options)` implements A*:

- Eight-connected neighbors.
- No-go cells are those with slope greater than `maxSlopeDeg` (20° default; UI allows 10–30°).
- A start or destination on a no-go cell returns a blocked result with a specific reason.
- Diagonal moves are rejected when either orthogonal neighbor is no-go, preventing corner cutting.
- Step distance is computed from the metre grid: 19.924 m orthogonal, about 28.18 m diagonal.
- Step cost is `stepMeters × (1 + slopeWeight × (slope / maxSlopeDeg)² + climbWeight × max(0, elevationDelta) / stepMeters + cautionExtra)`. Existing balanced, distance-priority, and gentler-slope modes use weights (4, 3.5, 0.6), (0.6, 0.5, 0), and (10, 6.5, 1.5); cautionExtra applies above 15°. Distance-priority still includes penalties and is not a guarantee of the geometrically shortest path.
- Heuristic is the Euclidean grid distance to the goal in metres.
- Route metrics include distance, duration at 1.2 km/h, maximum and mean slope, elevation gain/loss, steep fraction above 15°, and warnings.

The default route is WP2 (row 90, col 90) → WP5 (row 170, col 170): 139 cells, 3.311 km, 2.76 h, maximum slope 13.87°, mean 7.02°, 311.3 m climb, 29 m descent. The computation is about 50 ms locally.

WP1 (row 65, col 65) is a blocked example: its 22.19° slope makes it no-go at the 20° limit. The waypoints and route are synthetic demo data, not rover telemetry.

## Safety Model

`evaluateSafety(route, config)` returns:

- `walkHours = distanceKm / walkSpeedKmH`
- `requiredSuitHours = walkHours × (1 + suitReserve)`
- `doseMsV = baselineDoseRatePerDay × walkHours / 24`
- `status`: `blocked` for no route, exceeded slope, maximum walk/suit duration, or dose budget; `caution` for exceeded nominal walk/suit duration; otherwise `normal`. See the safety model for formulas.

See [../docs/safety-model.md](../docs/safety-model.md) for the full rule table and non-claims.

## Contracts

Contracts live in `src/types.ts`. Changes require owner agreement, an update here, and a migration note.

```ts
export interface GridMeta {
  width: number;
  height: number;
  bbox: [west: number, south: number, east: number, north: number];
  center: [lat: number, lon: number];
  metersPerCell: number;
  source: string;
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

export interface SafetyEvaluation {
  status: "normal" | "caution" | "blocked";
  doseMsV: number;
  walkHours: number;
  requiredSuitHours: number;
  warnings: string[];
  assumptions: string[];
}
```

`GalePatchMetadata` mirrors `public/data/gale/data/metadata.json`. `GaleGrid` and `LayerConfig` remain in `src/types.ts` for the deferred 2D-layer pipeline; the offline demo does not use them.

## Offline Data Pack

```text
public/data/gale/
  data/
    metadata.json
    elevation.f32
    slope.f32
    dem_20m.tif
    slope_deg.tif
    hillshade.tif
    texture_ctx.jpg
    hillshade.png
    slope_preview.png
    example_route.geojson
    geology.geojson
  vendor/
    three.min.js
    OrbitControls.js
    THREE-LICENSE.txt
  index.html
  viewer.js
  README.md
  SOURCES.md
  checksums.sha256
  reproduce_dem_subset.py
```

Integrity check:

```bash
cd public/data/gale
sha256sum -c checksums.sha256
```

The standalone `index.html` / `viewer.js` is kept as a reference and fallback viewer. The React app is the public demo.

## Three.js Boundary

- Three.js r128 is vendored as classic scripts in `index.html`, not installed from npm.
- `src/lib/three.ts` is the only module that reads the `THREE` global and throws a clear error if it is missing.
- `TerrainView.tsx` consumes that isolated boundary.
- Vite warns that classic vendor scripts cannot be bundled without `type="module"`; this is expected and non-fatal. The scripts load before the module entry.

## Deployment

- `vite.config.ts` sets `base: "/Odyssey-Cartography/"`.
- `npm run build` produces the Pages build.
- `npm run build:offline` runs `tsc -b && vite build --base=./` for a relative-root check.
- `.github/workflows/deploy.yml` builds and deploys from `main`.
- The live site updates only after merge and workflow completion.

## Runtime Failure Behavior

| Failure | Behavior |
| --- | --- |
| Terrain fetch fails | Show an error state; do not render a fake terrain |
| Safety config fails | Use documented `DEFAULT_SAFETY` assumptions and note it |
| Waypoint file fails | Show a waypoint error; terrain remains usable |
| Three.js global missing | Show a clear load error instead of a blank canvas |
| Start or destination no-go | Return a blocked route with the specific slope reason |
| No path at the current limit | Return a blocked route and suggest raising the limit |
| WebGL unavailable | Show a fallback message; do not crash the app |

## Expedition rendering and interaction

`TerrainView` keeps the r128 boundary and the original metre-grid coordinates. Additional groups contain a decorative edge skirt, derived 100 m contours, waypoint rings/pins, and route tubes. The skirt has no subsurface meaning. Contours interpolate the same triangulated DEM and are hidden on scientific false-color surfaces. CTX lighting/tint is a display treatment; slope and mineral maps remain unlit.

Routes remain piecewise linear through the computed path; no smoothing can cut across blocked cells. `src/lib/traverse.ts` supplies cumulative planar metre distances and raw DEM samples. The profile and moving traveller use that distance axis. Replay takes 24 seconds, independent of estimated EVA time, with explicit play/pause and scrubbing. No telemetry is implied. Route changes reset playback; hidden tabs pause progression.

Camera presets interpolate for 1.4 seconds, while reduced motion makes the change immediate. Orbit is opt-in and stops on direct manipulation. Ambient waypoint and route motion respects the system preference and manual Motion toggle. Rendering resources and listeners are disposed at unmount.

`App` groups controls into Plan, Waypoints, and Discover panels. Layer selection clears a mineral overlay to make the selected surface visible. Keyboard-selectable waypoint buttons are separate from start/destination actions. No shared data types were migrated.

`npm test` runs six data-backed regressions using the existing TypeScript compiler and Node test runner; no dependency was added.

## Deferred Work

- Full 20 km AOI and the original 256×256 MOLA/THEMIS/CTX overlay pipeline.
- Leaflet 2D layer view and layer toggles.
- Thermal context and live NOAA Kp.
- CI integration for the local regression test command.

## Open Engineering Questions

- Should the bottom-left coordinate readout be labeled planetocentric to avoid ambiguity? It currently says “Planetocentric lon/lat.”
- Should waypoint elevation be recomputed from the loaded raster instead of trusted from the GeoJSON? It currently uses the pack values.
- Should the app expose a route-distance note that cell-center steps are approximations, not surveyed paths?
- Should the 10–30° slope control persist in the URL for demos?

These are enhancements, not blockers.
