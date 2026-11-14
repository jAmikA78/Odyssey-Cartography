# Odyssey — Gale Crater Marswalk Planner

**NASA Space Apps Challenge Cairo 2026 — "Interplanetary Survival Guide: Martian Map"**

> **Status:** The feature branch includes the integrated terrain, minerals, geology, Curiosity gallery, printable mission card, and helmet view. The expedition console adds animated beacons, route playback, elevation scrubbing, camera presets, and a data-backed visor terrain scan. The public deployment has not been verified in this pass.

## What It Is

Odyssey is a browser-based Mars traverse planner for a two-person exploration team in Gale Crater. It combines a local merged DEM, a CTX texture, derived hillshade and slope surfaces, terrain-aware routing, and spacesuit and radiation assumptions so a user can compare a route and understand its trade-offs before an extravehicular activity (EVA).

The demo uses a **4.72 km patch across cell centers** (4.74 km edge-to-edge) in northwest Gale Crater, near **4.80°S, 137.40°E**. The patch is not verified as the challenge's boxwork field; it was chosen to reuse a valid compact DEM subset. It is a working assumption for the hackathon build, not a verified landing site or approved traverse.

## Challenge

The NASA Space Apps Cairo 2026 challenge, **"Interplanetary Survival Guide: Martian Map,"** asks teams to build a layered Mars map and survival-planning tool. Our working interpretation of the requirements is:

- Combine Mars datasets in one usable map.
- Help a user understand terrain, hazards, and visual context at a specific location.
- Plan a traverse that accounts for radiation, spacesuit limits, obstacles, and time.
- Present the result clearly enough to support a survival decision.

The official challenge wording and judging rubric should be checked before submission. See [docs/challenge.md](docs/challenge.md) for the requirement mapping.

## Implemented Features

- **Offline 3D terrain:** 238 × 238 cell DEM at 19.924 m spacing, rendered with vendored Three.js r128. Orbit, zoom, 1–3× vertical exaggeration, north arrow, 500 m scale bar, and cursor readout.
- **Three local surfaces:** CTX texture, derived hillshade (sun azimuth 315°, altitude 45°), and slope preview with a 0–45° display clamp.
- **A* traverse planner:** eight-neighbor search on the slope grid, 20° maximum traversable slope by default, adjustable 10–30° for screening. The route panel reports distance, walk time, maximum and mean slope, climb, descent, path cells, and warnings.
- **Default demo route:** WP2 (row 90, col 90) → WP5 (row 170, col 170), 3.31 km, about 2 h 46 min, maximum slope 13.9°. WP1 (row 65, col 65, 22.2°) demonstrates a blocked start at the 20° limit.
- **Safety screening:** walk time, suit-hours with a 25% reserve, EVA dose, slope limit, EVA duration limits, dose budget, and warnings. All values are demo assumptions.
- **Waypoints:** five synthetic points from a local GeoJSON file, selectable from the 3D scene or from cards. They are not rover telemetry.
- **Sources and caveats:** a persistent demo banner, local source notes, a limitations list, and visible assumption notes.
- **Offline-first:** all terrain, textures, vendor scripts, waypoints, and safety constants are local. The runtime makes no external tile, API, or telemetry requests and needs no login or backend.

**Not implemented / deferred:** the original MOLA/THEMIS overlay stack, the full 20 km AOI pipeline, live NOAA Kp, rover-scale obstacle inventory, and thermal modeling.

### Expedition console

- Sculpted terrain edges, warm display lighting, and optional 100 m DEM contours. The cutaway is decorative, not subsurface geology.
- Pulsing waypoint beacons, moving route accents, and visible markers for custom start/destination cells.
- Overview, north-up top view, focus-on-waypoint, and optional orbit camera modes.
- Distance-based route playback with a scrub-able elevation profile. Playback is a compressed preview, not telemetry.
- Plan, Waypoints, and Discover panels; collapsible terrain/layer tools; responsive mobile layout.
- Reduced-motion preference and a manual Motion switch for ambient effects.
- Existing CRISM indices, regional geology, Curiosity image gallery, printable mission card, and helmet view remain available.
- The helmet view uses a sharper local CTX crop and a detailed illustrative scout rover. The terrain and route still use the 20 m DEM.
- Its camera follows the progress control and looks along the route; subtle dust and haze add atmosphere without changing route or safety data.

See [docs/visual-experience.md](docs/visual-experience.md) for behavior, limits, and validation.

## Build

- **Stack:** Vite + React + TypeScript + Three.js r128 (vendored). Leaflet remains installed but is not used by the offline demo.
- **Hosting:** static GitHub Pages under `/Odyssey-Cartography/`.
- **AOI:** 137.36000069143637–137.44000109967354°E, 4.839992225631115–4.759991817393932°S (planetocentric); 4.72 km across cell centers, 4.74 km edge-to-edge.
- **CRS:** Mars 2000 equidistant cylindrical / equirectangular, ESRI:103885, radius 3,396,190 m, central longitude and standard parallel 0°.
- **Grid:** 238 × 238, row-major, cell centers, north-to-south rows; little-endian float32 rasters plus JSON metadata.
- **Routing:** A* on the slope grid with a 20° maximum traversable slope.
- **Feature freeze:** Saturday 10:00 Africa/Cairo.
- **Final submission:** before Saturday 13:00 Africa/Cairo.

