# K1479 Done 3: one fresh STRICT freeze of all 12 census scenes on master (bar queries).
$env:STRICT = "1"
node .claude/probes/K1436/k1436_screen.mjs http://localhost:5485 .claude/probes/K1479/out/fresh12 "$env:TEMP\k1479-screen-profile" .claude/probes/K1479/out/jobs_fresh12.json 3
exit $LASTEXITCODE
