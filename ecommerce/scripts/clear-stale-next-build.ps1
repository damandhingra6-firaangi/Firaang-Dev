$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$nextRoot = Join-Path $projectRoot ".next"

$nodeProcesses = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Name -match 'node' -and
    $_.CommandLine -match 'standalone[\\/ ]server\.js|next\s+(start|dev)'
  }

foreach ($process in $nodeProcesses) {
  try {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
    Write-Host "Stopped stale Next.js process: $($process.ProcessId)"
  } catch {
    Write-Warning "Unable to stop stale Next.js process $($process.ProcessId): $($_.Exception.Message)"
  }
}

if (Test-Path $nextRoot) {
  Remove-Item $nextRoot -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "Removed stale .next build directory"
}
