# Odyssey Execution Plan

Last updated: 2026-11-14

This directory is the execution source of truth for the Odyssey hackathon build. Research evidence lives in `docs/`; public-facing claims live in `README.md`.

## Current Status

- Research, solution definition, and documentation: complete and reconciled with the offline demo.
- Public Pages site: deployment state not checked during this local redesign.
- Offline 3D demo: integrated in the checked-out `main` baseline. New expedition visuals are local changes pending A review.
- Terrain pack: `public/data/gale/` extracted from `gale-3d-offline.zip`; all checksums pass.
- Runtime: terrain, CTX/hillshade/slope/geology, CRISM indices, A* routing, safety, waypoints, gallery, mission card, helmet view, and local sources. The redesign adds animated beacons, camera presets, route playback, and a DEM profile.
- Deferred: MOLA/THEMIS overlay stack, full 20 km AOI pipeline, live NOAA Kp.
- Public demo: Pages follows `main`; the new local changes are not deployed.
- Feature freeze: Saturday 10:00 Africa/Cairo.
- Final submission: before Saturday 13:00 Africa/Cairo.

## Locked Decisions

| Decision | Value |
| --- | --- |
| Event | NASA Space Apps Cairo 2026 |
| Challenge | "Interplanetary Survival Guide: Martian Map" |
| Product | Odyssey — Gale Crater Marswalk Planner |
| Team | 5 workstreams: A–E |
| Stack | Vite + React + TypeScript + Three.js r128 (vendored); Leaflet installed but unused |
| Hosting | Static GitHub Pages under `/Odyssey-Cartography/` |
| Runtime | No backend; all critical assets local; no external request required |
| AOI | Gale northwest Mount Sharp demo patch, 4.72 km across cell centers (4.74 km edge-to-edge) |
| AOI bounds | 137.36000069143637–137.44000109967354°E; 4.839992225631115–4.759991817393932°S |
| CRS | Mars 2000 equidistant cylindrical / equirectangular, ESRI:103885, R=3,396,190 m |
| Grid | 238×238, 19.924 m cells, row-major, north-to-south rows |
| Rasters | Little-endian float32 `elevation.f32` and `slope.f32`, plus JSON metadata |
| Routing | A* on the slope grid, 20° maximum traversable slope |
| Safety | Demo assumptions in `public/data/safety.json` |
| Feature freeze | Saturday 10:00 Africa/Cairo |
| Submission | Before Saturday 13:00 Africa/Cairo |

The boxwork location is **not verified**. The patch was chosen to reuse a valid compact DEM subset.

## Team and Ownership

| Slot | Role | Owner |
| --- | --- | --- |
| A | Integration, routing integration, deploy, merges, demo | Ahmed |
| B | Map, terrain, coordinate conversion, map interactions | TBD |
| C | Panels, responsive UI | TBD |
| D | Data acquisition, offline pack, credits | TBD |
| E | A*, hazard, safety logic, tests, content accuracy | TBD |

Project lead and submission owner: the team lead. Only A merges to `main`.

## Goals

- Deliver a working, public, no-login Mars traverse planner.
- Show a local 3D terrain with CTX, hillshade, and slope surfaces registered to the same AOI.
- Compute a terrain-aware route and explain its safety trade-offs.
- Keep the demo offline-safe and fully attributed.
- Produce a clear demo and submission package within the event deadline.

## Non-Goals

- Real mission planning or safety certification.
- Meter-scale obstacle detection from a 20 m merged DEM.
- Live Mars weather or radiation prediction.
- Multi-user accounts, backend services, or persistent storage.
- Full Gale Crater coverage or global Mars routing.
- Operational navigation or scientifically calibrated mineral/radiation interpretation.

## Implemented Demo Baseline

| Check | Result |
| --- | --- |
| Terrain load | 238×238 cells; elevation −4066.285 to −3094.734 m; slope 0.05–50.54° |
| Surfaces | CTX, hillshade, and slope switch at identical registration |
| Default route | WP2 (90, 90) → WP5 (170, 170); 3.31 km; 2 h 46 min; max slope 13.9° |
| Blocked example | WP1 (65, 65) at 22.2° is no-go at the 20° limit |
| Safety | 0.074 mSv EVA dose; 3 h 27 min suit-hours; within demo thresholds |
| Offline check | `npm run build:offline` + `python3 -m http.server -d dist` |
| Responsive check | Desktop and 390 px via headless browser screenshots |

The values above are demo results from the local pack, not rover telemetry.

## Checkpoints

| Checkpoint | Target | Pass condition | Status |
| --- | --- | --- | --- |
| Blank deploy | Friday 16:00 | Public Pages URL loads | done |
| Offline terrain demo | Friday 22:00 | 3D terrain and three surfaces render locally | done |
| Route end-to-end | Saturday 02:00 | Start/end selection produces route and stats | done |
| Safety and sources | Saturday 04:00 | Safety panel, caveats, and local sources visible | done |
| Responsive QA | Saturday 08:00 | Desktop and 390 px checks pass | done locally |
| Release candidate | Saturday 09:00 | Production and offline builds pass; branch reviewed | in progress |
| Feature freeze | Saturday 10:00 | No feature changes after this point | pending |
| Submission | Saturday 13:00 | Form and links verified before deadline | pending |

## Plan Index

- [architecture.md](architecture.md) — system design, data flow, and contracts
- [tasks.md](tasks.md) — workstreams, dependencies, cut lines, and acceptance criteria
- [timeline.md](timeline.md) — Cairo-time schedule and freeze rules

## Supporting Documents

- [../docs/challenge.md](../docs/challenge.md)
- [../docs/research.md](../docs/research.md)
- [../docs/data-sources.md](../docs/data-sources.md)
- [../docs/safety-model.md](../docs/safety-model.md)
- [../docs/demo-and-submission.md](../docs/demo-and-submission.md)

## Visual refresh

The user requested a broad visual and 3D upgrade on 2026-11-14. No dependency, data-pack, CRS, routing-rule, or frozen shared-type change is introduced. See [../docs/visual-experience.md](../docs/visual-experience.md). A review remains required before merge.

## Change Control

A locked decision changes only when:

1. the user or A approves the change,
2. the affected owner agrees,
3. `plan/README.md`, `plan/architecture.md`, and any affected `docs/` file are updated in the same change,
4. the pull request states the migration or demo impact.

Shared contracts in `src/types.ts` and `public/data/*.json` are frozen once published.