# Safety Model

Last updated: 2026-11-13

## Purpose and Scope

This document defines the illustrative safety calculations used by Odyssey. The model is a hackathon decision-support demo, not a mission planning or safety-certification tool.

It answers four questions:

- Can the team walk the route within the EVA time limit?
- Does the route exceed the maximum slope?
- Does the estimated radiation dose exceed the scenario budget?
- Does the route fit within the suit's rated duration and reserve?

## Non-Claims

Odyssey does not model:

- solar particle events or storm shelters,
- spacesuit shielding or vehicle shielding,
- terrain shadowing or regolith shielding,
- medical risk, acute radiation syndrome, or crew-specific limits,
- thermal stress, dust exposure, or life-support consumables,
- rover-scale obstacles or trafficability,
- real-time Mars weather.

Do not describe the output as operational, safety-certified, or mission-approved. A green state is not a safety certification.

## Inputs and Assumptions

| Input | Value | Type | Use in the demo |
| --- | --- | --- | --- |
| Baseline dose rate | 0.64 mSv/day | **Unverified assumption** | EVA dose estimate; needs a specific citation |
| Nominal EVA duration | 6 h | Scenario assumption | Caution threshold |
| Maximum EVA duration | 8 h | Scenario assumption | Hard route limit |
| Walking speed | 1.2 km/h | Scenario assumption | Conservative suited traverse estimate |
| Suit reserve | 25% | Scenario assumption | Applied to walking time |
| Maximum slope | 20° | Locked project rule | No-go above threshold; UI can test 10–30° |
| Dose budget | 150 mSv | Scenario placeholder | Block threshold; not a per-EVA limit |

These values live in `public/data/safety.json` and are shown with their assumption notes in the UI. The UI falls back to the same documented `DEFAULT_SAFETY` values if the JSON cannot be loaded.

## Formulas

```text
walkHours = distanceKm / walkSpeedKmH

requiredSuitHours = walkHours × (1 + suitReserve)

dose_mSv = baselineDoseRatePerDay × (walkHours / 24)

blocked =
  route not found
  OR maxSlope > maxSlopeDeg
  OR walkHours > maxEvaHours
  OR requiredSuitHours > maxEvaHours
  OR dose_mSv > doseBudgetMsV

caution =
  walkHours > nominalEvaHours
  OR requiredSuitHours > nominalEvaHours
```

The implementation evaluates every condition and reports all applicable warnings. Any block condition overrides a caution condition.

### Route Cost

The A* cost is separate from the safety gate:

```text
stepCost = stepMeters × (1 + 4 × (cellSlopeDeg / maxSlopeDeg)²)
```

- `stepMeters` is about 19.924 m orthogonally and 28.18 m diagonally.
- Cells with slope greater than `maxSlopeDeg` are no-go.
- A start or destination on a no-go cell returns a blocked result with a specific reason.
- Diagonal moves are rejected when either orthogonal neighbor is no-go.
- The heuristic is Euclidean grid distance to the goal in metres.

The 150 mSv figure is a **mission-level placeholder**, not a scientifically derived per-EVA limit. At the baseline rate, a single EVA will usually be far below it. The demo presents the EVA dose as an informational estimate and must not imply that a low value proves operational safety. The block condition remains for future scenarios that model cumulative or event-driven exposure.

## Current Demo Result

For the default WP2 → WP5 route:

| Measure | Value |
| --- | --- |
| Distance | 3.311 km |
| Walk time at 1.2 km/h | 2.76 h |
| Required suit-hours | 3.45 h (3 h 27 min) |
| EVA dose at 0.64 mSv/day | 0.074 mSv |
| Maximum slope | 13.87° |
| Mean slope | 7.02° |
| Status | normal within the demo thresholds |

These are outputs from synthetic waypoints and unverified assumptions, not a mission assessment.

## Thresholds and Warnings

| Condition | UI state | Message |
| --- | --- | --- |
| No route found | Blocked | “No traversable route found at the current slope limit.” |
| Start is no-go | Blocked | “Start is no-go: slope X° exceeds the 20° limit.” |
| Destination is no-go | Blocked | “Destination is no-go: slope X° exceeds the 20° limit.” |
| Max slope > 20° | Blocked | “Route exceeds the 20° traversable-slope limit.” |
| Walk time > 8 h | Blocked | “Route exceeds the maximum EVA duration.” |
| Required suit-hours > 8 h | Blocked | “Route exceeds the suit duration limit.” |
| Dose > 150 mSv | Blocked | “Estimated dose exceeds the scenario budget.” |
| Walk time > 6 h | Caution | “Route exceeds the nominal EVA duration; review reserves.” |
| Required suit-hours > 6 h | Caution | “Suit reserve is tight; shorten the route if possible.” |
| Route crosses cells > 15° | Warning | “Route crosses cells above 15°; treat this as slope screening, not trafficability.” |
| More than 25% of route > 15° | Warning | “More than 25% of the route is on near-limit slopes.” |
| Dose within budget | Normal | Show the estimate with the source and assumption notes. |

The UI must show the numbers and the caveat together.

## Space-Weather Context

NOAA Kp is **not fetched by the current demo**. If it is added later, it may be shown only as optional Earth space-weather context. It is not a direct Mars surface radiation dose predictor and must not change the dose calculation unless a validated Mars transfer model is added and documented.

If an optional fetch fails, show “Space-weather context unavailable” and keep the route usable.

## Thermal Context

THEMIS day/night layers are not in the current demo. If they are revived, they are context only. Do not use them as a calibrated thermal-risk input unless the team documents a source, calibration, and threshold. The route cost uses slope, not thermal brightness.

## Data and Model Integrity

- Keep safety constants in one JSON file: `public/data/safety.json`.
- Display the source/assumption next to each number.
- Do not silently change a threshold; update this document and `plan/architecture.md`.
- If a value is uncertain, label it `unverified` in the UI or omit it.
- Test the model with at least one feasible route and one blocked route.
- Do not present a blocked route as successful.

## Sources

- MSL RAD archive: <https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/>
- NOAA SWPC planetary K index: <https://services.swpc.noaa.gov/json/planetary_k_index_1m.json>
- Dataset details and attribution: [data-sources.md](data-sources.md)

The baseline dose rate still needs a specific citation selected from the RAD archive or an official NASA radiation reference before submission.

## Verification Checklist

- [ ] Baseline dose rate has a specific citation.
- [x] All constants match `public/data/safety.json`.
- [x] Warning thresholds match this document.
- [x] The UI distinguishes estimate, caution, and blocked states.
- [x] A blocked route cannot be presented as successful.
- [x] The disclaimer is visible in the caveat banner and safety panel.
- [x] No text claims operational safety.
- [x] A feasible route and a blocked route were both tested.
- [ ] NOAA Kp is labeled context only, if it is added later.