# Data Sources

Last updated: 2026-11-14

## Purpose

This document tracks the datasets, endpoints, attribution, and fallback behavior for Odyssey. The runtime demo uses local assets only; endpoints below are for provenance, preprocessing, and verification, not live map dependencies.

Status values: `verified`, `needs verification`, `optional`, `deferred`, `not used`.

## Current Runtime Sources

| Layer / Use | Provider | Access / provenance | Resolution / coverage | Status | Attribution |
| --- | --- | --- | --- | --- | --- |
| Terrain DEM | NASA/JPL-Caltech, MSL Gale Merged DEM (Calef & Parker 2016) via PDS | Local `public/data/gale/data/elevation.f32`; source and subset documented in the pack | 238×238, 19.924 m; 4.72 km across cell centers, 4.74 km edge-to-edge; merged HRSC/CTX/HiRISE/MOLA support varies | verified local file; **20 m screening-resolution** | NASA/JPL-Caltech; Calef & Parker (2016) |
| Slope raster | Derived locally from the DEM | Local `public/data/gale/data/slope.f32`; `atan(hypot(dz/dx, dz/dsouth))`, one-sided edges | 238×238, degrees; 0.05–50.54° | derived | Odyssey, from the merged DEM |
| CTX texture | NASA/JPL-Caltech/MSSS via Mars Trek | Local `public/data/gale/data/texture_ctx.jpg` | 466×466 RGB, same AOI; visual context only | verified local export | NASA/JPL-Caltech/MSSS |
| Visor CTX detail | Caltech Murray Lab Global CTX Mosaic V01 via Esri OnMars/CTX1; source CTX from NASA/JPL-Caltech/MSSS | Local `public/data/gale/data/texture_ctx_detail.jpg`; nine documented source tiles | 932×932, ~5.1 m display spacing, same AOI bounds; visual context only | locally rebuilt from published tiles; separate registration from planning CTX | Esri, Caltech Murray Lab, NASA, JPL, MSSS |
| Hillshade | Derived locally from the DEM | Local `public/data/gale/data/hillshade.png` | 238×238, azimuth 315°, altitude 45° | derived | Odyssey, from the merged DEM |
| Slope preview | Derived locally from the DEM | Local `public/data/gale/data/slope_preview.png` | 238×238, display clamp 0–45° | derived | Odyssey, from the merged DEM |
| Waypoints | Odyssey demo data | Local `public/data/gale/data/example_route.geojson` | Five synthetic points; not rover telemetry | synthetic | Odyssey |
| Safety constants | Odyssey demo assumptions | `public/data/safety.json` | Baseline 0.64 mSv/day, 6 h nominal EVA, 8 h max, 1.2 km/h, 25% suit reserve, 20° slope, 150 mSv budget | **unverified assumptions** | Odyssey; MSL RAD archive linked as context |
| Three.js r128 | Three.js authors | Vendored `public/data/gale/vendor/three.min.js` and `OrbitControls.js` | Local classic scripts | verified local vendor | Three.js MIT |

The runtime does not fetch any of these from the network. The pack's `SOURCES.md` and `checksums.sha256` are the local provenance record.

## Additional integrated local assets

- **CRISM:** 21 MTRDR indices from observation FRT000058A3. The local `minerals.json` and pack `SOURCES.md` document registration, provenance, and the measured/gap-filled mask. These are candidate signatures, not abundances.
- **Geology:** `geology.geojson` contains Htu, “Hesperian transition undivided unit,” from USGS SIM 3292; regional context only. No period is invented when the pack omits it.
- **Curiosity gallery:** local PIA19039, PIA21041, and PIA23137 files under `public/pov/`; existing captions, credits, and NASA Photojournal links remain in `PovGallery.tsx`. Their provenance was not independently revalidated during this visual pass.
- **Presentation:** contours and profile derive from the existing DEM. Cutaway, lighting, waypoint beacons, and route animation add no scientific dataset. No new remote media was introduced.

## Deferred / Not Used Sources

| Layer / Use | Provider | Access | Notes | Status |
| --- | --- | --- | --- | --- |
| MOLA hillshade / DEM | NASA/MGS/MOLA | Mars Trek WMTS and ImageServer | Original 463 m context layer; not in the 20 m demo pack | deferred |
| THEMIS day/night | NASA/JPL/Arizona State University | Mars Trek WMTS | Thermal context only; not a route input | deferred |
| Live USGS map service | USGS Astrogeology | See local pack provenance | Runtime uses the local clipped GeoJSON instead | not fetched |
| MSL/Curiosity images | NASA/JPL-Caltech/MSSS | <https://mars.nasa.gov/rss/api/?feed=raw_images&category=msl&feedtype=json> | Local gallery is implemented; no API fetch at runtime | local cached images |
| MSL RAD archive | NASA/JPL-Caltech | <https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/> | Radiation reference archive; baseline dose rate still needs a specific citation | archived; value needs verification |
| NOAA planetary K index | NOAA SWPC | <https://services.swpc.noaa.gov/json/planetary_k_index_1m.json> | Earth space-weather context only, not a Mars surface dose predictor | deferred |
| Viking context | NASA/USGS | Mars Trek WMTS | Optional historical context | not used |
| NASA Worldview | NASA EOSDIS | <https://worldview.earthdata.nasa.gov/> | Earth only | not used for Mars |

