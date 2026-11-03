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
  if (Test-Path $worktree) {
    # A leftover worktree still has its junction: unlink it first, since
    # `git worktree remove --force` follows a junction into its target
    # (git 2.33; on 2026-10-14 it emptied the main checkout's .bin).
    $nm = Get-Item (Join-Path $worktree "node_modules") -Force -ErrorAction SilentlyContinue
    if ($nm -and $nm.LinkType) { $nm.Delete() }
    git -C $repo worktree remove --force $worktree | Out-Null
  }
  git -C $repo worktree add --detach $worktree $sha | Out-Null
  # Reuse the main checkout's packages: a directory junction, removed
  # with .Delete() below (a recursive delete would follow it).
  New-Item -ItemType Junction -Path (Join-Path $worktree "node_modules") -Target (Join-Path $repo "node_modules") | Out-Null
  $source = $worktree
  $label = $sha
} else {
  $label = "worktree-" + (git -C $repo rev-parse --short HEAD).Trim()
}

# A plain checkout with no node_modules (an agent worktree, say) borrows
# the main checkout's through a junction; without one anywhere, say what
# is missing instead of letting npx fetch a stray vite (K593). The
# junction is this run's own: it is deleted in the finally below, by
# deleting the junction itself, never recursively through it.
$madeJunction = $null
if (-not (Test-Path (Join-Path $source "node_modules"))) {
  $commonDir = (git -C $source rev-parse --git-common-dir).Trim()
  if (-not [System.IO.Path]::IsPathRooted($commonDir)) { $commonDir = Join-Path $source $commonDir }
  $mainNm = Join-Path (Split-Path $commonDir -Parent) "node_modules"
  if (Test-Path $mainNm) {
    $madeJunction = Join-Path $source "node_modules"
    New-Item -ItemType Junction -Path $madeJunction -Target $mainNm | Out-Null
  } else {
    throw "node_modules not found in $source and no main checkout copy at $mainNm. Run 'npm ci' in $source and retry."
  }
}

$out = Join-Path $root $label
try {
  Push-Location $source
  try {
    npx vite build --outDir $out --emptyOutDir
    if ($LASTEXITCODE -ne 0) { throw "vite build failed" }
  } finally { Pop-Location }

  if ($BuildOnly) { Write-Host "Built $label into $out"; return }
  Write-Host "Serving $label on http://localhost:$Port (Ctrl+C stops)"
  Push-Location $repo
  try { npx vite preview --outDir $out --host --port $Port --strictPort }
  finally { Pop-Location }
} finally {
  if ($worktree) {
    (Get-Item (Join-Path $worktree "node_modules") -Force).Delete()
    git -C $repo worktree remove --force $worktree | Out-Null
  }
  if ($madeJunction) {
    $j = Get-Item $madeJunction -Force -ErrorAction SilentlyContinue
    if ($j -and $j.LinkType) { $j.Delete() }
  }
}
