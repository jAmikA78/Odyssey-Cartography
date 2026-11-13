# Odyssey — Gale Crater Marswalk Planner

**NASA Space Apps Challenge Cairo 2026 — "Interplanetary Survival Guide: Martian Map"**

> **Status:** Research, planning, and documentation are in place. The Vite + React + TypeScript scaffold now builds under the GitHub Pages base path with a placeholder shell. The data pipeline, map layers, routing, safety model, and public demo are not implemented yet.

## What It Is

Odyssey is a browser-based Mars traverse planner for a two-person exploration team in Gale Crater. It combines layered Mars datasets, terrain-aware routing, spacesuit and radiation constraints, and first-person rover imagery so a user can compare routes and understand the trade-offs before committing to an extravehicular activity (EVA).

The initial scenario is an illustrative boxwork field near **4.95°S, 137.45°E**. The location is a working assumption for the hackathon build, not a verified mission landing site.

## Challenge

The NASA Space Apps Cairo 2026 challenge, **"Interplanetary Survival Guide: Martian Map,"** asks teams to build a layered Mars map and survival-planning tool. Our working interpretation of the requirements is:

- Combine at least three Mars datasets in one usable map.
- Help a user understand terrain, hazards, and visual context at a specific location.
- Plan a traverse that accounts for radiation, spacesuit limits, obstacles, and time.
- Present the result clearly enough to support a survival decision.

The official challenge wording and judging rubric should be checked before submission. See [docs/challenge.md](docs/challenge.md) for the requirement mapping.

## Core Features

- **Layered Mars map:** CTX optical imagery, MOLA terrain/hillshade, THEMIS thermal context, and an optional USGS geology layer.
- **Traverse planning:** select a start, end, and optional waypoint; compute a route with A* over a 256×256 terrain and hazard grid.
- **Safety panel:** estimated walk time, radiation dose, suit-hours required, battery reserve, maximum slope, and warning conditions.
- **POV imagery:** MSL/Curiosity images tied to selected waypoints in Gale Crater.
- **Mission card:** a printable summary of the route, waypoints, safety limits, and data sources.
- **Offline-first demo:** critical map and data assets are served locally; external services are optional and must not break the demo.

## Build

- **Stack:** Vite + React + TypeScript + Leaflet.
- **Hosting:** static GitHub Pages under `/Odyssey-Cartography/`.
- **Grid:** 256×256 row-major terrain and hazard arrays.
- **Feature freeze:** Saturday 10:00 Africa/Cairo.
- **Final submission:** before Saturday 13:00 Africa/Cairo.

## Demo

Public demo link: **TBD after the Phase 0 GitHub Pages deploy.**

The demo must open without a login and must not depend on a local development server.

## Development Setup

These commands work with the current scaffold:

```bash
npm install
npm run dev
npm run build
npm run preview
```

The data preprocessing script is still a target; the repository does not yet contain `scripts/preprocess.py`:

```bash
python3 scripts/preprocess.py
```

Expected environment:

- Node.js 22+
- npm 10+
- Python 3.12+
- Python packages: `numpy`, `scipy`, `Pillow`, `requests`
- Additional geospatial packages only if the chosen data export requires them

## Data Sources

| Layer / Use | Source | Notes |
| --- | --- | --- |
| Optical base map | NASA/JPL/MSSS CTX via Mars Trek / ArcGIS | Local export planned; attribute NASA/JPL-Caltech/MSSS |
| Terrain and hillshade | NASA MGS MOLA 463 m | Screening-resolution terrain; not precise rover navigation |
| Thermal context | NASA/JPL/Arizona State University THEMIS day/night | Context layer; not currently used as a calibrated route input |
| Geology (optional) | USGS Astrogeology global Mars geology | Coarse global product; first cut candidate |
| POV imagery | NASA MSL/Curiosity raw images | Gale Crater images only; local copies with credits |
| Radiation reference | MSL RAD PDS data | Baseline estimate; verify before publishing numbers |
| Space-weather context (optional) | NOAA SWPC planetary K index | Earth space-weather context only; not a direct Mars surface dose predictor |

Primary links:

- NASA Space Apps Challenge: <https://www.spaceappschallenge.org/>
- Mars Trek: <https://trek.nasa.gov/mars/>
- MSL/Curiosity: <https://mars.nasa.gov/msl/>
- USGS Astrogeology: <https://astrogeology.usgs.gov/>
- NASA Worldview (Earth only): <https://worldview.earthdata.nasa.gov/>

Detailed endpoints, status, and attribution are tracked in [docs/data-sources.md](docs/data-sources.md).

## Scientific and Safety Limits

- The Gale boxwork AOI is **illustrative** and may change if the data lead verifies a better location.
- MOLA at 463 m per pixel is **screening-resolution** terrain. Odyssey does not claim precise obstacle detection or rover-grade navigation.
- Radiation and suit figures are hackathon estimates. They must be cited, labeled, and treated as illustrative.
- The app is **not operational mission-planning software** and must not be presented as safety-certified.
- NASA Worldview is an Earth-observation tool and is not a Mars data source.
- Perseverance is in Jezero Crater; Gale Crater imagery must come from MSL/Curiosity.

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
| B | Map, layers, coordinate conversion | TBD |
| C | Panels, POV, mission card, responsive UI | TBD |
| D | Data acquisition, preprocessing, credits | TBD |
| E | A*, hazard logic, tests, content accuracy | TBD |

Project lead and submission owner: the team lead.

## AI Disclosure

AI tools were used for research, planning, documentation, and code assistance. The team remains responsible for verifying data, calculations, sources, and all submitted claims. The final submission must include the event's required AI-use disclosure.

## License

MIT License. See [LICENSE](LICENSE).
