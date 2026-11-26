# K1584 s11: every on-screen count of a stage 11 capture against master's (m11), in ONE run of screen.py per maze
# (the gap worktree's s9/an9.ps1 with m11 in s8a's place), loose pieces (today | m11 | tag), the loose pieces by every
# gap ball (s9's a9.py and its measure.json, read in place) and by the three wedge balls (loose11.py). CPU only.
#   pwsh -NoProfile -File an11.ps1 [-Tag s11a] [-Line 42.5]   -> out/an_<Tag>/ (+ an.txt)
param([string]$Tag = 's11a', [double]$Line = 42.5)
$G = 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a2dfb242b056cf793\.claude\probes\K1584'
$t = 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af52b1a95572b7c1a\.claude\probes\K1584\screen'
$O = Join-Path $PSScriptRoot 'out'; $Out = Join-Path $O "an_$Tag"
$mazes='A_3','A_4','A_5','A_6','A_7','A_8','A_9','A_a','A_b','A_c','A_d','D_1','D_2','D_3','D_4','D_5','D_6','D_7','D_8','D_9','D_a'
New-Item -ItemType Directory $Out -Force | Out-Null
& {
"=== on-screen verdicts: m11 | $Tag (one screen.py run per maze)"
foreach($m in $mazes){ python "$t\screen.py" "$G\s4\cnt\${m}_s4.json" "$O\m11\$m" "$O\$Tag\$m" --json "$Out\$m.json" | Out-Null }
python "$t\juncsum.py" $Out
python "$t\tot.py" $Out
"=== loose pieces: today | m11 | $Tag"
python "$t\floats.py" "$Out\floats.json" "$G\s1\out\before\{m}" "$O\m11\{m}" "$O\$Tag\{m}"
"=== loose pieces by a gap ball, each side of the line ($Line deg; s9's a9.py)"
python "$G\s9\a9.py" "$Out\floats.json" $Line "today,m11,$Tag"
"=== loose pieces by the three wedge balls (loose11.py)"
python (Join-Path $PSScriptRoot 'loose11.py') "$Out\floats.json" "today,m11,$Tag"
} *>&1 | Tee-Object -FilePath (Join-Path $Out 'an.txt')
