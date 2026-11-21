# K1375 (27Z) Done 3: same-state captures, master vs fix, on link A and the plain link.
# Run under scripts/perf_lock.ps1. Bases: fix :5490 (working tree), master :5491 (9b178b1ec).
$ErrorActionPreference = "Stop"
$out = ".claude/probes/K1375/out/27Z"
$env:TODAY = "0"
$env:SIMT = "20"
$jobs = @(
  @{ link = "A"; q = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"; hash = "fff8c9e5" },
  @{ link = "plain"; q = "3&xp=off&am=instant"; hash = "f9d72040" }
)
foreach ($j in $jobs) {
  $env:HASH = $j.hash
  foreach ($b in @(@{ n = "fix"; base = "http://localhost:5490" }, @{ n = "master"; base = "http://localhost:5491" })) {
    foreach ($i in 1, 2) {
      $dir = "$out/$($j.link)_$($b.n)_$i"
      $prof = ".claude/probes/K1375/profile_$($b.n)"
      Write-Host "CAP $($j.link) $($b.n) load $i -> $dir"
      node .claude/probes/K1482/cap.mjs $b.base $dir $prof $j.q
      if ($LASTEXITCODE -ne 0) { throw "cap failed $($j.link) $($b.n) $i" }
    }
  }
}
Write-Host "CAP27Z DONE"
