$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$nextRoot = Join-Path $projectRoot ".next"
$publicRoot = Join-Path $projectRoot "public"
$packageJsonPath = Join-Path $projectRoot "package.json"
$packageLockPath = Join-Path $projectRoot "package-lock.json"
$distRoot = Join-Path $projectRoot "dist"
$packageRoot = Join-Path $distRoot "cpanel"
$archivePath = Join-Path $distRoot "cpanel-deploy.zip"

if (-not (Test-Path $nextRoot)) {
  throw "Build output was not found. Run 'npm run build' before packaging for cPanel."
}

if (Test-Path $packageRoot) {
  Remove-Item $packageRoot -Recurse -Force
}

if (Test-Path $archivePath) {
  Remove-Item $archivePath -Force
}

New-Item -ItemType Directory -Path $packageRoot | Out-Null

Copy-Item $nextRoot $packageRoot -Recurse -Force

# Remove unreadable files/folders from standalone output and build cache.
$standaloneInPackage = Join-Path $packageRoot ".next/standalone"
if (Test-Path $standaloneInPackage) {
  Remove-Item $standaloneInPackage -Recurse -Force
}

$nextCacheInPackage = Join-Path $packageRoot ".next/cache"
if (Test-Path $nextCacheInPackage) {
  Remove-Item $nextCacheInPackage -Recurse -Force
}

$nextDevInPackage = Join-Path $packageRoot ".next/dev"
if (Test-Path $nextDevInPackage) {
  Remove-Item $nextDevInPackage -Recurse -Force
}

if (Test-Path $publicRoot) {
  Copy-Item $publicRoot $packageRoot -Recurse -Force
}

Copy-Item $packageJsonPath $packageRoot -Force

if (Test-Path $packageLockPath) {
  Copy-Item $packageLockPath $packageRoot -Force
}

$appEntrypoint = Join-Path $packageRoot "app.js"
$appEntrypointContent = @"
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const http = require('http');
const next = require('next');

const port = Number.parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';

if (!Number.isFinite(port) || port < 1) {
  throw new Error('Invalid PORT value. Set a valid PORT in cPanel Node.js app settings.');
}

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));
    server.listen(port, hostname, () => {
      console.log('Next server listening on ' + hostname + ':' + port);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
"@

Set-Content -Path $appEntrypoint -Value $appEntrypointContent -Encoding utf8

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

chmod 755 app.js || true

echo "Permissions normalized for .next, public, and app.js"
'@

Set-Content -Path $permissionsScriptPath -Value $permissionsScript -Encoding utf8

Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $archivePath -Force

Write-Host "Created cPanel deployment archive: $archivePath"