# K863 J3m: the census split, the candidate's rows against J3L's, row by row (both written by checks_k863m.ps1's cens_c
# step over the words the candidate changes). A row is IN the spot when the candidate's source is a k863m exit
# ("k863m exit high|low") or it is a tail of a letter the candidate's k863m "fin" names; every other row is OUTSIDE it
# and is counted by the fields that differ (NaN = NaN). The check: outside the spot only kmax_p95 and spikes may move
# (both are scaled by the word's p95 curvature, which a changed join moves). census_cmp.txt (censcmp_k863k.py) compares
# each build with v6.8's rows instead, and its "spot" is J3k's (q's tails), not this one.
# Run from the trace dir: pwsh -NoProfile -File work37\dbg\censplit_k863m.ps1 [-Base <json>] [-Cand <json>]
#   [-Params <cand join_params.json>] [-Out <txt>]
param([string]$Base = "work37\census_J3L.json", [string]$Cand = "work37\census_J3M.json",
  [string]$Params = "work37\cand\J3M\join_params.json", [string]$Out = "work37\census_split.txt")
$rowsBase = (Get-Content -Raw $Base | ConvertFrom-Json).rows
$rowsCand = (Get-Content -Raw $Cand | ConvertFrom-Json).rows
$finLetters = @((Get-Content -Raw $Params | ConvertFrom-Json).k863m.fin.PSObject.Properties.Name)
function V($v) {
  if ($null -eq $v) { "null" } elseif ($v -is [double] -or $v -is [int] -or $v -is [long] -or $v -is [decimal]) { "$v" }
  else { $v | ConvertTo-Json -Compress -Depth 8 }
}
$byId = @{}; foreach ($r in $rowsBase) { $byId[$r.id] = $r }
$inSpot = [ordered]@{}; $inChanged = 0; $outFields = @{}; $outRows = 0; $missing = @()
foreach ($r in $rowsCand) {
  $o = $byId[$r.id]
  if (-not $o) { $missing += $r.id; continue }
  $diff = @($r.PSObject.Properties.Name | Where-Object { (V $r.$_) -ne (V $o.$_) })
  $key = $null
  if ("$($r.src)" -match '^k863m exit (high|low)') { $key = "join $($Matches[1])" }
  elseif ("$($r.type)" -eq "tail" -and "$($r.id)" -match 'tail\d+(.)$' -and $finLetters -contains $Matches[1]) { $key = "tail $($Matches[1])" }
  if ($key) {
    $inSpot[$key] = 1 + [int]$inSpot[$key]
    if ($diff.Count) { $inChanged++ }
    continue
  }
  if ($diff.Count) { $outRows++ }
  foreach ($f in $diff) { $outFields[$f] = 1 + [int]$outFields[$f] }
}
$other = @($outFields.Keys | Where-Object { $_ -notin @("kmax_p95", "spikes") })
$lines = @(
  "K863 J3m census split: $Cand against $Base, $($rowsCand.Count) and $($rowsBase.Count) rows; fin letters $($finLetters -join ' ')",
  "in the spot: $(($inSpot.Values | Measure-Object -Sum).Sum) rows ($(@($inSpot.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name) $($_.Value)" }) -join ', ')), $inChanged of them changed",
  "outside it: $outRows rows differ; by field: $(@($outFields.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name) $($_.Value)" }) -join ', ')",
  "rows missing from the base: $($missing.Count)",
  "check (outside the spot only kmax_p95 and spikes move): $(if ($other.Count -or $missing.Count) { "FAIL ($($other -join ', '))" } else { 'ok' })"
)
[IO.File]::WriteAllText((Join-Path $PWD $Out), (($lines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding($false)))
$lines
