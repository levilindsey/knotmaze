# Builds a commit of this repo into its own directory and serves it with
# `vite preview`, for A/B comparisons between builds (desktop or phone).
#
#   pwsh scripts/preview.ps1 -Port 5175                   # the working tree
#   pwsh scripts/preview.ps1 -Port 5176 -Ref 31c3c91      # any commit
#   pwsh scripts/preview.ps1 -Ref 31c3c91 -Root <dir> -BuildOnly
#                                                          # build, don't serve
#
# A -Ref build checks the commit out into a temporary git worktree first,
# so the working tree is never touched. Builds land in
# $env:TEMP\knotmaze-previews\<ref> unless -Root names a per-run folder
# (K150: that shared folder is where concurrent agents overwrite each
# other's builds; scripts/phone_pass.ps1 passes its own); each one carries
# its commit in the build stamp, so check the stamp before trusting an A/B.
# -BuildOnly builds into <Root>\<ref> and exits. Otherwise the server runs
# in the foreground (--host: reachable over the LAN, Tailscale, or the
# phone via scripts/phone.ps1 -Ports <port>).
param(
  [int]$Port = 0,
  [string]$Ref = "",
  [string]$Root = "",
  [switch]$BuildOnly
)
$ErrorActionPreference = "Stop"
if (-not $BuildOnly -and $Port -le 0) { throw "-Port is required unless -BuildOnly." }
$repo = Split-Path $PSScriptRoot -Parent
$root = if ($Root) { $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Root) } else { Join-Path $env:TEMP "knotmaze-previews" }
$source = $repo
$worktree = $null

if ($Ref) {
  $sha = (git -C $repo rev-parse --short $Ref).Trim()
  $worktree = Join-Path $root "src-$sha"
  if (Test-Path $worktree) { git -C $repo worktree remove --force $worktree | Out-Null }
  git -C $repo worktree add --detach $worktree $sha | Out-Null
  # Reuse the main checkout's packages: a directory junction, removed
  # with .Delete() below (a recursive delete would follow it).
  New-Item -ItemType Junction -Path (Join-Path $worktree "node_modules") -Target (Join-Path $repo "node_modules") | Out-Null
  $source = $worktree
  $label = $sha
} else {
  $label = "worktree-" + (git -C $repo rev-parse --short HEAD).Trim()
}

$out = Join-Path $root $label
try {
  Push-Location $source
  npx vite build --outDir $out --emptyOutDir
  if ($LASTEXITCODE -ne 0) { throw "vite build failed" }
} finally {
  Pop-Location
  if ($worktree) {
    (Get-Item (Join-Path $worktree "node_modules") -Force).Delete()
    git -C $repo worktree remove --force $worktree | Out-Null
  }
}

if ($BuildOnly) { Write-Host "Built $label into $out"; return }
Write-Host "Serving $label on http://localhost:$Port (Ctrl+C stops)"
Push-Location $repo
try { npx vite preview --outDir $out --host --port $Port --strictPort }
finally { Pop-Location }
