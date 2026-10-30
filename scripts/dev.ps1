# Levi's LAN dev server: the phone loads it, and a session's ledger env:
# line can name this script instead of a remembered command
# (claude-config rules/sessions.md, "Environment belongs in scripts").
#
#   pwsh scripts/dev.ps1              # port 5173
#   pwsh scripts/dev.ps1 -Port 5500   # another port (agents: not 5173)
#
# Runs vite from this checkout's own node_modules, in the foreground
# (Ctrl+C stops it):
#   vite --host 0.0.0.0 --port <Port> --strictPort
# It never runs npm ci or npm install: in an agent worktree node_modules
# can be a junction to the main checkout's, and an install through it
# empties the main one (K1058).
param(
  [int]$Port = 5173
)
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path "$PSScriptRoot\..").Path
$vite = Join-Path $repo "node_modules\vite"
if (-not (Test-Path (Join-Path $vite "package.json"))) {
  throw "node_modules does not hold vite ($vite). Run 'npm ci' in $repo first; this script never installs."
}
$lock = Join-Path $repo "package-lock.json"
$installed = Join-Path $repo "node_modules\.package-lock.json"
if ((Test-Path $lock) -and (-not (Test-Path $installed) -or (Get-Item $lock).LastWriteTime -gt (Get-Item $installed).LastWriteTime)) {
  Write-Warning "package-lock.json is newer than node_modules\.package-lock.json (the dependencies changed since the last install). Run 'npm ci' if the server misbehaves; starting anyway."
}
Write-Host "Serving $repo on http://localhost:$Port (LAN: --host 0.0.0.0; Ctrl+C stops)"
Push-Location $repo
try {
  & (Join-Path $repo "node_modules\.bin\vite.cmd") --host 0.0.0.0 --port $Port --strictPort
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}
