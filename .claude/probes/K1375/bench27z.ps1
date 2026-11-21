# K1375 (27Z) Done 4: desktop default-maze drag, master and fix interleaved A B B A,
# with the K1362 stages' drag timing probe (k1362c1_bench.mjs), unchanged.
$ErrorActionPreference = "Stop"
$out = ".claude/probes/K1375/out/27Z"
$seq = @(
  @{ tag = "A1_master"; base = "http://localhost:5491" },
  @{ tag = "B1_fix"; base = "http://localhost:5490" },
  @{ tag = "B2_fix"; base = "http://localhost:5490" },
  @{ tag = "A2_master"; base = "http://localhost:5491" }
)
foreach ($s in $seq) {
  $url = "$($s.base)/?1&xp=off&am=instant&snd=none&rp=gf"
  Write-Host "BENCH $($s.tag) $url"
  node .claude/probes/K1362/k1362c1_bench.mjs "$out/bench_$($s.tag).json" $url
  Write-Host "BENCH $($s.tag) exit $LASTEXITCODE"
}
Write-Host "BENCH27Z DONE"
