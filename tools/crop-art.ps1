# Crops the hand-made ASCII/binary portrait down to its content box and exports a
# web-sized copy for embedding in the card.
#
#   powershell -File tools/crop-art.ps1 -OutW 600 -Quality 92
#
# The card masks this image by luminance, so near-black JPEG noise turns into a
# faint haze over the whole rectangle. Keep Quality high enough that the black
# stays black; the crush filter in generate-card.js mops up the rest.
param([int]$OutW = 600, [int]$Quality = 92)

Add-Type -AssemblyName System.Drawing
$src = Join-Path $PSScriptRoot 'art.png'

# content bounds measured from a 48x48 density map: strips the black margins
$CX = 100; $CY = 45; $CW = 1154; $CH = 1190

$img = [System.Drawing.Bitmap]::FromFile($src)
$outH = [int][Math]::Round($OutW * $CH / $CW)

$bmp = New-Object System.Drawing.Bitmap($OutW, $outH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$dest = New-Object System.Drawing.Rectangle(0, 0, $OutW, $outH)
$g.DrawImage($img, $dest, $CX, $CY, $CW, $CH, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$jpg = Join-Path $PSScriptRoot 'art-crop.jpg'
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$prm = New-Object System.Drawing.Imaging.EncoderParameters(1)
$prm.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)
$bmp.Save($jpg, $enc, $prm)

$bmp.Dispose(); $img.Dispose()
Write-Output ("art-crop.jpg {0}x{1} q{2} {3}KB" -f $OutW, $outH, $Quality, [int]((Get-Item $jpg).Length / 1KB))
