# K1040 S3b: one markdown table of the GPU timer's p50 / p95 (ms) per scene
# from several out/time_summary_<label>.md files, in the order given.
# Usage: & .claude\probes\K1040\s3\time_table.ps1 pre3 s3b_a s3b_b
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Labels)
$out = Join-Path $PSScriptRoot 'out'
$rows = [ordered]@{}
foreach ($lab in $Labels) {
  $file = Join-Path $out "time_summary_$lab.md"
  foreach ($line in (Get-Content $file)) {
    if ($line -match '^- ([^:]+): .*gpu p50 ([0-9.]+) p95 ([0-9.]+) ms') {
      $scene = $Matches[1]
      if (-not $rows.Contains($scene)) { $rows[$scene] = [ordered]@{} }
      $rows[$scene][$lab] = "$([double]$Matches[2]) / $([double]$Matches[3])"
    }
  }
}
"| scene | " + ($Labels -join ' | ') + ' |'
'|---|' + (($Labels | ForEach-Object { '---' }) -join '|') + '|'
foreach ($scene in $rows.Keys) {
  $cells = foreach ($lab in $Labels) { if ($rows[$scene].Contains($lab)) { $rows[$scene][$lab] } else { '-' } }
  "| $scene | " + ($cells -join ' | ') + ' |'
}
