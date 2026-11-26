# K1584 s7b: copies this worktree's src into out/v_pad<P>/ (untracked) with rule C's flag start moved P arc nearer the
# crossing (gf_look.ts: `Math.abs(off) >= stop - su.arcPer / 2` -> `... - su.arcPer / 2 - P`), for padtab/padpx
# (tabdiff.ts / pxdiff.ts run with env GF_SRCP = that copy: their "s6" column is the padded build, "K" is s7).
#   pwsh mkpad.ps1 -Pad 0.5 [-Guard | -KOnly | -Into | -Code]   (writes out/v_pad<P>g | k | i | j)
param([Parameter(Mandatory)][double]$Pad, [switch]$Guard, [switch]$KOnly, [switch]$Into, [switch]$Code)
$ErrorActionPreference = 'Stop'
$wt = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$d = Join-Path $PSScriptRoot ("out\v_pad$Pad" + $(if ($Guard) { "g" } elseif ($KOnly) { "k" } elseif ($Into) { "i" } elseif ($Code) { "j" } else { "" }))
if (Test-Path $d) { Write-Output "$d exists"; return }
New-Item -ItemType Directory $d -Force | Out-Null
Copy-Item -Recurse (Join-Path $wt 'src') $d
$f = Join-Path $d 'src\render\gpu_field\gf_look.ts'
$t = [IO.File]::ReadAllText($f)
$old = 'Math.abs(off) >= stop - su.arcPer / 2 ?'
if (([regex]::Matches($t, [regex]::Escape($old))).Count -ne 1) { throw 'flag line not found once' }
# -Guard: the pad applies only to slots past both borders' own gap ends (gapWindow's gw[14 + o]: the border cleared the
# over's fill, margin and fade), so it never reaches into a real crossing's gap
$new = if ($Guard) { "Math.abs(off) >= stop - su.arcPer / 2 - (Math.abs(off) > Math.max(gw[14 + (off >= 0 ? 2 : 0)], gw[15 + (off >= 0 ? 2 : 0)]) ? $Pad : 0) ?" } else { "Math.abs(off) >= stop - su.arcPer / 2 - $Pad ?" }
# -KOnly: the pad applies only where a border on that side ends at rule K's room (gw[14 + o] = room - GAP_END_PAD, a
# border that never cleared the over) and the slot is past the other border's end + GAP_END_PAD
if ($KOnly) {
  $at = '          const stop = off >= 0 ? stopP : stopN;'
  if (([regex]::Matches($t, [regex]::Escape($at))).Count -ne 1) { throw 'stop line not found once' }
  $t = $t.Replace($at, "          const oK = off >= 0 ? 2 : 0, isK = (b: number): boolean => bRoom[oK + b] < 1e5 && Math.abs(gw[14 + oK + b] - Math.max(0, bRoom[oK + b] - GAP_END_PAD)) < 1e-4;`n          const padK = (isK(0) || isK(1)) && Math.abs(off) > Math.min(gw[14 + oK], gw[15 + oK]) + GAP_END_PAD ? $Pad : 0;`n$at")
  $new = 'Math.abs(off) >= stop - su.arcPer / 2 - padK ?'
}
# -Into: the pad applies only where a border's own gap end (gw[14 + o]) reaches the flag start, i.e. the border runs
# alongside the over into the pair corner and never clears it before the corner
if ($Into) { $new = "Math.abs(off) >= stop - su.arcPer / 2 - (Math.max(gw[14 + (off >= 0 ? 2 : 0)], gw[15 + (off >= 0 ? 2 : 0)]) >= stop - su.arcPer / 2 ? $Pad : 0) ?" }
# -Code: as -Into, but where the border's gap code (codeAt: its end + GAP_END_PAD + arcPer) still cuts at the flag start
if ($Code) { $new = "Math.abs(off) >= stop - su.arcPer / 2 - (Math.max(gw[14 + (off >= 0 ? 2 : 0)], gw[15 + (off >= 0 ? 2 : 0)]) + GAP_END_PAD + su.arcPer >= stop - su.arcPer / 2 ? $Pad : 0) ?" }
$t = $t.Replace($old, $new)
[IO.File]::WriteAllText($f, $t)
Write-Output "v_pad$Pad -> $d"

