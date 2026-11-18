# K1449: tabulate out/<tag>/<variant>_<scene>.json: per variant, all finds and tie+ramp finds/px, per kind:class, per scene.
#   pwsh -NoProfile -File .claude/probes/K1449/k1449_table.ps1 [-Tag scan] [-PerScene]
param([string]$Tag = "scan", [switch]$PerScene)
$dir = Join-Path $PSScriptRoot "out/$Tag"
$rows = foreach ($f in Get-ChildItem "$dir/*.json") {
  $j = Get-Content $f -Raw | ConvertFrom-Json
  foreach ($x in $j.finds) { [pscustomobject]@{ v = $j.sfx; sc = $j.scene; k = "$($x.kind):$($x.cls)"; tr = $x.cls -in 'tie', 'ramp'; px = $x.px } }
}
$vs = $rows | Group-Object v
"variant`tall`ttie+ramp finds/px"
foreach ($g in $vs) { $t = @($g.Group | Where-Object tr); "$($g.Name)`t$($g.Count)`t$($t.Count)/$(($t | Measure-Object px -Sum).Sum)" }
""
"kind:class (tie+ramp) per variant"
$ks = $rows | Where-Object tr | Group-Object k | Sort-Object Count -Descending
$hdr = "kind:class`t" + (($vs | ForEach-Object Name) -join "`t"); $hdr
foreach ($k in $ks) { $line = $k.Name; foreach ($g in $vs) { $line += "`t" + @($g.Group | Where-Object { $_.tr -and $_.k -eq $k.Name }).Count }; $line }
if ($PerScene) {
  ""
  "scene (tie+ramp finds/px)`t" + (($vs | ForEach-Object Name) -join "`t")
  foreach ($s in ($rows | Group-Object sc | ForEach-Object Name)) { $line = $s; foreach ($g in $vs) { $t = @($g.Group | Where-Object { $_.tr -and $_.sc -eq $s }); $line += "`t$($t.Count)/$(($t | Measure-Object px -Sum).Sum)" }; $line }
}
