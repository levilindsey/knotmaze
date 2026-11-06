# K863 J3l (word-end tails) checks, after work34\dbg\checks_k863k.ps1 (J3k's, untouched): the candidates (cand), their
# locality over J3i's 232 words (local), the census on the changed words with v6.8's rows beside them (cens_c), the
# sheets (font | v6.8 | J3l [| the variant]) inked at the pen's width, and their PNGs at 144 dpi (3x; png).
# Logs in work36\checks_logs. Run: pwsh -NoProfile -File work36\dbg\checks_k863l.ps1 [step ...] (no step = all, in
# order: cand local cens_c sheets words png; words = the 232 test words' sheets). At most 2 Python jobs while
# $env:TEMP\claude-perf.lock exists, 4 otherwise, counted machine-wide over the kit's jobs (Batch), so runs side by side
# share the cap.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Only)
$Only = @(@($Only) | ForEach-Object { "$_" -split ',' } | Where-Object { $_ })
$T = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"; Set-Location $T; $py = "$T\venv\Scripts\python.exe"
$env:K926_FINAL_E = "shear"; $env:K1009_PINS = $null
$font = "font\PlaywriteUSTrad[wght].ttf"; $lg = "work36\checks_logs"; $ports = "work28\ports_k990e.json"
New-Item -ItemType Directory -Force $lg, work36\sheets, out36, out36\png | Out-Null
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
  # a rolling pool: each job starts once the kit's jobs machine-wide are under the cap, read again before every start
  # (2 while the perf lock exists, 4 otherwise; $env:K863L_PAR caps it lower), so two runs side by side stay within it
  # and a lock taken mid-run takes effect at the next start
  # (its locals must not shadow what the jobs read when they run: $v68, $mine, $var, $tl, $az)
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
function Census($o, $dir, $label, $cw, $gen = "gen_k863k") {
  Py ("census_" + [IO.Path]::GetFileName($o)) @("work34\dbg\census_k863k.py", "run", $font, "$dir\bodies.json", "$dir\join_params.json", "$o.txt", "$o.json", "--ports", $ports, "--variant", "M", "--gen", $gen, "--label", ('"' + $label + '"'), "--words", ('"' + $cw + '"'))
}
function Sheet($svg, $title, $ws, [string[]]$cols) {
  $n = [IO.Path]::GetFileNameWithoutExtension($svg)
  $a = @("work34\dbg\sheet_k863k.py", $svg, ('"' + $title + '"'), ('"' + $ws + '"'))
  foreach ($c in $cols) { $a += @("--col", ('"' + $c + '"')) }
  Py ("sheet_$n") ($a + @("--report", "work36\sheets\$n.txt", "--sidecar", "work36\sheets\${n}_sidecar.json", "--ink", "9.2"))
}
$cands = @("J3L", "J3LC")
# J3L: forms_v1 (b, f, o, v, w; its s and p overridden) + forms_A's s (hugs the bowl, peels, swoops) + forms_P1's p
# (follows the bowl's bottom, swoops at 55 deg) + D2 (J3k's) + Q1s (Q1 without its S); J3LC: forms_v1's s and p (C1:
# they pass under their bowls), the rest the same
Step "cand" {
  & $py -I work36\dbg\qfit_k863l.py work34\base\bodies.json work34\cand\Q1\join_params.json work34\cand\qfit_Q1b.json work36\qfit_Q1s.json
  & $py -I work36\dbg\mk_cand_k863l.py work34\base work36\cand\J3L "work36\forms_v1.json,work36\forms_A.json,work36\forms_P1.json" work36\qfit_Q1s.json work34\cand\D2\join_params.json
  & $py -I work36\dbg\mk_cand_k863l.py work34\base work36\cand\J3LC "work36\forms_v1.json" work36\qfit_Q1s.json work34\cand\D2\join_params.json
}
Step "local" {
  "J3i's words: $(@($cwI0 -split ',').Count) -> $(@($cwI -split ',').Count) words (removed repeats: $repI)"
  & $py -I work34\dbg\local_k863k.py work34\base $ports M work36\cand work36\local.txt work36\local.json ($cands -join ",") --words $cwI
}
Step "cens_c" {
  $lj = Get-Content work36\local.json -Raw | ConvertFrom-Json
  $chg = @{}; foreach ($n in $cands) { $chg[$n] = @($lj.res.$n.changed_words) -join "," }
  $all = (@($cands | ForEach-Object { $chg[$_] -split ',' }) | Where-Object { $_ } | Select-Object -Unique) -join ","
  "changed words: $(@($all -split ',').Count) ($all)"
  $jobs = @([scriptblock]::Create("Census 'work36\census_v68k' 'work34\base' 'v6.8 through gen_k863k' '$all'"))
  foreach ($n in $cands) { $jobs += [scriptblock]::Create("Census 'work36\census_$n' 'work36\cand\$n' '$n' '$($chg[$n])'") }
  Batch $jobs
  & $py -I work34\dbg\censcmp_k863k.py work36\census_cmp.txt work34\census_v68x.json "v6.8k=work36\census_v68k.json" @($cands | ForEach-Object { "$_=work36\census_$_.json@q" })
}
$v68 = "approved (v6.8)=work34\base|ports|M|$ports"
$mine = "J3l=work36\cand\J3L|ports|M|$ports"
$var = "J3lc (C1)=work36\cand\J3LC|ports|M|$ports"
$tl = " (pale grey: the font; black: bodies; red: solved joins; blue: preset joins; orange: lead-ins and tails; grey: the ink at 9.2 u)"
$az = ($abc | ForEach-Object { "a$_" }) -join ","
$chunks = @(); $wl = @($cwI -split ','); for ($i = 0; $i -lt $wl.Count; $i += 29) { $chunks += , ($wl[$i..([Math]::Min($i + 29, $wl.Count) - 1)] -join ",") }
Step "sheets" {
  $jobs = @(
    { Sheet "out36\k863l_az.svg" "K863 J3l: every letter at a word's end (a + the letter): the font, v6.8, J3l, J3lc (s and p pass under their bowls)$tl" $az @($v68, $mine, $var) },
    { Sheet "out36\k863l_s.svg" "K863 J3l: s at a word's end: the font, v6.8, J3l (the tail follows the bowl, peels off and swoops up), J3lc (it passes under the bowl)$tl" "as,is,us,os,es,ds,bus,was,has,yes,less,boxes,jumps" @($v68, $mine, $var) },
    { Sheet "out36\k863l_p.svg" "K863 J3l: p at a word's end: the font, v6.8, J3l (the tail follows the bowl's bottom and swoops up), J3lc (it passes under the bowl)$tl" "ap,up,op,ep,ip,np,map,hop,ship,jump,cup,top,help,subgroup" @($v68, $mine, $var) },
    { Sheet "out36\k863l_dots.svg" "K863 J3l: the dots of i and j (D2, the font dot's oval): the font, v6.8, J3l$tl" "i,j,it,oi,oj,jet,ice jet even,which,hippo,minimum,fiji,jig" @($v68, $mine) },
    { Sheet "out36\k863l_q.svg" "K863 J3l: q's tail at a word's end (Q1 with its S smoothed): the font, v6.8, J3l$tl" "q,aq,oq,cq,fq,bq,vq,wq,iraq" @($v68, $mine) }
  )
  Batch $jobs
}
Step "words" {
  $jobs = @()
  for ($i = 0; $i -lt $chunks.Count; $i++) {
    $jobs += [scriptblock]::Create("Sheet 'out36\k863l_words$($i + 1).svg' 'K863 J3l: the 232 test words, $($i + 1) of $($chunks.Count): the font, v6.8, J3l$tl' '$($chunks[$i])' @(`$v68, `$mine)")
  }
  Batch $jobs
}
Step "png" {
  foreach ($s in Get-ChildItem out36\*.svg) {
    & "C:\Program Files\Inkscape\bin\inkscape.com" $s.FullName --export-type=png --export-dpi=144 --export-background=white --export-background-opacity=1 --export-filename="out36\png\$($s.BaseName).png" 2> "$lg\png_$($s.BaseName).stderr.txt"
    "out36\png\$($s.BaseName).png exit $LASTEXITCODE ($((Get-Item "out36\png\$($s.BaseName).png" -ErrorAction SilentlyContinue).Length) bytes)"
  }
}
