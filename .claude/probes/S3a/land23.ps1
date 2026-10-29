# K992 s4: land the corner rule (c23w: the tracked foot, the march's S the
# certified running minimum (--smin cert), K1000's continuous caps, the solved part walk) into
# src/render/field/oracle.ts through the --src chain, then check that the
# landed code lines equal the census's probe oracle. Run it on master's
# oracle.ts: since the landing (78e9a7dd), restore it first with
# git checkout 90d4290c -- src/render/field/oracle.ts.
#   pwsh .claude/probes/S3a/land23.ps1 [-Tau 1e-4] [-Ref oracle_c23w.ts]
param([string]$Tau = "1e-4", [string]$Ref = "oracle_c23w.ts")
$ErrorActionPreference = "Stop"
Set-Location C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k992-corners
$d = "$env:TEMP\k992_land23"
New-Item -ItemType Directory $d -Force | Out-Null
node .claude/probes/S3a/mk_a16.mjs --src --out "$d/a.ts"
if ($LASTEXITCODE) { throw "a16" }
node .claude/probes/S3a/mk_b16.mjs --src --in "$d/a.ts" --out "$d/b.ts"
if ($LASTEXITCODE) { throw "b16" }
node .claude/probes/S3a/mk_c17.mjs --src --refine 10 --foot track --smin cert --tau $Tau --in "$d/b.ts" --out "$d/c.ts"
if ($LASTEXITCODE) { throw "c17" }
node .claude/probes/S3a/mk_cap19.mjs --mode cont --src --in "$d/c.ts" --out "$d/cc.ts"
if ($LASTEXITCODE) { throw "cap19" }
node .claude/probes/S3a/mk_walk21.mjs --src --in "$d/cc.ts" --out "src/render/field/oracle.ts"
if ($LASTEXITCODE) { throw "walk21" }
# The landed source's code lines must equal the census's probe oracle.
$isCode = { param($l) $t = $l.Trim(); -not ($t -eq '' -or $t.StartsWith('//') -or $t.StartsWith('/*') -or $t.StartsWith('*')) }
$landed = [IO.File]::ReadAllText("$PWD\src\render\field\oracle.ts").Replace("`r`n", "`n").Split("`n") | Where-Object { & $isCode $_ }
$probe = [IO.File]::ReadAllText("$PWD\.claude\probes\S3a\$Ref").Replace("`r`n", "`n").Split("`n") | Where-Object { & $isCode $_ } | ForEach-Object { $_.Replace('"../../../src/render/field/', '"./') }
$diff = Compare-Object $landed $probe -SyncWindow 50
"landed: code lines $($landed.Count) vs $Ref $($probe.Count), differing $(@($diff).Count)"
if (@($diff).Count) { $diff | Select-Object -First 20 | Format-Table -AutoSize | Out-String -Width 220 }