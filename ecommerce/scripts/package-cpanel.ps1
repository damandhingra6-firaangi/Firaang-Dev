$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$standaloneRoot = Join-Path $projectRoot ".next/standalone"
$staticRoot = Join-Path $projectRoot ".next/static"
$publicRoot = Join-Path $projectRoot "public"
$distRoot = Join-Path $projectRoot "dist"
$packageRoot = Join-Path $distRoot "cpanel"
$archivePath = Join-Path $distRoot "cpanel-deploy.zip"

if (-not (Test-Path $standaloneRoot)) {
  throw "Standalone build output was not found. Run 'npm run build' before packaging for cPanel."
}

if (Test-Path $packageRoot) {
  Remove-Item $packageRoot -Recurse -Force
}

if (Test-Path $archivePath) {
  Remove-Item $archivePath -Force
}

New-Item -ItemType Directory -Path $packageRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot ".next") | Out-Null

Copy-Item (Join-Path $standaloneRoot "*") $packageRoot -Recurse -Force

if (Test-Path $staticRoot) {
  Copy-Item $staticRoot (Join-Path $packageRoot ".next") -Recurse -Force
}

if (Test-Path $publicRoot) {
  Copy-Item $publicRoot $packageRoot -Recurse -Force
}

Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $archivePath -Force

Write-Host "Created cPanel deployment archive: $archivePath"