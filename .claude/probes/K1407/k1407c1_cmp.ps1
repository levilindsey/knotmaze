# K1407 c1: census finds (not owner_only) of <After> against <Before>, matched by scene, kind and distance
# (< $R world units). Prints the finds only in After (new) and only in Before (gone).
#   pwsh -NoProfile -File .claude/probes/K1407/k1407c1_cmp.ps1 [-Before fix23c] [-After c1] [-R 0.15]
param([string]$Before = 'fix23c', [string]$After = 'c1', [double]$R = 0.15)
$dir = Join-Path $PSScriptRoot '../K1362/out/s1'
function Finds($tag) { @((Get-Content (Join-Path $dir "census_$tag.json") -Raw | ConvertFrom-Json).arts) | Where-Object { $_.kind -ne 'owner_only' } }
$b = Finds $Before; $a = Finds $After
function Fmt($f) { '{0,-22} {1,-10} {2,-8} ({3:F3},{4:F3}) px={5} size={6} near={7} {8}' -f $f.scene, $f.kind, $f.sub, $f.x, $f.y, $f.px, $f.sizePx, $f.near, $f.detail }
function Has($set, $f) { foreach ($g in $set) { if ($g.scene -eq $f.scene -and $g.kind -eq $f.kind -and [Math]::Sqrt(($g.x - $f.x) * ($g.x - $f.x) + ($g.y - $f.y) * ($g.y - $f.y)) -lt $R) { return $true } }; return $false }
"== only in $After"; foreach ($f in $a) { if (-not (Has $b $f)) { Fmt $f } }
"== only in $Before"; foreach ($f in $b) { if (-not (Has $a $f)) { Fmt $f } }
