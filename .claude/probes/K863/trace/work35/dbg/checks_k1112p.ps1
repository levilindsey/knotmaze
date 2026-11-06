# K1112 Run P (22P) checks, after work34\dbg\checks_k863k.ps1 (J3k's pipeline, copied) and
# work31\dbg\checks_k1112c.ps1 (J3h's checks, copied): v6.8 (work34\base, variant M of work28's ports)
# against each candidate in work35\ports_k1112p.json (M plus m's and/or u's exit port), on the same
# bodies (work34\base). Steps: tools, ports, census, gate, calib, locality, solves, side, det, tables,
# sheets, png, crops, guard, summary. Logs in work35\checks_logs.
# Run: pwsh -NoProfile -File work35\dbg\checks_k1112p.ps1 [step ...] (no step = all, in order).
# At most 2 Python processes while $env:TEMP\claude-perf.lock exists, 4 otherwise.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Only)
$Only = @(@($Only) | ForEach-Object { "$_" -split ',' } | Where-Object { $_ })
$T = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"; Set-Location $T; $py = "$T\venv\Scripts\python.exe"
$env:K926_FINAL_E = "shear"; $env:K1009_PINS = $null
$font = "font\PlaywriteUSTrad[wght].ttf"; $lg = "work35\checks_logs"
New-Item -ItemType Directory -Force $lg, work35\sheets, work35\sheets\png, work35\det, work35\look, out35, out35\png | Out-Null
$ports35 = "work35\ports_k1112p.json"
# the candidates: the first ports (Pm10, Pu10, Pmu10) plus any second candidate the ports file holds
$cands = @("Pm10", "Pu10", "Pmu10")
$extraCands = @()
if (Test-Path $ports35) {
  $pj = Get-Content $ports35 -Raw | ConvertFrom-Json
  $extraCands = @($pj.variants.PSObject.Properties.Name | Where-Object { ($_ -match '^P[mu]\d' -or $_ -match '^Pmu\d') -and $_ -notin $cands })
  $cands += $extraCands
}
$abc = "abcdefghijklmnopqrstuvwxyz".ToCharArray()
$opairs = ($abc | ForEach-Object { "o$_" }) -join ","
$fpairs = ($abc | ForEach-Object { "f$_" }) -join ","
$bp = ($abc | ForEach-Object { "b$_" }) -join ","; $vp = ($abc | ForEach-Object { "v$_" }) -join ","; $wp = ($abc | ForEach-Object { "w$_" }) -join ","
$cp = ($abc | ForEach-Object { "c$_" }) -join ","
$mpairs = ($abc | ForEach-Object { "m$_" }) -join ","; $upairs = ($abc | ForEach-Object { "u$_" }) -join ","
$lowcusp = @(foreach ($l in "acdefhin".ToCharArray()) { foreach ($r in "ijprstuwy".ToCharArray()) { "$l$r" } }) -join ","
$words = "minimum,bow,woven,boxes,people,hippo,puppy,and,knotmaze,cursive,quick brown fox,jumps over the lazy dog,be we shoe maze huge bye,ice jet even,coffee,which,oat,bad,subgroup,lawgiver,vg"
function Uniq([string]$s) {
  $seen = [ordered]@{}; $rep = @()
  foreach ($x in $s -split ',') { if ($seen.Contains($x)) { $rep += $x } else { $seen[$x] = 1 } }
  return @((@($seen.Keys) -join ","), ($rep -join ","))
}
# J3i's census words (J3k's $cwI, each word once), plus every pair out of m and u, each word once
$cw0 = "$words,$opairs,nt,at,it,et,$fpairs,of,after,$bp,$vp,$wp,wave,$cp"
$have = @{}; foreach ($x in $cw0 -split ',') { $have[$x] = 1 }
$cwI0 = $cw0 + "," + (@($lowcusp -split ',' | Where-Object { -not $have.ContainsKey($_) }) -join ",")
$cwI, $repI = Uniq $cwI0
$cwAll, $repA = Uniq "$cwI,$mpairs,$upairs"
# the words that hold a pair out of m or u (the gate's and locality's words are the census words; the
# gate measures only these)
$gateWords = (@($cwAll -split ',' | Where-Object {
  $w = $_; $hit = $false
  foreach ($tok in $w -split ' ') { for ($i = 0; $i -lt $tok.Length - 1; $i++) { if ($tok[$i] -in 'm','u') { $hit = $true } } }
  $hit }) -join ",")
