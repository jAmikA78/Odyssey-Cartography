import rasterio,math,time
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
u='https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif'
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',GDAL_HTTP_TIMEOUT='20'):
 with rasterio.open(u) as d:
  print('META',d.crs,d.transform,d.overviews(1),d.block_shapes,flush=True)
  k=3396190*math.pi/180
  w=from_bounds(137.36*k,-4.84*k,137.44*k,-4.76*k,d.transform).round_offsets().round_lengths()
  print('WINDOW',w,flush=True)
  a=d.read(1,window=w,out_shape=(238,238),resampling=Resampling.bilinear)
  t=d.window_transform(w)*rasterio.Affine.scale(w.width/238,w.height/238)
  p=d.profile;p.update(width=238,height=238,transform=t,compress='deflate',tiled=False,blockxsize=238,blockysize=1)
  with rasterio.open('./gale_demo_dem_20m.tif','w',**p) as o:o.write(a,1)
  print('OK',a.shape,a.min(),a.max(),flush=True)
