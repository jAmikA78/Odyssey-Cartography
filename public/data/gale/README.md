# Gale 3D offline starter
Prepared 13 November 2026. A compact data-and-code starter for one 4.74 x 4.74 km patch near northwest Mount Sharp, Gale Crater. Not all of Gale. Not a finished project, certified navigation tool, or complete scientific description of the area.

## شغله بسرعة
1. فك الـ ZIP كله في فولدر.
2. افتح Terminal في الفولدر اللي فيه index.html.
3. شغل `python -m http.server 8000` (أو `python3 -m http.server 8000`).
4. افتح http://localhost:8000 في Chrome / Edge / Firefox وWebGL يكون شغال.
5. مفيش CDN ولا تحميل داتا من النت. اسحب بالماوس تلف، wheel للـ zoom، right-drag للـ pan.
6. اختار CTX / Hillshade / Slope. الـ exaggeration بيكبر الارتفاع للعرض بس، مش بيغير الداتا.

## What's included
- `index.html`, `viewer.js`: working offline Three.js viewer. No build step, package install, API key or account needed. Serve with Python; do not double-click file://.
- `vendor/`: Three.js r128 and OrbitControls, locally vendored, plus MIT license. This fixed older version is selected for a small, self-contained prototype, not a production security recommendation.
- `data/dem_20m.tif`: real 238 x 238 Float32 GeoTIFF. Bilinear resample from USGS/JPL merged Gale DEM, ~19.924 m cells. Source mosaics HRSC, CTX, HiRISE and MOLA; its nominal 1m product spacing DOES NOT mean uniform 1m underlying measurement detail. This pack deliberately uses a smaller grid for weak internet and fast 3D.
- `data/texture_ctx.jpg`: real grayscale CTX mosaic from nine verified NASA Mars Trek zoom-12 tiles, cropped exactly to the DEM footprint. 466 x 466 pixels (~10.2m display spacing), JPEG to save bandwidth. This is visual imagery, not elevation. Imagery/DEM dates and registration may differ; coextensive bounds do not guarantee subpixel alignment.
- `data/slope_deg.tif`: Float32 slope in degrees from numeric DEM derivatives in meters. Terrain slope only, not obstacle or astronaut hazard detection.
- `data/hillshade.tif`: Float32 0-1 synthetic illumination computed from DEM; azimuth 315 degrees clockwise from north, sun altitude 45 degrees. NOT a photo or current sunlight prediction.
- `data/hillshade.png`: 8-bit display version.
- `data/slope_preview.png`: illustrative color ramp. Green is low slope; orange/red is higher slope, clamped at 45 degrees. NOT safe/unsafe classes.
- `data/elevation.f32`, `data/slope.f32`: exact little-endian Float32 rasters for browser use, 238 x 238 values each. Same cells as GeoTIFF. Rows north-to-south, columns west-to-east. Use `new Float32Array(await response.arrayBuffer())` on ordinary little-endian browsers.
- `data/geology.geojson`: one intersecting USGS SIM3292 polygon clipped to this exact patch. Unit properties preserved. Source map scale 1:20,000,000; this is broad regional context, not local geological truth or detailed hazards. A tiny patch may contain only one unit; no extra units were invented.
- `data/example_route.geojson`: synthetic polyline and five sample waypoints with elevations and slopes. Not Curiosity's actual route, not an optimal path, and NOT verified safe. The viewer interpolates between the waypoint cells and drapes its line on the DEM.
- `data/metadata.json`: exact bounds, dimensions, cell spacing, full WKT CRS, affine transform, vertical-unit notes, texture source tile URLs and limits.
- `reproduce_dem_subset.py`: extraction recipe from prior starter. Optional; requires internet, rasterio and requests. Do NOT run it just to view this pack. The large remote DEM is not a COG and has no overviews; expanding the crop can transfer lots of data.
- `SOURCES.md`, `checksums.sha256`: credits/provenance and integrity manifest.

## Coordinates and meters
- Longitude: east-positive. Latitude: planetocentric, north-positive.
- Bounds: 137.36000069143637 to 137.44000109967354 E; -4.839992225631115 to -4.759991817393932 N.
- CRS: Mars 2000 equidistant cylindrical, ESRI:103885; radius 3,396,190m, central longitude and standard parallel 0 degrees. The GeoTIFFs preserve this CRS; do not assign Earth EPSG:4326 to the rasters.
- Longitude/latitude in the GeoJSON are Mars angular coordinates for interchange, NOT Earth WGS84. GIS software may assume Earth; explicitly override to a compatible Mars geographic CRS.
- All projected coordinates and elevations are meters. Source DEM is tied to MOLA; heights are relative to Mars areoid, not Earth's sea level. No additional vertical datum transformation was applied.
- `metadata.json` gives pixel-edge bounds and GDAL affine transform. Cell centers are transform(col+0.5,row+0.5). The viewer mesh uses these centers; its horizontal center-to-center span is 4,722.076m, versus 4,742m edge-to-edge raster footprint.
- Viewer origin is the patch center in x/z, with y = DEM elevation minus the patch minimum (-4066.28515625m). x=east, y=up, z=south. Subtracting base height is a display offset, not a change to the stored elevations. Default vertical exaggeration is 1x.
- Do not use Earth's radius, default Leaflet distances, Web Mercator, or Earth scale-bar assumptions for Mars. Compute route distances using the meter grid.

## Start the actual solution
1. Keep this terrain viewer as a working base, or load the TIFF/Float32 arrays into your own framework.
2. Show selected-cell elevation and slope; use row/column lookup, not texture brightness.
3. Implement A* on this grid, with distance and slope penalties. Present thresholds as design assumptions until independently justified. Do not treat this example line as the A* result.
4. Let users toggle regional geology, route and terrain layers. Geology GeoJSON is supplied but is not drawn in this minimal 3D viewer.
5. Keep all route calculations INSIDE this patch. Label any synthetic hazards, destinations, suit limits, radiation values or rock density as demo assumptions. These are not provided by this dataset.
6. Add source credits and a visible limitation panel in your presentation.

## Important limits
This patch is not confirmed to be the boxwork site. It was chosen to reuse a valid, small DEM subset and matching NASA imagery quickly. It is not a package of 'all information' about Mars or the area. We have no verified local radiation, weather, soil bearing strength, rover telemetry, boulder inventory, water certainty, EVA limits or astronaut safety thresholds. Slopes are derived at ~20m grid spacing and can miss small hazards. Merged DEM accuracy and source support vary across the footprint. Narrower features than the grid are not reliable.

## Checks performed
238 x 238 dimensions and no DEM NoData; matching raster footprints; source CTX tiles downloaded successfully; geology clipped to footprint; offline viewer opened through localhost, WebGL rendered with no JS exceptions and no external network requests. Surface selection, exaggeration and route toggle tested. A desktop screenshot was visually inspected. Not a field safety validation.
