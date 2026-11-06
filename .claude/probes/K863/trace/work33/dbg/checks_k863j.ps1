# K863 J3j (base = v6.8) checks, after work28\dbg\checks_k990e.ps1 (J3e's, untouched) and work32\dbg\checks_k1112cusp.ps1
# (J3i's, untouched): v6.8 rebuilt by one pipeline as the kit's current build, proved identical to the one Levi approved,
# the account of what v6.9, v7.0, v7.1 and v7.2 changed against it, the cusp-corner check on it, and the reference sheets.
# v6.8 = work33\base, built from out33's template (out28's, the template J3e built, copied byte for byte), ports
# work28\ports_k990e.json variant M (J3e's; read in place, never copied). Later versions, read in place: v6.9 work29\base
# ports work29\ports_k1113.json P; v7.0 work30\base work30\ports_k1119.json Pae90; v7.1 work31\base
# work31\ports_k1112c.json Pc10; v7.2 work32\base work32\ports_k1112cusp.json Plc2m.
# Steps: template, build, ctx, base, census, cmp, det, account, cusp, probe, guard, sheets, png. Logs in work33\checks_logs.
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
  & $py -I work28\dbg\rowsame_k990e.py work29\census_v68.json work33\census_v68x.json
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
# the cusp corners: J3i's check (undesigned seams, the rule's pairs) on v6.8 beside v7.1 and v7.2 (work32's censuses)
Step "cusp" {
  & $py -I work33\dbg\pairs_k863j.py work33\cusp_corners.txt v6.8=work33\census_v68x.json v7.1=work32\census_v71.json v7.2=work32\census_v72.json
}
# J3i's probe (every rule pair solved) on v6.8
Step "probe" { & pwsh -NoProfile -File work33\dbg\probe_k863j.ps1 }
Step "guard" { & $py -I work20\dbg\check_out_k990.py out33 }
Step "sheets" {
  @((Sheet "out33\b_v68.svg" ($bt -replace '%s', 'b') "b,$bp" @($v68, $v69, $v70) "work33\sheets\b_v68"),
    (Sheet "out33\v_v68.svg" ($bt -replace '%s', 'v') "v,$vp" @($v68, $v69, $v70) "work33\sheets\v_v68"),
    (Sheet "out33\w_v68.svg" ($bt -replace '%s', 'w') "w,$wp" @($v68, $v69, $v70) "work33\sheets\w_v68"),
    (Sheet "out33\aq_joins_v68.svg" $aqt $aqw @($v68, $v69, $v70) "work33\sheets\aq_joins_v68")) | Wait-Process
  @((Sheet "out33\e_after_bvw_v68.svg" $et $ew @($v68, $v69, $v70) "work33\sheets\e_after_bvw_v68"),
    (Sheet "out33\c_v68.svg" $ct "c,$cp" @($v68, $v71, $v72) "work33\sheets\c_v68"),
    (Sheet "out33\cusp_v68.svg" $cut $lowcusp @($v68, $v72) "work33\sheets\cusp_v68"),
    (Sheet "out33\cursive_v68_words.svg" $wt $words @($v68) "work33\sheets\cursive_v68_words")) | Wait-Process
  Get-ChildItem out33\*.svg | ForEach-Object { "$($_.Name) $($_.Length) bytes" }
}
Step "png" { foreach ($s in "b_v68", "v_v68", "w_v68", "aq_joins_v68", "e_after_bvw_v68", "c_v68", "cusp_v68", "cursive_v68_words") { Png "out33\$s.svg" } }
