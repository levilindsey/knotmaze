# K1040 S1c: compare two scenes.ts logs (out/s1c/logs/scenes_<tag>.txt).
# Per scene: form B's #1 failing px and free ends, before -> after; then, per
# shared check, how many of the scenes FAIL it, before -> after.
# Usage: pwsh .claude/probes/K1040/s1/gate_table.ps1 <before.txt> <after.txt>
param([string]$Before, [string]$After)
function Read-Log([string]$path) {
  $res = [ordered]@{}
  $checks = @{}
  $scene = $null
  foreach ($line in [IO.File]::ReadLines((Resolve-Path $path).Path)) {
    if ($line -match '^== (\S+):') { $scene = $Matches[1]; $res[$scene] = @{ one = 0; free = 0 }; continue }
    if (-not $scene) { continue }
    if ($line -match '#1 \(form B\) fail: (\d+) px') { $res[$scene].one = [int]$Matches[1] }
    elseif ($line -match '#1 \(form B\) pass') { $res[$scene].one = 0 }
    elseif ($line -match '^\s*free ends: (\d+)') { $res[$scene].free = [int]$Matches[1] }
    elseif ($line -match '^\s*(#\d+ [^:]+): (PASS|FAIL)') {
      $k = $Matches[1]
      if (-not $checks.ContainsKey($k)) { $checks[$k] = 0 }
      if ($Matches[2] -eq "FAIL") { $checks[$k]++ }
    }
  }
  return @{ scenes = $res; checks = $checks }
}
$a = Read-Log $Before
$b = Read-Log $After
$s1 = 0; $s2 = 0; $f1 = 0; $f2 = 0
foreach ($k in $a.scenes.Keys) {
  $x = $a.scenes[$k]; $y = $b.scenes[$k]
  if (-not $y) { $y = @{ one = "?"; free = "?" } }
  "{0,-22} #1 {1,5} -> {2,5}  free ends {3,4} -> {4,4}" -f $k, $x.one, $y.one, $x.free, $y.free
  $s1 += $x.one; $f1 += $x.free
  if ($y.one -ne "?") { $s2 += $y.one; $f2 += $y.free }
}
"All #1 $s1 -> $s2, free ends $f1 -> $f2"
"Shared checks, scenes failing (of $($a.scenes.Count)):"
foreach ($k in ($a.checks.Keys + $b.checks.Keys | Sort-Object -Unique)) {
  "  {0}: {1} -> {2}" -f $k, $a.checks[$k], $b.checks[$k]
}
