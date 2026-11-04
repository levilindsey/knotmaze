# K1040 S3e: a verdict summary's DEFECT count and how many of them sit at
# 0.03 px or more (buckets 0.03, 0.1, 0.3, 1 and none: the gate's "794 DEFECT,
# 504 of them at 0.03 px or more", S3d's count), per scene and in total.
# Usage: & .claude\probes\K1040\s3\defects.ps1 <tag> [<tag> ...]
#   reads out/verdict_<tag>_summary.md
param([Parameter(Mandatory, ValueFromRemainingArguments)][string[]]$Tags)
foreach ($tag in $Tags) {
  $path = Join-Path $PSScriptRoot "out\verdict_${tag}_summary.md"
  if (-not (Test-Path $path)) { Write-Output "${tag}: no $path"; continue }
  $lines = Get-Content $path
  $total = 0; $big = 0; $rows = @()
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $m = [regex]::Match($lines[$i], '^- (\S+): .*?DEFECT (\d+);')
    if (-not $m.Success) { continue }
    $n = [int]$m.Groups[2].Value
    $detail = if ($i + 1 -lt $lines.Count) { $lines[$i + 1] } else { '' }
    $b = 0
    foreach ($bm in [regex]::Matches($detail, 'bucket:(0\.03|0\.1|0\.3|1|none) (\d+)(?=;|$)')) { $b += [int]$bm.Groups[2].Value }
    $total += $n; $big += $b
    $rows += "  {0}: DEFECT {1}, {2} at >= 0.03 px" -f $m.Groups[1].Value, $n, $b
  }
  Write-Output "${tag}: DEFECT $total, $big of them at 0.03 px or more"
  $rows | ForEach-Object { Write-Output $_ }
}
