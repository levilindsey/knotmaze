# K1584 land8: every on-screen count of land8 against s8a (and today), one screen.py run per maze, as s8's an8.ps1.
# Inputs read from the gap worktree (s4/cnt, s1/out/before, s7/out/s8a); land8 from this worktree. CPU only.
#   pwsh -NoProfile -File an_l8.ps1 -Out <dir> [-Gap <gap worktree's .claude\probes\K1584>] [-Tag land8]
param([Parameter(Mandatory)][string]$Out, [string]$Tag = 'land8',
      [string]$Gap = 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a2dfb242b056cf793\.claude\probes\K1584')
$t = Resolve-Path (Join-Path $PSScriptRoot '..\screen')
$L = Join-Path $PSScriptRoot "out\$Tag"
$mazes='A_3','A_4','A_5','A_6','A_7','A_8','A_9','A_a','A_b','A_c','A_d','D_1','D_2','D_3','D_4','D_5','D_6','D_7','D_8','D_9','D_a'
New-Item -ItemType Directory $Out -Force | Out-Null
"=== on-screen verdicts: s8a | $Tag (one screen.py run per maze)"
foreach($m in $mazes){ python "$t\screen.py" "$Gap\s4\cnt\${m}_s4.json" "$Gap\s7\out\s8a\$m" "$L\$m" --json "$Out\$m.json" | Out-Null }
python "$t\juncsum.py" $Out
python "$t\tot.py" $Out
"=== loose pieces: today | s8a | $Tag"
python "$t\floats.py" "$Out\floats.json" "$Gap\s1\out\before\{m}" "$Gap\s7\out\s8a\{m}" "$L\{m}"
"=== changed places s8a -> $Tag"
python "$t\chg.py" $Out "$Gap\s7\out\s8a\{m}" "$L\{m}" 0 1 "$Out\chg.json" | Select-Object -Last 3
