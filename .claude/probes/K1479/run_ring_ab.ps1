# K1479 Done 1b: 10 ring loads through K1468's ab.mjs (now parity-aligned) at the K868 sim.
$env:SIMT = "40.01666666666504"
$jobs = (@(1..10) | ForEach-Object { "R:.26:fill" }) -join ","
node .claude/probes/K1468/ab.mjs http://localhost:5485 .claude/probes/K1479/out/ring_ab "$env:TEMP\k1479-ab-profile" $jobs
exit $LASTEXITCODE