function Step($name, [scriptblock]$sb) {
  if ($Only -and -not ($Only -contains $name)) { return }
  "$((Get-Date).ToString('HH:mm:ss')) start $name"; & $sb *> "$lg\$name.log"; "$((Get-Date).ToString('HH:mm:ss')) end $name (exit $LASTEXITCODE)"
}
function Png($svg, $dpi = 48) {
  $n = [IO.Path]::GetFileNameWithoutExtension($svg)
  & "C:\Program Files\Inkscape\bin\inkscape.com" $svg --export-type=png --export-dpi=$dpi --export-background=white --export-background-opacity=1 --export-filename="out35\png\$n.png" 2> "$lg\png_$n.stderr.txt"
  "out35\png\$n.png exit $LASTEXITCODE ($((Get-Item "out35\png\$n.png" -ErrorAction SilentlyContinue).Length) bytes)"
}
function HashOf($p) {
  $s = [System.Security.Cryptography.SHA256]::Create(); $fs = [IO.File]::OpenRead($p)
  $x = [BitConverter]::ToString($s.ComputeHash($fs)).Replace("-", ""); $fs.Close(); $x
}
function Same($a, $b) {
  $ha = HashOf "$T\$a"
  $hb = if (Test-Path "$T\$b") { HashOf "$T\$b" } else { "missing" }
  "$a vs $b : $(if ($ha -eq $hb) { 'byte-identical' } else { 'DIFFER' }) $($ha.Substring(0,16))"
}
function Py($tag, [string[]]$argv) {
  Start-Process $py -ArgumentList (@("-I") + $argv) -WorkingDirectory $T -NoNewWindow -PassThru -RedirectStandardOutput "$lg\$tag.out.txt" -RedirectStandardError "$lg\$tag.err.txt"
}
function Batch([scriptblock[]]$jobs) {
  $k = if (Test-Path "$env:TEMP\claude-perf.lock") { 2 } else { 4 }
  for ($i = 0; $i -lt $jobs.Count; $i += $k) { @($jobs[$i..([Math]::Min($i + $k, $jobs.Count) - 1)] | ForEach-Object { & $_ }) | Wait-Process }
}
function Census($o, $ports, $var, $label, $cw) {
  Py ("census_" + [IO.Path]::GetFileName($o)) @("work35\dbg\census_k1112p.py", "run", $font, "work34\base\bodies.json", "work34\base\join_params.json", "$o.txt", "$o.json", "--ports", $ports, "--variant", $var, "--gen", "gen_k1027", "--label", ('"' + $label + '"'), "--words", ('"' + $cw + '"'))
}
Step "tools" { & $py -I work35\dbg\mk_tools_k1112p.py }
Step "ports" {
  if ($env:K1112P_EXTRA) { & $py -I work35\dbg\mk_ports_k1112p.py ($env:K1112P_EXTRA -split ' ') } else { & $py -I work35\dbg\mk_ports_k1112p.py }
  [IO.File]::WriteAllText("$T\work35\census_words.txt", $cwAll, (New-Object Text.UTF8Encoding $false))
  [IO.File]::WriteAllText("$T\work35\gate_words.txt", $gateWords, (New-Object Text.UTF8Encoding $false))
  "census words: J3i's $(@($cwI -split ',').Count) (removed repeats: $repI) + pairs out of m/u -> $(@($cwAll -split ',').Count) (removed: $repA); gate words: $(@($gateWords -split ',').Count)"
}
# the census of v6.8 and each candidate on the same words (work34\base's bodies for every build)
Step "census" {
  $jobs = @({ Census "work35\census_v68" "work28\ports_k990e.json" "M" "v6.8 (M)" $cwAll })
  foreach ($c in $cands) { $jobs += [scriptblock]::Create("Census 'work35\census_$c' '$ports35' '$c' '$c' '$cwAll'") }
  Batch $jobs
  foreach ($n in @("v68") + $cands) { "census_${n}: $((Get-Item "work35\census_$n.json" -ErrorAction SilentlyContinue).Length) bytes" }
}
# task 3, the gate: each candidate's joins out of m/u against v6.8's, on the words that hold one
Step "gate" {
  $specs = @("v6.8=work34/base|work28/ports_k990e.json|M|mu")
  foreach ($c in $cands) { $specs += "$c=work34/base|$ports35|$c|mu" }
  $p = Py "gate" (@("work35\dbg\dist_k1112p.py", "work35\dist_gate.txt", "work35\dist_gate.json", ('"' + $gateWords + '"')) + $specs)
  $p | Wait-Process; Get-Content "$lg\gate.out.txt", "$lg\gate.err.txt" -ErrorAction SilentlyContinue
}
# the calibration on c: J3h's v7.0 (presets) against v7.1 (c's port), the same measure
Step "calib" {
  $p = Py "calib" @("work35\dbg\dist_k1112p.py", "work35\dist_calib_c.txt", "work35\dist_calib_c.json", ('"' + $cp + '"'), "v7.0=work30/base|work30/ports_k1119.json|Pae90|c", "v7.1=work31/base|work31/ports_k1112c.json|Pc10|c")
  $p | Wait-Process; Get-Content "$lg\calib.out.txt", "$lg\calib.err.txt" -ErrorAction SilentlyContinue
}
Step "locality" {
  $jobs = @()
  foreach ($c in $cands) { $jobs += [scriptblock]::Create("Py 'locality_$c' @('work35\dbg\locality_k1112p.py', 'work35\locality_$c.txt', '$c', 'work35\census_words.txt')") }
  Batch $jobs
  foreach ($c in $cands) { Get-Content "$lg\locality_$c.err.txt" -ErrorAction SilentlyContinue | Select-Object -First 3 }
}
# every solve out of m and u (the standalone pairs), per candidate: status, nfev, the side margin
Step "solves" {
  $builds = (@($cands | ForEach-Object { "work34/base@$ports35@$_" }) -join ",")
  & $py -I work35\dbg\solves_k1112p.py work35\solves.txt work35\solves.json "$mpairs,$upairs" $builds
}
Step "side" { & $py -I work35\dbg\side_k1112p.py work35\solves.json work35\side.txt }
function CensusDet {
  $p = Py "census_det" @("work35\dbg\census_k1112p.py", "run", $font, "work34\base\bodies.json", "work34\base\join_params.json", "work35\det\census_Pmu10.txt", "work35\det\census_Pmu10.json", "--ports", $ports35, "--variant", "Pmu10", "--gen", "gen_k1027", "--label", '"Pmu10"', "--words", ('"' + $cwAll + '"'))
  $p | Wait-Process
}
# determinism: a second census of Pmu10, byte for byte against the first
Step "det" {
  CensusDet
  Same "work35\census_Pmu10.json" "work35\det\census_Pmu10.json"
  Same "work35\census_Pmu10.txt" "work35\det\census_Pmu10.txt"
}
Step "tables" {
  $specs = @("v6.8=work35\census_v68.json")
  foreach ($c in $cands) { $specs += "$c=work35\census_$c.json" }
  & $py -I work35\dbg\tables_k1112p.py work35\tables.txt work35\tables.json work35\dist_gate.json $specs
}
# ---- task 6: the sheets ----
$ports28 = "work28\ports_k990e.json"
$v68col = "approved (v6.8)=work34\base|ports|M|$ports28"
function Col35($var, $label) { "$label=work34\base|ports|$var|$ports35" }
function Sheet($svg, $title, $ws, [string[]]$cols, $rep) {
  $a = @("work35\dbg\sheet_k1112p.py", $svg, ('"' + $title + '"'), ('"' + $ws + '"'))
  foreach ($c in $cols) { $a += @("--col", ('"' + $c + '"')) }
  Py ("sheet_" + [IO.Path]::GetFileNameWithoutExtension($svg)) ($a + @("--report", "$rep.txt", "--sidecar", "${rep}_sidecar.json"))
}
$tl = " (pale grey: the font; black: bodies; red: solved joins; blue: preset joins; orange: lead-ins and tails)"
$mwords = (@($cwAll -split ',' | Where-Object { $_ -match 'm[a-z]' -or $_ -match '[a-z]m[a-z]' }) -join ",")
$uwords = (@($cwAll -split ',' | Where-Object { $_ -match 'u[a-z]' -or $_ -match '[a-z]u[a-z]' }) -join ",")
Step "sheets" {
  $mcols = @($v68col, (Col35 "Pm10" "Pm10 (m's port)")) + @($extraCands | Where-Object { $_ -match '^Pm' } | ForEach-Object { Col35 $_ "$_ (m's 2nd)" }) + @((Col35 "Pmu10" "Pmu10 (both)"))
  $ucols = @($v68col, (Col35 "Pu10" "Pu10 (u's port)")) + @($extraCands | Where-Object { $_ -match '^Pu' } | ForEach-Object { Col35 $_ "$_ (u's 2nd)" }) + @((Col35 "Pmu10" "Pmu10 (both)"))
  $mcases = (Uniq "m,$mpairs,$mwords")[0]
  $ucases = (Uniq "u,$upairs,$uwords")[0]
  Batch @(
    { Sheet "out35\m_v68.svg" "K1112 Run P: m's exit port against v6.8: m alone, every pair out of m, and the census words holding one$tl" $mcases $mcols "work35\sheets\m_v68" },
    { Sheet "out35\u_v68.svg" "K1112 Run P: u's exit port against v6.8: u alone, every pair out of u, and the census words holding one$tl" $ucases $ucols "work35\sheets\u_v68" },
    { Py "sheet_overlay" @("work35\dbg\overlay_k1112p.py", "out35\overlay_v68.svg", '"K1112 Run P: overlay: the font in light grey, v6.8 and each candidate centreline on the same axes"', ('"' + "$mpairs,$upairs" + '"'), "--col", ('"' + $v68col + '"'), "--col", ('"' + (Col35 "Pm10" "Pm10") + '"'), "--col", ('"' + (Col35 "Pu10" "Pu10") + '"'), "--col", ('"' + (Col35 "Pmu10" "Pmu10") + '"')) })
}
Step "png" { foreach ($s in "m_v68", "u_v68", "overlay_v68") { Png "out35\$s.svg" } }
Step "crops" { & $py -I work35\dbg\crops_k1112p.py }
Step "guard" { & $py -I work20\dbg\check_out_k990.py out35 }
Step "summary" { & $py -I work35\dbg\sum_k1112p.py }
