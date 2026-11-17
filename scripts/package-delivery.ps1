param([string] $Destination)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
if (-not $Destination) { $Destination = Join-Path (Split-Path -Parent $projectRoot) 'sim-invest-android-v32-source.zip' }
$target = [IO.Path]::GetFullPath($Destination)
if ((Split-Path -Parent $target) -ne (Split-Path -Parent $projectRoot)) { throw 'Delivery ZIP must be in the project outputs directory.' }
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
$archive = [IO.Compression.ZipFile]::Open($target, [IO.Compression.ZipArchiveMode]::Create)
$excluded = @('node_modules', '.npm-cache', '.git', '.gradle', 'build', 'dist')
function Add-ProjectDirectory([string] $Directory) {
    foreach ($item in Get-ChildItem -LiteralPath $Directory -Force) {
        if ($item.PSIsContainer) {
            if ($item.Name -notin $excluded) { Add-ProjectDirectory $item.FullName }
        } elseif ($item.Name -ne 'local.properties' -and $item.Extension -notin @('.keystore','.jks','.apk','.zip')) {
            $relative = $item.FullName.Substring($projectRoot.Length + 1).Replace('\','/')
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $item.FullName, $relative, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    }
}
try { Add-ProjectDirectory $projectRoot } finally { $archive.Dispose() }
Get-Item -LiteralPath $target | Select-Object FullName, Length, LastWriteTime
Get-FileHash -LiteralPath $target -Algorithm SHA256
