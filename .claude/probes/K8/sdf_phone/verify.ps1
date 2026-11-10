# K8 sdf phone: sdf_cost/verify.ps1 with its own output folder (-Tag).
# K8 sdf cost: the look checks for the fix, one perf-lock hold per run.
#   pwsh -File .claude/probes/K8/sdf_cost/verify.ps1 <base sha> <fix sha>
# Builds are served by ../sdf_gaps/serve.mjs "$env:TEMP\k8cost" 5700.
#  1-2. ss_ab on the fix: default (A, A2 control) against rp=sdf (B), same
#       state, on knot gs 24 and dense; the first also opens the three links
#       default and rp=sdf for gl.getError / context loss.
#  3-4. ss_ab across builds: the fix's rp=sdf (A, A2) against the base's
#       rp=sdf (B; HOSTB, QB=none), same state.
#  5.   diag_screenshot of max fabric (it never sleeps: pictures only),
#       default and rp=sdf on the fix, rp=sdf on the base.
param([string]$Base, [string]$Fix, [string]$Tag = $Fix, [switch]$XsOnly)
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
Set-Location $repo
$out = ".claude/probes/K8/sdf_phone/out/ss_$Tag"
New-Item -ItemType Directory $out -Force | Out-Null
$h = "http://127.0.0.1:5700"
$ss = ".claude/probes/K8/sdf_gaps/ss/ss_ab.mjs"
$locked = Join-Path $PSScriptRoot "..\sdf_gaps\locked.ps1"
$pin = "am=instant&snd=none&fw=0&phw=0"
$k24 = "b&gs=24&wd=1&mf=0"
$dense = "b&gs=24&wd=0.6&brd=0.6"
$maxfab = "b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5"
$gl = @("$k24&am=instant&snd=none", "$dense&am=instant&snd=none", "$maxfab&am=instant&snd=none")

Remove-Item Env:HOSTB, Env:QB -ErrorAction SilentlyContinue
if (-not $XsOnly) {
& $locked -What "K8 sdf cost: same state knot24 + gl checks ($Fix)" -NodeArgs (@($ss, "$h/$Fix", $out, "fix_knot24", "$k24&$pin") + $gl) 2>&1 | Set-Content -Encoding utf8 "$out/fix_knot24.log.txt"
"DONE 1 $(Get-Date -Format T)"
& $locked -What "K8 sdf cost: same state dense ($Fix)" -NodeArgs @($ss, "$h/$Fix", $out, "fix_dense", "$dense&$pin") 2>&1 | Set-Content -Encoding utf8 "$out/fix_dense.log.txt"
"DONE 2 $(Get-Date -Format T)"
}
$env:HOSTB = "$h/$Base"; $env:QB = "none"
& $locked -What "K8 sdf cost: same state sdf knot24 $Fix vs $Base" -NodeArgs @($ss, "$h/$Fix", $out, "xs_knot24", "$k24&$pin&rp=sdf") 2>&1 | Set-Content -Encoding utf8 "$out/xs_knot24.log.txt"
"DONE 3 $(Get-Date -Format T)"
& $locked -What "K8 sdf cost: same state sdf dense $Fix vs $Base" -NodeArgs @($ss, "$h/$Fix", $out, "xs_dense", "$dense&$pin&rp=sdf") 2>&1 | Set-Content -Encoding utf8 "$out/xs_dense.log.txt"
"DONE 4 $(Get-Date -Format T)"
Remove-Item Env:HOSTB, Env:QB -ErrorAction SilentlyContinue
if ($XsOnly) { return }
$q = "$maxfab&am=instant&snd=none"
& (Join-Path $PSScriptRoot "..\sdf_gaps\shots.ps1") -What "K8 sdf cost: max fabric shots" -Settle 20000 -Jobs @(
  "$h/$Fix/?$q|$out/maxfab_fix_base.png", "$h/$Fix/?$q&rp=sdf|$out/maxfab_fix_sdf.png", "$h/$Base/?$q&rp=sdf|$out/maxfab_master_sdf.png")
"DONE 5 $(Get-Date -Format T)"


