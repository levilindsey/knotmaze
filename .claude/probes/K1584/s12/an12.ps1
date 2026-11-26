# K1584 s12 (s11/an11.ps1 with m12 in m11's place): every on-screen count of a stage 12 capture against master's (m12),
# in ONE run of screen.py per maze, then the loose pieces (today | m12 | tag). CPU only.
#   pwsh -NoProfile -File an12.ps1 [-Tag s12a]   -> out/an_<Tag>/ (+ an.txt)
param([string]$Tag = 's12a')
$G = 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a2dfb242b056cf793\.claude\probes\K1584'
$t = 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af52b1a95572b7c1a\.claude\probes\K1584\screen'
$O = Join-Path $PSScriptRoot 'out'; $Out = Join-Path $O "an_$Tag"
$mazes='A_3','A_4','A_5','A_6','A_7','A_8','A_9','A_a','A_b','A_c','A_d','D_1','D_2','D_3','D_4','D_5','D_6','D_7','D_8','D_9','D_a'
New-Item -ItemType Directory $Out -Force | Out-Null
& {
"=== on-screen verdicts: m12 | $Tag (one screen.py run per maze)"
foreach($m in $mazes){ python "$t\screen.py" "$G\s4\cnt\${m}_s4.json" "$O\m12\$m" "$O\$Tag\$m" --json "$Out\$m.json" | Out-Null }
python "$t\juncsum.py" $Out
python "$t\tot.py" $Out
"=== loose pieces: today | m12 | $Tag"
python "$t\floats.py" "$Out\floats.json" "$G\s1\out\before\{m}" "$O\m12\{m}" "$O\$Tag\{m}"
} *>&1 | Tee-Object -FilePath (Join-Path $Out 'an.txt')
