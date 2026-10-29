$ErrorActionPreference = "Stop"
Set-Location C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k992-corners
$d = "$env:TEMP\k992_land21"
New-Item -ItemType Directory $d -Force | Out-Null
node .claude/probes/S3a/mk_a16.mjs --src --out "$d/a.ts"
if ($LASTEXITCODE) { throw "a16" }
node .claude/probes/S3a/mk_b16.mjs --src --in "$d/a.ts" --out "$d/b.ts"
if ($LASTEXITCODE) { throw "b16" }
node .claude/probes/S3a/mk_c17.mjs --src --refine 10 --foot track --in "$d/b.ts" --out "$d/c.ts"
if ($LASTEXITCODE) { throw "c17" }
node .claude/probes/S3a/mk_cap19.mjs --mode cont --src --in "$d/c.ts" --out "$d/cc.ts"
if ($LASTEXITCODE) { throw "cap19" }
node .claude/probes/S3a/mk_walk21.mjs --src --in "$d/cc.ts" --out "src/render/field/oracle.ts"
if ($LASTEXITCODE) { throw "walk21" }
# The landed source's code lines must equal the census's probe (c21w).
$isCode = { param($l) $t = $l.Trim(); -not ($t -eq '' -or $t.StartsWith('//') -or $t.StartsWith('/*') -or $t.StartsWith('*')) }
$x = [IO.File]::ReadAllText("$PWD\src\render\field\oracle.ts").Replace("`r`n", "`n").Split("`n") | Where-Object { & $isCode $_ }
$y = [IO.File]::ReadAllText("$PWD\.claude\probes\S3a\oracle_c21w.ts").Replace("`r`n", "`n").Split("`n") | Where-Object { & $isCode $_ } | ForEach-Object { $_.Replace('"../../../src/render/field/', '"./') }
$diff = Compare-Object $x $y -SyncWindow 50
"landed: code lines $($x.Count) vs c21w $($y.Count), differing $(@($diff).Count)"
