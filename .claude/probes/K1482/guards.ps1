# K1482 corner-stage guards (K1539, from stage 27's run27.ps1; run28.ps1 has the same sequence):
# the stage Done checks as one tracked script, so the next stage starts from them instead of
# rebuilding them in its worktree. The page is a preview of -Ref's code served on -Port (the bar
# builds -Ref and -BaseRef itself); run it from the checkout under test.
#
#   pwsh .claude/probes/K1482/guards.ps1 -Tag 27F_run1 -Port 5481 -Ref master -BaseRef master -BarPort 5482 -OutDir .claude/probes/K1539/out/27F/guards_run1 -Owner muse-27F [-NoBar] [-BarOnly]
#
# Guards, in run27's order, with the pass line each one prints (unchanged from the source script):
#   bar          pwsh K1436/k1436_bar.ps1 -Scenes ring,def,muse_hash,g41_user_tw64 -NoPerfLock (STRICT=1, GF_KRETRY=1):
#                bar.txt's first line "PASS new 0 grown 0 gone 0" and exit 0.
#   hold         node K1450/hold.mjs <link A gfh=1> <OutDir>/hold <profile> 60 (GF_KRETRY=1):
#                "PASS: all 60 frames show the maze".
#   hold_gfk0    the same hold on link A with &gfk=0 (the second corner try off): the same pass line.
#   panelopen    node K1482/s15/panelopen.mjs <base> <profile> (GF_KRETRY=1): prints 1 (panelOpen=1), exit 0.
#   dragcheck_b  node K1492/dragcheck_b.mjs <base> <OutDir>/dcb <profile> gfh (GF_KRETRY=1, TLK=border):
#                "DRAG CHECK: PASS" (each stop <= 200 px over TOL 24 from a fresh load).
#   dragcheck    node K1458/dragcheck.mjs <base> <OutDir>/dcf <profile> gfh (GF_KRETRY=1): "DRAG CHECK: PASS".
#   npm test     npm test with GF_KRETRY removed from its environment (K1543): exit 0.
#
# Every capture guard (all but npm test) runs through scripts/perf_lock.ps1 -Owner <Owner>, one guard
# at a time. Each guard's WHOLE output goes to <OutDir>/<guard>.txt (npm test's to npm_test.txt); the
# console gets one line per guard, "PASS|FAIL <guard>: <its numbers>". A failed npm test also prints
# the failed tests' files and names (vitest's JSON reporter). The exit code is the number of failed
# guards. GF_KRETRY is set for each child process exactly as run27's lines give it (1 for the bar and
# the capture guards, removed for npm test); STRICT and TLK likewise live only in their one child.
param(
  [string]$Tag = "guards",
  [int]$Port = 5481,
  [string]$Ref = "master",
  [string]$BaseRef = "",
  [int]$BarPort = 5482,
  [string]$OutDir = "",
  [string]$Owner = "",
  [switch]$NoBar,
  [switch]$BarOnly
)
$ErrorActionPreference = "Continue"
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
if (-not $BaseRef) { $BaseRef = $Ref }
if (-not $Owner) { $Owner = "muse-guards-$Tag" }
if (-not $OutDir) { $OutDir = Join-Path $repo ".claude/probes/K1482/out/guards/$Tag" }
$OutDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutDir)
New-Item -ItemType Directory $OutDir -Force | Out-Null
$refShort = (git -C $repo rev-parse --short=8 $Ref 2>$null)
if (-not $refShort) { $refShort = $Tag }
$prof = Join-Path $env:TEMP "k1482-guards-$refShort"
$base = "http://localhost:$Port"
$link = "$base/?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&rp=gf"
$probes = Join-Path $repo ".claude/probes"
$summary = Join-Path $OutDir "summary.txt"
"guards $Tag ref $Ref base $BaseRef page $base out $OutDir started $(Get-Date -Format s)" | Out-File $summary -Encoding utf8

