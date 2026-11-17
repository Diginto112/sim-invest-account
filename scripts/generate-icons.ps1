$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$iconRoot = Join-Path $projectRoot 'icons'
New-Item -ItemType Directory -Path $iconRoot -Force | Out-Null
function Write-InvestIcon([int] $Size, [string] $Target) {
    $bitmap = [Drawing.Bitmap]::new($Size, $Size)
    $canvas = [Drawing.Graphics]::FromImage($bitmap)
    $canvas.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $canvas.Clear([Drawing.Color]::FromArgb(29, 107, 227))
    $pen = [Drawing.Pen]::new([Drawing.Color]::White, $Size * 0.06)
    $pen.StartCap = [Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
    $points = [Drawing.PointF[]] @(
        [Drawing.PointF]::new($Size * 0.24, $Size * 0.68),
        [Drawing.PointF]::new($Size * 0.43, $Size * 0.48),
        [Drawing.PointF]::new($Size * 0.56, $Size * 0.57),
        [Drawing.PointF]::new($Size * 0.76, $Size * 0.31)
    )
    $canvas.DrawLines($pen, $points)
    $canvas.DrawLine($pen, [single]($Size * 0.59), [single]($Size * 0.31), [single]($Size * 0.76), [single]($Size * 0.31))
    $canvas.DrawLine($pen, [single]($Size * 0.76), [single]($Size * 0.31), [single]($Size * 0.76), [single]($Size * 0.48))
    $bitmap.Save($Target, [Drawing.Imaging.ImageFormat]::Png)
    $pen.Dispose(); $canvas.Dispose(); $bitmap.Dispose()
}
Write-InvestIcon 192 (Join-Path $iconRoot 'icon-192.png')
Write-InvestIcon 512 (Join-Path $iconRoot 'icon-512.png')
foreach ($density in @(@('mdpi',48),@('hdpi',72),@('xhdpi',96),@('xxhdpi',144),@('xxxhdpi',192))) {
    $targetRoot = Join-Path $projectRoot ('android/app/src/main/res/mipmap-' + $density[0])
    foreach ($name in @('ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png')) {
        Write-InvestIcon ([int]$density[1]) (Join-Path $targetRoot $name)
    }
}
Write-Output 'Generated PWA and Android launcher icons.'
