# Challenge Interpretation

Last updated: 2026-11-14

## At a Glance

| Item | Value |
| --- | --- |
| Event | NASA Space Apps Cairo 2026 |
| Challenge | "Interplanetary Survival Guide: Martian Map" |
| Product | Odyssey — Gale Crater Marswalk Planner |
| Team | 5 workstreams: A–E |
| Build window | Friday 13:00 to Saturday 13:00 Africa/Cairo |
| Feature freeze | Saturday 10:00 Africa/Cairo |
| Submission | Before Saturday 13:00 Africa/Cairo |
| Public link | Required; no login |

Official event site: <https://www.spaceappschallenge.org/>

The official challenge text and submission instructions must be checked before the final submission. This document records the team's working interpretation, not a replacement for the official wording.

## Working Interpretation

The challenge asks for a Mars survival-planning experience built around a map. A strong response should:

- put Mars datasets on one map,
- connect the map to a specific exploration scenario,
- help the user make a route or safety decision,
- explain the data and its limits clearly.

Odyssey answers with an offline 3D Gale Crater terrain, a terrain-aware traverse planner, a safety panel, and visible caveats. The user selects a start and destination from synthetic waypoints; the app returns a route, time estimate, slope exposure, and safety warnings.

## Requirement Mapping

| Challenge need | Odyssey response | Evidence |
| --- | --- | --- |
| Mars map | Local merged DEM plus CTX texture, hillshade, and slope surfaces | [data-sources.md](data-sources.md) |
| Specific Mars location | Gale northwest Mount Sharp patch, 4.72 km across cell centers near 4.80°S, 137.40°E | [../plan/architecture.md](../plan/architecture.md) |
| Route planning | A* over the 238×238 slope grid, 20° default limit | [../plan/architecture.md](../plan/architecture.md) |
| Survival constraints | Radiation estimate, suit-hours, slope, duration, reserve, dose budget | [safety-model.md](safety-model.md) |
| Obstacle awareness | Slope no-go threshold and slope-weighted cost; screening-resolution disclaimer | [safety-model.md](safety-model.md) |
| Visual context | 3D terrain, CTX optical texture, hillshade, cursor readout, waypoint cards | [../plan/architecture.md](../plan/architecture.md) |
| Clear decision support | Route panel, safety panel, warnings, persistent caveats, local sources | [demo-and-submission.md](demo-and-submission.md) |
| Public demo | Static GitHub Pages, local assets, no login, no backend | [../plan/architecture.md](../plan/architecture.md) |

### Dataset Count

The current local runtime includes the merged DEM, CTX, CRISM spectral indices, and regional USGS geology, plus a Curiosity context gallery. Hillshade, slope, contours, and the elevation profile derive from the DEM; they are not independent observations. The official rubric and dataset qualification remain unverified.

### Deferred Against the Challenge

- MOLA and THEMIS context layers are deferred.
- POV imagery, regional geology, and the printable mission card exist in the integrated baseline.
- Live space-weather context is deferred.

These are documented gaps, not hidden claims.

## Why Gale Crater

Gale Crater is the MSL/Curiosity landing site, which gives the project a credible exploration context and a well-known terrain setting. The challenge's boxwork-style terrain is used as the scenario for route planning.

The demo AOI is **illustrative** and **not verified** as the boxwork field. It is not a verified landing site or an approved traverse. If the data lead identifies a better boxwork field, update the AOI in one place and regenerate the pack and all surfaces.

## Scope

In scope:

- One local AOI in Gale Crater.
- One two-person EVA scenario.
- CTX, hillshade, and slope surfaces at shared registration.
- One route at a time, with start and destination waypoints.
- Safety estimates and warnings.
- Local sources and visible caveats.
- A public static 3D demo.

Out of scope / deferred:

- Global Mars routing.
- Real-time mission operations.
- Meter-scale obstacle detection.
- Solar-particle-event forecasting.
- Operationally verified POV/terrain correspondence.
- User accounts, persistence, or collaboration.
- Claims of safety certification.

## Submission Constraints

- The public link must open without a login.
- Critical assets must work from the static deploy.
- Do not use names, images, or voices of minors.
- Disclose AI assistance as required by the event.
- Check attribution and usage terms for every image and dataset.
- Do not present the product as operational or mission-approved.
- Do not claim the boxwork location is verified.

## Open Questions

- Confirm the exact official challenge wording and judging rubric.
- Confirm whether the rubric requires three independent datasets or three displayed layers.
- Confirm the final submission form fields and deadline.
- Verify the best illustrative boxwork AOI.
- Confirm which POV images are unambiguously from Gale Crater, if POV is revived.
- Verify the radiation baseline with a citable source.