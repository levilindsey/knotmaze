# K1584 s3: gapcheck on every maze's stage-1 capture, with the stage-1 rules (NOJA=1) and with s3's.
#   pwsh counts.ps1 [-S3Only]     (writes cnt/<maze>_s1.json, cnt/<maze>_s3.json; -S3Only skips the stage-1 rules)
param([switch]$S3Only)
$env:GF_KRETRY = "1"
foreach ($m in (Get-ChildItem (Join-Path $PSScriptRoot '..\s1\out\after') -Directory).Name) {
  $d = Join-Path $PSScriptRoot "..\s1\out\after\$m"
  if (-not $S3Only) { $env:NOJA = "1"; npx tsx (Join-Path $PSScriptRoot 'gapcheck.ts') $d (Join-Path $PSScriptRoot "cnt\${m}_s1.json") | Out-Null; Remove-Item Env:NOJA }
  npx tsx (Join-Path $PSScriptRoot 'gapcheck.ts') $d (Join-Path $PSScriptRoot "cnt\${m}_s3.json") | Out-Null
  "$m $(Get-Date -Format HH:mm:ss)"
}
