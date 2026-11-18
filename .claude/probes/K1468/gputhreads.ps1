param([string]$Match, [int]$Secs = 200)
$t0 = Get-Date; $prev = @{}
while (((Get-Date) - $t0).TotalSeconds -lt $Secs) {
  $g = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match $Match -and $_.CommandLine -match 'type=gpu-process' } | Select-Object -First 1
  if ($g) {
    $p = Get-Process -Id $g.ProcessId -ErrorAction SilentlyContinue
    if ($p) {
      $main = ($p.Threads | Sort-Object StartTime | Select-Object -First 1).Id
      $rows = foreach ($t in $p.Threads) { $c = $t.TotalProcessorTime.TotalSeconds; $k = "$($p.Id):$($t.Id)"; $d = if ($prev.ContainsKey($k)) { $c - $prev[$k] } else { 0 }; $prev[$k] = $c; [pscustomobject]@{ Id = $t.Id; D = $d; W = "$($t.WaitReason)" } }
      $top = $rows | Sort-Object D -Descending | Select-Object -First 3 | ForEach-Object { '{0}{1}={2:N1}s' -f $(if ($_.Id -eq $main) { 'MAIN' } else { 't' }), $_.Id, $_.D }
      $m = $rows | Where-Object Id -eq $main
      $gpu = (Get-Counter '\GPU Engine(*engtype_3D)\Utilization Percentage' -ErrorAction SilentlyContinue).CounterSamples | Where-Object CookedValue -gt 0.5
      $byPid = $gpu | Group-Object { ($_.InstanceName -split '_')[1] } | ForEach-Object { [pscustomobject]@{ P = $_.Name; U = ($_.Group | Measure-Object CookedValue -Sum).Sum } } | Sort-Object U -Descending
      '{0,4:N0}s pid {1} main {2:N1}s/10s ({3}) top: {4} | gpu3D total {5:N0}% this {6:N0}% top {7}' -f ((Get-Date) - $t0).TotalSeconds, $p.Id, $m.D, $m.W, ($top -join ' '), ($byPid | Measure-Object U -Sum).Sum, (($byPid | Where-Object P -eq "$($p.Id)").U), (($byPid | Select-Object -First 3 | ForEach-Object { '{0}:{1:N0}' -f $_.P, $_.U }) -join ' ')
    }
  }
  Start-Sleep 9
}
