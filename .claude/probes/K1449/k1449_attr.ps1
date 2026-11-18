# K1449: attribute each tie+ramp find of out/map2/<variant>_<scene>.json to a flag-off defect (any class, same kind,
# within -R world, K1438's out/scan/off_<scene>.json) or call it new to home membership. Per variant: existing/new
# finds and px, and the new ones by kind:class.
#   pwsh -NoProfile -File .claude/probes/K1449/k1449_attr.ps1 [-Variants base_d,clip_d,clip_0] [-R 0.15]
param([string[]]$Variants = @("base_0", "clip_0", "base_d", "clip_d", "base_1.2", "clip_1.2"), [double]$R = 0.15)
$off = @{}
foreach ($f in Get-ChildItem (Join-Path $PSScriptRoot "../K1438/out/scan/off_*.json")) { $j = Get-Content $f -Raw | ConvertFrom-Json; $off[$j.scene] = $j.finds }
foreach ($v in $Variants) {
  $ex = 0; $exPx = 0; $nw = 0; $nwPx = 0; $byK = @{}; $big = @()
  foreach ($f in Get-ChildItem (Join-Path $PSScriptRoot "out/map2/$($v)_*.json")) {
    $j = Get-Content $f -Raw | ConvertFrom-Json
    foreach ($x in $j.finds) {
      if ($x.cls -notin 'tie', 'ramp') { continue }
      $hit = $false
      foreach ($o in $off[$j.scene]) { if ($o.kind -eq $x.kind -and [math]::Abs($o.x - $x.x) -le $R -and [math]::Abs($o.y - $x.y) -le $R -and (($o.x - $x.x) * ($o.x - $x.x) + ($o.y - $x.y) * ($o.y - $x.y)) -le $R * $R) { $hit = $true; break } }
      if ($hit) { $ex++; $exPx += $x.px } else { $nw++; $nwPx += $x.px; $k = "$($x.kind):$($x.cls)"; $byK[$k] = 1 + [int]$byK[$k]; $big += [pscustomobject]@{ s = "$($j.scene):$([math]::Round($x.x,2)):$([math]::Round($x.y,2))"; k = $k; px = $x.px } }
    }
  }
  "$v`texisting $ex ($exPx px)`tnew $nw ($nwPx px)`t" + (($byK.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { "$($_.Key) $($_.Value)" }) -join ', ')
  "  largest new: " + (($big | Sort-Object px -Descending | Select-Object -First 5 | ForEach-Object { "$($_.s) $($_.k) $($_.px)" }) -join '; ')
}