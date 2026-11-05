# K1188: preview.ps1 under a long -Root, and after a kill.
# Verifies the fixed scripts/preview.ps1 end to end. Uses only ports
# 5670-5679 and its own roots under $env:TEMP\k1188e-repro-* (never
# $env:TEMP\k1139s4pv, never .claude/worktrees), and kills only the
# servers it started, by the process ids it recorded.
# Before tables (unmodified script, taken manually 2026-11-04):
#   long root (208 chars): git worktree add fails with
#     fatal: '$GIT_DIR' too big, vite then fails ("Cannot resolve
#     entry module index.html"), empty src-<sha> left behind.
#     Isolated: worktree 136 chars builds, 141 fails at checkout
#     (deepest file passes 260 chars); 216 fails in git itself.
#   short root (44 chars): builds. Kill: pwsh 23800 killed, orphan
#     node 30628 kept serving 5670; after stopping the recorded
#     children the port freed and src-4b740d38 stayed registered
#     with its node_modules junction to the main checkout.
param([switch]$Keep)
$ErrorActionPreference = "Continue"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$preview = Join-Path $repo "scripts\preview.ps1"
$shaA = (git -C $repo rev-parse --short HEAD).Trim()
$shaB = (git -C $repo rev-parse --short HEAD~1).Trim()
$failures = @()
function Check([string]$name, [bool]$ok, [string]$detail) {
  if ($ok) { Write-Host "PASS $name - $detail" } else { Write-Host "FAIL $name - $detail"; $script:failures += $name }
}
function Wait-Http([int]$port, [int]$seconds = 180) {
  for ($i = 0; $i -lt $seconds; $i += 2) {
    try { if ((Invoke-WebRequest "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { return $true } } catch { }
    Start-Sleep -Seconds 2
  }
  return $false
}
function Listener-Pid([int]$port) {
  $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) { [int]$c.OwningProcess } else { 0 }
}
function Chain-Ids([int]$fromPid, [int]$upToPid) {
  $ids = @(); $cur = $fromPid
  for ($n = 0; $n -lt 8 -and $cur -gt 0; $n++) {
    $ids += $cur
    if ($cur -eq $upToPid) { break }
    $w = Get-CimInstance Win32_Process -Filter "ProcessId=$cur" -ErrorAction SilentlyContinue
    if (-not $w) { break }
    $cur = [int]$w.ParentProcessId
  }
  return $ids
}
function Start-Preview([int]$port, [string]$ref, [string]$rootPath) {
  $p = Start-Process pwsh -ArgumentList @("-NoProfile", "-File", $preview, "-Port", "$port", "-Ref", $ref, "-Root", $rootPath) -PassThru
  return $p.Id
}
function Run-BuildOnly([string]$ref, [string]$rootPath) {
  if ($ref) { $txt = & pwsh -NoProfile -File $preview -Ref $ref -Root $rootPath -BuildOnly 2>&1 | Out-String -Width 300 }
  else { $txt = & pwsh -NoProfile -File $preview -Root $rootPath -BuildOnly 2>&1 | Out-String -Width 300 }
  return @{ Code = $LASTEXITCODE; Text = $txt }
}
function Outside-Worktrees {
  @(git -C $repo worktree list --porcelain | Where-Object { $_ -like "worktree *" } | ForEach-Object { $_.Substring(9) } | Where-Object { $_ -notlike "*k1188e-*" } | Sort-Object)
}

$seg = 'a' * 32
$longRoot = Join-Path $env:TEMP "k1188e-repro-long\$seg\$seg\$seg\$seg\$seg"
$mainRoot = Join-Path $env:TEMP "k1188e-repro-main"
$shortRoot = Join-Path $env:TEMP "k1188e-repro-short"
$wtRoot = Join-Path $env:TEMP "k1188e-repro-wt"
foreach ($r in @($longRoot, $mainRoot, $shortRoot, $wtRoot)) {
  $base = Join-Path $env:TEMP ($r.Substring($env:TEMP.Length).TrimStart('\').Split('\')[0])
  if (Test-Path $base) { Remove-Item $base -Recurse -Force -ErrorAction SilentlyContinue }
}
$beforeOutside = Outside-Worktrees
Write-Host "refs A=$shaA B=$shaB longRoot($($longRoot.Length) chars)=$longRoot"

# 1. Long root: refuses before creating anything.
$r = Run-BuildOnly $shaA $longRoot
$flat = $r.Text -replace '\s+', ' '
Check "long-refuses" ($r.Code -ne 0 -and $flat.Contains("too long") -and $flat.Contains($longRoot)) "exit=$($r.Code) refusal names the root and the limit"
$longKids = @(Get-ChildItem $longRoot -Force -ErrorAction SilentlyContinue)
Check "long-creates-nothing" ($longKids.Count -eq 0) "entries under long root: $($longKids.Count)"

# 2. Killed run cleaned by the next run; live sibling untouched.
$victimPwsh = Start-Preview 5672 $shaA $mainRoot
Check "victim-serves" (Wait-Http 5672) "pwsh=$victimPwsh"
$sibPwsh = Start-Preview 5671 $shaB $mainRoot
Check "sibling-serves" (Wait-Http 5671) "pwsh=$sibPwsh"
$victimWt = Join-Path $mainRoot "src-$shaA"
$sibWt = Join-Path $mainRoot "src-$shaB"
$victimChain = Chain-Ids (Listener-Pid 5672) $victimPwsh
Stop-Process -Id $victimPwsh -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
foreach ($id in $victimChain) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1
Check "victim-leftover" ((Test-Path $victimWt) -and ((git -C $repo worktree list --porcelain) -match [regex]::Escape($victimWt.Replace('\', '/')))) "worktree still registered after full kill"
$r = Run-BuildOnly $shaA $mainRoot
Check "cleanup-builds" ($r.Code -eq 0) "exit=$($r.Code)"
Check "victim-cleaned" (-not (Test-Path $victimWt)) "victim worktree gone after next run under same root"
Check "sibling-still-serving" (Wait-Http 5671 10) "port 5671 still HTTP 200"
Check "sibling-worktree-kept" (Test-Path $sibWt) "sibling worktree untouched"

# 3. Orphan (pwsh killed, server child alive): kept, then cleaned.
$orphanPwsh = Start-Preview 5673 $shaA $mainRoot
Check "orphan-serves" (Wait-Http 5673) "pwsh=$orphanPwsh"
$orphanWt = Join-Path $mainRoot "src-$shaA"
$orphanChain = Chain-Ids (Listener-Pid 5673) $orphanPwsh
Stop-Process -Id $orphanPwsh -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Check "orphan-still-serving" (Wait-Http 5673 10) "port 5673 answers with pwsh dead"
$r = Run-BuildOnly "" $mainRoot
Check "orphan-cleanup-builds" ($r.Code -eq 0) "exit=$($r.Code)"
Check "orphan-kept-while-live" ((Test-Path $orphanWt) -and (Wait-Http 5673 10)) "worktree kept and serving after cleanup run"
foreach ($id in $orphanChain) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1
$r = Run-BuildOnly "" $mainRoot
Check "orphan-cleaned-after-stop" (-not (Test-Path $orphanWt)) "worktree gone once orphan stopped, exit=$($r.Code)"
Check "sibling-still-serving-2" (Wait-Http 5671 10) "port 5671 still HTTP 200"

# Same -Ref while live under this root: refused, sibling untouched.
$r = Run-BuildOnly $shaB $mainRoot
$flat = $r.Text -replace '\s+', ' '
Check "same-ref-refused-while-live" ($r.Code -ne 0 -and $flat.Contains("already has a live run")) "exit=$($r.Code)"
Check "sibling-still-serving-3" (Wait-Http 5671 10) "port 5671 still HTTP 200 after refusal"

# 4. Controls.
$r = Run-BuildOnly $shaA $shortRoot
Check "control-short-ref" ($r.Code -eq 0 -and (Test-Path (Join-Path $shortRoot "$shaA\index.html"))) "exit=$($r.Code)"
$r = Run-BuildOnly "" $wtRoot
$wtOut = Get-ChildItem $wtRoot -Directory -Filter "worktree-*" -ErrorAction SilentlyContinue | Select-Object -First 1
Check "control-working-tree" ($r.Code -eq 0 -and $wtOut -and (Test-Path (Join-Path $wtOut.FullName "index.html"))) "exit=$($r.Code) out=$($wtOut.Name)"

# Stop the sibling (own pids only) and clean its leftover.
$sibChain = Chain-Ids (Listener-Pid 5671) $sibPwsh
Stop-Process -Id $sibPwsh -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
foreach ($id in $sibChain) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
$r = Run-BuildOnly "" $mainRoot
Check "sibling-cleaned" (-not (Test-Path $sibWt)) "sibling leftover gone after final cleanup, exit=$($r.Code)"

$afterOutside = Outside-Worktrees
Check "outside-worktrees-same" (-not (Compare-Object $beforeOutside $afterOutside)) "before=$($beforeOutside.Count) after=$($afterOutside.Count) outside own roots"

if (-not $Keep) {
  foreach ($baseName in @("k1188e-repro-long", "k1188e-repro-main", "k1188e-repro-short", "k1188e-repro-wt", "k1188e-long", "k1188e-short", "k1188e-kill", "k1188e-thr")) {
    $b = Join-Path $env:TEMP $baseName
    if (Test-Path $b) { Remove-Item $b -Recurse -Force -ErrorAction SilentlyContinue }
  }
}
if ($failures.Count) { Write-Host "RESULT FAIL: $($failures -join ', ')"; exit 1 }
Write-Host "RESULT PASS (all checks)"
exit 0
