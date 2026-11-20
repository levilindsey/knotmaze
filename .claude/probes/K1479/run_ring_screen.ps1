# K1479 Done 1a: 10 ring loads through the bar's capture path (k1436_screen.mjs, STRICT).
$env:STRICT = "1"
node .claude/probes/K1436/k1436_screen.mjs http://localhost:5485 .claude/probes/K1479/out/ring_screen "$env:TEMP\k1479-screen-profile" .claude/probes/K1479/out/jobs_ring10.json 3
exit $LASTEXITCODE
