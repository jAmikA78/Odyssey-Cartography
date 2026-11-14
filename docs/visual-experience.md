# Expedition console refresh

Implemented on feature branch `feat/expedition-console` on 2026-11-14 at the user's request. Based on integrated `main` at `c27e8d2`. The first polish pass was committed and pushed; no merge or deployment was performed. A's integration review is still pending.

## Experience

- The terrain is the primary canvas. Plan, Waypoints, and Discover organize the existing tools, while Layers & terrain opens a compact drawer.
- Warm display lighting, a subdued survey grid, and a shaded cutaway give the DEM depth. The cutaway is decorative, not a representation of subsurface strata. CTX tint is a display treatment, not calibrated true color.
- Optional 100 m contours interpolate the existing DEM triangles. They are hidden on slope, geology, and mineral surfaces so scientific colors remain readable.
- Synthetic waypoints use rotating diamond beacons, stems, and expanding rings. Color continues to indicate blocked, start, destination, and selection states. Custom cell endpoints also receive markers.
- The route uses a raised line with a soft halo and moving accents. Its geometry stays piecewise linear through the A* path; no curved shortcut changes the computed corridor.
- Overview, north-up Top view, and Focus point animate the camera. Orbit is opt-in; direct pointer interaction cancels it.
- The elevation profile uses cumulative planar metre-grid distance and raw DEM elevations. The traveller follows the same distance axis. Play, pause, replay, and keyboard/pointer scrubbing are available. A full preview takes 24 seconds, independent of estimated walking time.
- Route changes reset playback. A blocked, missing, or single-cell route cannot start playback. Hidden tabs pause progress. Playing a preview makes the route visible.
- Ambient animation defaults off under `prefers-reduced-motion`; Motion off freezes it. Camera changes become immediate. Explicit route playback remains a separate user-controlled action.
- The helmet view now moves continuously along the computed route instead of teleporting between 20 m cells. Auto-Walk uses a 3 m/s visual pace; pause, manual stepping, and scrubbing remain available. The camera follows with smoothed heading and height.
- The visor progress control now tracks movement continuously. Scrubbing or stepping moves the camera to that location and turns it toward the route; large seeks face forward immediately. Free look remains available while stationary, then eases back toward the route when travel resumes.
- A restrained atmospheric pass adds drifting dust, a soft horizon haze and edge vignette, a small route guide pulse, and subtle walking motion. Reduced-motion mode freezes ambient movement while leaving explicit route controls usable. These are visual effects, not weather or sensor readings.
- The optional visor scan sends a terrain-following visual ring across the scene and briefly marks the next five route cells using measured DEM slope categories. Its report names the peak sampled slope and distance. It is a visualization of local map data, not a live instrument or obstacle detector. Reduced-motion mode skips the expanding ring and shows static markers.
- Reaching the end of the synthetic route displays a destination moment and prompts return-margin review. The 390 px visor layout keeps its layer controls, color key, and rover in view.
- The visor now uses a separate local 932 × 932 CTX crop (~5.1 m display spacing) from Caltech Murray Lab's published mosaic. The planning basemap and CRISM registration still use their original Mars Trek CTX texture. The visor texture adds optical detail only; the terrain shape and route remain based on the 20 m DEM.
- The desktop visor draws a denser, smoothly interpolated display mesh from the same 20 m DEM samples; narrow screens keep the original mesh density. Extra rocks near the route are illustrative scale cues, not mapped obstacles.
- The illustrative scout rover stays roughly 8 m ahead and to the side of the viewer. Its smaller, matte six-wheel body and solar panels read more clearly. The visor names it and can hide it with the Scout rover switch. The printable mission card, Curiosity gallery, CRISM layers, geology, source notes, and safety panels remain available.
- The scout rover now has beveled housings, detailed wheel rims and hubs, suspension rods, solar-cell grids, a two-lens mast camera, matte metal surfaces, wheel-ground slope fitting, and a terrain-following contact shadow. It remains an illustrative model, not a mission rover asset.
- A comparison card computes the three existing route modes under the same slope limit and shows distance, scenario walk time, climb, and maximum slope. Selection activates that route on the terrain. The distance-priority option retains penalties and is not presented as a guaranteed shortest path.

## Inspection corrections

- The walk-back envelope now reads the existing `suitReserve` configuration field, instead of silently falling back to 25% through an absent field. Default results remain unchanged.
- Geology reads the local `unitdesc` property. Missing period metadata is labeled missing instead of invented.
- The legend reflects an active mineral layer. Selecting a base surface clears the mineral layer so the chosen surface is actually shown.
- Waypoint selection uses its own keyboard button, avoiding interactive buttons nested inside a parent button role.
- The normal safety state uses the existing green status style.
- README, architecture, tasks, research, and source notes reconcile previously implemented features that were still marked deferred.

## Validation

- `npm test`: six data-backed regression tests pass. They cover all routing modes, blocked cells and diagonal corner cuts, profile/route distance agreement, missing and same-cell paths, configured walk-back reserves, and default safety outputs.
- `npm run build`: passes.
- `npm run build:offline`: passes. The existing classic-script Vite warnings for vendored Three.js and OrbitControls are expected.
- Browser checks: desktop and 390 px viewport; no horizontal overflow at mobile width; waypoint selection, WP1 blocked start, default route restoration, surface/mineral switching, camera controls, and keyboard profile scrubbing. The rebuilt visor was inspected with the sharper CTX layer, extra rock detail, terrain scan, slope report, arrival card, and mobile controls; Auto-Walk was checked in the prior visor pass.
- Browser console during these checks: no warning or error entries.
- The visor detail image, updated metadata and source notes, and reproduction script are included in the checksum manifest. Existing pack text may differ by CRLF line endings in this Windows checkout.
- No new dependencies, telemetry, or external runtime services. The new source tiles were fetched during asset preparation; runtime fetch call sites remain local asset URLs.

## Limits and follow-up

Public deployment, official event requirements, and scientific calibration were not revalidated. The new CTX crop's published credit was checked; other image attributions were preserved. The terrain still has 20 m screening resolution and the boxwork location remains unverified. This pass does not certify route safety or validate the decorative close-up environment.

Before release, A should review the visual integration, repeat the deployment rehearsal, and verify the public Pages build. A full blocked-network browser run and physical-phone performance profiling remain release checks; local assets and the relative-base build are verified separately.
