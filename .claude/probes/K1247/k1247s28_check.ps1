# K1247 s28: rebuild the digest and profile bundles from the worktree's src, compare each frame's
# digests with master's (out/s28/dig_master_*.txt) and print the Node part times on def.
#   pwsh .claude/probes/K1247/k1247s28_check.ps1 [-NoProf] [-R 6] [-Tag name]
param([switch]$NoProf, [int]$R = 6, [string]$Tag = "branch")
$ErrorActionPreference = "Stop"
$root = (Resolve-Path "$PSScriptRoot/../../..").Path
Set-Location $root
$o = ".claude/probes/K1247/out/s28"
node .claude/probes/K1247/k1247s28_build.mjs .claude/probes/K1247/k1247s28_digest.ts "$o/dg" | Out-Null
$bad = 0
foreach ($c in @(@("def", "2"), @("fat", "2"), @("def", "x"), @("def", "1"))) {
  $s = $c[0]; $m = $c[1]
  $ref = if ($m -eq "2") { "$o/dig_master_$s.txt" } else { "$o/dig_master_${s}_$m.txt" }
  $got = "$o/dig_${Tag}_${s}_$m.txt"
  node "$o/dg/k1247s28_digest.mjs" "$o/drag/$s" $m > $got 2>&1
  $a = Get-Content $ref; $b = Get-Content $got
  $d = Compare-Object $a $b
  if ($d) {
    $bad++
    $first = ($b | Where-Object { $a -notcontains $_ } | Select-Object -First 1)
    "$s fillRec $m : DIFFERS ($(@($d).Count) lines); first: $first"
    "   master: $(($a | Where-Object { $_.Split(' ')[0] -eq $first.Split(' ')[0] }))"
  } else { "$s fillRec $m : identical ($($b[-1]))" }
}
if (-not $NoProf) {
  node .claude/probes/K1247/k1247s28_build.mjs .claude/probes/K1247/k1247s28_prof.ts "$o/prof/bb" | Out-Null
  node "$o/prof/bb/k1247s28_prof.mjs" "$o/drag/def" $R 0
}
exit $bad
