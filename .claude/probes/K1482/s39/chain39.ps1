# K1482 s39: the queue after seq1 (each step goes through perf_lock; the lock alternates with the guards run).
$here = $PSScriptRoot
& pwsh -NoProfile -File (Join-Path $here runseq39.ps1) -Name seq2 -Mazes A_7 -What "item 5: A_7 fresh session"
& pwsh -NoProfile -File (Join-Path $here runlock39.ps1) -Name src1 -Script src39_run.ps1 -What "item 6 src record"
& pwsh -NoProfile -File (Join-Path $here runseq39.ps1) -Name seq3 -Mazes A_a,A_b
& pwsh -NoProfile -File (Join-Path $here runseq39.ps1) -Name seq4 -Mazes A_c,A_d
"CHAINDONE $(Get-Date -Format HH:mm:ss)"
