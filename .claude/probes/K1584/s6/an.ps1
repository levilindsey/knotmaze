# K1584 s6: every on-screen count of s6a against s5d (and today), in ONE run of screen.py per maze, as comb_an.ps1.
# CPU only. Results to -Out (untracked).   pwsh -NoProfile -File an.ps1 -Out <dir> [-Tag s6a]
param([Parameter(Mandatory)][string]$Out, [string]$Tag = 's6a')
$G = Resolve-Path (Join-Path $PSScriptRoot '..')
$t = 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af52b1a95572b7c1a\.claude\probes\K1584\screen'
$mazes='A_3','A_4','A_5','A_6','A_7','A_8','A_9','A_a','A_b','A_c','A_d','D_1','D_2','D_3','D_4','D_5','D_6','D_7','D_8','D_9','D_a'
New-Item -ItemType Directory $Out -Force | Out-Null
"=== on-screen verdicts: s5d | $Tag (one screen.py run per maze)"
foreach($m in $mazes){ python "$t\screen.py" "$G\s4\cnt\${m}_s4.json" "$G\s5\out\s5d\$m" "$G\s6\out\$Tag\$m" --json "$Out\$m.json" | Out-Null }
python "$t\juncsum.py" $Out
python "$t\tot.py" $Out
"=== loose pieces: today | s5d | $Tag"
python "$t\floats.py" "$Out\floats.json" "$G\s1\out\before\{m}" "$G\s5\out\s5d\{m}" "$G\s6\out\$Tag\{m}"
"=== changed places s5d -> $Tag"
python "$t\chg.py" $Out "$G\s5\out\s5d\{m}" "$G\s6\out\$Tag\{m}" 0 1 "$Out\chg.json" | Select-Object -Last 3
