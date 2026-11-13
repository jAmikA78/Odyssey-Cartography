# Research Notes

Last updated: 2026-11-13

## Purpose

This document records the research that shaped the Odyssey build: what was checked, what was rejected, and what remains uncertain. It is not a data catalog; exact endpoints and attribution live in [data-sources.md](data-sources.md).

## Research Questions

1. Which open Mars datasets can provide terrain, optical, thermal, and geologic context for Gale Crater?
2. Which sources can be cached locally for an offline-safe demo?
3. Which MSL/Curiosity images can provide credible Gale POV context?
4. What radiation, suit, and terrain assumptions are defensible for a hackathon prototype?
5. Which common Mars data mistakes must be avoided?

## Key Findings

### Verified

- **The offline Gale pack is a usable demo foundation.** `gale-3d-offline.zip` contains a 238×238 merged DEM subset, a CTX texture, derived hillshade and slope images, synthetic waypoints, metadata, source notes, and checksums.
- **The pack uses Mars 2000 equidistant cylindrical / equirectangular (ESRI:103885).** The Mars radius is 3,396,190 m; this is not Earth `EPSG:4326` and not Web Mercator.
- **The patch is 4.72 km across cell centers (4.74 km edge-to-edge) with 19.924 m cells.** Elevation ranges from −4066.285 to −3094.734 m; slope ranges from 0.05 to 50.54°.
- **The merged DEM is a 20 m screening product with variable support.** HRSC, CTX, HiRISE, and MOLA contributions vary across the merged product. It is not a uniform 1 m obstacle map.
- **CTX imagery is available through NASA Mars Trek.** The pack contains a local 466×466 CTX texture registered to the same AOI.
- **The source DEM is the MSL Gale Merged DEM (Calef & Parker 2016).** It is distributed through PDS and is the correct high-resolution terrain family for Gale.
- **MOLA hillshade and DEM are available through Mars Trek.** The global MOLA product is about 463 m per pixel at the equator; it is regional screening data, not rover-scale terrain.
- **THEMIS day and night products are available as Mars Trek layers.** They are thermal context, not a calibrated traverse-cost input.
- **USGS publishes a global Mars geology map service.** It is coarse and optional context, not a Gale-specific engineering map.
- **MSL raw images are available through NASA's Mars API.** MSL is the correct mission for Gale Crater. The POV feature is deferred.
- **MSL RAD data are archived in the Planetary Data System.** RAD is the right reference family for radiation context, but the team still needs to select and cite a specific baseline value.
- **NOAA SWPC provides a planetary K-index JSON feed.** Kp is Earth space-weather context; it is not a direct Mars surface dose predictor. It is not fetched by the current demo.
- **NASA Worldview is an Earth-observation tool.** It is not a Mars data source and must not appear in the Mars layer list.
- **Three.js r128 is vendored as classic scripts.** The pack includes `three.min.js` and `OrbitControls.js`; the React app uses an isolated global boundary.

### Needs Verification

- The exact best boxwork AOI inside Gale Crater.
- The final radiation baseline value and its precise citation.
- The runtime terms and attribution requirements for each selected asset.
- Whether the CTX texture is fully registered to the DEM at all edges, beyond the shared bounds check.
- Whether the user-facing distance should include a cell-center approximation note.

### Rejected or Deprioritized

- **Perseverance imagery for Gale Crater.** Perseverance is in Jezero Crater; using its images for Gale would be a factual error.
- **NASA Worldview as a Mars layer.** It is Earth-only.
- **Live Mars weather API as a core dependency.** No verified, no-login, demo-safe service was confirmed. The demo must not depend on one.
- **MOLA as obstacle detection.** The resolution is too coarse for meter-scale claims.
- **The original 20 km / 256×256 MOLA/THEMIS/CTX overlay pipeline.** The pre-baked 4.72 km cell-center patch is faster, offline-safe, and already verified.
- **USGS global geology as a primary layer.** It is coarse and optional.
- **POV imagery and printable mission card in this iteration.** Both were cut to protect the critical path.

## Data Decisions

| Decision | Reason |
| --- | --- |
| Use the pre-baked local pack | Offline-safe, checksummed, and already registered |
| Use Mars equirectangular (ESRI:103885) | Correct CRS for the data and metre-grid distances |
| Use a 238×238 grid | Fast A*, small rasters, appropriate for a 4.72 km cell-center screening patch |
| Use the merged Gale DEM | Higher resolution than MOLA and correct for Gale |
| Derive slope and hillshade locally | Reproducible display and routing products from one DEM |
| Label terrain as 20 m screening-resolution | Prevents false precision and obstacle-detection claims |
| Use Three.js for the 3D view | Vendored, offline-safe, and sufficient for a terrain mesh |
| Keep Leaflet installed but unused | Avoids a second framework and an unnecessary CRS layer |
| Use MSL/Curiosity for any future POV | Correct mission for Gale Crater |
| Treat Kp as context only | Avoids implying a direct Mars radiation model |
| Keep optional layers optional | Protects the deadline and the core demo |

## Scientific Cautions

- The 4.72 km cell-center AOI at 238×238 gives cells of about 19.9 m. That is a planning grid, not a rover navigation map.
- Slope derived from a merged 20 m DEM is a screening product. Local rocks, sand, cliffs, and small craters may be invisible.
- The merged DEM has variable source support; do not imply uniform resolution.
- The CTX texture is visual context. It is not used to infer slope or trafficability.
- Thermal data can show context but does not automatically translate into trafficability or suit risk.
- Radiation estimates based on a daily baseline do not model solar particle events, shielding, or terrain shadowing.
- A route that is “safe” in this prototype is not operationally safe.

## Open Questions

| Question | Why it matters | Owner |
| --- | --- | --- |
| What is the exact boxwork AOI? | Scientific credibility and route meaning | D |
| Which radiation baseline and source will be displayed? | Safety credibility | E |
| Should POV imagery or a mission card be revived? | Challenge completeness | C/D |
| What is the official submission wording and rubric? | Final submission quality | Lead |
| Should the app show a cell-center distance approximation note? | Honesty about route precision | A |

## Decision Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-11-13 | Use Gale Crater and MSL imagery | Correct mission/location pairing |
| 2026-11-13 | Use local image overlays | Offline-safe demo and stable CRS |
| 2026-11-13 | Use A* on a 256×256 grid | Initial plan; superseded by the 238×238 pack |
| 2026-11-13 | Keep geology, Viking, and Kp optional | Protect the critical path |
| 2026-11-13 | Treat all safety output as illustrative | Avoid operational overclaim |
| 2026-11-13 | Adopt the 238×238 offline pack | Verified, compact, and already registered |
| 2026-11-13 | Switch the primary view to Three.js 3D | Direct terrain visualization from the DEM |
| 2026-11-13 | Defer POV imagery and mission card | Protect the critical path and submission deadline |