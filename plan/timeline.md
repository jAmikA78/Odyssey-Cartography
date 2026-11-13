# Timeline

Last updated: 2026-11-13

All times are **Africa/Cairo**. The event starts Friday at 13:00 and the final submission is due before Saturday 13:00.

## Schedule

| Time | Focus | Owners | Checkpoint | Status |
| --- | --- | --- | --- | --- |
| Fri 13:00–14:00 | Kickoff, repo setup, contract freeze | All | Shared decisions confirmed | done |
| Fri 14:00–16:00 | Scaffold, deploy blank site, start data export | A, D | Blank deploy live by 16:00 | done |
| Fri 16:00–18:00 | CRS spike, grid prototype, UI shell | B, D, C, E | Local registration plan documented | done |
| Fri 18:00–20:00 | Offline pack extraction and verification | D | Checksums pass; metadata documented | done |
| Fri 20:00–22:00 | 3D terrain and three surfaces | B, A | Terrain renders and surfaces switch | done |
| Fri 22:00–00:00 | A* route and safety panel | E, A, C | Route and stats appear | done |
| Sat 00:00–02:00 | Waypoint cards, blocked example, caveats | C, A | Route end-to-end with caveats | done |
| Sat 02:00–04:00 | Responsive layout and local source review | C, D, A | 390 px layout and sources pass | done locally |
| Sat 04:00–06:00 | Rest rotation and async fixes | Split team | At least four hours of sleep per person | in progress |
| Sat 06:00–08:00 | Full-flow QA, offline build, Pages-base check | All | Acceptance checks pass | pending |
| Sat 08:00–09:00 | Fix release blockers only | A, E, B | Release candidate passes | pending |
| Sat 09:00–10:00 | Merge, deploy, and freeze | A | Live Pages URL shows the demo | pending |
| Sat 10:00–12:00 | Demo rehearsal, fallback video, submission form | All | Submission package complete | pending |
| Sat 12:00–13:00 | Final checks and submit | A | Submitted before 13:00 | pending |

## Actual Progress

The offline 3D demo, route planner, safety panel, waypoints, responsive layout, and local sources are implemented and verified locally. Remaining work is documentation reconciliation, final QA, merge/deploy, and submission evidence. The implementation finished ahead of the original feature deadline; the public site still follows `main` until the branch is merged.

## Freeze Rules

After Saturday 10:00 Africa/Cairo:

- No new features.
- No data or contract changes.
- Only fixes for release blockers are allowed, and they must be re-verified with both builds.
- The live URL, demo script, fallback video, and submission text are frozen before 12:00.

## Submission Rules

- Submit before Saturday 13:00 Africa/Cairo.
- Verify the public URL in a fresh browser session.
- Keep the fallback demo video ready in case the live site or WebGL fails.
- Include the required AI-use disclosure and data attributions.
- Do not claim the boxwork location is verified or the route is mission-approved.

## Milestones

| Milestone | Target | Status |
| --- | --- | --- |
| Blank public deploy | Fri 16:00 | done |
| Offline terrain pack | Fri 20:00 | done |
| 3D terrain and surfaces | Fri 22:00 | done |
| Route and safety end-to-end | Sat 02:00 | done |
| Responsive and sources QA | Sat 04:00 | done locally |
| Release candidate | Sat 09:00 | in progress |
| Live demo from `main` | Sat 10:00 | pending |
| Submission | Sat 13:00 | pending |