## Demo

Live URL: <https://jamika78.github.io/Odyssey-Cartography/>.

The live site follows `main`. The public deployment was not inspected or changed during this redesign. The demo must open without a login and must not depend on a local development server.

Local offline check:

```bash
npm run build:offline
python3 -m http.server -d dist
```

Then open the printed local URL. `build:offline` uses a relative base so the build works from the `dist/` root.

## Development Setup

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
npm run build:offline
```

The demo uses a pre-baked pack under `public/data/gale/`. The pack contains metadata, float32 elevation and slope rasters, CTX and derived surface images, waypoints, vendor scripts, source notes, a checksum manifest, and a standalone `viewer.js` reference. The root `scripts/preprocess.py` is not implemented; the pack's `reproduce_dem_subset.py` documents how the subset was produced.

Expected environment:

- Node.js 22+
- npm 10+
- Python 3.12+ only for the local static-server check; no Python packages are required for the demo.

## Data Sources

| Layer / Use | Source | Notes |
| --- | --- | --- |
| Terrain | MSL Gale Merged DEM (Calef & Parker 2016, PDS), 20 m resample | Merged HRSC/CTX/HiRISE/MOLA support varies; screening-resolution, not uniform 1 m |
| Optical texture | NASA/JPL-Caltech/MSSS CTX via Mars Trek | Local 466 × 466 texture; visual context only |
| Hillshade and slope | Derived from the local DEM | Display products; not independent observations |
| Waypoints and example line | Synthetic local GeoJSON | Not Curiosity telemetry and not a safe/optimal route |
| Safety constants | Demo assumptions in `public/data/safety.json` | Unverified baseline dose and scenario limits |
| Mineral context | CRISM FRT000058A3 MTRDR, 21 indices | Candidate signatures; gap-filled cells flagged |
| Regional geology | USGS SIM 3292 | Coarse context, not local hazards |
| Surface context | Three local Curiosity/Mastcam images | Credits and source links in gallery |
| Deferred sources | MOLA 463 m, THEMIS, NOAA Kp | Not used by the current runtime |

Primary links:

- NASA Space Apps Challenge: <https://www.spaceappschallenge.org/>
- Mars Trek: <https://trek.nasa.gov/mars/>
- MSL/Curiosity: <https://mars.nasa.gov/msl/>
- USGS Astrogeology: <https://astrogeology.usgs.gov/>
- NASA Worldview (Earth only): <https://worldview.earthdata.nasa.gov/>

Detailed endpoints, attribution, and status are tracked in [docs/data-sources.md](docs/data-sources.md). Local pack provenance is in [public/data/gale/SOURCES.md](public/data/gale/SOURCES.md).

## Scientific and Safety Limits

- The Gale patch is **not verified** as the boxwork location.
- The merged DEM is a **20 m screening grid** with variable source support. Odyssey does not claim meter-scale obstacle detection or rover-grade navigation.
- The waypoints and route are **synthetic demo data**, not rover telemetry.
- Radiation, walk speed, suit, EVA, and dose-budget values are **unverified scenario assumptions**. A green safety state is not a safety certification.
- The app is **not operational mission-planning software** and must not be presented as safety-certified or mission-approved.
- NASA Worldview is an Earth-observation tool and is not a Mars data source.
- Perseverance is in Jezero Crater; any future Gale imagery must come from MSL/Curiosity.

## Project Documentation

- [plan/README.md](plan/README.md) — locked decisions, status, and execution index
- [plan/architecture.md](plan/architecture.md) — system design, data flow, and contracts
- [plan/tasks.md](plan/tasks.md) — workstreams, dependencies, and acceptance criteria
- [plan/timeline.md](plan/timeline.md) — Cairo-time schedule and checkpoints
- [docs/README.md](docs/README.md) — documentation index
- [docs/challenge.md](docs/challenge.md) — challenge interpretation and requirement mapping
- [docs/research.md](docs/research.md) — verified findings and open questions
- [docs/data-sources.md](docs/data-sources.md) — endpoints, attribution, and fallback policy
- [docs/safety-model.md](docs/safety-model.md) — radiation, suit, terrain, and warning assumptions
- [docs/demo-and-submission.md](docs/demo-and-submission.md) — demo script and submission checklist
- [AGENTS.md](AGENTS.md) — rules for AI coding agents

## Team

| Slot | Role | Owner |
| --- | --- | --- |
| A | Integration, routing, demo, merges | Ahmed |
| B | Map, terrain, coordinate conversion | TBD |
| C | Panels, responsive UI | TBD |
| D | Data acquisition, preprocessing, credits | TBD |
| E | A*, hazard logic, tests, content accuracy | TBD |

Project lead and submission owner: the team lead.

## AI Disclosure

AI tools were used for research, planning, documentation, and code assistance. The team remains responsible for verifying data, calculations, sources, and all submitted claims. The final submission must include the event's required AI-use disclosure.

## License

MIT License. See [LICENSE](LICENSE).
