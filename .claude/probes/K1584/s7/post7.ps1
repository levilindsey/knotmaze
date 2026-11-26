# K1584 s7: everything after the s7a capture, CPU only: framediffs, changed places, the brief's sheets, the screen run.
#   pwsh -NoProfile -File post7.ps1   (outputs in out/; sheet paths printed)
$h = $PSScriptRoot; $o = Join-Path $h 'out'; $sh = Join-Path $h 'sheet7.py'
"== views (s6a vs s7a)"
Get-ChildItem (Join-Path $o 's7a') -Directory | ForEach-Object {
  $a = (Get-Content (Join-Path $_.FullName 'gf_b2view.txt') -TotalCount 1); $b = (Get-Content (Join-Path $h "..\s6\out\s6a\$($_.Name)\gf_b2view.txt") -TotalCount 1)
  if ($a -ne $b) { "  VIEW DIFFERS $($_.Name): $a | $b" } }
"== framediff"
& (Join-Path $h 'fdall.ps1') -To s7a | Where-Object { $_ -match ' t(6|1) ' -and $_ -notmatch '^\s+far' } | ForEach-Object { $_ -replace '^.*?\\s7a\\', '' }
"== changed places (t1)"
python (Join-Path $h 'chgplaces.py') 1 6
"== sheets"
python $sh "$o\loops7.png" 5 26 'today,s5,s7' --diff 's6,s7' A_b:x75 A_8:x65 A_5:x277 A_3:x49 D_9:x264 A_6:x119 A_3:x102 A_c:x75 A_3:x192 A_7:x81 A_d:x241 A_c:x102 A_7:x158 A_4:x343 A_4:x5
python $sh "$o\stems7.png" 4 40 'today,s4,s5,s7' --diff 's6,s7' A_a:@:1600:1619:p1 A_c:@:1585:1359:p2 A_6:@:1362:1615:p3 A_5:@:1270:747:p4 A_b:@:1370:554:p5 A_6:@:1269:326:p6 A_d:@:2199:952:p7
python $sh "$o\farend7.png" 4 48 'today,s4,s7' --diff 'today,s4' A_a:@:1600:1619:p1 A_c:@:1585:1359:p2 A_5:@:1270:747:p4 A_b:@:1370:554:p5
python $sh "$o\tear7.png" 5 30 'today,s4,s5,s7' --diff 's6,s7' A_b:k45 A_9:k0 A_5:k113 A_c:k17 A_3:k103 D_6:k357 A_5:k0 A_a:k101
python $sh "$o\a3x100.png" 6 26 'today,s5,s6,s7' --diff 's6,s7' A_3:x100
python $sh "$o\a8x304.png" 6 30 'today,s6,s7' --diff 's6,s7' 'A_8:@:2318:614:x304:2314;612;2323;617'
& (Join-Path $h 'chgsheets.ps1') -Thr 1 -Per 8
"== screen (s6a vs s7a)"
& (Join-Path $h 'an7.ps1') -Out (Join-Path $o 'an7') *> (Join-Path $o 'an7.txt'); Get-Content (Join-Path $o 'an7.txt')
