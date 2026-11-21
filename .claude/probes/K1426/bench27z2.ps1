# 27Z2 Done 1: master (A, :5480) vs no-cap throwaway (B, :5481), def + fat drag,
# interleaved A B B A, with the K1362 stages' drag timing probe
# (k1362c1_bench.mjs), unchanged. Run under scripts/perf_lock.ps1.
#   pwsh .claude/probes/K1426/bench27z2.ps1 -Tags A1,B1
param([Parameter(Mandatory = $true)][string[]]$Tags)
$ErrorActionPreference = "Stop"
$out = ".claude/probes/K1426/out/27Z2"
New-Item -ItemType Directory $out -Force | Out-Null
$bases = @{
  A1 = "http://localhost:5480"; B1 = "http://localhost:5481"
  B2 = "http://localhost:5481"; A2 = "http://localhost:5480"
}
$links = @("b.FMKB4DIQ", "p9ar6.FMKB4DIQ")
foreach ($tag in $Tags) {
  $base = $bases[$tag]
  if (-not $base) { throw "unknown tag $tag" }
  $urls = $links | ForEach-Object { "$base/?$_&am=instant&snd=none&rp=gf" }
  Write-Host "BENCH $tag $base"
  & node .claude/probes/K1362/k1362c1_bench.mjs "$out/bench_$tag.json" @urls
  Write-Host "BENCH $tag exit $LASTEXITCODE"
}
Write-Host "BENCH27Z2 $($Tags -join ',') DONE"
