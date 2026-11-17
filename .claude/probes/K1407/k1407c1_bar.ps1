# K1407 c1: a CPU census counted against the bar. Finds of a listed kind within r of a spot in
# k1407c1_bar_exceptions.json (form B known wrong there) are counted apart; the rest are the differences
# to the bar, by category.
#   pwsh -NoProfile -File .claude/probes/K1407/k1407c1_bar.ps1 c1 m1 fix23c
param([Parameter(ValueFromRemainingArguments)][string[]]$Tags)
$dir = Join-Path $PSScriptRoot '../K1362/out/s1'
$ex = (Get-Content (Join-Path $PSScriptRoot 'k1407c1_bar_exceptions.json') -Raw | ConvertFrom-Json).spots
$cats = 'stray_ink', 'hard_edge', 'paper', 'broken_ink', 'k1049'
'{0,-8} {1,6} {2,6} {3,6} {4,7} {5,6} {6,6} {7,9}' -f 'tag', 'stray', 'hard', 'paper', 'broken', 'k1049', 'total', 'excepted'
foreach ($t in $Tags) {
  # a CPU census (s1) or, failing that, a GPU one (s2: k1407c1_gpucensus.ps1's merged tag, c2g / c3g)
  $jf = Join-Path $dir "census_$t.json"; if (-not (Test-Path $jf)) { $jf = Join-Path $PSScriptRoot "../K1362/out/s2/census_$t.json" }
  $arts = @((Get-Content $jf -Raw | ConvertFrom-Json).arts) | Where-Object { $cats -contains $_.kind }
  $n = @{}; foreach ($c in $cats) { $n[$c] = 0 }; $exc = 0
  foreach ($a in $arts) {
    $hit = $false
    foreach ($e in $ex) { if ($e.scene -eq $a.scene -and $e.kinds -contains $a.kind -and [Math]::Sqrt(($e.x - $a.x) * ($e.x - $a.x) + ($e.y - $a.y) * ($e.y - $a.y)) -lt $e.r) { $hit = $true; break } }
    if ($hit) { $exc++ } else { $n[$a.kind]++ }
  }
  $tot = ($cats | ForEach-Object { $n[$_] } | Measure-Object -Sum).Sum
  '{0,-8} {1,6} {2,6} {3,6} {4,7} {5,6} {6,6} {7,9}' -f $t, $n['stray_ink'], $n['hard_edge'], $n['paper'], $n['broken_ink'], $n['k1049'], $tot, $exc
}
