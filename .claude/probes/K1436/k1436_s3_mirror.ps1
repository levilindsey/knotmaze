param([string]$Out)
$scenes = "muse_hash","g41_def_tw42","g41_ring_tw64","user_tw42.lightpaper","def","fat","g41_def_tw64","g41_user_tw42","muse_default_tw","ring","g41_ring_tw42","g41_user_tw64"
New-Item -ItemType Directory $Out -Force | Out-Null
foreach ($h in "1","0") {
  $env:GF_HOME = $(if ($h -eq "1") { "1" } else { "" }); $t0 = Get-Date
  $q = [System.Collections.Queue]::new($scenes); $run = @()
  while ($q.Count -or $run.Count) {
    while ($q.Count -and $run.Count -lt 2) { $s = $q.Dequeue(); $run += Start-Process node -ArgumentList "scripts/run_node.mjs", ".claude/probes/K1436/k1436_scan.ts", "bar", $s, "100", (Join-Path $Out "${s}_h$h.mirror.json") -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $Out "${s}_h$h.mirror.log") }
    Start-Sleep 2; $run = @($run | Where-Object { -not $_.HasExited })
  }
  "h$h mirror scans $([int]((Get-Date) - $t0).TotalSeconds) s" | Out-File (Join-Path $Out "times.txt") -Append
}
