param(
  [string]$PackRoot = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$metadata = Get-Content -LiteralPath (Join-Path $PackRoot 'data/metadata.json') -Raw | ConvertFrom-Json
$west, $south, $east, $north = $metadata.bounds_lonlat_deg
$level = 12
$resolution = 8.58306884765625E-05
$tileSize = 512
$tileSpan = $resolution * $tileSize
$firstCol = [int][math]::Floor(($west + 180) / $tileSpan)
$lastCol = [int][math]::Floor(($east + 180) / $tileSpan)
$firstRow = [int][math]::Floor((90 - $north) / $tileSpan)
$lastRow = [int][math]::Floor((90 - $south) / $tileSpan)
$columns = $lastCol - $firstCol + 1
$rows = $lastRow - $firstRow + 1
$mosaic = [System.Drawing.Bitmap]::new($columns * $tileSize, $rows * $tileSize)
$graphics = [System.Drawing.Graphics]::FromImage($mosaic)
$sources = @()

try {
  for ($row = $firstRow; $row -le $lastRow; $row++) {
    for ($col = $firstCol; $col -le $lastCol; $col++) {
      $url = "https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX1/MapServer/tile/$level/$row/$col"
      $tilePath = Join-Path $env:TEMP "odyssey-ctx-$level-$row-$col.jpg"
      Invoke-WebRequest -Uri $url -OutFile $tilePath -TimeoutSec 30
      $tile = [System.Drawing.Image]::FromFile($tilePath)
      try {
        if ($tile.Width -ne $tileSize -or $tile.Height -ne $tileSize) {
          throw "Unexpected tile size at $url"
        }
        $graphics.DrawImage($tile, ($col - $firstCol) * $tileSize, ($row - $firstRow) * $tileSize, $tileSize, $tileSize)
        $sources += [pscustomobject]@{ url = $url; bytes = (Get-Item -LiteralPath $tilePath).Length }
      } finally {
        $tile.Dispose()
        Remove-Item -LiteralPath $tilePath
      }
    }
  }
} finally {
  $graphics.Dispose()
}

$sourceRect = [System.Drawing.RectangleF]::new(
  [float](($west + 180) / $resolution - $firstCol * $tileSize),
  [float]((90 - $north) / $resolution - $firstRow * $tileSize),
  [float](($east - $west) / $resolution),
  [float](($north - $south) / $resolution)
)
$size = [int][math]::Round(($east - $west) / $resolution)
$detail = [System.Drawing.Bitmap]::new($size, $size)
$crop = [System.Drawing.Graphics]::FromImage($detail)
try {
  $crop.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $crop.DrawImage($mosaic, [System.Drawing.RectangleF]::new(0, 0, $size, $size), $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  $output = Join-Path $PackRoot 'data/texture_ctx_detail.jpg'
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg' | Select-Object -First 1
  $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
  $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]90)
  $detail.Save($output, $codec, $parameters)
  [pscustomobject]@{ path = $output; width = $size; height = $size; sources = $sources } | ConvertTo-Json -Depth 4
} finally {
  $crop.Dispose()
  $detail.Dispose()
  $mosaic.Dispose()
}
