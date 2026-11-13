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
