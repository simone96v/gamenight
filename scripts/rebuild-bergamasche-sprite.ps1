Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\simon\Desktop\claude\minigames\gamenight\public\cards\card_bergamasche.png"
$outPath = "c:\Users\simon\Desktop\claude\minigames\gamenight\public\cards\italian-deck.png"

# Approximate card bounds in the source (from gutter detection):
# Column starts at: 58, 267, 487, 705, 934, 1153, 1390, 1614, 1840, 2070
# Column ends at:  258, 479, 698, 925, 1142, 1380, 1603, 1827, 2061, 2285
$colStarts = @(58, 267, 487, 705, 934, 1153, 1390, 1614, 1840, 2070)
$colEnds   = @(258, 479, 698, 925, 1142, 1380, 1603, 1827, 2061, 2285)

# Row starts: 57, 463, 905, 1315
# Row ends:   444, 888, 1299, 1682
$rowStarts = @(57, 463, 905, 1315)
$rowEnds   = @(444, 888, 1299, 1682)

$src = [System.Drawing.Bitmap]::new($srcPath)

# Output cell size: uniform, designed for a typical italian playing card aspect ratio (~0.6)
# Sized for ~2x the largest display preset (xl=108x180), keeps file under PWA precache limit.
$cellW = 180
$cellH = 300
$outW = $cellW * 10
$outH = $cellH * 4

$out = New-Object System.Drawing.Bitmap $outW, $outH
$g = [System.Drawing.Graphics]::FromImage($out)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

# For each cell in the source, find the precise card bounds (non-black region)
# then draw the card centered into the destination cell.

function Get-CardBounds {
    param($bmp, $x0, $y0, $x1, $y1)
    # Scan inward to find tight bounding box of non-black pixels
    $left = $x1; $right = $x0; $top = $y1; $bottom = $y0
    for ($y = $y0; $y -le $y1; $y += 2) {
        for ($x = $x0; $x -le $x1; $x += 2) {
            $px = $bmp.GetPixel($x, $y)
            if ($px.R -gt 40 -or $px.G -gt 40 -or $px.B -gt 40) {
                if ($x -lt $left) { $left = $x }
                if ($x -gt $right) { $right = $x }
                if ($y -lt $top) { $top = $y }
                if ($y -gt $bottom) { $bottom = $y }
            }
        }
    }
    return @{ L = $left; R = $right; T = $top; B = $bottom }
}

for ($r = 0; $r -lt 4; $r++) {
    for ($c = 0; $c -lt 10; $c++) {
        $sx0 = $colStarts[$c]
        $sx1 = $colEnds[$c]
        $sy0 = $rowStarts[$r]
        $sy1 = $rowEnds[$r]

        $b = Get-CardBounds $src $sx0 $sy0 $sx1 $sy1
        if ($b.R -le $b.L -or $b.B -le $b.T) { continue }

        $cardW = $b.R - $b.L + 1
        $cardH = $b.B - $b.T + 1

        # Fit card inside cell with small margin while preserving aspect ratio
        $margin = 4
        $maxW = $cellW - 2 * $margin
        $maxH = $cellH - 2 * $margin
        $scale = [Math]::Min($maxW / $cardW, $maxH / $cardH)
        $drawW = [int]($cardW * $scale)
        $drawH = [int]($cardH * $scale)

        $dx = $c * $cellW + [int](($cellW - $drawW) / 2)
        $dy = $r * $cellH + [int](($cellH - $drawH) / 2)

        $srcRect = New-Object System.Drawing.Rectangle $b.L, $b.T, $cardW, $cardH
        $dstRect = New-Object System.Drawing.Rectangle $dx, $dy, $drawW, $drawH
        $g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    }
}

$g.Dispose()
$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
$src.Dispose()

Write-Output "Saved: $outPath ($outW x $outH, cell $cellW x $cellH, aspect $($cellW / $cellH))"
