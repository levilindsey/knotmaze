# K1314 s3 follow-up: a like-for-like census diff. Two census JSONs (k1314_run.ps1 -Tag <tag>, out/s1/census_<tag>.json)
# made with the same census tools (the fillet reference, form_b_fillet) on two commits; matches finds by scene, kind
# and position (|dx|, |dy| < 0.06 world) over the Done bar's kinds, prints the counts per kind side by side, the finds
# only B has, and the finds only A has.
#   pwsh .claude/probes/K1314/k1314_ll_diff.ps1 -A <census_a.json> -B <census_b.json> [-Near muse_hash:j78,...]
# -Near lists junctions (scene:jN); finds whose `near` is one of them are counted per side (the claim's region).
param([Parameter(Mandatory)][string]$A, [Parameter(Mandatory)][string]$B, [string]$Near = '')
$kinds = @('stray_ink', 'hard_edge', 'paper', 'broken_ink', 'k1049')
$ja = (Get-Content $A -Raw | ConvertFrom-Json).arts; $jb = (Get-Content $B -Raw | ConvertFrom-Json).arts
$fa = @($ja | Where-Object { $kinds -contains $_.kind }); $fb = @($jb | Where-Object { $kinds -contains $_.kind })
"kind        A    B"
foreach ($k in $kinds + @('owner_only', 'tail_look')) { '{0,-10} {1,4} {2,4}' -f $k, @($ja | Where-Object kind -eq $k).Count, @($jb | Where-Object kind -eq $k).Count }
'{0,-10} {1,4} {2,4}' -f 'bar total', $fa.Count, $fb.Count
function Find-Match($x, $set) { $set | Where-Object { $_.scene -eq $x.scene -and $_.kind -eq $x.kind -and [Math]::Abs($_.x - $x.x) -lt 0.06 -and [Math]::Abs($_.y - $x.y) -lt 0.06 } | Select-Object -First 1 }
$onlyB = @($fb | Where-Object { -not (Find-Match $_ $fa) }); $onlyA = @($fa | Where-Object { -not (Find-Match $_ $fb) })
"only in B ($($onlyB.Count)):"; $onlyB | ForEach-Object { '  {0} {1} {2} ({3:N2}, {4:N2}) {5}' -f $_.scene, $_.near, $_.kind, $_.x, $_.y, $_.sub }
"only in A ($($onlyA.Count)):"; $onlyA | ForEach-Object { '  {0} {1} {2} ({3:N2}, {4:N2}) {5}' -f $_.scene, $_.near, $_.kind, $_.x, $_.y, $_.sub }
if ($Near) {
  $nj = $Near -split ','
  $inA = @($fa | Where-Object { $nj -contains "$($_.scene):$($_.near)" }); $inB = @($fb | Where-Object { $nj -contains "$($_.scene):$($_.near)" })
  $both = @($inB | Where-Object { Find-Match $_ $inA })
  "near the listed junctions: A $($inA.Count), B $($inB.Count), B's matched in A $($both.Count)"
}
