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
#
# K1188: a -Root so long that the worktree's files would pass the
# 260-char Windows limit is refused before anything is created (git
# 2.33 fails there with "'$GIT_DIR' too big"). Each -Ref run leaves a
# ".src-<sha>.live.json" marker under -Root (pwsh id + start time,
# port, worktree, build folder); the next run naming that -Root first
# removes dead "src-*" leftovers under that root only (junction
# unlinked before any remove; a run whose pwsh or whose port listener
# is still alive - an orphaned server included - is kept), and refuses
# a second live run of the same -Ref under that root.
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
$markerPath = $null

function Get-PreviewMarker([string]$folderName) { Join-Path $root (".$folderName.live.json") }

# Live = the run's pwsh (id reused by another process does not count:
# start times must match) or a listener on its recorded port (which is
# how an orphaned vite preview, whose pwsh was killed, still counts).
# Any doubt answers live, so a live sibling is never removed.
function Test-PreviewLive($marker, [string]$folder, [string]$outDir) {
  try {
    if ($null -ne $marker) {
      $proc = Get-Process -Id ([int]$marker.pwshPid) -ErrorAction SilentlyContinue
      if ($proc) {
        try {
          $nowTicks = $proc.StartTime.ToUniversalTime().Ticks
          $markTicks = [int64]::Parse([string]$marker.pwshStart)
          if ([Math]::Abs($nowTicks - $markTicks) -le 20000000) { return $true }
        } catch { return $true }
      }
      if ([int]$marker.port -gt 0) {
        $listen = Get-NetTCPConnection -LocalPort ([int]$marker.port) -State Listen -ErrorAction SilentlyContinue
        if ($listen) { return $true }
      }
      return $false
    }
    # No marker (a run from before K1188, or one still starting): live
    # if another process names this folder or its build, or it just
    # appeared.
    foreach ($p in @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)) {
      if ($p.ProcessId -eq $PID -or -not $p.CommandLine) { continue }
      if ($p.CommandLine.IndexOf($folder, [StringComparison]::OrdinalIgnoreCase) -ge 0 -or
          $p.CommandLine.IndexOf($outDir, [StringComparison]::OrdinalIgnoreCase) -ge 0) { return $true }
    }
    $item = Get-Item $folder -Force -ErrorAction SilentlyContinue
    if ($item -and ((Get-Date) - $item.LastWriteTime).TotalSeconds -lt 15) { return $true }
    return $false
  } catch { return $true }
}

function Remove-PreviewWorktree([string]$folder) {
  # Unlink the junction first: `git worktree remove --force` follows a
  # junction into its target (git 2.33; on 2026-10-14 it emptied the
  # main checkout's .bin).
  $nm = Get-Item (Join-Path $folder "node_modules") -Force -ErrorAction SilentlyContinue
  if ($nm -and $nm.LinkType) { $nm.Delete() }
  git -C $repo worktree remove --force $folder 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0 -and (Test-Path $folder)) {
    # Not registered (an empty leftover, say): drop the folder itself
    # once its junction is gone, never recursively through a junction.
    $nm2 = Get-Item (Join-Path $folder "node_modules") -Force -ErrorAction SilentlyContinue
    if ($nm2 -and $nm2.LinkType) { $nm2.Delete() }
    if ((Test-Path (Join-Path $folder ".git")) -or -not @(Get-ChildItem $folder -Force -ErrorAction SilentlyContinue)) {
      Remove-Item $folder -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
  $mp = Get-PreviewMarker (Split-Path $folder -Leaf)
  if (Test-Path $mp) { Remove-Item $mp -Force -ErrorAction SilentlyContinue }
}

# Remove dead "src-*" leftovers under $root only (never a live run's),
# before this run adds its own worktree. No other root is touched and
# no `git worktree prune` is ever run.
function Clear-DeadPreviews([string]$exceptFolder) {
  if (-not (Test-Path $root)) { return }
  foreach ($dir in @(Get-ChildItem $root -Directory -Filter "src-*" -Force -ErrorAction SilentlyContinue)) {
    if ($exceptFolder -and $dir.FullName.Equals($exceptFolder, [StringComparison]::OrdinalIgnoreCase)) { continue }
    $mp = Get-PreviewMarker $dir.Name
    $marker = $null
    if (Test-Path $mp) {
      try { $marker = Get-Content $mp -Raw | ConvertFrom-Json } catch { continue }
    }
    $outDir = if ($marker -and $marker.out) { [string]$marker.out } else { Join-Path $root ($dir.Name -replace '^src-', '') }
    if (Test-PreviewLive $marker $dir.FullName $outDir) { continue }
    Remove-PreviewWorktree $dir.FullName
  }
}

if ($Ref) {
  $sha = (git -C $repo rev-parse --short $Ref).Trim()
  $worktree = Join-Path $root "src-$sha"
  # Refuse a -Root whose worktree files would pass the Windows limit
  # before creating a worktree, a junction or an output folder. The
  # repo's longest tracked path sets how much room a checkout needs
  # (119 chars today; measured: worktree 136 chars builds, 141 fails).
  $maxRel = 119
  try {
    $lens = @(git -C $repo ls-files | ForEach-Object { $_.Length })
    if ($lens.Count) { $maxRel = ($lens | Measure-Object -Maximum).Maximum }
  } catch { }
  if (($worktree.Length + 1 + $maxRel) -gt 259) { throw "preview.ps1: -Root '$root' is too long for -Ref $sha - worktree '$worktree' plus the repo's longest path ($maxRel chars) passes the 260-char Windows limit, where git worktree add fails ('`$GIT_DIR' too big, checkout reset fails); use a shorter -Root." }
  Clear-DeadPreviews ""
  if (Test-Path $worktree) { throw "preview.ps1: -Ref $sha already has a live run at '$worktree' under -Root '$root'; stop it first or use another -Root." }
  New-Item -ItemType Directory $root -Force | Out-Null
  $markerPath = Get-PreviewMarker (Split-Path $worktree -Leaf)
  $markerObj = [ordered]@{
    pwshPid = $PID
    pwshStart = [string](Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks
    port = $(if ($BuildOnly) { 0 } else { $Port })
    ref = $sha
    worktree = $worktree
    out = (Join-Path $root $sha)
  }
  [IO.File]::WriteAllText($markerPath, ($markerObj | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding $false))
  git -C $repo worktree add --detach $worktree $sha | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Remove-Item $markerPath -Force -ErrorAction SilentlyContinue
    $markerPath = $null
    throw "git worktree add failed for $sha at $worktree"
  }
  # Reuse the main checkout's packages: a directory junction, removed
  # with .Delete() below (a recursive delete would follow it).
  New-Item -ItemType Junction -Path (Join-Path $worktree "node_modules") -Target (Join-Path $repo "node_modules") | Out-Null
  $source = $worktree
  $label = $sha
} else {
  Clear-DeadPreviews ""
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
  if ($worktree) { Remove-PreviewWorktree $worktree }
  if ($markerPath -and (Test-Path $markerPath)) { Remove-Item $markerPath -Force -ErrorAction SilentlyContinue }
  if ($madeJunction) {
    $j = Get-Item $madeJunction -Force -ErrorAction SilentlyContinue
    if ($j -and $j.LinkType) { $j.Delete() }
  }
}
