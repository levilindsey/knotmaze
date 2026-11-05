# K1198 (Muse batch 20 Run G) COPY of work32/dbg/probe_k1112cusp.ps1 (K1112 J3i, untouched in
# .claude/probes/K863/trace/): retargeted - the solver (work29/dbg/solves_k1113.py), the base
# (work31/base) and J3h's ports stay read-only in the trace; the ports file is this folder's
# ports_k1112cusp.json and every output lands in this folder's probe/. -B added (no bytecode in the kit).
# K1112 (J3i, v7.2) the probe: every join from a low exit with a port (a, c, d, e, f, h, i, n) into a letter with a cusp
# window (i, j, p, r, s, t, u, w, y), 72 pairs, solved under each named build (work29\dbg\solves_k1113.py, J3f's,
# untouched: status, nfev, the attach in its stretch with BOUND, side, meet turn). One Python process per build, at
# most 4 at once. Builds: v71 (work31\base, work31\ports_k1112c.json Pc10) or a variant of this folder's
# ports_k1112cusp.json on work31\base (the template is unchanged, so the base is too). -Pins '{"fr":{},"fs":{}}'
# clears J3e's fr and fs pins (K1009_PINS) and adds "_nopins" to the output names.
# Run from anywhere: pwsh -NoProfile -File .claude\probes\K1198\probe_k1112cusp.ps1 Plc1m [-Pins <json>]
param([string[]]$Builds = @("Plc1m"), [string]$Pins = "")
$T = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"; $py = "$T\venv\Scripts\python.exe"
$K = $PSScriptRoot; $ports = "$K\ports_k1112cusp.json"
$env:K926_FINAL_E = "shear"; $env:K1009_PINS = $null; $env:PYTHONDONTWRITEBYTECODE = "1"
if ($Pins) { $env:K1009_PINS = $Pins }
$Builds = @($Builds | ForEach-Object { "$_" -split ',' } | Where-Object { $_ })
$pairs = @(foreach ($l in "acdefhin".ToCharArray()) { foreach ($r in "ijprstuwy".ToCharArray()) { "$l$r" } }) -join ","
$suf = if ($Pins) { "_nopins" } else { "" }
New-Item -ItemType Directory -Force "$K\probe" | Out-Null
$run = foreach ($b in $Builds) {
  $spec = if ($b -eq "v71") { "work31/base@work31/ports_k1112c.json@Pc10" } else { "work31/base@$ports@$b" }
  $o = "$K\probe\lowcusp_$b$suf"
  Start-Process $py -ArgumentList @("-I", "-B", "work29\dbg\solves_k1113.py", "$o.txt", "$o.json", $pairs, $spec) -WorkingDirectory $T -NoNewWindow -PassThru -RedirectStandardOutput "$o.out.txt" -RedirectStandardError "$o.err.txt"
}
$run | Wait-Process
foreach ($b in $Builds) { $o = "$K\probe\lowcusp_$b$suf"; "$o.txt: $((Get-Content "$o.txt" -ErrorAction SilentlyContinue | Measure-Object -Line).Lines) lines; stderr $((Get-Item "$o.err.txt").Length) bytes" }
