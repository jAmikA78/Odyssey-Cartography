# Sources and credits
Checked 13 November 2026. Source URLs are provenance, not instructions to download huge full mosaics.

## Elevation
Calef III, F.J. and Parker, T., 2016. MSL Gale Merged DEM, JPL-Caltech / NASA / USGS Astrogeology / University of Arizona.
Official metadata read during this build:
https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m
Numeric source used for prior extraction, preserved here:
https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif
The included 20m TIFF was reused from the previously delivered Gale offline starter, not redownloaded as a 3.87 GB file. Metadata confirms HRSC/CTX/HiRISE/MOLA blend and varying underlying coverage. Source product is a 1m grid, not uniformly 1m precision.

## Texture
NASA Solar System Treks / SSERVI / JPL, Gale CTX block-adjusted equirectangular mosaic. Nine PNG tiles downloaded live during this build, stitched and cropped, then JPEG encoded. All exact tile URLs and original byte sizes are in data/metadata.json under texture.sources. Example successfully downloaded source tile:
https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/default/default028mm/12/2156/7222.png
Capabilities / API links preserved from prior source pack:
https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml
https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars

## Visor detail texture
The first-person visor uses a separate 932 × 932 pixel grayscale CTX crop of the same geographic bounds (~5.1 m display spacing). It is assembled from nine level-12 tiles (rows 2156–2158, columns 7221–7223) of the Caltech Murray Lab Global CTX Mosaic V01, served by Esri's OnMars/CTX1 MapServer. Source: https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX1/MapServer . Credit: Esri, Caltech Murray Lab, NASA, JPL, MSSS. `rebuild_ctx_detail.ps1` records the exact URL pattern and geographic crop. The mosaic is a different registration from the Mars Trek Gale layer; it is for visual context in the visor, not a new route or mineral-analysis surface. It does not add elevation detail to the 20 m DEM.

## Geology
Tanaka et al., 2014, USGS Scientific Investigations Map 3292, Geologic Map of Mars, 1:20M. Official publication read during this build:
https://pubs.usgs.gov/sim/3292/
Prior extracted GeoJSON was clipped again locally to this exact patch. Original query provenance (large polygon download, not needed to run):
https://astrogeology.usgs.gov/pygeoapi/collections/mars/sim3292_global_geologic_map/units/items?f=json&bbox=137.2,-5.1,137.7,-4.3&limit=50

## Code
Three.js r128 and OrbitControls, MIT license included. Vendored from these successfully downloaded URLs:
https://unpkg.com/three@0.128.0/build/three.min.js
https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js
https://unpkg.com/three@0.128.0/LICENSE
Viewer glue code and synthetic route are prototype examples prepared for this starter pack. They are not NASA mission software.

## Mineral / spectral indices (added in this kit)
NASA/Johns Hopkins APL CRISM instrument on MRO. Map-Projected Targeted Reduced Data Record (MTRDR), observation FRT000058A3 (acquired 2007-04-22, solar longitude 223.9, orbit 3453), summary-product cube frt000058a3_07_sr165j_mtr3.img, 18 m/pixel, PDS Geosciences Node dataset MRO-M-CRISM-5-RDR-MPTARGETED-V1.0. 21 of 60 standard summary parameters extracted for this patch and resampled to the pack grid. Exact product directory (large files; only byte-ranges of selected bands were downloaded):
https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2007/2007_112/frt000058a3/
Summary parameter definitions: Viviano-Beck, C.E. et al., 2014, Revised CRISM spectral parameters and summary products based on the currently detected mineral diversity on Mars, JGR Planets 119(6), doi:10.1002/2014JE004627.
Product discovered and footprint-verified through NASA PDS Orbital Data Explorer (ODE) REST: https://oderest.rsl.wustl.edu/ (bbox query over the patch, 7 MTRDRs intersect; this observation chosen for full footprint coverage at full 18 m resolution). Footprint coverage is not valid-data coverage: at the albedo-corrected registration the strip's valid-data edge leaves 1,592 west/southwest patch cells (2.81%) outside the image; those cells are gap-filled from nearest measured values and marked in data/minerals/minerals_mask.f32 (1 = measured, 0 = filled).
Registration note: the MTRDR label corner was found ~0.68 km off from its own image content (2007-era map control); the layer was co-registered to the Gale CTX mosaic by albedo correlation and the correction is documented in metadata.json. Verify against a second observation before any science claim.
