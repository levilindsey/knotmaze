# K1584 stage 5 + K1588: every count on a capture set of the two together, against stage 5 alone. Run after
# comb_run.ps1's capture. CPU only (a few minutes); results go to -Out (a scratch directory, never tracked).
#   -G     K1584's probe directory in the gap worktree (capture sets s1\out\before, s4\out\s4g, s5\out\s5d; s4\cnt)
#   -Kp    K1588's s1 probe directory (capture sets out\j3 = stage 4 + rule and out\<Tag> = stage 5 + rule)
#   pwsh -NoProfile -File comb_an.ps1 -Out <dir> [-Tag comb] [-G <dir>] [-Kp <dir>]
param([Parameter(Mandatory)][string]$Out, [string]$Tag = 'comb', [string]$G, [string]$Kp)
$main = Split-Path (git -C $PSScriptRoot rev-parse --path-format=absolute --git-common-dir)
if (-not $G) { $G = "$main\.claude\worktrees\agent-a2dfb242b056cf793\.claude\probes\K1584" }
if (-not $Kp) { $Kp = "$main\.claude\worktrees\agent-af202ca51788156a0\.claude\probes\K1588\s1" }
$t = $PSScriptRoot
$mazes='A_3','A_4','A_5','A_6','A_7','A_8','A_9','A_a','A_b','A_c','A_d','D_1','D_2','D_3','D_4','D_5','D_6','D_7','D_8','D_9','D_a'
New-Item -ItemType Directory $Out -Force | Out-Null
"=== on-screen verdicts: now | now + junction (screen.py aligns on the first capture: compare within this run only)"
foreach($m in $mazes){ python "$t\screen.py" "$G\s4\cnt\${m}_s4.json" "$G\s5\out\s5d\$m" "$Kp\out\$Tag\$m" --json "$Out\$m.json" | Out-Null }
python "$t\juncsum.py" $Out
"=== loose pieces: today | last step | now | now + junction"
python "$t\floats.py" "$Out\floats4.json" "$G\s1\out\before\{m}" "$G\s4\out\s4g\{m}" "$G\s5\out\s5d\{m}" "$Kp\out\$Tag\{m}" | Select-Object -Last 2
"=== changed places now -> now + junction"
python "$t\chg.py" $Out "$G\s5\out\s5d\{m}" "$Kp\out\$Tag\{m}" 0 1 "$Out\chg.json" | Select-Object -Last 1
"=== where the rule acts differently on the gap step than on the last step"
python "$t\inter.py" $Out "$G\s4\out\s4g\{m}" "$Kp\out\j3\{m}" "$G\s5\out\s5d\{m}" "$Kp\out\$Tag\{m}" "$Out\inter.json"
"=== far from every crossing side: today -> now + junction"
python "$t\far.py" $Out "$G\s1\out\before\{m}" "$Kp\out\$Tag\{m}" "$Out\far_tc.json" | Select-Object -Last 12