function Wait-Mem {
  $t0 = Get-Date
  while ((((Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB) -lt 3 -or ((Get-PSDrive C).Free / 1GB) -lt 8) -and ((Get-Date) - $t0).TotalMinutes -lt 15) { [Threading.Thread]::Sleep(20000) }
}
function Q([string]$s) { "'" + $s.Replace("'", "''") + "'" }
# Run one guard as its own pwsh child (its env is set in the child only), optionally through the
# perf lock; the child's whole output lands in <OutDir>/<Name>.txt. Returns the child's exit code.
function Invoke-Guard([string]$Name, [string]$ChildCode, [bool]$UseLock) {
  $txt = Join-Path $OutDir "$Name.txt"
  $inner = "Set-Location $(Q $repo); `$o = & { $ChildCode } 2>&1; `$c = `$LASTEXITCODE; `$o | ForEach-Object { [string]`$_ } | Set-Content $(Q $txt) -Encoding utf8; exit `$c"
  $b64 = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($inner))
  if ($UseLock) {
    & pwsh -NoProfile -File (Join-Path $repo "scripts/perf_lock.ps1") -Owner $Owner -What "guards $Tag $Name" -Cmd "pwsh -NoProfile -EncodedCommand $b64" | Out-Host
  } else {
    & pwsh -NoProfile -EncodedCommand $b64 | Out-Host
  }
  return $LASTEXITCODE
}
function Get-GuardText([string]$Name) {
  $txt = Join-Path $OutDir "$Name.txt"
  if (Test-Path $txt) { return (Get-Content $txt -Raw) } else { return "" }
}
function Report([string]$Label, [bool]$Pass, [string]$Numbers) {
  $line = "$(if ($Pass) { 'PASS' } else { 'FAIL' }) ${Label}: $Numbers"
  Write-Host $line
  $line | Out-File $summary -Append -Encoding utf8
  return $(if ($Pass) { 0 } else { 1 })
}

$failed = 0
# --- bar (run27: GF_KRETRY=1 and STRICT=1 for this child, the bar under the lock with -NoPerfLock)
if (-not $NoBar) {
  "== bar $(Get-Date -Format HH:mm:ss)"
  $barCmd = "`$env:GF_KRETRY='1'; `$env:STRICT='1'; pwsh -NoProfile -File $(Q (Join-Path $probes 'K1436/k1436_bar.ps1')) -Ref $(Q $Ref) -Base $(Q $BaseRef) -Scenes ring,def,muse_hash,g41_user_tw64 -Port $BarPort -Tag $(Q $Tag) -NoPerfLock"
  $code = Invoke-Guard "bar" $barCmd $true
  $barTxtPath = Join-Path $probes "K1436/out/bar/$Tag/bar.txt"
  $nums = ""
  if (Test-Path $barTxtPath) { $nums = (Get-Content $barTxtPath -TotalCount 1).Trim() }
  if (-not $nums) {
    $m = [regex]::Match((Get-GuardText "bar"), "(PASS|FAIL)\s+new \d+ grown \d+ gone \d+[^\r\n]*")
    $nums = if ($m.Success) { $m.Value.Trim() } else { "exit $code (no verdict in bar.txt; see bar.txt in OutDir)" }
  }
  $failed += Report "bar" ($code -eq 0) $nums
}
if ($BarOnly) { "ALLDONE $(Get-Date -Format HH:mm:ss) failed=$failed"; exit $failed }

# --- hold, corner retry on (run27: GF_KRETRY=1 inherited by every capture child)
Wait-Mem
"== hold $(Get-Date -Format HH:mm:ss)"
$holdCmd = "`$env:GF_KRETRY='1'; node $(Q (Join-Path $probes 'K1450/hold.mjs')) $(Q $link) $(Q (Join-Path $OutDir 'hold')) $(Q $prof) 60"
$code = Invoke-Guard "hold" $holdCmd $true
$t = Get-GuardText "hold"
$mm = [regex]::Match($t, '"max":\s*(\d+)'); $mn = [regex]::Match($t, '"min":\s*(\d+)')
$nums = if ($mm.Success -and $mn.Success) { "60/60 frames, edges min $($mn.Groups[1].Value) max $($mm.Groups[1].Value)" } else { "exit $code (see hold.txt)" }
$failed += Report "hold" ($code -eq 0 -and $t -match "PASS: all 60 frames") $nums

# --- hold with gfk=0 (the second corner try off)
Wait-Mem
"== hold gfk=0 $(Get-Date -Format HH:mm:ss)"
$hold0Cmd = "`$env:GF_KRETRY='1'; node $(Q (Join-Path $probes 'K1450/hold.mjs')) $(Q ($link + '&gfk=0')) $(Q (Join-Path $OutDir 'hold_gfk0')) $(Q $prof) 60"
$code = Invoke-Guard "hold_gfk0" $hold0Cmd $true
$t = Get-GuardText "hold_gfk0"
$mm = [regex]::Match($t, '"max":\s*(\d+)'); $mn = [regex]::Match($t, '"min":\s*(\d+)')
$nums = if ($mm.Success -and $mn.Success) { "60/60 frames, edges min $($mn.Groups[1].Value) max $($mm.Groups[1].Value)" } else { "exit $code (see hold_gfk0.txt)" }
$failed += Report "hold_gfk0" ($code -eq 0 -and $t -match "PASS: all 60 frames") $nums

# --- panel open (the drag checks need knotmaze.panelOpen=1 in the shared profile)
Wait-Mem
"== panelopen $(Get-Date -Format HH:mm:ss)"
$panelCmd = "`$env:GF_KRETRY='1'; node $(Q (Join-Path $probes 'K1482/s15/panelopen.mjs')) $(Q $base) $(Q $prof)"
$code = Invoke-Guard "panelopen" $panelCmd $true
$t = (Get-GuardText "panelopen").Trim()
$failed += Report "panelopen" ($code -eq 0 -and $t -match "(?m)^1\s*$") "panelOpen=$($t -split '\s+' | Select-Object -Last 1) exit $code"

