# K1588 s3: K1482's guards (guards.ps1, as K1584's guards_run.ps1 calls it with -NoBar) WITHOUT the two drag checks
# (K1600: the brief leaves them out), on an already-served build: hold, hold_gfk0, panelopen, all three under ONE
# take of scripts/perf_lock.ps1 (the lock has no queue: a waiter wins a 5 s polling race, and three separate takes
# lost every race to two other agents' sequences for an hour on 2026-11-24), the same child commands and pass lines
# as guards.ps1. npm test is run separately on the commit.
#   pwsh -NoProfile -File guards_nodrag.ps1 -Port 5640 -Tag j5 -Ref <commit>     (-NoLock: the inner run, lock held)
# Outputs (untracked): .claude/probes/K1588/s3/out/guards_<Tag>/ (<guard>.txt, summary.txt).
param([Parameter(Mandatory)][int]$Port, [Parameter(Mandatory)][string]$Tag, [Parameter(Mandatory)][string]$Ref, [switch]$NoLock)
$here = $PSScriptRoot
$repo = (Resolve-Path (Join-Path $here '..\..\..\..')).Path
$probes = Join-Path $repo '.claude/probes'
$OutDir = Join-Path $here "out/guards_$Tag"; New-Item -ItemType Directory $OutDir -Force | Out-Null
$Owner = "claude K1588 s3 guards"
$prof = Join-Path $env:TEMP "k1588s3-guards-$Ref"
$base = "http://localhost:$Port"
$link = "$base/?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&rp=gf"
$summary = Join-Path $OutDir 'summary.txt'
function Q([string]$s) { "'" + $s.Replace("'", "''") + "'" }
if (-not $NoLock) {
  "guards (no drag) $Tag ref $Ref page $base waiting for the perf lock from $(Get-Date -Format s)" | Out-File $summary -Encoding utf8
  $cmd = "pwsh -NoProfile -File $(Q $PSCommandPath) -Port $Port -Tag $(Q $Tag) -Ref $(Q $Ref) -NoLock"
  & pwsh -NoProfile -File (Join-Path $repo 'scripts/perf_lock.ps1') -Owner $Owner -What "guards $Tag (hold, hold_gfk0, panelopen)" -Cmd $cmd -MaxWaitMin 120 | Out-Host
  exit $LASTEXITCODE
}
"guards (no drag) $Tag ref $Ref page $base started $(Get-Date -Format s)" | Out-File $summary -Append -Encoding utf8
function Invoke-Guard([string]$Name, [string]$ChildCode) {
  $txt = Join-Path $OutDir "$Name.txt"
  $inner = "Set-Location $(Q $repo); `$o = & { $ChildCode } 2>&1; `$c = `$LASTEXITCODE; `$o | ForEach-Object { [string]`$_ } | Set-Content $(Q $txt) -Encoding utf8; exit `$c"
  $b64 = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($inner))
  & pwsh -NoProfile -EncodedCommand $b64 | Out-Host
  return $LASTEXITCODE
}
function Report([string]$Label, [bool]$Pass, [string]$Numbers) {
  $line = "$(if ($Pass) { 'PASS' } else { 'FAIL' }) ${Label}: $Numbers"; Write-Host $line; $line | Out-File $summary -Append -Encoding utf8
  return $(if ($Pass) { 0 } else { 1 })
}
$failed = 0
foreach ($g in @(@('hold', $link), @('hold_gfk0', "$link&gfk=0"))) {
  "== $($g[0]) $(Get-Date -Format HH:mm:ss)"
  $code = Invoke-Guard $g[0] "`$env:GF_KRETRY='1'; node $(Q (Join-Path $probes 'K1450/hold.mjs')) $(Q $g[1]) $(Q (Join-Path $OutDir $g[0])) $(Q $prof) 60"
  $t = Get-Content (Join-Path $OutDir "$($g[0]).txt") -Raw -ErrorAction SilentlyContinue
  $mm = [regex]::Match("$t", '"max":\s*(\d+)'); $mn = [regex]::Match("$t", '"min":\s*(\d+)')
  $nums = if ($mm.Success -and $mn.Success) { "60/60 frames, edges min $($mn.Groups[1].Value) max $($mm.Groups[1].Value)" } else { "exit $code (see $($g[0]).txt)" }
  $failed += Report $g[0] ($code -eq 0 -and "$t" -match 'PASS: all 60 frames') $nums
}
"== panelopen $(Get-Date -Format HH:mm:ss)"
$code = Invoke-Guard 'panelopen' "`$env:GF_KRETRY='1'; node $(Q (Join-Path $probes 'K1482/s15/panelopen.mjs')) $(Q $base) $(Q $prof)"
$t = "$(Get-Content (Join-Path $OutDir 'panelopen.txt') -Raw -ErrorAction SilentlyContinue)".Trim()
$failed += Report 'panelopen' ($code -eq 0 -and $t -match '(?m)^1\s*$') "panelOpen=$($t -split '\s+' | Select-Object -Last 1) exit $code"
"GUARDS (no drag) $Tag failed=$failed $(Get-Date -Format HH:mm:ss)"
exit $failed
