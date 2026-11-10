# K1247 s13: the stage's numeric gates, one node process at a time at Idle priority (another
# agent may hold the perf lock): acc at eps 0.02/0.05/0.1/0.2, k1247s9_union --d=0.001,0.01 still
# and --cyc=10/18, and k1247s5_cmp. Runs the tools from -Proto (a snapshot copy of proto/, so
# outline.ts can change while it runs) and writes out/s13/<Tag>_*.txt.
#   pwsh .claude/probes/K1240/proto/k1247s13_gates.ps1 -Proto proto_g13 -Tag s13_hw [-Only acc,union,cmp]
param([string]$Proto = 'proto', [Parameter(Mandatory)][string]$Tag, [string[]]$Only = @('acc', 'union', 'cmp'))
$root = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$out = "$root\.claude\probes\K1240\out\s13"
New-Item -ItemType Directory $out -Force | Out-Null
$p = ".claude/probes/K1240/$Proto"
$jobs = @()
if ($Only -contains 'acc') { foreach ($e in '0.02', '0.05', '0.1', '0.2') { $jobs += , @("${Tag}_acc_$e.txt", "$p/k1247s8_acc.ts", "--eps=$e") } }
if ($Only -contains 'union') {
  $jobs += , @("${Tag}_union_still.txt", "$p/k1247s9_union.ts", '--d=0.001,0.01')
  foreach ($c in '10', '18') { $jobs += , @("${Tag}_union_cyc$c.txt", "$p/k1247s9_union.ts", '--d=0.001,0.01', "--cyc=$c") }
}
if ($Only -contains 'cmp') { $jobs += , @("${Tag}_s5cmp.txt", "$p/k1247s5_cmp.ts") }
Push-Location $root
try {
  foreach ($j in $jobs) {
    $o = "$out\$($j[0])"; $t0 = Get-Date
    $proc = Start-Process node -ArgumentList (@('scripts/run_node.mjs') + $j[1..($j.Count - 1)]) -NoNewWindow -PassThru -RedirectStandardOutput $o -RedirectStandardError "$o.err"
    try { $proc.PriorityClass = 'Idle' } catch {}
    $proc.WaitForExit()
    $last = Get-Content $o -Tail 1
    "{0} {1:N0}s exit {2}: {3}" -f $j[0], ((Get-Date) - $t0).TotalSeconds, $proc.ExitCode, $last
  }
} finally { Pop-Location }