## Local Asset Policy

- All demo assets are local; do not depend on external tile servers at runtime.
- Terrain and derived surfaces live under `public/data/gale/data/`.
- Vendor scripts live under `public/data/gale/vendor/`.
- Safety constants live in `public/data/safety.json`.
- Keep source URLs and attribution alongside each asset in `public/data/gale/SOURCES.md`.
- Do not edit binary rasters or generated images by hand. Regenerate the pack, update metadata and source notes, then refresh `checksums.sha256`.
- Test the production build with network disabled or external requests blocked.

## Preprocessing and Pack

The current demo uses `gale-3d-offline.zip`, which was extracted into `public/data/gale/`. The zip is ignored and must not be committed.

The pack provides:

- a GDAL-compatible `metadata.json` with WKT, PROJ4, affine transform, bounds, dimensions, and source note;
- little-endian float32 `elevation.f32` and `slope.f32`;
- CTX, hillshade, and slope-preview images registered to the same AOI;
- `example_route.geojson` with synthetic waypoints;
- a standalone `index.html` / `viewer.js` reference viewer;
- `reproduce_dem_subset.py`, which documents how the DEM subset was produced;
- `checksums.sha256`.

There is no root `scripts/preprocess.py`. Do not invent one; the pre-baked pack is the runtime source of truth.

Integrity check:

```bash
cd public/data/gale
sha256sum -c checksums.sha256
```

## Layer Registration

All current surfaces share:

- the same AOI bounds: 137.36000069143637–137.44000109967354°E, 4.839992225631115–4.759991817393932°S;
- the same 238×238 grid registration;
- the same UV mapping on the 3D terrain mesh;
- the same Mars equirectangular CRS (ESRI:103885, R=3,396,190 m);
- the same attribution and caveat metadata.

The CTX texture is 466×466 but is mapped to the same bounds; it is not resampled into the 238×238 elevation grid. If a source cannot be registered to the shared AOI, cut it rather than display a misaligned layer.

## Attribution and Usage

- NASA imagery and data are generally public domain, but the team must check the specific product page and credit requirements.
- The merged DEM is credited to NASA/JPL-Caltech and Calef & Parker (2016).
- CTX is credited to NASA/JPL-Caltech/MSSS.
- USGS products are generally public domain; credit the USGS Astrogeology Science Center.
- NOAA SWPC products are generally public domain; credit NOAA SWPC.
- Three.js is MIT licensed; keep its license notice.
- Do not hotlink images in the final app.
- Do not use an image if the location or mission is uncertain.
- Do not use Perseverance imagery for Gale Crater.
- Do not present NASA Worldview as a Mars source.
- Do not present synthetic waypoints or routes as rover telemetry.

This document is not legal advice. Verify terms for every selected asset before submission.

## Fallback Policy

If a source is unavailable or fails registration:

1. Use the cached local export.
2. If no cache exists, use the pre-baked demo pack.
3. If a surface is missing, show a clear error or hide the control rather than showing a broken surface.
4. If the safety config fails, use the documented `DEFAULT_SAFETY` assumptions and note it.
5. If an optional future runtime fetch fails, show “Context unavailable” and keep the map and routing working.
6. Never block the core route on an external service.

## Verification Checklist

- [x] The local pack checksums pass.
- [x] Metadata bounds, 238×238 grid, and cell size match the code and docs.
- [x] Elevation and slope ranges are plausible for the Gale patch.
- [x] CTX, hillshade, and slope surfaces share registration.
- [x] All runtime assets load locally with external requests blocked.
- [x] Attribution appears in the app and source notes.
- [x] The terrain is labeled 20 m screening-resolution, not meter-scale.
- [x] Waypoints and route are labeled synthetic.
- [ ] Radiation baseline has a specific citation.
- [ ] POV images, if added, are confirmed Gale/Curiosity and credited.
- [ ] Thermal and geology layers, if revived, are labeled context only and optional.
- [ ] NOAA Kp, if revived, is labeled Earth space-weather context only.
