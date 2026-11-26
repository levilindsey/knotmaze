Set-Location C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\kink-diag
$env:BEND = '{"ratio":1.25,"soft":true}'
node .claude\probes\kink\cap.mjs http://localhost:5642 .claude\probes\kink\out\bend .claude\probes\kink\profile
