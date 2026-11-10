# K863 J3n checks, after work37\dbg\checks_k863m.ps1 (J3m's, untouched): the candidate (cand: J3M + the k863n spec of
# $env:K863N_SPEC, default work38\k863n_v1.json; a variant from $env:K863N_VAR_SPEC as J3NV), its locality against J3M
# over the 232 test words (local: only the forms the spec changes may move), the census of the changed words in J3M and
# J3n with v6.8's rows beside them (cens_c), v6.9's flaws on the joins out of b, v and w (climb), the look sheets
# (font | v6.8 | J3M | J3n [| the variant]) inked at the pen's width (sheets), the 232 test words' sheets (words) and
# their PNGs at 144 dpi (3x; png). Logs in work38\checks_logs. Run: pwsh -NoProfile -File work38\dbg\checks_k863n.ps1
# [step ...] (no step = all, in order: cand local cens_c climb sheets words png). Batch caps the kit's Python jobs as
# J3m's did. J3m's header, for the rest:
# K863 J3m checks, after work36\dbg\checks_k863l.ps1 (J3l's, untouched): the candidate (cand: J3L + the k863m forms of
# $env:K863M_SPEC, default work37\k863m_v2.json), its locality against J3L over the 232 test words (local), the census
# of the changed words in J3L and J3m with v6.8's rows beside them (cens_c), the look sheets (font | v6.8 | J3l | J3m
# [| the variant]) inked at the pen's width (sheets), the 232 test words' sheets (words) and their PNGs at 144 dpi
# (3x; png). Logs in work37\checks_logs. Run: pwsh -NoProfile -File work37\dbg\checks_k863m.ps1 [step ...] (no step =
# all, in order: cand local cens_c sheets words png). At most 2 Python jobs while $env:TEMP\claude-perf.lock exists, 4
# otherwise, counted machine-wide over the kit's jobs (Batch).
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Only)
$Only = @(@($Only) | ForEach-Object { "$_" -split ',' } | Where-Object { $_ })
$T = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"; Set-Location $T; $py = "$T\venv\Scripts\python.exe"
$env:K926_FINAL_E = "shear"; $env:K1009_PINS = $null
$font = "font\PlaywriteUSTrad[wght].ttf"; $lg = "work38\checks_logs"; $ports = "work28\ports_k990e.json"
$spec = if ($env:K863N_SPEC) { $env:K863N_SPEC } else { "work38\k863n_v1.json" }
$vspec = $env:K863N_VAR_SPEC   # optional: a variant spec, built as J3NV and drawn as a fifth column
New-Item -ItemType Directory -Force $lg, work38\sheets, work38\cand, out38, out38\png | Out-Null
$abc = "abcdefghijklmnopqrstuvwxyz".ToCharArray()
$opairs = ($abc | ForEach-Object { "o$_" }) -join ","
$fpairs = ($abc | ForEach-Object { "f$_" }) -join ","
$bp = ($abc | ForEach-Object { "b$_" }) -join ","; $vp = ($abc | ForEach-Object { "v$_" }) -join ","; $wp = ($abc | ForEach-Object { "w$_" }) -join ","
$cp = ($abc | ForEach-Object { "c$_" }) -join ","
$lowcusp = @(foreach ($l in "acdefhin".ToCharArray()) { foreach ($r in "ijprstuwy".ToCharArray()) { "$l$r" } }) -join ","
$words = "minimum,bow,woven,boxes,people,hippo,puppy,and,knotmaze,cursive,quick brown fox,jumps over the lazy dog,be we shoe maze huge bye,ice jet even,coffee,which,oat,bad,subgroup,lawgiver,vg"
function Uniq([string]$s) {
  $seen = [ordered]@{}; $rep = @()
  foreach ($x in $s -split ',') { if ($seen.Contains($x)) { $rep += $x } else { $seen[$x] = 1 } }
  return @((@($seen.Keys) -join ","), ($rep -join ","))
}
# J3i's census words, each once (J3k's $cwI: the 232 test words)
$cw0 = "$words,$opairs,nt,at,it,et,$fpairs,of,after,$bp,$vp,$wp,wave,$cp"
$have = @{}; foreach ($x in $cw0 -split ',') { $have[$x] = 1 }
$cwI0 = $cw0 + "," + (@($lowcusp -split ',' | Where-Object { -not $have.ContainsKey($_) }) -join ",")
$cwI, $repI = Uniq $cwI0
# the next letter's entry class (J3m): low = its join out of b dips to 57-74 u first in v6.8 (e h k r s), high = 85-104 u
$low = "ehkrs"; $high = (@($abc | Where-Object { $low.IndexOf($_) -lt 0 }) -join "")
function Step($name, [scriptblock]$sb) {
  if ($Only -and -not ($Only -contains $name)) { return }
  "$((Get-Date).ToString('HH:mm:ss')) start $name"; & $sb *> "$lg\$name.log"; "$((Get-Date).ToString('HH:mm:ss')) end $name (exit $LASTEXITCODE)"
}
function Py($tag, [string[]]$argv) {
  Start-Process $py -ArgumentList (@("-I") + $argv) -WorkingDirectory $T -NoNewWindow -PassThru -RedirectStandardOutput "$lg\$tag.out.txt" -RedirectStandardError "$lg\$tag.err.txt"
}
function KitJobs() {
  # the kit's Python jobs machine-wide (any run of this script or another): the venv launchers, not their children
  $all = @(Get-CimInstance Win32_Process -Filter "Name='python.exe'")
  $pids = @{}; foreach ($p in $all) { $pids[[int]$p.ProcessId] = 1 }
  @($all | Where-Object { $_.CommandLine -like "*\K863\trace\venv\*" -and -not $pids.ContainsKey([int]$_.ParentProcessId) }).Count
}
function Batch([scriptblock[]]$jobs) {
  # a rolling pool (J3l's): each job starts once the kit's jobs machine-wide are under the cap, read again before
  # every start (2 while the perf lock exists, 4 otherwise; $env:K863L_PAR caps it lower)
  # (its locals must not shadow what the jobs read when they run: $v68, $j3m, $mine, $var, $tl)
  $started = @()
  foreach ($j in $jobs) {
    while ($true) {
      $k = if (Test-Path "$env:TEMP\claude-perf.lock") { 2 } else { 4 }
      if ($env:K863L_PAR) { $k = [Math]::Min($k, [int]$env:K863L_PAR) }
      if ((KitJobs) -lt $k) { break }
      Start-Sleep -Seconds 3
    }
    $started += & $j
    Start-Sleep -Seconds 1
  }
  $started | Wait-Process
}
function Census($o, $dir, $label, $cw, $gen) {
  Py ("census_" + [IO.Path]::GetFileName($o)) @("work38\dbg\census_k863n.py", "run", $font, "$dir\bodies.json", "$dir\join_params.json", "$o.txt", "$o.json", "--ports", $ports, "--variant", "M", "--gen", $gen, "--label", ('"' + $label + '"'), "--words", ('"' + $cw + '"'))
}
function Sheet($svg, $title, $ws, [string[]]$cols) {
  $n = [IO.Path]::GetFileNameWithoutExtension($svg)
  $a = @("work38\dbg\sheet_k863n.py", $svg, ('"' + $title + '"'), ('"' + $ws + '"'))
  foreach ($c in $cols) { $a += @("--col", ('"' + $c + '"')) }
  Py ("sheet_$n") ($a + @("--report", "work38\sheets\$n.txt", "--sidecar", "work38\sheets\${n}_sidecar.json", "--ink", "9.2"))
}
Step "cand" {
  & $py -I work37\dbg\mk_cand_k863m.py work37\cand\J3M work38\cand\J3N $spec
  if ($vspec) { & $py -I work37\dbg\mk_cand_k863m.py work37\cand\J3M work38\cand\J3NV $vspec }
}
$cands = @("J3N"); if ($vspec) { $cands += "J3NV" }
Step "local" {
  "J3i's words: $(@($cwI0 -split ',').Count) -> $(@($cwI -split ',').Count) words (removed repeats: $repI)"
  foreach ($n in $cands) {
    & $py -I work38\dbg\local_k863n.py work37\cand\J3M work38\cand\$n $ports M "work38\local_$n.txt" "work38\local_$n.json" --words $cwI
  }
}
Step "cens_c" {
  $chg = @{}; foreach ($n in $cands) { $chg[$n] = @((Get-Content "work38\local_$n.json" -Raw | ConvertFrom-Json).changed_words) -join "," }
  $all = (@($cands | ForEach-Object { $chg[$_] -split ',' }) | Where-Object { $_ } | Select-Object -Unique) -join ","
  "changed words: $(@($all -split ',').Count) ($all)"
  $jobs = @([scriptblock]::Create("Census 'work38\census_v68n' 'work34\base' 'v6.8 through gen_k863n' '$all' 'gen_k863n'"),
    [scriptblock]::Create("Census 'work38\census_J3M' 'work37\cand\J3M' 'J3M' '$all' 'gen_k863n'"))
  foreach ($n in $cands) { $jobs += [scriptblock]::Create("Census 'work38\census_$n' 'work38\cand\$n' '$n' '$all' 'gen_k863n'") }
  Batch $jobs
  & $py -I work34\dbg\censcmp_k863k.py work38\census_cmp.txt work38\census_v68n.json "J3M=work38\census_J3M.json" @($cands | ForEach-Object { "$_=work38\census_$_.json@q" })
}
$v68 = "approved (v6.8)=work34\base|ports|M|$ports"
$j3m = "J3M=work37\cand\J3M|ports|M|$ports"
$mine = "J3n=work38\cand\J3N|ports|M|$ports"
$var = if ($vspec) { "J3n variant=work38\cand\J3NV|ports|M|$ports" } else { $null }
$tl = " (pale grey: the font; black: bodies; red: solved joins; blue: preset joins; orange: lead-ins and tails; grey: the ink at 9.2 u)"
$chunks = @(); $wl = @($cwI -split ','); for ($i = 0; $i -lt $wl.Count; $i += 29) { $chunks += , ($wl[$i..([Math]::Min($i + 29, $wl.Count) - 1)] -join ",") }
Step "climb" {
  & $py -I work38\dbg\climb_k863n.py work38\climb.txt
}
Step "sheets" {
  $cols = @($v68, $j3m, $mine); if ($var) { $cols += $var }
  $jobs = @()
  foreach ($X in "b", "v", "w") {
    $hw = (@($high.ToCharArray() | ForEach-Object { "$X$_" }) -join ",")
    $jobs += [scriptblock]::Create("Sheet 'out38\k863n_${X}_high.svg' 'K863 J3n: $X into a letter that enters high ($high): the font, v6.8, J3M, J3n (out of the cusp a little more downward: 33.75 degrees below level, J3M 22.5)$tl' '$hw' @(`$cols)")
  }
  $lw = (@("b", "v", "w" | ForEach-Object { $X = $_; $low.ToCharArray() | ForEach-Object { "$X$_" } }) -join ",") + ",brown,over,lower,abs,awe,ivy"
  $jobs += [scriptblock]::Create("Sheet 'out38\k863n_bvw_low.svg' 'K863 J3n: b, v and w into a letter that enters low ($low): the font, v6.8, J3M, J3n (unchanged: v6.8''s sharp cusp, the later swoop)$tl' '$lw' @(`$cols)")
  $jobs += [scriptblock]::Create("Sheet 'out38\k863n_bvw_end.svg' 'K863 J3n: b, v and w at a word''s end: the font, v6.8, J3M, J3n (out of the cusp a little more downward: 33.75 degrees below level, J3M 22.5)$tl' 'b,ab,cab,tub,job,web,bob,v,av,rev,gov,w,aw,bow,saw,new,cow,few' @(`$cols)")
  $jobs += [scriptblock]::Create("Sheet 'out38\k863n_f_end.svg' 'K863 J3n: f at a word''s end: the font, v6.8, J3M, J3n (down beside the stroke to the baseline as before, then a shorter, flatter, smooth tail)$tl' 'f,af,of,if,off,chef,leaf,golf,half,beef,cliff,wolf,self,surf' @(`$cols)")
  $jobs += [scriptblock]::Create("Sheet 'out38\k863n_p_end.svg' 'K863 J3n: p at a word''s end: the font, v6.8, J3M, J3n (a shorter tail that rises less steeply)$tl' 'p,up,hip,op,sap,ship,deep,top,map,cap,jump,help,stop,keep' @(`$cols)")
  $jobs += [scriptblock]::Create("Sheet 'out38\k863n_ref_end.svg' 'K863 J3n: the word-end tails Levi called fine (o, q, a), for reference beside the changed ones: the font, v6.8, J3M, J3n$tl' 'o,so,two,photo,q,aq,iraq,a,ba,data,sofa,pizza' @(`$cols)")
  Batch $jobs
}
Step "words" {
  $cols = @($v68, $j3m, $mine)
  $jobs = @()
  for ($i = 0; $i -lt $chunks.Count; $i++) {
    $jobs += [scriptblock]::Create("Sheet 'out38\k863n_words$($i + 1).svg' 'K863 J3n: the 232 test words, $($i + 1) of $($chunks.Count): the font, v6.8, J3M, J3n$tl' '$($chunks[$i])' @(`$cols)")
  }
  Batch $jobs
}
Step "png" {
  foreach ($s in Get-ChildItem out38\*.svg) {
    & "C:\Program Files\Inkscape\bin\inkscape.com" $s.FullName --export-type=png --export-dpi=144 --export-background=white --export-background-opacity=1 --export-filename="out38\png\$($s.BaseName).png" 2> "$lg\png_$($s.BaseName).stderr.txt"
  }
}