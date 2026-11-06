# K863 J3j (base = v6.8) checks, after work28\dbg\checks_k990e.ps1 (J3e's, untouched) and work32\dbg\checks_k1112cusp.ps1
# (J3i's, untouched): v6.8 rebuilt by one pipeline as the kit's current build, proved identical to the one Levi approved,
# the account of what v6.9, v7.0, v7.1 and v7.2 changed against it, the cusp-corner check on it, and the reference sheets.
# v6.8 = work33\base, built from out33's template (out28's, the template J3e built, copied byte for byte), ports
# work28\ports_k990e.json variant M (J3e's; read in place, never copied). Later versions, read in place: v6.9 work29\base
# ports work29\ports_k1113.json P; v7.0 work30\base work30\ports_k1119.json Pae90; v7.1 work31\base
# work31\ports_k1112c.json Pc10; v7.2 work32\base work32\ports_k1112cusp.json Plc2m.
# Steps: tools, template, build, ctx, base, census, cmp, det, account, c, cusp, probe, sheets, png, sheetcol, crops, guard.
# Logs in work33\checks_logs. tools = mk_tools_k863j.py (J3i's pairs, probe, area and wtcopy tools ported);
# account_k863j.py, same_k863j.py and sheetcol_k863j.py are J3j's own.
# Run: pwsh -NoProfile -File work33\dbg\checks_k863j.ps1 [step ...] (no step = all, in order). At most 4 Python processes.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Only)
$Only = @(@($Only) | ForEach-Object { "$_" -split ',' } | Where-Object { $_ })
$T = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"; Set-Location $T; $py = "$T\venv\Scripts\python.exe"
$env:K926_FINAL_E = "shear"; $env:K1009_PINS = $null
$font = "font\PlaywriteUSTrad[wght].ttf"; $lg = "work33\checks_logs"
New-Item -ItemType Directory -Force $lg, work33\sheets, work33\det, work33\account, work33\probe, out33, out33\png | Out-Null
$abc = "abcdefghijklmnopqrstuvwxyz".ToCharArray()
$opairs = ($abc | ForEach-Object { "o$_" }) -join ","
$fpairs = ($abc | ForEach-Object { "f$_" }) -join ","
$bp = ($abc | ForEach-Object { "b$_" }) -join ","; $vp = ($abc | ForEach-Object { "v$_" }) -join ","; $wp = ($abc | ForEach-Object { "w$_" }) -join ","
$cp = ($abc | ForEach-Object { "c$_" }) -join ","
$lowcusp = @(foreach ($l in "acdefhin".ToCharArray()) { foreach ($r in "ijprstuwy".ToCharArray()) { "$l$r" } }) -join ","
$words = "minimum,bow,woven,boxes,people,hippo,puppy,and,knotmaze,cursive,quick brown fox,jumps over the lazy dog,be we shoe maze huge bye,ice jet even,coffee,which,oat,bad,subgroup,lawgiver,vg"
# J3e's census words (349 pieces: the identity check against work28\census_v68.json)
$cwE = "$words,$opairs,nt,at,it,et,ba,va,wa,bq,vq,wq,$fpairs,of,after"
# J3i's census words (718 pieces: the account and the cusp corners, on the same pieces as work32's censuses)
$cw0 = "$words,$opairs,nt,at,it,et,$fpairs,of,after,$bp,$vp,$wp,wave,$cp"
$have = @{}; foreach ($x in $cw0 -split ',') { $have[$x] = 1 }
$cwI = $cw0 + "," + (@($lowcusp -split ',' | Where-Object { -not $have.ContainsKey($_) }) -join ",")
# the sheets' columns (the font column is drawn by the sheet tool)
$v68 = "approved (v6.8)=work33\base|ports|M|work28\ports_k990e.json"
$v69 = "v6.9=work29\base|ports|P|work29\ports_k1113.json"
$v70 = "v7.0=work30\base|ports|Pae90|work30\ports_k1119.json"
$v71 = "v7.1=work31\base|ports|Pc10|work31\ports_k1112c.json"
$v72 = "v7.2=work32\base|ports|Plc2m|work32\ports_k1112cusp.json"
$aqw = "ba,va,wa,bq,vq,wq,oa,oq,bad,wave"
$ew = "be,ve,we,oe,be we shoe maze huge bye,woven,ice jet even,jumps over the lazy dog"
$tl = " (red solved joins, blue preset joins; the font pale under each)"
$bt = "K863 J3j: %s alone and joined to every letter: the font, the approved version (v6.8, J3e's build rebuilt in work33), v6.9 and v7.0$tl"
$aqt = "K863 J3j: b, v and w into a and q, oa and oq for reference: the font, the approved version (v6.8), v6.9 and v7.0$tl"
$et = "K863 J3j: e after b, v, w and o: the font, the approved version (v6.8), v6.9 and v7.0$tl"
$ct = "K863 J3j: c alone and joined to every letter: the font, the approved version (v6.8: J2's hand-set joins out of c), v7.1 and v7.2$tl"
$cnw = "nr,dr,after,lawgiver,jumps over the lazy dog,ds,as,es,er,ar,hr,ir,which,boxes,is,ii,hippo,hi,di"
$cnt = "K863 J3j: the 19 cusp corners on the base (undesigned seams at the top of i r s, pairs_k863j.py): the font, the approved version (v6.8) and v7.2$tl"
$cut = "K863 J3j: every join from a low exit (a c d e f h i n) into the top of i j p r s t u w y: the font, the approved version (v6.8) and v7.2$tl"
$wt = "K863 J3j: the test words: the font and the approved version (v6.8)$tl"
$build = { param($tpl, $dir) & pwsh -NoProfile -File work23\dbg\build_k1019.ps1 $tpl -Dir $dir -Mode ports -Variant B -Ports work21\ports_k1009.json -Tail long -Map work20\template_map_k990.json -Base work16\fewnode\bodies.json }
function Step($name, [scriptblock]$sb) {
  if ($Only -and -not ($Only -contains $name)) { return }
  "$((Get-Date).ToString('HH:mm:ss')) start $name"; & $sb *> "$lg\$name.log"; "$((Get-Date).ToString('HH:mm:ss')) end $name (exit $LASTEXITCODE)"
}
function Png($svg, $dpi = 48) {
  $n = [IO.Path]::GetFileNameWithoutExtension($svg)
  & "C:\Program Files\Inkscape\bin\inkscape.com" $svg --export-type=png --export-dpi=$dpi --export-background=white --export-background-opacity=1 --export-filename="out33\png\$n.png" 2> "$lg\png_$n.stderr.txt"
  "out33\png\$n.png exit $LASTEXITCODE ($((Get-Item "out33\png\$n.png" -ErrorAction SilentlyContinue).Length) bytes)"
}
function Same($a, $b) {
  $ha = (Get-FileHash "$T\$a" -Algorithm SHA256).Hash
  $hb = if (Test-Path "$T\$b") { (Get-FileHash "$T\$b" -Algorithm SHA256).Hash } else { "missing" }
  "$a vs $b : $(if ($ha -eq $hb) { 'byte-identical' } else { 'DIFFER' }) $($ha.Substring(0,16))"
}
function Py($tag, [string[]]$argv) {
  Start-Process $py -ArgumentList (@("-I") + $argv) -WorkingDirectory $T -NoNewWindow -PassThru -RedirectStandardOutput "$lg\$tag.out.txt" -RedirectStandardError "$lg\$tag.err.txt"
}
function Census($o, $dir, $ports, $var, $label, $cw) {
  Py ("census_" + [IO.Path]::GetFileName($o)) @("work27\dbg\census_k1027.py", "run", $font, "$dir\bodies.json", "$dir\join_params.json", "$o.txt", "$o.json", "--ports", $ports, "--variant", $var, "--label", ('"' + $label + '"'), "--words", ('"' + $cw + '"'))
}
function Sheet($svg, $title, $ws, [string[]]$cols, $rep) {
  $a = @("work27\dbg\sheet_k1027.py", $svg, ('"' + $title + '"'), ('"' + $ws + '"'))
  foreach ($c in $cols) { $a += @("--col", ('"' + $c + '"')) }
  Py ("sheet_" + [IO.Path]::GetFileNameWithoutExtension($svg)) ($a + @("--report", "$rep.txt", "--sidecar", "${rep}_sidecar.json"))
}
Step "tools" { & $py -I work33\dbg\mk_tools_k863j.py }
# the template: the one J3e built (out28's, after its ctx step), copied byte for byte
Step "template" { Copy-Item out28\cursive_template.svg out33\cursive_template.svg -Force; Same "out28\cursive_template.svg" "out33\cursive_template.svg" }
Step "build" { & $build out33\cursive_template.svg work33\base }
# J3e's ctx step (f's rebuilt exit context); it changes nothing on J3e's template, checked byte for byte
Step "ctx" { & $py -I work27\dbg\ctx_template_k1027.py out33\cursive_template.svg work33\base\out\cursive_template.svg; Same "out28\cursive_template.svg" "out33\cursive_template.svg" }
# the build against J3e's, file by file (logs carry times and paths)
Step "base" {
  $files = Get-ChildItem work28\base -File -Recurse | ForEach-Object { $_.FullName.Substring("$T\work28\base\".Length) }
  foreach ($f in $files) { Same "work28\base\$f" "work33\base\$f" }
  $extra = Get-ChildItem work33\base -File -Recurse | ForEach-Object { $_.FullName.Substring("$T\work33\base\".Length) } | Where-Object { $files -notcontains $_ }
  "only in work33\base: $(@($extra).Count) $($extra -join ', ')"
}
# v6.8's census on J3e's words (identity) and on J3i's words (the account, the cusp corners), side by side
Step "census" {
  @((Census "work33\census_v68" "work33\base" "work28\ports_k990e.json" "M" "v6.8 (M)" $cwE),
    (Census "work33\census_v68x" "work33\base" "work28\ports_k990e.json" "M" "v6.8 (M), J3i's words" $cwI)) | Wait-Process
  foreach ($j in "v68", "v68x") { "census_${j}: $((Get-Item "work33\census_$j.json" -ErrorAction SilentlyContinue).Length) bytes" }
}
# identity: J3e's field-by-field (NaN-aware) and row-by-row comparisons, against J3e's census and J3f's v6.8 census
Step "cmp" {
  & $py -I work28\dbg\cmpf_k990e.py work28\census_v68.json work33\census_v68.json work33\census_cmpf_v68.txt --all
  & $py -I work28\dbg\rowsame_k990e.py work28\census_v68.json work33\census_v68.json
  & $py -I work28\dbg\cmpf_k990e.py work29\census_v68.json work33\census_v68x.json work33\census_cmpf_v68x_j3f.txt --all
  # rowsame keys its rows by word number, so it compares only censuses of one word list: same_k863j.py matches by
  # the id without its word number (J3e's census and J3f's v6.8 census against the one on J3i's words)
  & $py -I work33\dbg\same_k863j.py work28\census_v68.json work33\census_v68x.json work33\same_v68_v68x.txt
  & $py -I work33\dbg\same_k863j.py work29\census_v68.json work33\census_v68x.json work33\same_v68x_j3f.txt
  & $py -I work27\dbg\census_k1027.py cmp work28\census_v68.json work33\census_v68.json work33\census_cmp_v68.txt
}
# determinism: a second build of out33's template and the census again, each compared byte for byte
Step "det" {
  & $build out33\cursive_template.svg work33\det\base
  $files = Get-ChildItem work33\base -File -Recurse | ForEach-Object { $_.FullName.Substring("$T\work33\base\".Length) }
  foreach ($f in $files) { Same "work33\base\$f" "work33\det\base\$f" }
  & $py -I work27\dbg\census_k1027.py run $font work33\det\base\bodies.json work33\det\base\join_params.json work33\det\census_v68.txt work33\det\census_v68.json --ports work28\ports_k990e.json --variant M --label "v6.8 (M)" --words $cwE
  & $py -I work28\dbg\cmpf_k990e.py work33\census_v68.json work33\det\census_v68.json work33\det\census_cmpf_det.txt --all
  & $py -I work28\dbg\rowsame_k990e.py work33\census_v68.json work33\det\census_v68.json
}
# the account: every piece of J3i's words dumped under each version (one process per version), then compared
Step "account" {
  @((Py "dump_v68" @("work33\dbg\account_k863j.py", "dump", "v6.8", "work33\base", "work28\ports_k990e.json", "M")),
    (Py "dump_v69" @("work33\dbg\account_k863j.py", "dump", "v6.9", "work29\base", "work29\ports_k1113.json", "P")),
    (Py "dump_v70" @("work33\dbg\account_k863j.py", "dump", "v7.0", "work30\base", "work30\ports_k1119.json", "Pae90")),
    (Py "dump_v71" @("work33\dbg\account_k863j.py", "dump", "v7.1", "work31\base", "work31\ports_k1112c.json", "Pc10"))) | Wait-Process
  @((Py "dump_v72" @("work33\dbg\account_k863j.py", "dump", "v7.2", "work32\base", "work32\ports_k1112cusp.json", "Plc2m"))) | Wait-Process
  & $py -I work33\dbg\account_k863j.py account work33\account.txt work33\account.json
}
# c: v6.8's c pieces against v7.0's (work30's census, J3g's words; work31's, J3h's words with c joined to every
# letter): census rows NaN-aware, and the account dumps' raw coefficients
Step "c" {
  & $py -I work33\dbg\same_k863j.py work33\census_v68x.json work30\census_v70.json work33\c_v68_v70_work30.txt c --dumps work33\account\v6.8.json work33\account\v7.0.json
  & $py -I work33\dbg\same_k863j.py work33\census_v68x.json work31\census_v70.json work33\c_v68_v70_work31.txt c --dumps work33\account\v6.8.json work33\account\v7.0.json
}
# the cusp corners: J3i's check (undesigned seams, the rule's pairs) on v6.8 beside v7.1 and v7.2 (work32's censuses)
Step "cusp" {
  & $py -I work33\dbg\pairs_k863j.py work33\cusp_corners.txt v6.8=work33\census_v68x.json v7.1=work32\census_v71.json v7.2=work32\census_v72.json
}
# J3i's probe (every rule pair solved) on v6.8
Step "probe" { & pwsh -NoProfile -File work33\dbg\probe_k863j.ps1 }
# three sheets at a time (room for one more Python process beside them)
Step "sheets" {
  @((Sheet "out33\b_v68.svg" ($bt -replace '%s', 'b') "b,$bp" @($v68, $v69, $v70) "work33\sheets\b_v68"),
    (Sheet "out33\v_v68.svg" ($bt -replace '%s', 'v') "v,$vp" @($v68, $v69, $v70) "work33\sheets\v_v68"),
    (Sheet "out33\w_v68.svg" ($bt -replace '%s', 'w') "w,$wp" @($v68, $v69, $v70) "work33\sheets\w_v68")) | Wait-Process
  @((Sheet "out33\aq_joins_v68.svg" $aqt $aqw @($v68, $v69, $v70) "work33\sheets\aq_joins_v68"),
    (Sheet "out33\e_after_bvw_v68.svg" $et $ew @($v68, $v69, $v70) "work33\sheets\e_after_bvw_v68"),
    (Sheet "out33\c_v68.svg" $ct "c,$cp" @($v68, $v71, $v72) "work33\sheets\c_v68")) | Wait-Process
  @((Sheet "out33\cusp_v68.svg" $cut $lowcusp @($v68, $v72) "work33\sheets\cusp_v68"),
    (Sheet "out33\cursive_v68_words.svg" $wt $words @($v68) "work33\sheets\cursive_v68_words"),
    (Sheet "out33\corners_v68.svg" $cnt $cnw @($v68, $v72) "work33\sheets\corners_v68")) | Wait-Process
  Get-ChildItem out33\*.svg | ForEach-Object { "$($_.Name) $($_.Length) bytes" }
}
Step "png" { foreach ($s in "b_v68", "v_v68", "w_v68", "aq_joins_v68", "e_after_bvw_v68", "c_v68", "cusp_v68", "cursive_v68_words", "corners_v68") { Png "out33\$s.svg" } }
# each column against the earlier sheets that drew the same version (sheetcol_k863j.py, cell by cell, one at a time):
# the approved column against J3e's and J3g's v6.8 (K1119's sheets) and against v7.0 (K1197's old c joins)
Step "sheetcol" {
  $sc = @(
    @("b_v68", 1, "out30\b_v70", 1, "b_v68_vs_out30_v68"), @("v_v68", 1, "out30\v_v70", 1, "v_v68_vs_out30_v68"),
    @("w_v68", 1, "out30\w_v70", 1, "w_v68_vs_out30_v68"), @("b_v68", 2, "out30\b_v70", 3, "b_v69_vs_out30_v69"),
    @("v_v68", 2, "out30\v_v70", 3, "v_v69_vs_out30_v69"), @("w_v68", 2, "out30\w_v70", 3, "w_v69_vs_out30_v69"),
    @("b_v68", 3, "out30\b_v70", 2, "b_v70_vs_out30_v70"), @("v_v68", 3, "out30\v_v70", 2, "v_v70_vs_out30_v70"),
    @("w_v68", 3, "out30\w_v70", 2, "w_v70_vs_out30_v70"), @("b_v68", 0, "out30\b_v70", 0, "b_font_vs_out30_font"),
    @("aq_joins_v68", 1, "out28\aq_joins_v68", 3, "aq_v68_vs_out28_v68"), @("aq_joins_v68", 1, "out30\aq_joins_v70", 1, "aq_v68_vs_out30_v66"),
    @("aq_joins_v68", 2, "out30\aq_joins_v70", 2, "aq_v69_vs_out30_v69"), @("aq_joins_v68", 3, "out30\aq_joins_v70", 3, "aq_v70_vs_out30_v70"),
    @("e_after_bvw_v68", 2, "out30\e_after_bvw_v70", 1, "e_v69_vs_out30_v69"), @("e_after_bvw_v68", 3, "out30\e_after_bvw_v70", 2, "e_v70_vs_out30_v70"),
    @("c_v68", 1, "out32\c_v72", 1, "c_v68_vs_out32_v70"), @("c_v68", 1, "out31\c_v71", 1, "c_v68_vs_out31_v70"),
    @("c_v68", 2, "out31\c_v71", 2, "c_v71_vs_out31_v71"), @("c_v68", 3, "out32\c_v72", 2, "c_v72_vs_out32_v72"),
    @("cusp_v68", 1, "out32\cusp_v72", 1, "cusp_v68_vs_out32_v71"), @("cusp_v68", 2, "out32\cusp_v72", 2, "cusp_v72_vs_out32_v72"),
    @("cursive_v68_words", 1, "out28\cursive_v68_words", 2, "words_v68_vs_out28_v68"),
    @("cursive_v68_words", 1, "out29\cursive_v69_words", 1, "words_v68_vs_out29_v68"),
    @("e_after_bvw_v68", 1, "out29\cursive_v69_words", 1, "e_v68_vs_out29_words_v68"))
  foreach ($c in $sc) { & $py -I work33\dbg\sheetcol_k863j.py "out33\$($c[0]).svg" $c[1] "$($c[2]).svg" $c[3] "work33\sheets\col_$($c[4]).txt" }
}
# crops to view at 96 dpi (J3h's strip tool, untouched): every row of every sheet, 9 or 10 rows an image, the left
# part of each cell; the long rows (test words, e's words, the corners' words) in their approved column only (it draws
# over the font's pale copy), whole; the corner sheet's crops in out33\png (the deliverable crop sheet); nr's and
# ds's corners (the largest r and s) at 2x, approved above v7.2 (work33\dbg\zoom_corners_k863j.py)
Step "crops" {
  New-Item -ItemType Directory -Force work33\sheets\png | Out-Null
  $st = "work31\dbg\strip_k1112c.py"; $sp = "work33\sheets\png"; $n4 = "names=font,approved,v6.9,v7.0"
  @((Py "crop_b" @($st, "out33\b_v68.svg", "$sp\b_v68", "b,$bp", "width=460", "rows=9", $n4)),
    (Py "crop_v" @($st, "out33\v_v68.svg", "$sp\v_v68", "v,$vp", "width=410", "rows=9", $n4)),
    (Py "crop_w" @($st, "out33\w_v68.svg", "$sp\w_v68", "w,$wp", "width=460", "rows=9", $n4)),
    (Py "crop_c" @($st, "out33\c_v68.svg", "$sp\c_v68", "c,$cp", "width=460", "rows=9", "names=font,approved,v7.1,v7.2"))) | Wait-Process
  @((Py "crop_aq" @($st, "out33\aq_joins_v68.svg", "$sp\aq_joins_v68", $aqw, "width=670", "rows=10", $n4)),
    (Py "crop_e" @($st, "out33\e_after_bvw_v68.svg", "$sp\e_after_bvw_v68", ('"' + $ew + '"'), "width=460", "rows=4", $n4)),
    (Py "crop_ew" @($st, "out33\e_after_bvw_v68.svg", "$sp\e_after_bvw_v68_words", ('"' + $ew + '"'), "width=3220", "rows=4", "cols=1", "names=approved")),
    (Py "crop_cusp" @($st, "out33\cusp_v68.svg", "$sp\cusp_v68", $lowcusp, "width=455", "rows=9", "names=font,approved,v7.2"))) | Wait-Process
  @((Py "crop_words" @($st, "out33\cursive_v68_words.svg", "$sp\words_v68", ('"' + $words + '"'), "width=3220", "rows=7", "cols=1", "names=approved")),
    (Py "crop_corners" @($st, "out33\corners_v68.svg", "out33\png\corners_v68_crop", ('"' + $cnw + '"'), "width=1100", "rows=10", "names=font,approved,v7.2")),
    (Py "crop_cornerw" @($st, "out33\corners_v68.svg", "$sp\corners_v68_words", ('"' + $cnw + '"'), "width=3040", "rows=10", "cols=1", "names=approved"))) | Wait-Process
  & $py -I work33\dbg\zoom_corners_k863j.py out33\png\corners_v68_crop_0.png "$sp\corners_v68_zoom_nr_ds.png"
  Get-ChildItem $sp, out33\png -Filter *.png | ForEach-Object { "$($_.Name) $($_.Length) bytes" }
}
# guard last, once out33 holds every sheet: J3e's check of Levi's chart rule on each SVG
Step "guard" { & $py -I work20\dbg\check_out_k990.py out33 }
