# Tasks

Last updated: 2026-11-13

Status values: `planned`, `in progress`, `blocked`, `done`.

## Workstreams

### A — Integration, Routing Integration, Deploy, Demo

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| A0 | Scaffold Vite + React + TypeScript, set Pages base, add deploy workflow | — | Blank site is publicly deployed | done |
| A1 | Build app shell and shared state | A0 | Map and panel placeholders render | planned |
| A2 | Integrate map, route, and safety flow | B1, C1, E1 | Start/end selection produces a route and stats | planned |
| A3 | Build QA, production preview, and demo rehearsal | A2 | Acceptance checks pass | planned |
| A4 | Final merge and release candidate | A3 | Freeze candidate is deployed | planned |

### B — Map, Layers, Coordinates

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| B0 | Spike Leaflet CRS and local image overlay | A0 | Local image is registered and clicks map to grid | planned |
| B1 | Implement CTX, MOLA, THEMIS overlays and layer control | B0, D1 | Three layers toggle at identical bounds | planned |
| B2 | Add waypoint selection, markers, and route rendering | B1, E1 | User can select points and see the route | planned |
| B3 | Add legend, attribution, and mobile map behavior | B2 | Map works at 390 px and desktop | planned |

### C — Panels, POV, Mission Card

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| C0 | Build responsive app layout and panel shell | A0 | Layout works at desktop and 390 px | planned |
| C1 | Build route and safety panels | E2 | Stats and warnings update with the route | planned |
| C2 | Build POV modal and printable mission card | D2, C1 | POV opens and card prints cleanly | planned |
| C3 | Visual QA and responsive polish | C2 | No overflow, clipped text, or broken controls | planned |

### D — Data and Assets

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| D0 | Export or download CTX, MOLA, THEMIS, and optional geology assets | — | Source assets are cached locally | planned |
| D1 | Build 256×256 grid and local layer images | D0 | JSON and images validate against contracts | planned |
| D2 | Prepare waypoints and at least three Gale POV images | D0 | Assets are local with credits and source URLs | planned |
| D3 | Document attribution, resolution, and fallback behavior | D1, D2 | Credits are visible and fallback is tested | planned |

### E — Logic, Tests, Content

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| E0 | Freeze types and add pure-function test scaffold | A0 | Shared contracts compile and tests run | planned |
| E1 | Implement geo conversion, hazard, and A* | E0, D1 | Route test passes and returns documented stats | planned |
| E2 | Implement safety calculations and warnings | E1 | Dose, suit, slope, and duration warnings work | planned |
| E3 | Verify content, numbers, and source labels | E2 | UI and docs use the same values and caveats | planned |

### S — Submission

| ID | Task | Depends on | Done when | Status |
| --- | --- | --- | --- | --- |
| S0 | Write and rehearse the 3-minute demo | A3 | Demo runs without dead air or failed links | planned |
| S1 | Produce the deck and optional 30-second video | S0 | Files are exported and reviewed | planned |
| S2 | Submit form, links, credits, and AI disclosure | S1 | Submission confirmed before 13:00 | planned |

## Critical Path

```text
A0 -> D0 -> D1 -> E1 -> A2 -> C1 -> C2 -> A3 -> freeze -> submission
          \-> B0 -> B1 -/
```

B and E can proceed in parallel after the scaffold and grid contract exist. D is the data blocker; if D0 slips, the fallback is a pre-baked local dataset with three layers and three waypoints.

## First-Hour Checklist

1. A creates the Vite app and sets `base: '/Odyssey-Cartography/'`.
2. A adds the GitHub Pages workflow and deploys a blank site.
3. E writes `src/types.ts` from `plan/architecture.md`.
4. D starts source downloads and records exact endpoints and formats.
5. B spikes `L.CRS.EPSG4326` with a local test image overlay.
6. C builds the responsive shell with placeholder panels.
7. Everyone confirms they can run the blank site locally.

## Cut Lines

Cut in this order if time is short:

1. Viking layer.
2. USGS geology layer.
3. Live NOAA Kp fetch.
4. Extra POV images beyond three.
5. Mission-card print polish.
6. CTX-derived roughness.
7. Multi-stop route optimization.
8. Advanced mobile polish.

Never cut:

- A* route computation.
- Safety panel and warnings.
- Three working layers.
- Public no-login link.
- Mission card.
- Local/offline fallback.
- Sources and caveats.

## Risks

| Risk | Impact | Mitigation | Owner |
| --- | --- | --- | --- |
| Source export fails or changes | No terrain/layers | Cache early; use pre-baked fallback dataset | D |
| CORS or service outage | Demo breaks | Local assets only; optional fetch has fallback | D/A |
| DEM too coarse for claims | Scientific credibility | Label screening-resolution; avoid obstacle claims | D/E |
| POV image location mismatch | Wrong story | Verify Gale sol/location and credits | D |
| Contract drift | Integration failures | Freeze `src/types.ts`; update plan before changes | A/E |
| GitHub Pages base-path bug | Blank deploy | Test production build under base path early | A |
| Scope creep | Missing deadline | Enforce cut order and freeze | A |
| Fatigue | Late mistakes | Rest rotation; freeze at 10:00 | All |

## Acceptance Criteria

- Public GitHub Pages URL loads without login.
- At least three layers toggle with legend and attribution.
- Start/end selection computes a route in under one second.
- Route stats include distance, duration, max slope, and hazard.
- Safety panel reports dose, suit-hours, and warnings.
- At least three Gale POV images open from waypoints.
- Mission card prints cleanly.
- Desktop and 390 px mobile layouts work.
- `npm run build` passes.
- No critical console errors.
- Sources, caveats, and AI disclosure are visible.
- The demo works with local assets when optional network calls fail.

## Merge Checklist

- [ ] Build passes.
- [ ] Route and safety outputs match the contracts.
- [ ] Sources and credits are updated.
- [ ] `README.md`, `plan/`, and `docs/` remain consistent.
- [ ] Desktop and 390 px checks pass.
- [ ] No secrets, debug panels, or console noise.
- [ ] A reviewed the integration impact.
