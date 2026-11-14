# Documentation Index

Last updated: 2026-11-14

This directory is the research and evidence source of truth for Odyssey. It records what was verified, what is assumed, and what must not be claimed.

## Documents

| Document | Purpose | Status |
| --- | --- | --- |
| [challenge.md](challenge.md) | Challenge interpretation and requirement mapping | Current |
| [research.md](research.md) | Research findings, verified endpoints, corrections, and open questions | Current |
| [data-sources.md](data-sources.md) | Source table, attribution, offline pack, and fallback policy | Current |
| [safety-model.md](safety-model.md) | Radiation, suit, terrain, and warning assumptions | Current |
| [demo-and-submission.md](demo-and-submission.md) | Demo script, deck outline, and submission checklist | Current |
| [visual-experience.md](visual-experience.md) | Local expedition-console changes, verification, and remaining review | Current |

## Current Demo Evidence

- Offline pack: `public/data/gale/`; checksums verified.
- AOI: 4.72 km across cell centers (4.74 km edge-to-edge), 238×238 cells, 19.924 m cells.
- CRS: Mars equirectangular, ESRI:103885, R=3,396,190 m.
- Surfaces: CTX, hillshade, and slope at shared registration.
- Default route: WP2 → WP5, 3.311 km, 2.76 h, maximum slope 13.87°.
- Blocked example: WP1, 22.19° at the 20° limit.
- Runtime: no external requests, no backend, no login.
- Public site: follows `main`; shows the demo only after merge and deploy.

## Evidence Rules

- `verified` means the endpoint or fact was checked during research or local verification.
- `needs verification` means the item is plausible but not confirmed for the final build.
- `unverified` means it must not appear as a factual claim in the UI or submission.
- `deferred` means it is not in the current runtime.
- Every displayed number needs a source and an assumption note.
- If a value is illustrative, say so in the UI and in this directory.

## Source Hierarchy

1. Official NASA, USGS, NOAA, and event documentation.
2. Mission project pages and PDS archives.
3. Peer-reviewed or official explanatory material.
4. Team assumptions, clearly labeled as assumptions.

Do not use a secondary blog as the only source for a scientific claim.

## Public Repository Note

This repository is public. Do not add secrets, private credentials, personal data, or names/images/voices of minors. Check attribution and usage terms for every external asset.

## Local Pack Note

The runtime terrain pack is pre-baked. Do not edit binary rasters or generated surfaces by hand. Regenerate the pack, update `public/data/gale/SOURCES.md` and `metadata.json`, then refresh `checksums.sha256`. See [data-sources.md](data-sources.md) for the full policy.
