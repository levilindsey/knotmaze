# K863 J3j: copy of work32\dbg\wtcopy_k1112cusp.ps1 (J3i's, untouched) by work33\dbg\mk_tools_k863j.py, for
# work33 and out33 (the account's dumps left out too). J3i's header:
# K1112 (J3i): copy the stage's probe outputs into the agent worktree, at the same paths under .claude/probes/K863/trace,
# for a commit there (git add -f; .claude/* is ignored). Leaves out NOTES.md (shared by every stage: this stage's section
# is work33/NOTES_k863j.md), the big sheet SVGs (out33/*.svg but the template; their PNGs go), the account's
# dumps (work33/account: its account step remakes them) and the builds (work33/base, work33/det/base:
# checks_k863j.ps1 remakes them).
# Run from anywhere: pwsh -NoProfile -File work33\dbg\wtcopy_k863j.ps1 <worktree root>
param([Parameter(Mandatory)][string]$Wt)
# (PowerShell names are case-blind: no loop variable may be called d, t or wt.)
$ErrorActionPreference = 'Stop'
$T = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$D = Join-Path $Wt '.claude\probes\K863\trace'
$files = @()
$files += Get-ChildItem "$T\work33" -File
foreach ($sub in 'dbg', 'probe', 'checks_logs', 'sheets') {
    if (Test-Path "$T\work33\$sub") { $files += Get-ChildItem "$T\work33\$sub" -File -Recurse }
}
if (Test-Path "$T\work33\det") { $files += Get-ChildItem "$T\work33\det" -File | Where-Object { $_.Extension -ne '.svg' } }
$files += Get-ChildItem "$T\out33\png" -File -Recurse
$files += Get-Item "$T\out33\cursive_template.svg"
$n = 0; $bytes = 0
foreach ($f in $files) {
    $rel = $f.FullName.Substring($T.Length + 1)
    $dst = Join-Path $D $rel
    New-Item -ItemType Directory -Force (Split-Path $dst -Parent) | Out-Null
    Copy-Item -LiteralPath $f.FullName -Destination $dst -Force
    $n++; $bytes += $f.Length
}
"{0} files, {1:N1} MB -> {2}" -f $n, ($bytes / 1MB), $D
