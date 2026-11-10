# K8 sdf phone: bench_frame before / after, one perf-lock hold per link.
#   pwsh -File .claude/probes/K8/sdf_phone/bench.ps1 -Tag <name> -Builds <sha>,<sha>...
# Per link: the first build's default path, then every build's rp=sdf, in one
# bench_frame run (ABBA over -Rounds). Builds served by
# ../sdf_gaps/serve.mjs "$env:TEMP\k8cost" 5700.
param([string]$Tag, [string[]]$Builds, [int]$Rounds = 2, [int]$Sec = 4)
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
Set-Location $repo
$out = ".claude/probes/K8/sdf_phone/out/bench_$Tag"
New-Item -ItemType Directory $out -Force | Out-Null
$h = "http://127.0.0.1:5700"
$locked = Join-Path $PSScriptRoot "..\sdf_gaps\locked.ps1"
$pin = "am=instant&snd=none&fw=0&phw=0"
$links = [ordered]@{ knot24 = "b&gs=24&wd=1&mf=0"; dense = "b&gs=24&wd=0.6&brd=0.6"; maxfab = "b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5" }
foreach ($k in $links.Keys) {
  $q = "$($links[$k])&$pin"
  $urls = @("$h/$($Builds[0])/?$q") + ($Builds | ForEach-Object { "$h/$_/?$q&rp=sdf" })
  & $locked -What "K8 phone: bench_frame $k ($Tag)" -NodeArgs (@("scripts/bench_frame.mjs") + $urls + @("--sec", "$Sec", "--rounds", "$Rounds", "--rest-ms", "45000", "--out", "$out/$k.json")) 2>&1 | Set-Content -Encoding utf8 "$out/$k.log.txt"
  "DONE $k $(Get-Date -Format T)"
}
