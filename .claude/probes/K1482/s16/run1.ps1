$env:FILL = '1'
& 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adb9685c1b245d815/.claude/probes/K1482/s16/cap16.ps1' 5930 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adb9685c1b245d815/.claude/probes/K1482/out/s16/raw/base' base
& 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adb9685c1b245d815/.claude/probes/K1482/s16/cap16.ps1' 5931 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adb9685c1b245d815/.claude/probes/K1482/out/s16/raw/start' start
$env:PATCH = 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adb9685c1b245d815/.claude/probes/K1482/s16/patch_g0.json'
& 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adb9685c1b245d815/.claude/probes/K1482/s16/cap16.ps1' 5931 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adb9685c1b245d815/.claude/probes/K1482/out/s16/raw/startg0' startg0
$env:PATCH = $null; $env:FILL = $null
'ALLDONE'