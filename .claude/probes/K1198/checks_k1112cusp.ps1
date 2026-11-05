# K1198 (Muse batch 20 Run G) COPY of work32/dbg/checks_k1112cusp.ps1 (K1112 J3i, untouched in
# .claude/probes/K863/trace/): retargeted - Plc1m only. The trace (venv, font, work31/base, J3h's
# ports, work32's on-record censuses/solves) stays read-only; the ports file is this folder's
# ports_k1112cusp.json and every output lands in this folder. Steps kept: census, cmp, locality,
# solves, side (J3i's template/build/ctx/sheets/png/det/guard steps land a variant and are not
# copied; Run G lands nothing). The census/side/locality tools are this folder's copies
# (census_k1027.py, sum_k1113.py, pairs_k1112cusp.py, locality_k1112cusp.py, side_k1112c.py);
# the solver work29/dbg/solves_k1113.py runs in place, read-only, through probe_k1112cusp.ps1.
# K1112 (J3i, v7.2) checks, after work31\dbg\checks_k1112c.ps1 (J3h's, untouched): v7.2 against v7.1.
# Steps: census (Plc1m on work31/base, the rule moves no body), cmp, locality, solves, side.
# Logs in checks_logs. Run: pwsh -NoProfile -File .claude\probes\K1198\checks_k1112cusp.ps1 [step ...]
# (no step = all, in order). At most 4 Python processes.
param([string]$Cand = "Plc1m", [Parameter(ValueFromRemainingArguments = $true)][string[]]$Only)
$Only = @(@($Only) | ForEach-Object { "$_" -split ',' } | Where-Object { $_ })
$T = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"; $py = "$T\venv\Scripts\python.exe"
$K = $PSScriptRoot; $ports = "$K\ports_k1112cusp.json"
$env:K926_FINAL_E = "shear"; $env:K1009_PINS = $null; $env:PYTHONDONTWRITEBYTECODE = "1"
$font = "font\PlaywriteUSTrad[wght].ttf"; $lg = "$K\checks_logs"
New-Item -ItemType Directory -Force $lg | Out-Null
$abc = "abcdefghijklmnopqrstuvwxyz".ToCharArray()
$opairs = ($abc | ForEach-Object { "o$_" }) -join ","
$fpairs = ($abc | ForEach-Object { "f$_" }) -join ","
$bp = ($abc | ForEach-Object { "b$_" }) -join ","; $vp = ($abc | ForEach-Object { "v$_" }) -join ","; $wp = ($abc | ForEach-Object { "w$_" }) -join ","
$cp = ($abc | ForEach-Object { "c$_" }) -join ","
# the rule's pairs: every low exit with a port (a c d e f h i n) into every letter with a cusp window (i j p r s t u w y)
$lowcusp = @(foreach ($l in "acdefhin".ToCharArray()) { foreach ($r in "ijprstuwy".ToCharArray()) { "$l$r" } }) -join ","
$words = "minimum,bow,woven,boxes,people,hippo,puppy,and,knotmaze,cursive,quick brown fox,jumps over the lazy dog,be we shoe maze huge bye,ice jet even,coffee,which,oat,bad,subgroup,lawgiver,vg"
# J3h's census words and pairs, plus every rule pair not already there (the census words holding one are in $words)
$cw0 = "$words,$opairs,nt,at,it,et,$fpairs,of,after,$bp,$vp,$wp,wave,$cp"
$have = @{}; foreach ($x in $cw0 -split ',') { $have[$x] = 1 }
$cw = $cw0 + "," + (@($lowcusp -split ',' | Where-Object { -not $have.ContainsKey($_) }) -join ",")
function Step($name, [scriptblock]$sb) {
  if ($Only -and -not ($Only -contains $name)) { return }
  "$((Get-Date).ToString('HH:mm:ss')) start $name"; & $sb *> "$lg\$name.log"; "$((Get-Date).ToString('HH:mm:ss')) end $name (exit $LASTEXITCODE)"
}
# the census of Plc1m on work31/base (J3i's v7.2 census used work32/base, byte-identical bodies),
# beside the trace's on-record v7.1/v7.2/v7.2b censuses, read-only
Step "census" {
  $o = "$K\census_Plc1m"
  $p = Start-Process $py -ArgumentList @("-I", "-B", "$K\census_k1027.py", "run", $font, "work31\base\bodies.json", "work31\base\join_params.json", "$o.txt", "$o.json", "--ports", $ports, "--variant", $Cand, "--label", ('"' + "Plc1m (K1198)" + '"'), "--words", ('"' + $cw + '"')) -WorkingDirectory $T -NoNewWindow -PassThru -RedirectStandardOutput "$lg\census_Plc1m.out.txt" -RedirectStandardError "$lg\census_Plc1m.err.txt"
  $p | Wait-Process
  "census_Plc1m: $((Get-Item "$o.json" -ErrorAction SilentlyContinue).Length) bytes"
}
Step "cmp" {
  & $py -I -B "$K\census_k1027.py" cmp "$T\work32\census_v71.json" "$K\census_Plc1m.json" "$K\census_cmp_v71_Plc1m.txt"
  & $py -I -B "$K\sum_k1113.py" "$K\census_sum_v71_Plc1m.txt" acdefhin "$T\work32\census_v71.json" "$K\census_Plc1m.json"
  & $py -I -B "$K\pairs_k1112cusp.py" "$K\census_pairs_k1112cusp.txt" "v71=$T\work32\census_v71.json" "Plc1m=$K\census_Plc1m.json" "v72=$T\work32\census_v72.json" "v72b=$T\work32\census_v72b.json"
}
Step "locality" {
  & $py -I -B "$K\locality_k1112cusp.py" "$K\locality_k1112cusp.txt" "work31\base" $Cand
}
Step "solves" {
  & pwsh -NoProfile -File "$K\probe_k1112cusp.ps1" $Cand
}
Step "side" {
  & $py -I -B "$K\side_k1112c.py" "$K\probe\lowcusp_$Cand.json" "$K\side_Plc1m.txt"
}
