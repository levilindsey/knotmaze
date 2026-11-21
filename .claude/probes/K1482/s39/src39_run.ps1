# K1482 s39 item 6: link A, one candidate load (port 6321, profile k1482s39-c) and one start load (6320, k1482s39-m),
# each polled until the program-source record stops growing (cap 120 s).
$here = $PSScriptRoot
foreach ($pair in @(@(6321, "c", "candidate"), @(6320, "m", "start"))) {
  "== $($pair[2]) link A $(Get-Date -Format HH:mm:ss)"
  $env:CAP = "120"
  node (Join-Path $here src39.mjs) "http://localhost:$($pair[0])" (Join-Path $env:TEMP "k1482s39-$($pair[1])")
}
"SRCDONE $(Get-Date -Format HH:mm:ss)"
