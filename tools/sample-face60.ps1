Add-Type -AssemblyName System.Drawing
$src = Join-Path $PSScriptRoot 'avatar.png'
# crop the head-and-shoulders region, excluding the white "X" watermark on the right
$CX = 118; $CY = 70; $CW = 176; $CH = 240
$NCOL = 60; $NROW = 80

$img = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap($NCOL, $NROW)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode  = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$destRect = New-Object System.Drawing.Rectangle(0, 0, $NCOL, $NROW)
$g.DrawImage($img, $destRect, $CX, $CY, $CW, $CH, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$acc = @()
for ($y = 0; $y -lt $NROW; $y++) {
  $cells = @()
  for ($x = 0; $x -lt $NCOL; $x++) {
    $p = $bmp.GetPixel($x, $y)
    $cells += ('{0:x2}{1:x2}{2:x2}' -f $p.R, $p.G, $p.B)
  }
  $acc += ($cells -join ',')
}
$bmp.Dispose(); $img.Dispose()
$out = Join-Path $PSScriptRoot 'pixels-face60.txt'
[System.IO.File]::WriteAllText($out, ($acc -join "`n"), [System.Text.Encoding]::ASCII)
Write-Output ("wrote {0} rows x {1} cols -> {2}" -f $acc.Count, $NCOL, $out)
