# K1627 s1: copy of K1604 s3's an.ps1. K1604 s1 (from k1584-s11's s11/an11.ps1): every on-screen count of my capture against master's (m0), in ONE run of
# screen.py per maze (closed sides: juncsum.py, tot.py), and the loose pieces (today | m0 | tag, floats.py). CPU only.
#   pwsh -NoProfile -File an.ps1 [-Tag k1] [-Master m0]   -> out/an_<Tag>/ (+ an.txt)
param([string]$Tag = 'k1', [string]$Master = 'm0')
$G = 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a2dfb242b056cf793\.claude\probes\K1584'
$t = 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af52b1a95572b7c1a\.claude\probes\K1584\screen'
$O = Join-Path $PSScriptRoot 'out'; $Out = Join-Path $O "an_$Tag"
$mazes='A_3','A_4','A_5','A_6','A_7','A_8','A_9','A_a','A_b','A_c','A_d','D_1','D_2','D_3','D_4','D_5','D_6','D_7','D_8','D_9','D_a'
New-Item -ItemType Directory $Out -Force | Out-Null
& {
"=== on-screen verdicts: $Master | $Tag (one screen.py run per maze)"
foreach($m in $mazes){ python "$t\screen.py" "$G\s4\cnt\${m}_s4.json" "$O\$Master\$m" "$O\$Tag\$m" --json "$Out\$m.json" | Out-Null }
python "$t\juncsum.py" $Out
python "$t\tot.py" $Out
"=== loose pieces: today | $Master | $Tag"
python "$t\floats.py" "$Out\floats.json" "$G\s1\out\before\{m}" "$O\$Master\{m}" "$O\$Tag\{m}"
} *>&1 | Tee-Object -FilePath (Join-Path $Out 'an.txt')
