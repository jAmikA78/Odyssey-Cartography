# AGENTS.md

This file is the operating contract for AI coding agents working on **Odyssey — Gale Crater Marswalk Planner**, a NASA Space Apps Cairo 2026 hackathon project.

## Read First

Before changing code or documentation, read:

1. `README.md`
2. `plan/README.md`
3. `plan/architecture.md`
4. `plan/tasks.md`
5. `docs/challenge.md`
6. `docs/data-sources.md`
7. `docs/safety-model.md`

If a document conflicts with the code, stop and reconcile both. Do not silently make the code and docs disagree.

## Locked Decisions

Do not change these without explicit user approval and a matching update to the plan documents:

- Event: NASA Space Apps Cairo 2026, challenge "Interplanetary Survival Guide: Martian Map."
- Product: Odyssey, a Gale Crater traverse planner.
- Team: 5 workstreams, A–E. A is the integration and merge owner.
- Stack: Vite + React + TypeScript + Three.js r128 (vendored classic scripts). Leaflet remains installed but is **not used** by the offline demo.
- Hosting: static GitHub Pages under `/Odyssey-Cartography/`.
- Runtime: no backend; all critical assets served locally; no external request is required.
- AOI: Gale northwest Mount Sharp demo patch, 4.72 km across cell centers (4.74 km edge-to-edge), bounds 137.36000069143637–137.44000109967354°E and 4.839992225631115–4.759991817393932°S. The boxwork location is **not verified**.
- CRS: Mars 2000 equidistant cylindrical / equirectangular, ESRI:103885, radius 3,396,190 m, central longitude and standard parallel 0°.
- Grid: 238×238, 19.924 m cells, row-major, north-to-south rows; little-endian float32 rasters plus JSON metadata.
- Routing: A* on the slope grid with a 20° maximum traversable slope.
- Data pack: `public/data/gale/` is the runtime source of truth; it is pre-baked and checksummed.
- Feature freeze: Saturday 10:00 Africa/Cairo.
- Final submission: before Saturday 13:00 Africa/Cairo.

