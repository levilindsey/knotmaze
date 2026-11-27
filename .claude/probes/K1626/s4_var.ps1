# K1626 s4: run census.ts on this worktree under eye-pressure probe switches
# (globalThis.__K1626S4, see census.ts S4 / S4FROZEN), one process per
# variant x maze group, in parallel; then s4_meas.py against out/s4_<Base>/.
#   pwsh .claude/probes/K1626/s4_var.ps1 -Vars 'tag=json[|frozen]' ... [-Mazes L] [-Base mine]
# A tag ending in _f runs frozen (set after a plain settle to sleep).
param([string[]]$Vars, [string[]]$Mazes = @('L'), [string]$Base = 'mine')
$wt = Resolve-Path "$PSScriptRoot/../../.."
Set-Location $wt
$Q = @{ L = '?3.FCBQ1H6L4-6NPbeg8HHN09w' }
foreach ($c in '123456789a'.ToCharArray()) { $Q["D_$c"] = "?$c" }
$procs = @()
foreach ($v in $Vars) {
  $tag, $json = $v -split '=', 2
  $out = ".claude/probes/K1626/out/s4v_$tag"
  New-Item -ItemType Directory $out -Force | Out-Null
  $env:S4 = $json
  $env:S4FROZEN = if ($tag.EndsWith('_f')) { '1' } else { '0' }
  $k = 0
  foreach ($m in $Mazes) {
    $procs += Start-Process node -ArgumentList @('scripts/run_node.mjs', '.claude/probes/K1626/census.ts', $out, '.', "$m=$($Q[$m])") `
      -RedirectStandardOutput "$out/c_$m.txt" -RedirectStandardError "$out/c_$m.err" -NoNewWindow -PassThru
    $k++
  }
}
$procs | Wait-Process
Remove-Item Env:S4, Env:S4FROZEN
foreach ($v in $Vars) {
  $tag = ($v -split '=', 2)[0]
  "=== $tag  $(($v -split '=', 2)[1])"
  Get-Content ".claude/probes/K1626/out/s4v_$tag/c_*.txt"
  python .claude/probes/K1626/s4_meas.py ".claude/probes/K1626/out/s4_$Base" ".claude/probes/K1626/out/s4v_$tag" @Mazes
}
