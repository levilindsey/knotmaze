# K863 J3k (v6.8's leftovers) checks, after work33\dbg\checks_k863j.ps1 (J3j's, untouched).
# Task 1 (K1212, the kit): v6.8 rebuilt as work34\base from out34's template (out33's, copied byte for byte) by J3e's
# pipeline, compared file by file with work33\base; its census on the two word lists with each repeat REMOVED (the first
# occurrence kept: "of" in $cwE, "of" and "vg" in $cwI), compared row by row with J3j's by the id without its word
# number (rowsame_k863k.py), and J3i's cusp-corner check with g2 reading the census's ang_deg (pairs_k863k.py).
# Later steps: the candidates (cand), their census and locality (cens_c, local), the sheets, PNGs, crops, guard.
# Steps: tools, template, build, ctx, base, census, cmp, g2, cand, cens_c, local, sheets, png, crops, guard.
# Logs in work34\checks_logs. Run: pwsh -NoProfile -File work34\dbg\checks_k863k.ps1 [step ...] (no step = all, in
# order). At most 2 Python processes while $env:TEMP\claude-perf.lock exists, 4 otherwise.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Only)
$Only = @(@($Only) | ForEach-Object { "$_" -split ',' } | Where-Object { $_ })
$T = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"; Set-Location $T; $py = "$T\venv\Scripts\python.exe"
$env:K926_FINAL_E = "shear"; $env:K1009_PINS = $null
$font = "font\PlaywriteUSTrad[wght].ttf"; $lg = "work34\checks_logs"
New-Item -ItemType Directory -Force $lg, work34\sheets, work34\sheets\png, out34, out34\png | Out-Null
$abc = "abcdefghijklmnopqrstuvwxyz".ToCharArray()
$opairs = ($abc | ForEach-Object { "o$_" }) -join ","
$fpairs = ($abc | ForEach-Object { "f$_" }) -join ","
$bp = ($abc | ForEach-Object { "b$_" }) -join ","; $vp = ($abc | ForEach-Object { "v$_" }) -join ","; $wp = ($abc | ForEach-Object { "w$_" }) -join ","
$cp = ($abc | ForEach-Object { "c$_" }) -join ","
$lowcusp = @(foreach ($l in "acdefhin".ToCharArray()) { foreach ($r in "ijprstuwy".ToCharArray()) { "$l$r" } }) -join ","
$words = "minimum,bow,woven,boxes,people,hippo,puppy,and,knotmaze,cursive,quick brown fox,jumps over the lazy dog,be we shoe maze huge bye,ice jet even,coffee,which,oat,bad,subgroup,lawgiver,vg"
# K1212: each word once (the first occurrence kept, in order); the repeats removed are listed in the census step's log
function Uniq([string]$s) {
  $seen = [ordered]@{}; $rep = @()
  foreach ($x in $s -split ',') { if ($seen.Contains($x)) { $rep += $x } else { $seen[$x] = 1 } }
  return @((@($seen.Keys) -join ","), ($rep -join ","))
}
# J3e's census words (J3j's $cwE, which held "of" twice: in $opairs and again before "after")
$cwE0 = "$words,$opairs,nt,at,it,et,ba,va,wa,bq,vq,wq,$fpairs,of,after"
# J3i's census words (J3j's $cwI, which held "of" twice and "vg" twice: in $words and $vp)
$cw0 = "$words,$opairs,nt,at,it,et,$fpairs,of,after,$bp,$vp,$wp,wave,$cp"
$have = @{}; foreach ($x in $cw0 -split ',') { $have[$x] = 1 }
$cwI0 = $cw0 + "," + (@($lowcusp -split ',' | Where-Object { -not $have.ContainsKey($_) }) -join ",")
$cwE, $repE = Uniq $cwE0
$cwI, $repI = Uniq $cwI0
$build = { param($tpl, $dir) & pwsh -NoProfile -File work23\dbg\build_k1019.ps1 $tpl -Dir $dir -Mode ports -Variant B -Ports work21\ports_k1009.json -Tail long -Map work20\template_map_k990.json -Base work16\fewnode\bodies.json }
function Step($name, [scriptblock]$sb) {
  if ($Only -and -not ($Only -contains $name)) { return }
  "$((Get-Date).ToString('HH:mm:ss')) start $name"; & $sb *> "$lg\$name.log"; "$((Get-Date).ToString('HH:mm:ss')) end $name (exit $LASTEXITCODE)"
}
function Png($svg, $dpi = 48) {
  $n = [IO.Path]::GetFileNameWithoutExtension($svg)
  & "C:\Program Files\Inkscape\bin\inkscape.com" $svg --export-type=png --export-dpi=$dpi --export-background=white --export-background-opacity=1 --export-filename="out34\png\$n.png" 2> "$lg\png_$n.stderr.txt"
  "out34\png\$n.png exit $LASTEXITCODE ($((Get-Item "out34\png\$n.png" -ErrorAction SilentlyContinue).Length) bytes)"
}
function Same($a, $b) {
  $ha = (Get-FileHash "$T\$a" -Algorithm SHA256).Hash
  $hb = if (Test-Path "$T\$b") { (Get-FileHash "$T\$b" -Algorithm SHA256).Hash } else { "missing" }
  "$a vs $b : $(if ($ha -eq $hb) { 'byte-identical' } else { 'DIFFER' }) $($ha.Substring(0,16))"
}
function Py($tag, [string[]]$argv) {
  Start-Process $py -ArgumentList (@("-I") + $argv) -WorkingDirectory $T -NoNewWindow -PassThru -RedirectStandardOutput "$lg\$tag.out.txt" -RedirectStandardError "$lg\$tag.err.txt"
}
# at most 2 Python processes while the perf lock exists, else 4: run a list of Py calls in batches of that size
function Batch([scriptblock[]]$jobs) {
  $k = if (Test-Path "$env:TEMP\claude-perf.lock") { 2 } else { 4 }
  for ($i = 0; $i -lt $jobs.Count; $i += $k) { @($jobs[$i..([Math]::Min($i + $k, $jobs.Count) - 1)] | ForEach-Object { & $_ }) | Wait-Process }
}
function Census($o, $dir, $ports, $var, $label, $cw, $gen = "gen_k1027") {
  Py ("census_" + [IO.Path]::GetFileName($o)) @("work34\dbg\census_k863k.py", "run", $font, "$dir\bodies.json", "$dir\join_params.json", "$o.txt", "$o.json", "--ports", $ports, "--variant", $var, "--gen", $gen, "--label", ('"' + $label + '"'), "--words", ('"' + $cw + '"'))
}
Step "tools" { & $py -I work34\dbg\mk_tools_k863k.py }
# the template: J3j's (out33's = out28's, J3e's after its ctx step), copied byte for byte
Step "template" { Copy-Item out33\cursive_template.svg out34\cursive_template.svg -Force; Same "out33\cursive_template.svg" "out34\cursive_template.svg"; Same "out28\cursive_template.svg" "out34\cursive_template.svg" }
Step "build" { & $build out34\cursive_template.svg work34\base }
# J3e's ctx step (f's rebuilt exit context): a no-op on this template, checked byte for byte
Step "ctx" { & $py -I work27\dbg\ctx_template_k1027.py out34\cursive_template.svg work34\base\out\cursive_template.svg; Same "out33\cursive_template.svg" "out34\cursive_template.svg" }
# the build against J3j's, file by file (the text logs and reports carry times and paths)
Step "base" {
  $files = Get-ChildItem work33\base -File -Recurse | ForEach-Object { $_.FullName.Substring("$T\work33\base\".Length) }
  foreach ($f in $files) { Same "work33\base\$f" "work34\base\$f" }
  $extra = Get-ChildItem work34\base -File -Recurse | ForEach-Object { $_.FullName.Substring("$T\work34\base\".Length) } | Where-Object { $files -notcontains $_ }
  "only in work34\base: $(@($extra).Count) $($extra -join ', ')"
  $sp = @($files | Where-Object { $_ -match '\.(svg|png|json)$' })
  $bad = @($sp | Where-Object { (Get-FileHash "$T\work33\base\$_").Hash -ne (Get-FileHash "$T\work34\base\$_" -ErrorAction SilentlyContinue).Hash })
  "SVG, PNG and JSON files: $($sp.Count), differing: $($bad.Count) $($bad -join ', ')"
}
# v6.8's census on the two word lists, each word once (census_k863k.py = J3d's census_k1027.py, its path only)
Step "census" {
  "J3e's words: $(@($cwE0 -split ',').Count) -> $(@($cwE -split ',').Count) words (removed repeats: $repE)"
  "J3i's words: $(@($cwI0 -split ',').Count) -> $(@($cwI -split ',').Count) words (removed repeats: $repI)"
  Batch @({ Census "work34\census_v68" "work34\base" "work28\ports_k990e.json" "M" "v6.8 (M)" $cwE },
          { Census "work34\census_v68x" "work34\base" "work28\ports_k990e.json" "M" "v6.8 (M), J3i's words" $cwI })
  foreach ($j in "v68", "v68x") { "census_${j}: $((Get-Item "work34\census_$j.json" -ErrorAction SilentlyContinue).Length) bytes" }
}
# K1212: rows matched by the id without its word number, every field compared but the label and the id
Step "cmp" {
  & $py -I work34\dbg\rowsame_k863k.py work33\census_v68.json work34\census_v68.json work34\rowsame_v68.txt
  & $py -I work34\dbg\rowsame_k863k.py work33\census_v68x.json work34\census_v68x.json work34\rowsame_v68x.txt
  & $py -I work34\dbg\rowsame_k863k.py work28\census_v68.json work34\census_v68.json work34\rowsame_v68_j3e.txt
}
# K1212: J3i's check with g2 reading ang_deg, on v6.8 (J3i's words), beside J3j's (angle unread) for the counts
Step "g2" {
  & $py -I work33\dbg\pairs_k863j.py work34\cusp_corners_j3j.txt v6.8=work34\census_v68x.json
  & $py -I work34\dbg\pairs_k863k.py work34\cusp_corners.txt v6.8=work34\census_v68x.json
}
# ---- tasks 2-7: the candidates ----
function Sheet($svg, $title, $ws, [string[]]$cols, $rep) {
  $a = @("work34\dbg\sheet_k863k.py", $svg, ('"' + $title + '"'), ('"' + $ws + '"'))
  foreach ($c in $cols) { $a += @("--col", ('"' + $c + '"')) }
  Py ("sheet_" + [IO.Path]::GetFileNameWithoutExtension($svg)) ($a + @("--report", "$rep.txt", "--sidecar", "${rep}_sidecar.json"))
}
$ports = "work28\ports_k990e.json"
$cands = @("S1", "S2", "P1", "Q1", "D1", "D2", "ALL")
$v68 = "approved (v6.8)=work34\base|ports|M|$ports"
function Col($n, $label) { "$label=work34\cbuild\$n|ports|M|$ports" }
# the candidates: q's refit (Q1 = the second fit: the first, a0 >= 0.15, hit its curvature cap), the forms (cand_k863k:
# S1, S2, P1, Q1, D1, D2 and the union ALL = S2+P1+Q1+D2, the test-word column), and each one's build dir (v6.8's
# bodies, byte for byte, and its join_params)
Step "cand" {
  & $py -I work34\dbg\qfit_k863k.py work34\base\bodies.json work34\base\join_params.json work34\cand\qfit_Q1.json 0.15 1.5
  & $py -I work34\dbg\qfit_k863k.py work34\base\bodies.json work34\base\join_params.json work34\cand\qfit_Q1b.json 0.3 1.0
  & $py -I work34\dbg\cand_k863k.py work34\base $ports M work34\cand\qfit_Q1b.json work34\cand "ALL=S2+P1+Q1+D2"
  foreach ($n in $cands) {
    New-Item -ItemType Directory -Force "work34\cbuild\$n" | Out-Null
    Copy-Item work34\base\bodies.json "work34\cbuild\$n\bodies.json" -Force; Copy-Item "work34\cand\$n\join_params.json" "work34\cbuild\$n\join_params.json" -Force
    Same "work34\base\bodies.json" "work34\cbuild\$n\bodies.json"
  }
}
# locality: every piece of every word of J3i's list (which holds J3e's and the test words) for every candidate
Step "local" { & $py -I work34\dbg\local_k863k.py work34\base $ports M work34\cand work34\local.txt work34\local.json ($cands -join ",") --words $cwI }
# the census on each candidate's changed words (gen_k863k), v6.8 through gen_k863k on ALL's (must equal gen_k1027's
# rows, every field), and the rows against v6.8's (censcmp_k863k)
Step "cens_c" {
  $lj = Get-Content work34\local.json -Raw | ConvertFrom-Json
  $chg = @{}; foreach ($n in $cands) { $chg[$n] = @($lj.res.$n.changed_words) -join "," }
  $jobs = @([scriptblock]::Create("Census 'work34\census_v68k' 'work34\base' '$ports' 'M' 'v6.8 through gen_k863k' '$($chg['ALL'])' 'gen_k863k'"))
  foreach ($n in $cands) { $jobs += [scriptblock]::Create("Census 'work34\census_$n' 'work34\cbuild\$n' '$ports' 'M' '$n' '$($chg[$n])' 'gen_k863k'") }
  Batch $jobs
  $sp = @{ "S1" = ""; "S2" = ""; "P1" = ""; "Q1" = "@q"; "D1" = ""; "D2" = ""; "ALL" = "@q" }
  & $py -I work34\dbg\censcmp_k863k.py work34\census_cmp.txt work34\census_v68x.json "v6.8k=work34\census_v68k.json" @($cands | ForEach-Object { "$_=work34\census_$_.json$($sp[$_])" })
}
$tl = " (pale grey: the font; black: bodies; red: solved joins; blue: preset joins; orange: lead-ins and tails)"
Step "sheets" {
  Batch @({ Sheet "out34\spot_s.svg" "K863 J3k: s at a word's end: the font, the approved version (v6.8), S1 (cut at the bottom curl's reversal), S2 (cut where the font's stroke ends)$tl" "boxes,is,jumps,as,ds,es,os" @($v68, (Col "S1" "S1 (cut at the curl)"), (Col "S2" "S2 (cut at the font's end)")) "work34\sheets\spot_s" },
          { Sheet "out34\spot_p.svg" "K863 J3k: p at a word's end: the font, the approved version (v6.8), P1 (cut where the bowl closes into the stem)$tl" "ap,op,ep,ip,np,subgroup" @($v68, (Col "P1" "P1 (bowl closed, no run-out)")) "work34\sheets\spot_p" },
          { Sheet "out34\spot_q.svg" "K863 J3k: q's tail at a word's end: the font, the approved version (v6.8), Q1 (the tail refit without the step)$tl" "oq,cq,fq,bq,vq,wq" @($v68, (Col "Q1" "Q1 (no step)")) "work34\sheets\spot_q" },
          { Sheet "out34\spot_dots.svg" "K863 J3k: the dots of i and j: the font, the approved version (v6.8), D1 (a round dot inside the font's), D2 (the font dot's oval)$tl" "it,minimum,jet,ice jet even,which,hippo,oi,oj" @($v68, (Col "D1" "D1 (round)"), (Col "D2" "D2 (the font's oval)")) "work34\sheets\spot_dots" },
          { Sheet "out34\cursive_k863k_words.svg" "K863 J3k: the test words: the font, the approved version (v6.8), ALL (S2 + P1 + Q1 + D2)$tl" $words @($v68, (Col "ALL" "ALL (S2+P1+Q1+D2)")) "work34\sheets\cursive_k863k_words" })
}
Step "png" { foreach ($s in "spot_s", "spot_p", "spot_q", "spot_dots", "cursive_k863k_words") { Png "out34\$s.svg" } }
# nothing earlier moved: out33's template and work33's build against work34's copies (byte for byte)
Step "guard" {
  Same "out33\cursive_template.svg" "out34\cursive_template.svg"
  $sp = @(Get-ChildItem work33\base -File -Recurse | Where-Object { $_.Name -match '\.(svg|png|json)$' } | ForEach-Object { $_.FullName.Substring("$T\work33\base\".Length) })
  $bad = @($sp | Where-Object { (Get-FileHash "$T\work33\base\$_").Hash -ne (Get-FileHash "$T\work34\base\$_" -ErrorAction SilentlyContinue).Hash })
  "work33\base against work34\base: $($sp.Count) SVG, PNG and JSON files, differing: $($bad.Count) $($bad -join ', ')"
}
