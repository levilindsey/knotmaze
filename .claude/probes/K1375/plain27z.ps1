# K1375 (27Z) Done 3, plain link with the 27I recipe (fw=0 + full clock pin + flowTime 0).
$ErrorActionPreference = "Stop"
$out = ".claude/probes/K1375/out/27Z"
$env:TODAY = "0"
$env:SIMT = "20"
$env:HASH = "f9d72040"
$q = "3&xp=off&am=instant&fw=0"
foreach ($b in @(@{ n = "fix"; base = "http://localhost:5490" }, @{ n = "master"; base = "http://localhost:5491" })) {
  foreach ($i in 1, 2) {
    $dir = "$out/plainP_$($b.n)_$i"
    $prof = ".claude/probes/K1375/profile_$($b.n)"
    Write-Host "PLAINCAP $($b.n) load $i -> $dir"
    node .claude/probes/K1375/plaincap.mjs $b.base $dir $prof $q
    if ($LASTEXITCODE -ne 0) { throw "plaincap failed $($b.n) $i" }
  }
}
Write-Host "PLAIN27Z DONE"
