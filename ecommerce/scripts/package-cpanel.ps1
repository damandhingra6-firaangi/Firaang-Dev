$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$nextRoot = Join-Path $projectRoot ".next"
$standaloneRoot = Join-Path $nextRoot "standalone"
$staticRoot = Join-Path $nextRoot "static"
$publicRoot = Join-Path $projectRoot "public"
$packageJsonPath = Join-Path $projectRoot "package.json"
$packageLockPath = Join-Path $projectRoot "package-lock.json"
$distRoot = Join-Path $projectRoot "dist"
$packageRoot = Join-Path $distRoot "cpanel"
$archivePath = Join-Path $distRoot "cpanel-deploy.zip"

# Always package from a fresh production build to avoid stale .next artifacts.
if (Test-Path $nextRoot) {
  Remove-Item $nextRoot -Recurse -Force
}

Push-Location $projectRoot
try {
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Build failed while preparing cPanel package."
  }
}
finally {
  Pop-Location
}

if (-not (Test-Path $nextRoot)) {
  throw "Build output was not found. Run 'npm run build' before packaging for cPanel."
}

if (-not (Test-Path $standaloneRoot)) {
  throw "Standalone output was not found at .next/standalone. Ensure next.config.ts sets output='standalone' and run 'npm run build'."
}

if (Test-Path $packageRoot) {
  Remove-Item $packageRoot -Recurse -Force
}

if (Test-Path $archivePath) {
  Remove-Item $archivePath -Force
}

New-Item -ItemType Directory -Path $packageRoot | Out-Null

# Copy traced production server and dependencies.
$standaloneItems = Get-ChildItem -Path $standaloneRoot -Force | ForEach-Object { $_.FullName }
if (-not $standaloneItems -or $standaloneItems.Count -eq 0) {
  throw "Standalone build is empty; cannot package deployment archive."
}

Copy-Item $standaloneItems $packageRoot -Recurse -Force

# Copy static assets required by Next runtime.
$packageNextRoot = Join-Path $packageRoot ".next"
if (-not (Test-Path $packageNextRoot)) {
  New-Item -ItemType Directory -Path $packageNextRoot | Out-Null
}

if (Test-Path $staticRoot) {
  Copy-Item $staticRoot (Join-Path $packageNextRoot "static") -Recurse -Force
}

if (Test-Path $publicRoot) {
  $packagePublicRoot = Join-Path $packageRoot "public"
  if (Test-Path $packagePublicRoot) {
    Remove-Item $packagePublicRoot -Recurse -Force
  }

  New-Item -ItemType Directory -Path $packagePublicRoot | Out-Null

  # Only ship the assets that the app actually references. The full public folder
  # includes legacy imagery that makes the cPanel upload archive too large.
  $publicAssets = @(
    "24-7Hrs.svg",
    "AED.svg",
    "apple-touch-icon.png",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
    "Banner1.png",
    "Banner_Mobile.png",
    "cat1.jpg",
    "cat2.jpg",
    "cat3.jpg",
    "cat4.jpg",
    "FiraangLogoDesign-black.svg",
    "FiraangLogoDesign-white.svg",
    "FiraangLogoDesign.png",
    "FooterTransparentLogo.svg",
    "FreeReturn.svg",
    "FreeShipping.svg",
    "GiftCard.svg",
    "GoldenArrow.svg",
    "hero.jpg",
    "Home Page Banner.png",
    "HomePageBannerDevotional.jpg",
    "icon_v001.svg",
    "India.svg",
    "Mobile view_02.png",
    "Mobile_banner_devotional.png",
    "site.webmanifest",
    "USD.svg",
    "favicon.ico",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "favicon-48x48.png"
  )

  foreach ($asset in $publicAssets) {
    $sourcePath = Join-Path $publicRoot $asset
    if (-not (Test-Path $sourcePath)) {
      throw "Required public asset not found: $asset"
    }

    Copy-Item $sourcePath $packagePublicRoot -Force
  }
}

# Do not deploy local runtime upload artifacts from development.
# The app creates this folder on-demand in production.
$packagedDataRoot = Join-Path $packageRoot ".data"
if (Test-Path $packagedDataRoot) {
  Remove-Item $packagedDataRoot -Recurse -Force
}

$packagedUploadsRoot = Join-Path $packagedDataRoot "design-uploads"
New-Item -ItemType Directory -Path $packagedUploadsRoot -Force | Out-Null

Copy-Item $packageJsonPath $packageRoot -Force

if (Test-Path $packageLockPath) {
  Copy-Item $packageLockPath $packageRoot -Force
}

$legacyEntrypointPath = Join-Path $packageRoot "app.js"
$legacyEntrypointContent = @'
require("./server.js");
'@

Set-Content -Path $legacyEntrypointPath -Value $legacyEntrypointContent -Encoding utf8

$permissionsScriptPath = Join-Path $packageRoot "fix-permissions.sh"
$permissionsScript = @'
#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_ROOT"

# Directories need execute bit for Node.js to traverse; files need read bit.
if [ -d ".next" ]; then
  find .next -type d -exec chmod 755 {} \;
  find .next -type f -exec chmod 644 {} \;
fi

if [ -d "public" ]; then
  find public -type d -exec chmod 755 {} \;
  find public -type f -exec chmod 644 {} \;
fi

chmod 755 server.js || true
chmod 755 app.js || true

echo "Permissions normalized for .next, public, server.js, and app.js"
'@

Set-Content -Path $permissionsScriptPath -Value $permissionsScript -Encoding utf8

$archiveItems = Get-ChildItem -Path $packageRoot -Force | ForEach-Object { $_.FullName }
if (-not $archiveItems -or $archiveItems.Count -eq 0) {
  throw "Packaging directory is empty; nothing to archive."
}

Compress-Archive -Path $archiveItems -DestinationPath $archivePath -Force

Write-Host "Created cPanel deployment archive: $archivePath"