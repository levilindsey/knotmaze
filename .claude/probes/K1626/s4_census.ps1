# K1626 s4: settle Levi's link and ?1..?a on two roots (census.ts, in parallel: 3 groups per root), then compare
# them with s4_meas.py. Outputs land in out/s4_<tag>/ (untracked).
#   pwsh .claude/probes/K1626/s4_census.ps1 -TagA master -RootA .claude/probes/K1626/out/rm -TagB mine [-RootB .]
param([string]$TagA = 'master', [string]$RootA = '.claude/probes/K1626/out/rm', [string]$TagB = 'mine', [string]$RootB = '.',
  [switch]$SkipA, [string]$Env = '')
$wt = Resolve-Path "$PSScriptRoot/../../.."
Set-Location $wt
$L = '?3.FCBQ1H6L4-6NPbeg8HHN09w'
$groups = @(@("L=$L", 'D_1=?1', 'D_2=?2', 'D_3=?3'), @('D_4=?4', 'D_5=?5', 'D_6=?6', 'D_7=?7'), @('D_8=?8', 'D_9=?9', 'D_a=?a'))
if ($Env) { foreach ($kv in $Env -split ';') { $k, $v = $kv -split '=', 2; Set-Item "Env:$k" $v } }
$procs = @()
$runs = @(, @($TagB, $RootB)); if (-not $SkipA) { $runs += , @($TagA, $RootA) }
foreach ($r in $runs) {
  $out = ".claude/probes/K1626/out/s4_$($r[0])"
  New-Item -ItemType Directory $out -Force | Out-Null
  for ($g = 0; $g -lt $groups.Count; $g++) {
    $procs += Start-Process node -ArgumentList (@('scripts/run_node.mjs', '.claude/probes/K1626/census.ts', $out, (Resolve-Path $r[1]).Path) + $groups[$g]) `
      -RedirectStandardOutput "$out/census$g.txt" -RedirectStandardError "$out/census$g.err" -NoNewWindow -PassThru
  }
}
$procs | Wait-Process
foreach ($r in $runs) { Get-Content ".claude/probes/K1626/out/s4_$($r[0])/census*.txt" }
python .claude/probes/K1626/s4_meas.py ".claude/probes/K1626/out/s4_$TagA" ".claude/probes/K1626/out/s4_$TagB"
