# K863 J3j: copy of work32\dbg\probe_k1112cusp.ps1 (J3i's, untouched) by work33\dbg\mk_tools_k863j.py:
# build v68 (work33/base, work28/ports_k990e.json M) added and the default; output in work33\probe.
# Run: pwsh -NoProfile -File work33\dbg\probe_k863j.ps1 [v68,...]. J3i's header:
# K1112 (J3i, v7.2) the probe: every join from a low exit with a port (a, c, d, e, f, h, i, n) into a letter with a cusp
# window (i, j, p, r, s, t, u, w, y), 72 pairs, solved under each named build (work29\dbg\solves_k1113.py, J3f's,
# untouched: status, nfev, the attach in its stretch with BOUND, side, meet turn). One Python process per build, at
# most 4 at once. Builds: v71 (work31\base, work31\ports_k1112c.json Pc10) or a variant of work32\ports_k1112cusp.json
# on work31\base (the template is unchanged, so the base is too). -Pins '{"fr":{},"fs":{}}' clears J3e's fr and fs
# pins (K1009_PINS) and adds "_nopins" to the output names.
# Run from anywhere: pwsh -NoProfile -File work32\dbg\probe_k1112cusp.ps1 v71,Plc1,Plc2,Plc3 [-Pins <json>]
param([string[]]$Builds = @("v68"), [string]$Pins = "")
$T = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"; Set-Location $T; $py = "$T\venv\Scripts\python.exe"
$env:K926_FINAL_E = "shear"; $env:K1009_PINS = $null
if ($Pins) { $env:K1009_PINS = $Pins }
$Builds = @($Builds | ForEach-Object { "$_" -split ',' } | Where-Object { $_ })
$pairs = @(foreach ($l in "acdefhin".ToCharArray()) { foreach ($r in "ijprstuwy".ToCharArray()) { "$l$r" } }) -join ","
$suf = if ($Pins) { "_nopins" } else { "" }
New-Item -ItemType Directory -Force work33\probe | Out-Null
$run = foreach ($b in $Builds) {
  $spec = if ($b -eq "v68") { "work33/base@work28/ports_k990e.json@M" } elseif ($b -eq "v71") { "work31/base@work31/ports_k1112c.json@Pc10" } else { "work31/base@work32/ports_k1112cusp.json@$b" }
  $o = "work33\probe\lowcusp_$b$suf"
  Start-Process $py -ArgumentList @("-I", "work29\dbg\solves_k1113.py", "$o.txt", "$o.json", $pairs, $spec) -WorkingDirectory $T -NoNewWindow -PassThru -RedirectStandardOutput "$o.out.txt" -RedirectStandardError "$o.err.txt"
}
$run | Wait-Process
foreach ($b in $Builds) { $o = "work33\probe\lowcusp_$b$suf"; "$o.txt: $((Get-Content "$o.txt" -ErrorAction SilentlyContinue | Measure-Object -Line).Lines) lines; stderr $((Get-Item "$o.err.txt").Length) bytes" }
