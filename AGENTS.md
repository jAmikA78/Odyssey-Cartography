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
- Stack: Vite + React + TypeScript + Leaflet.
- Hosting: static GitHub Pages under `/Odyssey-Cartography/`.
- Runtime: no backend; critical assets served locally.
- Initial AOI: illustrative Gale boxwork near 4.95°S, 137.45°E, approximately 20 km square.
- Grid: 256×256, row-major arrays.
- Routing: A* on a slope/hazard grid with a 20° maximum traversable slope.
- Feature freeze: Saturday 10:00 Africa/Cairo.
- Final submission: before Saturday 13:00 Africa/Cairo.

## Expected Commands

The app scaffold does not exist yet. Once it does, these are the expected commands:

```bash
npm install
npm run dev
npm run build
npm run preview
python3 scripts/preprocess.py
```

Before merging implementation work:

```bash
npm run build
```

Run the project test command if one is defined. Do not invent a test command that does not exist.

## Repository Layout

```text
README.md                 Public project overview
AGENTS.md                 This file
plan/                     Execution plan and decisions
docs/                     Research, data, safety, and submission evidence
src/                      React application (planned)
scripts/preprocess.py     Data preparation (planned)
public/data/              Runtime JSON contracts (planned)
public/layers/            Local map layer images (planned)
public/pov/               Local POV images (planned)
.github/workflows/        GitHub Pages deployment (planned)
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

- TypeScript strict mode; avoid `any`. If `any` is unavoidable, isolate it at a boundary and justify it.
- Keep A*, hazard, safety, and coordinate logic in pure functions under `src/lib/`.
- Use React state only; do not add a state-management library without approval.
- Use plain CSS or the project's established styling approach; do not add a UI framework without approval.
- Do not add dependencies without approval. Prefer the browser, Leaflet, and existing utilities.
- Keep comments focused on non-obvious science, math, or data assumptions.
- Do not leave dead code, debug panels, console noise, or placeholder claims in a merge candidate.
- Prefer small, reviewable commits with a clear scope.

## Map and Coordinate Rules

- Use Leaflet `L.CRS.EPSG4326` with local image overlays for the Mars map.
- Do not use Web Mercator (`L.CRS.EPSG3857`) for Mars data.
- All layers must share the same AOI bounds and registration.
- Keep latitude/longitude ↔ pixel ↔ grid conversion in `src/lib/geo.ts`.
- Keep route output in grid/pixel coordinates and convert at the UI boundary.
- The map must not depend on external tile servers during the demo.
- If local tiles are used instead of image overlays, document the CRS choice and test it before integration.

## Data and Scientific Integrity

- Never invent data, coordinates, image credits, or live readings.
- Label MOLA-derived terrain as screening-resolution. Do not claim meter-scale obstacle detection.
- Do not use Perseverance imagery for Gale Crater. Use MSL/Curiosity for Gale.
- Do not treat NASA Worldview as a Mars data source.
- NOAA Kp is space-weather context, not a direct Mars surface radiation dose predictor.
- Thermal layers are context unless a calibration source is documented.
- Every displayed number must have a source and an assumption note.
- Mark unverified values clearly. If a value is illustrative, say so in the UI and docs.
- Do not present the product as operational, safety-certified, or mission-approved.

## Runtime and Failure Rules

- The demo must work with cached/local map layers, grid data, waypoints, POV images, and safety assumptions.
- External fetches are optional enhancements only.
- If an external fetch fails, show a neutral fallback state; do not break the map or routing.
- Keep the initial route computation under one second on a typical laptop.
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
  - work at desktop and 390 px mobile width,
  - include source/attribution updates for new data,
  - keep `README.md`, `plan/`, and `docs/` consistent with the change.

## Definition of Done

An implementation task is done only when:

- the feature works end-to-end in the browser,
- the production build passes,
- the route and safety outputs match the documented contracts,
- sources and caveats are visible where required,
- no critical console errors remain,
- the owning plan/task status is updated,
- and A has reviewed the integration impact.

## Documentation Rules

- `README.md` is public-facing and must not claim a working feature or live demo before it exists.
- `plan/` is the execution source of truth.
- `docs/` is the research and evidence source of truth.
- Use the same roles, dates, AOI, thresholds, and terminology across files.
- Link instead of duplicating detailed tables when possible.
- Mark unresolved items as `TBD`, `unverified`, or `planned`; do not present assumptions as facts.

## When Unsure

Ask the user or the relevant workstream owner. Do not guess a scientific value, invent an endpoint, fabricate an image credit, or quietly expand scope.