# --- drag checks (border first, as run27: TLK=border lives only in that child)
New-Item -ItemType Directory (Join-Path $OutDir "dcb"), (Join-Path $OutDir "dcf") -Force | Out-Null
Wait-Mem
"== dragcheck_b $(Get-Date -Format HH:mm:ss)"
$dcbCmd = "`$env:GF_KRETRY='1'; `$env:TLK='border'; node $(Q (Join-Path $probes 'K1492/dragcheck_b.mjs')) $(Q $base) $(Q (Join-Path $OutDir 'dcb')) $(Q $prof) gfh"
$code = Invoke-Guard "dragcheck_b" $dcbCmd $true
$t = Get-GuardText "dragcheck_b"
$stops = [regex]::Matches($t, "\| (\d+) of (\d+) px differ > (\d+)") | ForEach-Object { $_.Groups[1].Value }
$nums = if ($stops.Count) { "$($stops -join ' / ') px over TOL 24 (max $($stops | Measure-Object -Maximum | Select-Object -ExpandProperty Maximum) <= 200)" } else { "exit $code (see dragcheck_b.txt)" }
$failed += Report "dragcheck_b" ($code -eq 0 -and $t -match "DRAG CHECK: PASS") $nums

Wait-Mem
"== dragcheck $(Get-Date -Format HH:mm:ss)"
$dcfCmd = "`$env:GF_KRETRY='1'; node $(Q (Join-Path $probes 'K1458/dragcheck.mjs')) $(Q $base) $(Q (Join-Path $OutDir 'dcf')) $(Q $prof) gfh"
$code = Invoke-Guard "dragcheck" $dcfCmd $true
$t = Get-GuardText "dragcheck"
$stops = [regex]::Matches($t, "\| (\d+) of (\d+) px differ > (\d+)") | ForEach-Object { $_.Groups[1].Value }
$nums = if ($stops.Count) { "$($stops -join ' / ') px over TOL 24 (max $($stops | Measure-Object -Maximum | Select-Object -ExpandProperty Maximum) <= 200)" } else { "exit $code (see dragcheck.txt)" }
$failed += Report "dragcheck" ($code -eq 0 -and $t -match "DRAG CHECK: PASS") $nums

# --- npm test (run27 clears GF_KRETRY for this child only; K1543: the bar's 1 must not leak in)
"== npm test $(Get-Date -Format HH:mm:ss)"
$npmCmd = "Remove-Item Env:GF_KRETRY -ErrorAction SilentlyContinue; npm.cmd test"
$code = Invoke-Guard "npm_test" $npmCmd $false
$t = (Get-GuardText "npm_test") -replace '\x1b\[[0-9;]*m', ''
if ($code -eq 0) {
  $mf = [regex]::Match($t, "Test Files\s+(\d+) passed"); $mt = [regex]::Match($t, "Tests\s+(\d+) passed")
  $nums = if ($mf.Success -and $mt.Success) { "$($mf.Groups[1].Value) files, $($mt.Groups[1].Value) tests passed" } else { "exit 0 (see npm_test.txt)" }
  $failed += Report "npm test" $true $nums
} else {
  # Name the failed tests from vitest's JSON reporter (GF_KRETRY removed here too).
  $jsonPath = Join-Path $OutDir "npm_test.json"
  $jsonCmd = "Remove-Item Env:GF_KRETRY -ErrorAction SilentlyContinue; Set-Location $(Q $repo); npx.cmd vitest run --reporter=json --outputFile=$(Q $jsonPath) | Out-Null; exit 0"
  $b64 = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($jsonCmd))
  & pwsh -NoProfile -EncodedCommand $b64 | Out-Null
  $fails = @()
  if (Test-Path $jsonPath) {
    try {
      $j = Get-Content $jsonPath -Raw | ConvertFrom-Json
      foreach ($f in $j.testResults) { foreach ($a in $f.assertionResults) { if ($a.status -eq "failed") { $fails += "$($f.name) > $($a.fullName)" } } }
    } catch {}
  }
  if ($fails.Count) {
    foreach ($f in $fails) { "  failed: $f"; "  failed: $f" | Out-File $summary -Append -Encoding utf8 }
    $nums = "exit $code; $($fails.Count) failed: $($fails -join '; ')"
  } elseif ($t -match "error TS") {
    $nums = "exit $code; typecheck failed (see npm_test.txt)"
  } else {
    $nums = "exit $code (see npm_test.txt)"
  }
  $failed += Report "npm test" $false $nums
}
"ALLDONE $(Get-Date -Format HH:mm:ss) failed=$failed"
exit $failed
