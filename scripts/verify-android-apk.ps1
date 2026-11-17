param(
    [Parameter(Mandatory = $true)]
    [string] $ToolchainRoot,
    [string] $ApkPath
)

$ErrorActionPreference = 'Stop'
$null = Add-Type -AssemblyName System.IO.Compression
$null = Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = [IO.Path]::GetFullPath($ToolchainRoot)
if (-not $ApkPath) { $ApkPath = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk' }
$apk = (Resolve-Path -LiteralPath $ApkPath).Path
$buildTools = Join-Path $toolRoot 'sdk\build-tools\34.0.0'
$previousJava = $env:JAVA_HOME
try {
    $env:JAVA_HOME = Join-Path $toolRoot 'jdk'
    & (Join-Path $buildTools 'apksigner.bat') verify --print-certs $apk *> $null
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    $badging = & (Join-Path $buildTools 'aapt.exe') dump badging $apk
    if ($LASTEXITCODE -ne 0) { throw 'APK manifest inspection failed.' }
    $badging | Select-String "^package:|^sdkVersion:|^targetSdkVersion:|^application-label:|^launchable-activity:"
    if (-not ($badging -match "name='com.siminvest.account' versionCode='32' versionName='0.2.0'")) {
        throw 'Unexpected Android package/version.'
    }
    $zip = [IO.Compression.ZipFile]::OpenRead($apk)
    try {
        $webRoot = Join-Path $projectRoot 'web'
        $files = Get-ChildItem -LiteralPath $webRoot -Recurse -File
        foreach ($file in $files) {
            $relative = $file.FullName.Substring($webRoot.Length + 1).Replace('\', '/')
            $entry = $zip.GetEntry('assets/public/' + $relative)
            if ($null -eq $entry) { throw "Missing bundled Web asset: $relative" }
            $stream = $entry.Open()
            try {
                $expectedHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
                $sha256 = [Security.Cryptography.SHA256]::Create()
                try { $actualHash = [BitConverter]::ToString($sha256.ComputeHash($stream)).Replace('-', '') } finally { $sha256.Dispose() }
                if ($expectedHash -ne $actualHash) { throw "Stale bundled Web asset: $relative" }
            } finally { $stream.Dispose() }
        }
        "Verified $($files.Count) bundled Web assets against the current prepared source."
    } finally { $zip.Dispose() }
    Get-FileHash -LiteralPath $apk -Algorithm SHA256
} finally { $env:JAVA_HOME = $previousJava }
