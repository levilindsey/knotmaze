# K1539 proof driver (27F): 12 loads of link A through the tracked K1482 cap.mjs, HASH pinned.
# Run under the perf lock: pwsh scripts/perf_lock.ps1 -Owner muse-27F -What "K1539 cap x12" -Cmd "pwsh -NoProfile -File .claude/probes/K1539/cap12.ps1"
param([string]$Base = "http://localhost:5481", [string]$OutRoot = ".claude/probes/K1539/out/27F/cap12")
$ErrorActionPreference = "Continue"
$repo = (git rev-parse --show-toplevel).Trim()
Set-Location $repo
$out = Join-Path $repo $OutRoot
New-Item -ItemType Directory $out -Force | Out-Null
$prof = Join-Path $env:TEMP "k1539-cap"
$cap = Join-Path $repo ".claude/probes/K1482/cap.mjs"
$env:HASH = "fff8c9e5"; $env:FILL = "1"; $env:GF = "1"; $env:TODAY = ""
$rows = @()
# Warm the kept profile once (compiles gf's programs; no capture).
$env:WARM = "1"
$w = & node $cap $Base (Join-Path $out "warm") $prof 2>&1
$w | ForEach-Object { [string]$_ } | Set-Content (Join-Path $out "warm.log") -Encoding utf8
"warm exit $LASTEXITCODE" | Add-Content (Join-Path $out "warm.log")
$env:WARM = ""
for ($i = 1; $i -le 12; $i++) {
  $dir = Join-Path $out ("load{0:d2}" -f $i)
  $log = Join-Path $out ("load{0:d2}.log" -f $i)
  $o = & node $cap $Base $dir $prof 2>&1
  $code = $LASTEXITCODE
  $o | ForEach-Object { [string]$_ } | Set-Content $log -Encoding utf8
  $txt = Get-Content $log -Raw
  $reloads = ([regex]::Matches($txt, "reload")).Count
  $gfHash = if (Test-Path (Join-Path $dir "gf.png")) { (Get-FileHash (Join-Path $dir "gf.png") -Algorithm SHA256).Hash } else { "MISSING" }
  $fillHash = if (Test-Path (Join-Path $dir "gf_fill.png")) { (Get-FileHash (Join-Path $dir "gf_fill.png") -Algorithm SHA256).Hash } else { "MISSING" }
  $sites = if (Test-Path (Join-Path $dir "sites_gf.json")) { (Get-Content (Join-Path $dir "sites_gf.json") -Raw | ConvertFrom-Json).hash } else { "?" }
  $rows += [pscustomobject]@{ load = $i; exit = $code; reloads = $reloads; sitesHash = $sites; gf = $gfHash; fill = $fillHash }
  "load $i exit $code reloads $reloads hash $sites gf $($gfHash.Substring(0,12)) fill $($fillHash.Substring(0,12))"
}
$rows | Export-Csv (Join-Path $out "cap12.csv") -NoTypeInformation
$okHash = ($rows | Where-Object { $_.sitesHash -ne "fff8c9e5" }).Count -eq 0
$okTry = ($rows | Where-Object { $_.reloads -ne 0 -or $_.exit -ne 0 }).Count -eq 0
$okGf = ($rows.gf | Select-Object -Unique).Count -eq 1
$okFill = ($rows.fill | Select-Object -Unique).Count -eq 1
"RESULT try1=$okTry oneHash=$okHash gfIdentical=$okGf fillIdentical=$okFill"
if ($okHash -and $okTry -and $okGf -and $okFill) { exit 0 } else { exit 1 }
