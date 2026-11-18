# K1449: the clean bench of the K1449 change alone: build 5285760f (master at the branch point, K1439's flag) under the
# perf lock, then k1449_bench.ps1 -Master 5285760f -Branch f71f824c -Tag bench2 -NoOff (gfh=1 pairs, two rounds).
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
& pwsh -NoProfile -File (Join-Path $here "k1449_locked.ps1") -What "K1449 preview build 5285760f" -MaxWaitMin 20 -Cmd "pwsh -NoProfile -File C:\Users\lsl\Repositories\knotmaze\scripts\preview.ps1 -Ref 5285760f -Root $env:TEMP\k1439pv -BuildOnly"
if (-not (Test-Path (Join-Path $env:TEMP "k1439pv\5285760f\index.html"))) { throw "no 5285760f build" }
& pwsh -NoProfile -File (Join-Path $here "k1449_bench.ps1") -Master 5285760f -Branch f71f824c -Tag bench2 -NoOff