## Expected Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run build:offline
python3 -m http.server -d dist
```

`npm run build:offline` uses `vite build --base=./` so the static build works from the `dist/` root. There is no root `scripts/preprocess.py`; the demo uses the pre-baked pack. Do not invent a test command that does not exist.

Before merging implementation work:

```bash
npm run build
npm run build:offline
```

Run the project test command if one is defined.

## Repository Layout

```text
README.md                     Public project overview
AGENTS.md                     This file
plan/                         Execution plan and decisions
docs/                         Research, data, safety, and submission evidence
src/                          React application
src/lib/                      Pure terrain, geo, A*, safety, and Three.js boundary code
src/components/               Terrain, route, safety, waypoint, and source UI
public/data/gale/             Offline terrain pack, textures, waypoints, vendor scripts
public/data/safety.json       Demo safety constants
public/favicon.svg            Local favicon
.github/workflows/            GitHub Pages deployment
```

## Ownership and Merge Policy

- Only A merges to `main`.
- Other workstreams use short-lived branches, for example `b-map-layers` or `d-data-pipeline`.
- Keep changes inside your workstream. Do not edit another owner's component or data contract without coordination.
- Shared contracts in `src/types.ts` and `public/data/*.json` are frozen once published. A contract change requires:
  1. agreement from the affected owners,
  2. an update to `plan/architecture.md`,
  3. a migration note in the pull request.
- Do not rewrite another person's work to match your preferences.

## Coding Standards

- TypeScript strict mode; avoid `any`. The vendored Three.js global is the one approved untyped boundary (`src/lib/three.ts` and `TerrainView.tsx`); isolate it and justify it.
- Keep A*, safety, and coordinate logic in pure functions under `src/lib/`.
- Use React state only; do not add a state-management library without approval.
- Use plain CSS; do not add a UI framework without approval.
- Do not add dependencies without approval. Three.js is vendored, not an npm dependency. Leaflet is present but unused; do not add another map/3D framework.
- Keep comments focused on non-obvious science, math, or data assumptions.
- Do not leave dead code, debug panels, console noise, or placeholder claims in a merge candidate.
- Prefer small, reviewable commits with a clear scope.

## Map and Coordinate Rules

- The 3D scene uses **x east, y up, z south**, in metres. Elevations are relative to the patch minimum; vertical exaggeration is a display transform.
- The data CRS is Mars equirectangular (ESRI:103885, R=3,396,190 m). Do not assign Earth `EPSG:4326` to the rasters and do not use Web Mercator (`EPSG:3857`) for Mars.
- All surfaces (CTX, hillshade, slope) must share the same AOI bounds, 238×238 registration, and UV mapping.
- Keep latitude/longitude ↔ cell ↔ world/scene conversion in `src/lib/geo.ts`.
- Keep route output in grid coordinates (`x = col`, `y = row`) and convert at the UI/render boundary.
- Do not assume Earth radius, Web Mercator distances, or Earth scale-bar values. Compute distances from the metre grid.
- The map must not depend on external tile servers during the demo.
- If Leaflet is revived for a 2D view, document the CRS choice and registration before integration.

## Offline Data Pack

- `public/data/gale/` contains `metadata.json`, `elevation.f32`, `slope.f32`, derived surface images, `example_route.geojson`, vendor scripts, source notes, and `checksums.sha256`.
- The source archive `gale-3d-offline.zip` is ignored and must not be committed.
- Do not edit binary rasters or generated surfaces by hand. Regenerate the pack, update `metadata.json` / `SOURCES.md`, and refresh `checksums.sha256`.
- Verify integrity with:

```bash
cd public/data/gale
sha256sum -c checksums.sha256
```

- `public/data/safety.json` is the single source of safety constants. Keep it synchronized with `docs/safety-model.md` and the UI.

## Data and Scientific Integrity

- Never invent data, coordinates, image credits, or live readings.
- Label the merged-DEM terrain as **20 m screening-resolution** with variable source support. Do not claim meter-scale obstacle detection.
- Do not use Perseverance imagery for Gale Crater. Use MSL/Curiosity if POV imagery is added.
- Do not treat NASA Worldview as a Mars data source.
- NOAA Kp is space-weather context, not a direct Mars surface radiation dose predictor. It is not fetched by the current demo.
- Thermal layers are context only and are not used by the current demo.
- The waypoints and example route are **synthetic demo data**, not rover telemetry and not a safe/optimal route.
- Every displayed number must have a source and an assumption note.
- Mark unverified values clearly. If a value is illustrative, say so in the UI and docs.
- Do not present the product as operational, safety-certified, or mission-approved.

## Runtime and Failure Rules

- The demo must work with the local terrain pack, waypoints, and safety assumptions.
- External fetches are optional future enhancements only. The current runtime must make no external tile, API, or telemetry requests.
- If an optional future fetch fails, show a neutral fallback state; do not break the map or routing.
- Keep the initial route computation under one second on a typical laptop. The default 238×238 route is currently about 50 ms in a local check.
- Do not add telemetry, analytics, tracking, or login requirements.

## Security and Privacy

- Never commit secrets, tokens, API keys, or private credentials.
- Do not add services that require an API key for the core demo.
- Do not collect personal data.
- Do not include names, images, or voices of minors.
- Check attribution and usage terms for every external asset.
- Disclose AI assistance as required by the event; never claim that AI-generated content is verified science.
- Do not present placeholder or illustrative values as real mission data.

## Git and Review

- Do not commit, push, amend, or open a pull request unless the user explicitly asks.
- Do not run destructive commands or rewrite history without approval.
- Do not commit generated cache files, local environment files, or large unoptimized assets.
- Do not force-push `main`.
- Do not amend or rewrite commits that have already been reviewed unless explicitly asked.
- A merge candidate must:
  - build successfully,
  - pass the offline build check,
  - work at desktop and 390 px mobile width,
  - include source/attribution updates for new data,
  - keep `README.md`, `plan/`, and `docs/` consistent with the change.

## Definition of Done

An implementation task is done only when:

- the feature works end-to-end in the browser,
- the production and offline builds pass,
- the route and safety outputs match the documented contracts,
- sources and caveats are visible where required,
- no critical console errors remain,
- the owning plan/task status is updated,
- and A has reviewed the integration impact.

## Documentation Rules

- `README.md` is public-facing and must not claim a feature or live demo state that does not exist.
- `plan/` is the execution source of truth.
- `docs/` is the research and evidence source of truth.
- Use the same roles, dates, AOI, bounds, grid, thresholds, and terminology across files.
- Link instead of duplicating detailed tables when possible.
- Mark unresolved items as `TBD`, `unverified`, or `deferred`; do not present assumptions as facts.
- The live Pages site follows `main`. Do not claim the branch is publicly deployed until it is merged.

## When Unsure

Ask the user or the relevant workstream owner. Do not guess a scientific value, invent an endpoint, fabricate an image credit, or quietly expand scope.