# K992 s4: raster23 then cost23 (run under locked23.ps1).
Set-Location C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k992-corners
node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\raster23.ts .claude/probes/S3a/pops23/raster23 5392 *> .claude/probes/S3a/pops23/raster23.log
"raster exit $LASTEXITCODE, done $(Get-Date -Format HH:mm:ss)"
node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\cost23.ts 6 .claude/probes/S3a/pops23/cost23.md *> .claude/probes/S3a/pops23/cost23.log
"cost exit $LASTEXITCODE, done $(Get-Date -Format HH:mm:ss)"