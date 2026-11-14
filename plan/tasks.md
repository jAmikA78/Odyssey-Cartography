# Tasks

Last updated: 2026-11-14

Status values: `planned`, `in progress`, `blocked`, `done`, `deferred`.

## Workstreams

### A — Integration, Routing Integration, Deploy, Demo

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| A0 | Scaffold Vite + React + TypeScript, set Pages base, add deploy workflow | — | Blank site is publicly deployed | done |
| A1 | Build app shell and shared state | A0 | Terrain, route, safety, and waypoint panels render | done |
| A2 | Integrate terrain, route, and safety flow | B1, C1, E1, D0 | Start/end selection produces a route and stats | done |
| A3 | QA, production preview, offline check, and demo rehearsal | A2 | Acceptance checks pass | in progress |
| A4 | Final merge and release candidate | A3 | Freeze candidate is deployed from `main` | pending |

### B — Map, Layers, Coordinates

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| B0 | Choose map CRS and registration | D0 | AOI, grid, and conversion rules documented | done; replaced by the 3D Three.js view |
| B1 | Load CTX, hillshade, and slope surfaces at matching bounds | B0 | Three surfaces switch without misregistration | done |
| B2 | Implement hover, click, and waypoint picking | B1 | Cursor readout and cell selection work | done |
| B3 | Add north arrow, scale bar, exaggeration, and reset | B1 | Controls change the scene and reset reliably | done |
| B4 | Revive a Leaflet 2D layer view | B1 | 2D layer view matches the 3D registration | deferred |

### C — Panels, Responsive UI

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| C0 | Route, safety, and waypoint panel shells | A1 | Panels render with real data | done |
| C1 | Wire route and safety results into panels | E1 | Distance, time, slope, dose, and warnings match contracts | done |
| C2 | POV image modal | D2 | Three Gale POV images open with credits | implemented in integrated baseline |
| C3 | Responsive 390 px layout and caveats | C1 | No blocking overflow; caveats visible | done |
| C4 | Printable mission card | C1 | Card previews or prints with route and sources | implemented in integrated baseline |

### D — Data Acquisition, Preprocessing, Credits

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| D0 | Acquire and verify the offline terrain pack | — | Metadata, rasters, textures, and checksums pass | done |
| D1 | Derive hillshade and slope; register CTX | D0 | Surfaces share the 238×238 AOI | done |
| D2 | Fetch and cache MSL POV images | D0 | Three local images with captions and credits | implemented in integrated baseline; attribution retained |
| D3 | Source notes and attribution | D0 | `SOURCES.md`, UI sources, and docs agree | done |
| D4 | Full 20 km AOI and MOLA/THEMIS pipeline | D1 | Deferred original pipeline is implemented | deferred |

### E — A*, Hazard, Safety Logic, Tests, Content Accuracy

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| E0 | Freeze contracts in `src/types.ts` | — | Terrain, route, waypoint, and safety types compile | done |
| E1 | Implement A* on the slope grid | D1, E0 | Route avoids >20° cells and returns stats | done |
| E2 | Implement safety and warning evaluation | E1 | Dose, suit-hours, slope, duration, and warnings are correct | done |
| E3 | Verify blocked cases and edge conditions | E1 | Start no-go, destination no-go, and no-path cases are handled | done |
| E4 | Automated unit tests and CI | E1, E2 | Tests run in CI and cover the contracts | deferred |

### S — Submission and Evidence

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| S0 | Verify official challenge wording and rubric | — | Requirements mapped with links | pending |
| S1 | Record a fallback demo video | A3 | Video works without network | pending |
| S2 | Final submission form, links, and AI disclosure | A4 | Submitted before deadline | pending |

## Local visual upgrade (2026-11-14)

| ID | Scope | Status |
| --- | --- | --- |
| B5 | Lit terrain cutaway, 100 m contours, waypoint beacon animation, route flow, camera presets | implemented; local QA recorded in visual-experience.md |
| C5 | Expedition console, panel navigation, mobile layout, elevation profile and playback | implemented; local QA recorded in visual-experience.md |
| E5 | Route/profile regression suite and configured walk-back reserve correction | six tests passing locally |
| B6 | Higher-detail local CTX crop for visor, denser display mesh, detailed illustrative scout rover, and corrected visor geology key | implemented on feature branch; browser, test, offline build, and new asset hashes checked locally |
| B7 | Progress-driven forward camera, continuous visor scrubber, route guide pulse, and dust/haze polish | implemented on feature branch; final QA and PR review pending |
| A5 | Review visual integration and merge/deploy | pending A review; no commit/push performed |

## Critical Path

`A0 → D0 → E1 → A2 → C1 → A3 → A4 → S2`

The offline pack and the A* implementation are complete. The remaining path is final QA, documentation reconciliation, merge/deploy, and submission. POV imagery and the mission card are implemented in the integrated baseline.

## Completed Foundation

- [x] Repository, Pages base, deploy workflow, and blank public deploy.
- [x] Offline pack extracted and checksummed.
- [x] React app shell and local asset loading.
- [x] Three.js 3D terrain and three surfaces.
- [x] Coordinate helpers for cell, lat/lon, and scene.
- [x] A* route with 20° default and adjustable limit.
- [x] Safety evaluation and warnings.
- [x] Synthetic waypoints and blocked-start example.
- [x] Desktop and 390 px responsive layout.
- [x] Local sources and persistent caveats.

## Cut Lines

If time runs short, cut in this order:

1. Extra camera or hover polish.
2. Additional documentation detail that does not affect submission claims.
3. Any remaining deferred feature.

**Never cut:** the 3D terrain, three surfaces, A* route, safety panel, blocked example, local sources, caveats, mobile layout, offline build, public link, or AI disclosure.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Branch not merged before freeze | Public site still shows the scaffold | Merge and deploy before Saturday 10:00; keep a fallback video |
| WebGL or headless screenshots fail | Demo verification gap | Test in a real browser; keep the standalone viewer as fallback |
| Boxwork location unverified | Scientific credibility | State the caveat in the UI and docs; do not claim the site is confirmed |
| Safety values unverified | Overclaiming | Label them as scenario assumptions; keep the non-operational banner |
| 20 m merged DEM | Overstated precision | Call it screening-resolution; do not claim meter-scale obstacle detection |
| Three.js r128 classic scripts | Build warnings | Keep the isolated boundary; verify the load order in production |
| Submission deadline | Zero score | Submit the working demo and links before Saturday 13:00 |

## Acceptance Criteria

- [x] `npm run build` passes.
- [x] `npm run build:offline` passes.
- [x] Terrain loads from local assets with no runtime external request.
- [x] CTX, hillshade, and slope surfaces share registration.
- [x] Default route succeeds; WP1 blocked example succeeds.
- [x] Safety panel shows dose, suit-hours, slope, duration, and warnings.
- [x] Sources, caveats, and assumptions are visible.
- [x] Desktop and 390 px layout pass local checks.
- [x] Default route computation is under one second.
- [ ] Public Pages URL shows the offline demo after merge.
- [ ] Fresh-session demo rehearsal passes with no console errors.

## Merge Checklist

- [ ] `npm run build` and `npm run build:offline` pass on the merge candidate.
- [ ] `public/data/gale/checksums.sha256` passes.
- [ ] No runtime external requests are present.
- [ ] No critical console errors remain.
- [ ] `README.md`, `plan/`, and `docs/` match the implementation.
- [ ] Sources and caveats remain visible.
- [ ] A reviews the integration impact.
- [ ] Merge to `main`, deploy, and verify the live URL.
