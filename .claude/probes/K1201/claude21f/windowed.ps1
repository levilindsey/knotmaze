# K1201, Claude's check of 21F (2026-11-05). census21f.txt's step column is ridge_joint.ts's metric
# without the reach window (census21f.ts sets uKReach to 1e6). This weights each play-reach meeting
# end's step by kReachWin at its joint (paint_math.ts: 1 - smooth01((d - (reach - f)) / f), with
# f = min(PULSE_REACH_FADE 1.0, reach / 2) as paint_state.ts sets uKReach[1]); d is the end's dB.
# Reach: 8 for loop and x4 (pr=8), 3 (the default) for cyc and the dailies.
# Run: pwsh -NoProfile -File .claude/probes/K1201/claude21f/windowed.ps1 (writes windowed.txt beside it)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $PSCommandPath
$src = Join-Path $here '..\out\census21f.txt'
$pat = '^\s+(\S+) head (\S+) e(\d+) \S+ end (\S+) xR (-?[\d.]+) span/W ([\d.]+) dA ([\d.]+) dB ([\d.]+) onCycle \S+ step ([\d.]+)'
function Smooth01([double]$t) { [double]$u = [Math]::Min([double]1.0, [Math]::Max([double]0.0, $t)); return $u * $u * (3.0 - 2.0 * $u) }
$rows = foreach ($line in (Get-Content $src)) {
  if ($line -notmatch $pat) { continue }
  $maze = $Matches[1]
  [double]$reach = if ($maze -in @('loop', 'x4')) { 8.0 } else { 3.0 }
  [double]$f = [Math]::Min([double]1.0, 0.5 * $reach)
  [double]$dB = $Matches[8]; [double]$step = $Matches[9]
  [double]$win = 1.0 - (Smooth01 (($dB - ($reach - $f)) / $f))
  [pscustomobject]@{ maze = $maze; head = $Matches[2]; edge = "e$($Matches[3])"; end = $Matches[4]; xR = [double]$Matches[5]
    span = [double]$Matches[6]; dA = [double]$Matches[7]; dB = $dB; reach = $reach; step = $step; win = $win; eff = $step * $win }
}
$o = @('K1201 21F: play-reach meeting ends (xR < 0.5) weighted by the reach window, from census21f.txt', '')
$o += 'maze       ends  over0.1  over0.3  heads>0.3  max windowed'
foreach ($g in ($rows | Group-Object maze)) {
  $hi = @($g.Group | Where-Object eff -gt 0.3)
  $o += '{0,-9} {1,5} {2,8} {3,8} {4,10}  {5:N3}' -f $g.Name, $g.Count, @($g.Group | Where-Object eff -gt 0.1).Count, $hi.Count, @($hi.head | Sort-Object -Unique).Count, ($g.Group | Measure-Object eff -Maximum).Maximum
}
$all3 = @($rows | Where-Object eff -gt 0.3)
$d3 = @($all3 | Where-Object { $_.maze -like 'daily-*' })
$o += ''
$o += "all: $($rows.Count) ends, $($all3.Count) over 0.3; dailies: $($d3.Count) ends over 0.3 at $(@($d3 | ForEach-Object { "$($_.maze)|$($_.head)" } | Sort-Object -Unique).Count) heads, $(@($d3 | Where-Object { [Math]::Abs($_.span - 2.236) -lt 1e-3 -and $_.dA -eq 0 -and [Math]::Abs($_.dB - 2.236) -lt 1e-3 }).Count) of them span 2.236 with dA 0 and dB 2.236"
$o += ''
$o += 'every row: maze head edge end xR span dA dB reach step window windowed'
foreach ($r in $rows) { $o += '{0} {1} {2} {3} {4:N3} {5:N3} {6:N3} {7:N3} {8} {9:N4} {10:N3} {11:N3}' -f $r.maze, $r.head, $r.edge, $r.end, $r.xR, $r.span, $r.dA, $r.dB, $r.reach, $r.step, $r.win, $r.eff }
[IO.File]::WriteAllText((Join-Path $here 'windowed.txt'), ($o -join "`n") + "`n")
$o[0..13]