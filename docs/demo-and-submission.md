# Demo and Submission

Last updated: 2026-11-14

## Demo Goal

Show, in under three minutes, that Odyssey turns local Mars data into a route and safety decision for a Gale Crater EVA.

The demo must use the public, no-login build and local assets. Do not rely on a live external service.

## Pre-Demo Checklist

- [ ] Public Pages URL loads in a fresh browser session and shows the offline demo, not the scaffold.
- [ ] CTX, hillshade, and slope surfaces switch at the same bounds.
- [ ] The default WP2 → WP5 route renders with distance, time, slope, climb, and descent.
- [ ] The safety panel shows dose, suit-hours, slope, and duration.
- [ ] WP1 demonstrates a blocked start at the 20° limit.
- [ ] Lowering the limit to 10° demonstrates a blocked destination.
- [ ] Sources, caveats, and assumption notes are visible.
- [ ] Mobile 390 px layout has no blocking overflow.
- [ ] Browser console has no critical errors.
- [ ] External requests can fail without breaking the core flow.
- [ ] Backup local build, screenshots, and a fallback video are ready.

## 3-Minute Demo Script

| Time | Action | Narration intent |
| --- | --- | --- |
| 0:00–0:20 | Open Odyssey | “A Mars map is not enough; the crew needs a decision.” |
| 0:20–0:40 | State the challenge and Gale scenario | “We built an offline 3D traverse planner for a Gale Crater patch.” |
| 0:40–1:10 | Switch CTX → hillshade → slope | “Optical context, shaded relief, and slope screening share one registration.” |
| 1:10–1:35 | Load the default WP2 → WP5 route | “The user chooses the mission geometry from local waypoints.” |
| 1:35–2:00 | Show route stats and the 3D line | “A* balances distance and slope; the route climbs about 311 m.” |
| 2:00–2:25 | Show safety panel and warnings | “Time, dose, suit-hours, and slope are evaluated together.” |
| 2:25–2:45 | Try WP1 or lower the slope limit | “The planner blocks a start or destination that breaks the rule.” |
| 2:45–3:00 | Close with limits and impact | “Screening-resolution terrain, illustrative safety, fully offline.” |

Do not claim that the route is safe, optimal, or rover-approved.

## Visual demo controls

1. Open Layers & terrain to switch surfaces or inspect the existing mineral indices.
2. Select Waypoints, select a point, then use Focus point to fly to it. Use Overview to return.
3. Play the route preview, pause, and drag the elevation profile to inspect progress. Explain that the 24-second playback is compressed, not live data.
4. Toggle Orbit for a presentation view. Motion off freezes ambient effects; the system reduced-motion setting is respected.
5. Discover contains the existing helmet view, mission card, gallery, and sources.

## Deck Outline

1. **Title:** Odyssey — Gale Crater Marswalk Planner.
2. **Problem:** A map without survival constraints does not support a traverse decision.
3. **Challenge fit:** Local Mars terrain, route planning, safety screening, visible caveats.
4. **Solution:** 3D terrain + A* + safety panel + waypoint cards.
5. **Data:** Merged Gale DEM, CTX, derived hillshade and slope; local, attributed, offline-safe.
6. **Demo evidence:** Route screenshot, blocked example, safety panel, mobile view.
7. **Limits and next steps:** 20 m screening-resolution, unverified safety assumptions, future calibration and broader coverage.

## 30-Second Video Option

If a video is required or useful:

1. Open the public app.
2. Switch two surfaces.
3. Load or select the default route.
4. Show one safety warning or blocked example.
5. Show the caveat and source panel.
6. End on the public URL.

Keep the video free of music or media the team does not have rights to use.

## Submission Checklist

- [ ] Public app URL opens without login and shows the merged offline demo.
- [ ] Deck file is exported and accessible.
- [ ] Video file or link is accessible, if required.
- [ ] Repo is public and contains the final source.
- [ ] README quickstart matches the final build.
- [ ] Data sources and attribution are visible.
- [ ] AI-use disclosure is included where required.
- [ ] No under-18 names, images, or voices.
- [ ] No secrets, private links, or personal data.
- [ ] Challenge wording and deadline are verified.
- [ ] The boxwork location is described as unverified.
- [ ] Submission is confirmed before Saturday 13:00 Africa/Cairo.

## AI Disclosure

Use the event's required wording if provided. Otherwise, a clear statement is:

> AI tools were used for research, planning, documentation, and code assistance. The team verified the data sources, calculations, and final claims, and remains responsible for the submission.

Do not claim that AI generated verified scientific results.

## Final Verification

- Open the public URL on a phone-sized viewport and a desktop viewport.
- Disable network access after the page loads and confirm the core terrain and route still work.
- Re-read the safety panel for operational overclaims.
- Re-check the route numbers, AOI bounds, and credits.
- Confirm the submission link is the frozen deploy, not a local preview.
- Confirm the live site is built from `main` after the feature branch is merged.

## Known Gaps

- The original MOLA/THEMIS overlay stack is deferred.
- POV gallery, printable mission card, regional geology, CRISM indices, and helmet view are present locally; verify the deployed version separately.
- The radiation baseline is unverified.
- The boxwork location is unverified.
- The public site shows the demo only after merge and deploy.

These gaps must be stated in the submission, not hidden.