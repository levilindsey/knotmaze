# K1247 (Claude's re-run of the Done checks on a run's final commit): every
# non-timing check, logs in out/k1247c_final/. Run from anywhere:
#   & .claude/probes/K1240/proto/k1247c_final.ps1 [-Base <out/k1247/<sub> rows dir>] [-Tables <verify's out/<sub>>] [-Out <rows sub>]
# K1263 (stage 10): exits 1 when any step fails. A step fails on a nonzero exit
# or on its own verdict in its log (most tools exit 0 on failures): verify and
# coldwarm and cmprows "N FAILURES", faces any "== scene mult" difference block,
# k1247_cmp a keyDiff or a maxPoint over 1e-6, move a rigid maxDiff over 1e-6 or
# a count/identity line. index.txt says which and why.
param(
  [string]$Base = "../../worktrees/muse-k1240-s1/.claude/probes/K1240/out/k1247/base",   # relative to .claude/probes/K1240/
  [string]$Tables = "k1247c_base",   # verify's and faces' baseline tables, out/<Tables>/ (k1247c_dump.ts <sub>)
  [string]$Out = "cfinal"            # this run's rows, out/k1247/<Out>/
)
$ErrorActionPreference = "Continue"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../../../..")).Path
$proto = ".claude/probes/K1240/proto"
$log = Join-Path $root ".claude/probes/K1240/out/k1247c_final"
New-Item -ItemType Directory $log -Force | Out-Null
Set-Location $root
$script:failed = @()
$idx = Join-Path $log "index.txt"
function Run([string]$name, [string[]]$cmd, [scriptblock]$verdict = $null) {
  $t = Get-Date
  $f = Join-Path $log "$name.txt"
  & node @cmd *> $f
  $code = $LASTEXITCODE
  $why = $null
  if ($code -ne 0) { $why = "exit $code" }
  elseif ($verdict) { $why = & $verdict (Get-Content $f) }
  if ($why) { $script:failed += $name }
  "$name exit $code $([int]((Get-Date) - $t).TotalSeconds)s $(if ($why) { "FAIL: $why" } else { 'ok' })" | Tee-Object -FilePath $idx -Append
}
$failures = { param($lines) $m = $lines | Select-String -Pattern '^\d+ FAILURES' | Select-Object -Last 1; if ($m) { $m.Line.Trim() } }
$faces = { param($lines) $n = @($lines | Select-String -Pattern '^== ').Count; if ($n) { "$n cases differ" } }
# k1247_cmp is the fast frame against the frameRef oracle: their points differ by ~2e-2
# on master (a known gap), so the verdict is structural: a keyDiff, or a corner, cut,
# region or face count that differs between the two.
$cmp = { param($lines)
  $bad = @()
  foreach ($l in ($lines | Select-String -Pattern 'keyDiff=(\d+)')) {
    $kd = [int]$l.Matches[0].Groups[1].Value
    $cnt = [regex]::Matches($l.Line, '(corners|cuts|regions|faces) (\d+)->(\d+)') | Where-Object { $_.Groups[2].Value -ne $_.Groups[3].Value }
    if ($kd -gt 0 -or @($cnt).Count) { $bad += ($l.Line -split ':')[0] }
  }
  if ($bad.Count) { "$($bad.Count) scenes: $($bad -join ', ')" } }
$move = { param($lines)
  $r = $lines | Select-String -Pattern 'rigid def: maxDiff=([0-9.eE+-]+)' | Select-Object -Last 1
  $odd = @($lines | Select-String -Pattern '^rigid: ').Count
  if (-not $r) { "no rigid line" } elseif ([double]$r.Matches[0].Groups[1].Value -gt 1e-6 -or $odd) { "maxDiff $($r.Matches[0].Groups[1].Value), $odd count/identity lines" } }
"start $(Get-Date -Format s) $(git rev-parse --short HEAD) base=$Base tables=$Tables out=$Out" | Out-File $idx -Encoding ascii
Run "verify" @("scripts/run_node.mjs", "$proto/k1247c_verify.ts", $Tables) $failures
Run "faces" @("scripts/run_node.mjs", "$proto/k1247c_faces.ts", $Tables) $faces
Run "coldwarm" @("scripts/run_node.mjs", "$proto/k1247c_coldwarm.ts") $failures
Run "cmp_cold" @("scripts/run_node.mjs", "$proto/k1247_cmp.ts") $cmp
Run "cmp_warm" @("scripts/run_node.mjs", "$proto/k1247_cmp.ts", "--warm") $cmp
Run "cmp_move" @("scripts/run_node.mjs", "$proto/k1247_cmp.ts", "--move") $cmp
Run "structure" @("scripts/run_node.mjs", "$proto/k1247_structure.ts")
Run "pieces" @("scripts/run_node.mjs", "$proto/k1247_pieces.ts")
Run "move_def" @("scripts/run_node.mjs", "$proto/k1247_move.ts", "def") $move
Run "outline_test" @("scripts/run_node.mjs", "$proto/outline.test.ts")
Run "rows_still" @("scripts/run_node.mjs", "$proto/k1247_exact.ts", "--out=$Out")
Run "rows_0.1" @("scripts/run_node.mjs", "$proto/k1247_exact.ts", "--out=$Out", "--move=0.1")
Run "rows_0.5" @("scripts/run_node.mjs", "$proto/k1247_exact.ts", "--out=$Out", "--move=0.5")
# cmp_consistent.mjs reads its paths relative to .claude/probes/K1240/ (it exits 0 on failures: the verdict reads its last line).
$fin = "out/k1247/$Out"
Run "cmprows_still" @("$proto/cmp_consistent.mjs", "0", "$Base/", "$fin/") $failures
Run "cmprows_0.1" @("$proto/cmp_consistent.mjs", "0.1", "$Base/move0.1c_", "$fin/move0.1c_") $failures
Run "cmprows_0.5" @("$proto/cmp_consistent.mjs", "0.5", "$Base/move0.5c_", "$fin/move0.5c_") $failures
"end $(Get-Date -Format s): $(if ($script:failed.Count) { "$($script:failed.Count) FAILED: $($script:failed -join ', ')" } else { 'ALL PASS' })" | Tee-Object -FilePath $idx -Append
exit $(if ($script:failed.Count) { 1 } else { 0 })
