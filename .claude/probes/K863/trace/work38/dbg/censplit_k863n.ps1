# K863 J3n: the census split, J3N's rows against J3M's, row by row (both written by checks_k863n.ps1's cens_c step over
# the words J3N changes). A copy of work37\dbg\censplit_k863m.ps1 whose spot is only the forms that CHANGED between the
# two candidates' "k863m" blocks (as local_k863n.py's is): a row is IN the spot when its source is a k863m exit of a
# class whose form changed ("k863m exit high", for J3n) or it is a tail of a letter whose "fin" changed (b f p v w for
# J3n; o's is J3M's and stays outside). Every other row is OUTSIDE it and is counted by the fields that differ
# (NaN = NaN). The check: outside the spot only kmax_p95 and spikes may move (both are scaled by the word's p95
# curvature, which a changed join or tail moves).
# Run from the trace dir: pwsh -NoProfile -File work38\dbg\censplit_k863n.ps1 [-Base <json>] [-Cand <json>]
#   [-BaseParams <join_params.json>] [-Params <join_params.json>] [-Out <txt>]
param([string]$Base = "work38\census_J3M.json", [string]$Cand = "work38\census_J3N.json",
  [string]$BaseParams = "work37\cand\J3M\join_params.json", [string]$Params = "work38\cand\J3N\join_params.json",
  [string]$Out = "work38\census_split.txt")
$rowsBase = (Get-Content -Raw $Base | ConvertFrom-Json).rows
$rowsCand = (Get-Content -Raw $Cand | ConvertFrom-Json).rows
$m0 = (Get-Content -Raw $BaseParams | ConvertFrom-Json).k863m
$m1 = (Get-Content -Raw $Params | ConvertFrom-Json).k863m
function J($v) { if ($null -eq $v) { "null" } else { $v | ConvertTo-Json -Compress -Depth 8 } }
$finLetters = @($m1.fin.PSObject.Properties.Name | Where-Object { (J $m1.fin.$_) -ne (J $m0.fin.$_) })
$classes = @()
foreach ($X in $m1.exit.PSObject.Properties.Name) {
  foreach ($c in "high", "low") { if ((J $m1.exit.$X.$c) -ne (J $m0.exit.$X.$c) -and $classes -notcontains $c) { $classes += $c } }
}
function V($v) {
  if ($null -eq $v) { "null" } elseif ($v -is [double] -or $v -is [int] -or $v -is [long] -or $v -is [decimal]) { "$v" }
  else { $v | ConvertTo-Json -Compress -Depth 8 }
}
$byId = @{}; foreach ($r in $rowsBase) { $byId[$r.id] = $r }
$inSpot = [ordered]@{}; $inChanged = 0; $outFields = @{}; $outRows = 0; $missing = @(); $outIds = @{}
foreach ($r in $rowsCand) {
  $o = $byId[$r.id]
  if (-not $o) { $missing += $r.id; continue }
  $diff = @($r.PSObject.Properties.Name | Where-Object { (V $r.$_) -ne (V $o.$_) })
  $key = $null
  if ("$($r.src)" -match '^k863m exit (high|low)' -and $classes -contains $Matches[1]) { $key = "join $($Matches[1])" }
  elseif ("$($r.type)" -eq "tail" -and "$($r.id)" -match 'tail\d+(.)$' -and $finLetters -contains $Matches[1]) { $key = "tail $($Matches[1])" }
  if ($key) {
    $inSpot[$key] = 1 + [int]$inSpot[$key]
    if ($diff.Count) { $inChanged++ }
    continue
  }
  if ($diff.Count) { $outRows++ }
  foreach ($f in $diff) { $outFields[$f] = 1 + [int]$outFields[$f]; if ($f -notin @("kmax_p95", "spikes")) { $outIds[$r.id] = 1 } }
}
$other = @($outFields.Keys | Where-Object { $_ -notin @("kmax_p95", "spikes") })
$lines = @(
  "K863 J3n census split: $Cand against $Base, $($rowsCand.Count) and $($rowsBase.Count) rows; changed fins $($finLetters -join ' '); changed exit classes $($classes -join ' ')",
  "in the spot: $(($inSpot.Values | Measure-Object -Sum).Sum) rows ($(@($inSpot.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name) $($_.Value)" }) -join ', ')), $inChanged of them changed",
  "outside it: $outRows rows differ; by field: $(@($outFields.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name) $($_.Value)" }) -join ', ')",
  "rows missing from the base: $($missing.Count)",
  "check (outside the spot only kmax_p95 and spikes move): $(if ($other.Count -or $missing.Count) { "FAIL ($($other -join ', '); rows $(@($outIds.Keys) -join ', '))" } else { 'ok' })"
)
[IO.File]::WriteAllText((Join-Path $PWD $Out), (($lines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding($false)))
$lines
