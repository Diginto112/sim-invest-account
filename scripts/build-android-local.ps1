param(
    [Parameter(Mandatory = $true)]
    [string] $ToolchainRoot
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = [IO.Path]::GetFullPath($ToolchainRoot)
$javaRoot = Join-Path $toolRoot 'jdk'
$sdkRoot = Join-Path $toolRoot 'sdk'
$gradle = Join-Path $toolRoot 'gradle\gradle-8.2.1\bin\gradle.bat'
$sdkManager = Join-Path $sdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
foreach ($required in @((Join-Path $javaRoot 'bin\java.exe'), $gradle, $sdkManager)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Missing build tool: $required. See ANDROID_PACKAGING.md."
    }
}

$previous = @{}
$settings = @{
    JAVA_HOME = $javaRoot
    ANDROID_HOME = $sdkRoot
    ANDROID_SDK_ROOT = $sdkRoot
    GRADLE_USER_HOME = (Join-Path $toolRoot 'gradle-user')
    ANDROID_USER_HOME = (Join-Path $toolRoot 'android-user')
}

try {
    foreach ($key in $settings.Keys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, $settings[$key], 'Process')
    }
    if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot 'platforms\android-34\android.jar')) -or
        -not (Test-Path -LiteralPath (Join-Path $sdkRoot 'build-tools\34.0.0\aapt2.exe'))) {
        throw "SDK platform/build tools are not installed. Review https://developer.android.com/studio/terms and run sdkmanager interactively to install platforms;android-34 and build-tools;34.0.0. This script does not accept licenses. SDK manager: $sdkManager"
    }
    Push-Location -LiteralPath $projectRoot
    try {
        & node (Join-Path $PSScriptRoot 'prepare-capacitor.cjs')
        if ($LASTEXITCODE -ne 0) { throw 'Web resource preparation failed.' }
        & node (Join-Path $projectRoot 'node_modules\@capacitor\cli\bin\capacitor') sync android
        if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed. Run npm install first.' }
    } finally { Pop-Location }
    Push-Location -LiteralPath (Join-Path $projectRoot 'android')
    try {
        & $gradle --no-daemon --console plain assembleDebug
        if ($LASTEXITCODE -ne 0) { throw "Android debug build failed ($LASTEXITCODE)." }
    } finally { Pop-Location }
    $apk = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
    if (-not (Test-Path -LiteralPath $apk)) { throw 'Gradle completed without the expected APK.' }
    Get-Item -LiteralPath $apk | Select-Object FullName, Length, LastWriteTime
    Get-FileHash -LiteralPath $apk -Algorithm SHA256
} finally {
    foreach ($key in $previous.Keys) {
        [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process')
    }
}
