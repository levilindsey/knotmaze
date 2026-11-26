# K1626 s3: per material fraction, the width jump (0.75 -> 0.5) on Levi's link and ?1, plus the eye census over
# his link and ?1..?a, all in parallel; outputs land in out/s3_<tag>_*.
#   pwsh .claude/probes/K1626/s3_sweep.ps1 -Fracs 0.85,0.7 [-NoCensus] [-NoJump]
param([string]$Fracs = '0.85', [int]$Mode = 3, [switch]$NoCensus, [switch]$NoJump, [string]$Root = (Resolve-Path "$PSScriptRoot/../../.."))
Set-Location $Root
$FracList = $Fracs -split ','
$L = '?3.FCBQ1H6L4-6NPbeg8HHN09w'
$procs = @()
foreach ($f in $FracList) {
  $tag = "m${Mode}_" + ('{0}' -f $f).Replace('.', 'p')
  if (-not $NoJump) {
    foreach ($q in @(@('L', $L), @('1', '?1'))) {
      $env:Q = $q[1]; $env:MATFRAC = "$f"; $env:MATMODE = "$Mode"; $env:RUN = '20'
      $procs += Start-Process node -ArgumentList @('scripts/run_node.mjs', '.claude/probes/K1626/widthjump.ts', '0.75', '0.5', $Root) `
        -RedirectStandardOutput ".claude/probes/K1626/out/s3_${tag}_wj_$($q[0]).txt" -RedirectStandardError ".claude/probes/K1626/out/s3_${tag}_wj_$($q[0]).err" -NoNewWindow -PassThru
    }
  }
  if (-not $NoCensus) {
    $groups = @(@("L=$L", 'D_1=?1', 'D_2=?2', 'D_3=?3'), @('D_4=?4', 'D_5=?5', 'D_6=?6', 'D_7=?7'), @('D_8=?8', 'D_9=?9', 'D_a=?a'))
    for ($g = 0; $g -lt $groups.Count; $g++) {
      $env:MAXC = '8'; $env:JSET = "jeyeMatFrac=$f,jeyeMatMode=$Mode"; Remove-Item Env:Q, Env:RUN, Env:MATFRAC, Env:MATMODE -ErrorAction SilentlyContinue
      $procs += Start-Process node -ArgumentList (@('scripts/run_node.mjs', '.claude/probes/K1626/jeye.ts', $Root, ".claude/probes/K1626/out/s3_${tag}_census$g.json") + $groups[$g]) `
        -RedirectStandardOutput ".claude/probes/K1626/out/s3_${tag}_census$g.txt" -RedirectStandardError ".claude/probes/K1626/out/s3_${tag}_census$g.err" -NoNewWindow -PassThru
      Remove-Item Env:JSET
    }
  }
}
$procs | Wait-Process
Get-ChildItem ".claude/probes/K1626/out/s3_m${Mode}_*_wj_*.txt" | ForEach-Object { "$($_.Name): $(Get-Content $_ -Raw)" }
