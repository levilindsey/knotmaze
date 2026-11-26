# K1584 s8: everything after the s8a capture (cap7.ps1 -Tag s8a writes s7/out/s8a), CPU only: the view check,
# framediffs s7a -> s8a and s6a -> s8a, chg8.py (changed places, right loops, wrong loops, stems), the brief's sheets and
# the screen run (an8.ps1: s7a | s8a in one run of screen.py per maze).   pwsh -NoProfile -File post8.ps1
$h = $PSScriptRoot; $o = Join-Path $h 'out'; $sh = Join-Path $h 'sheet8.py'; $s7o = Join-Path $h '..\s7\out'
$s1 = Join-Path $h '..\s1'
New-Item -ItemType Directory "$o\fd" -Force | Out-Null
"== views (s7a vs s8a)"
Get-ChildItem (Join-Path $s7o 's8a') -Directory | ForEach-Object {
  $va = (Get-Content (Join-Path $_.FullName 'gf_b2view.txt') -TotalCount 1); $vb = (Get-Content (Join-Path $s7o "s7a\$($_.Name)\gf_b2view.txt") -TotalCount 1)
  if ($va -ne $vb) { "  VIEW DIFFERS $($_.Name): $vb | $va" } }
"== framediff"
$log = Join-Path $o 'fd_s8a.txt'; Set-Content $log ''
foreach ($m in (Get-ChildItem (Join-Path $s7o 's8a') -Directory).Name) {
  $after = Join-Path $s7o "s8a\$m"
  if (-not (Test-Path (Join-Path $after 'gf_b2.png'))) { "${m}: no capture" | Tee-Object -Append $log; continue }
  foreach ($pr in @(@('s7s8', (Join-Path $s7o "s7a\$m")), @('s6s8', (Join-Path $h "..\s6\out\s6a\$m")))) {
    foreach ($thr in 6, 1) { python (Join-Path $s1 'framediff.py') $pr[1] $after "$o\fd\${m}_$($pr[0])_t$thr.json" $thr 2>&1 | ForEach-Object { "$m $($pr[0]) t$thr $_" } | Tee-Object -Append $log | Select-Object -First 1 }
  }
}
"== changed places (t1)"
python (Join-Path $h 'chg8.py') 1
"== sheets"
python $sh "$o\stems8.png" 4 40 'today,s7,s8' --diff 's7,s8' A_a:@:1600:1619:p1 A_c:@:1585:1359:p2 A_6:@:1362:1615:p3 A_5:@:1270:747:p4 A_b:@:1370:554:p5 A_6:@:1269:326:p6 A_d:@:2199:952:p7 A_6:@:1367:1599:k197 A_d:@:2195:960:k148 A_9:@:2369:592:k307 A_c:@:1107:1383:k310 A_3:@:1294:1008:k148 A_a:x344
python $sh "$o\loops8.png" 4 40 'today,s7,s8' --diff 's7,s8' A_b:x75 A_8:x65 A_5:x277 A_3:x49 D_9:x264 A_6:x119 A_3:x102 A_c:x75 A_3:x192 A_7:x81 A_d:x241 A_c:x102 A_7:x158 A_4:x343 A_4:x5
$chg = Get-Content (Join-Path $o 'chg8_args_t1.txt') | Where-Object { $_ }
for ($i = 0; $i -lt $chg.Count; $i += 8) {
  $n = [int]($i / 8) + 1; $chunk = $chg[$i..([Math]::Min($i + 8, $chg.Count) - 1)]
  python $sh (Join-Path $o "chg8_$n.png") 4 40 'today,s7,s8' --diff 's7,s8' @chunk
}
"== screen (s7a vs s8a)"
& (Join-Path $h 'an8.ps1') -Out (Join-Path $o 'an8') *> (Join-Path $o 'an8.txt'); Get-Content (Join-Path $o 'an8.txt')
