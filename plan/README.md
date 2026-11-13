# Odyssey Execution Plan

Last updated: 2026-11-13

This directory is the execution source of truth for the Odyssey hackathon build. Research evidence lives in `docs/`; public-facing claims live in `README.md`.

## Current Status

- Research, solution definition, and documentation: complete.
- Application scaffold: complete; blank site publicly deployed at <https://jamika78.github.io/Odyssey-Cartography/>.
- Data pipeline: not started.
- Public demo: blank deploy live; full feature demo not implemented.
- Feature freeze: Saturday 10:00 Africa/Cairo.
- Final submission: before Saturday 13:00 Africa/Cairo.

## Locked Decisions

| Decision | Value |
| --- | --- |
| Event | NASA Space Apps Cairo 2026 |
| Challenge | "Interplanetary Survival Guide: Martian Map" |
| Product | Odyssey — Gale Crater Marswalk Planner |
| Team | 5 workstreams: A–E |
| Stack | Vite + React + TypeScript + Leaflet |
| Hosting | Static GitHub Pages under `/Odyssey-Cartography/` |
| Runtime | No backend; critical assets local |
| AOI | Illustrative Gale boxwork near 4.95°S, 137.45°E |
| AOI size | Approximately 20 km square |
| Grid | 256×256, row-major |
| Routing | A* on slope/hazard grid |
| Maximum slope | 20° |
| Feature freeze | Saturday 10:00 Africa/Cairo |
| Submission | Before Saturday 13:00 Africa/Cairo |

## Team and Ownership

| Slot | Role | Owner |
| --- | --- | --- |
| A | Integration, routing integration, deploy, merges, demo | Ahmed |
| B | Map, layers, coordinate conversion, map interactions | TBD |
| C | Panels, POV, mission card, responsive UI | TBD |
| D | Data acquisition, preprocessing, POV assets, credits | TBD |
| E | A*, hazard, safety logic, tests, content accuracy | TBD |

Project lead and submission owner: the team lead. Only A merges to `main`.

## Goals

- Deliver a working, public, no-login Mars traverse planner.
- Show at least three Mars layers registered to the same AOI.
- Compute a terrain-aware route and explain its safety trade-offs.
- Ground the experience in Gale Crater with MSL/Curiosity POV imagery.
- Produce a clear demo and submission package within the event deadline.

## Non-Goals

- Real mission planning or safety certification.
- Meter-scale obstacle detection from MOLA.
- Live Mars weather or radiation prediction.
- Multi-user accounts, backend services, or persistent storage.
- Full Gale Crater coverage or global Mars routing.

## Checkpoints

| Checkpoint | Target | Pass condition |
| --- | --- | --- |
| Blank deploy | Friday 16:00 | Public Pages URL loads |
| Map plus layers | Friday 22:00 | Three layers toggle at correct bounds |
| Route end-to-end | Saturday 02:00 | Start/end selection produces route and stats |
| Full flow | Saturday 06:00 | Route, safety, POV, mission card work together |
| Release candidate | Saturday 09:00 | Acceptance checks pass; build is clean |
| Feature freeze | Saturday 10:00 | No feature changes after this point |
| Submission | Saturday 13:00 | Form and links verified before deadline |

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

## Change Control

A locked decision changes only when:

1. the user or A approves the change,
2. the affected owner agrees,
3. `plan/README.md`, `plan/architecture.md`, and any affected `docs/` file are updated in the same change,
4. the pull request states the migration or demo impact.

Shared contracts in `src/types.ts` and `public/data/*.json` are frozen once published.
