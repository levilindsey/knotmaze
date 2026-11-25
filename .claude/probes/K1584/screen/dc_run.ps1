# K1584 / K1588: serve one commit and run K1482's drag checks alone, as guards.ps1 runs them (GF_KRETRY=1, mode
# gfh, each through scripts/perf_lock.ps1), -Times times, then stop the server. For telling a lost WebGL context
# on a new Chrome profile (K1468) from a pixel change. By default only the second check (K1458/dragcheck.mjs) on
# the guards' profile for the commit (%TEMP%\k1482-guards-<sha8>, warm after a guards run). -B runs the first
# check (K1492/dragcheck_b.mjs, TLK=border) before it, as the guards do; -Fresh uses a new, empty profile.
# Results: <main>\.claude\probes\K1482\out\guards\<Tag>\dragcheck[_b]_r<i>.txt (+ dcf_r<i>\, dcb_r<i>\ pictures,
# untracked). Each check ends with its pictures' times: a stop's wait is the gap before its drag_ picture.
#   pwsh -NoProfile -File dc_run.ps1 -Ref <commit> -Port <port> -Tag <tag> [-Times 2] [-B] [-Fresh]
param([Parameter(Mandatory)][string]$Ref, [Parameter(Mandatory)][int]$Port, [Parameter(Mandatory)][string]$Tag, [int]$Times = 1, [switch]$B, [switch]$Fresh)
$main = Split-Path (git -C $PSScriptRoot rev-parse --path-format=absolute --git-common-dir)
$out = Join-Path $main ".claude\probes\K1482\out\guards\$Tag"
New-Item -ItemType Directory $out -Force | Out-Null
$short8 = (git -C $main rev-parse --short=8 $Ref).Trim()
$prof = Join-Path $env:TEMP "k1482-guards-$short8"
if ($Fresh) { $prof = Join-Path $env:TEMP "k1482-dc-$short8-$(Get-Date -Format HHmmss)" }
$log = Join-Path $PSScriptRoot "gpreview_$Tag.log"
$proc = Start-Process pwsh -ArgumentList '-NoProfile','-File',"$main\scripts\preview.ps1",'-Port',"$Port",'-Ref',$Ref -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
$failed = 0
function Q([string]$s) { "'" + $s.Replace("'", "''") + "'" }
function Invoke-Check([string]$name, [string]$child, [string]$txt, [string]$dir) {
  $inner = "Set-Location $(Q $main); `$o = & { $child } 2>&1; `$c = `$LASTEXITCODE; `$o | ForEach-Object { [string]`$_ } | Set-Content $(Q $txt) -Encoding utf8; exit `$c"
  $b64 = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($inner))
  "== $name $(Get-Date -Format HH:mm:ss)"
  & pwsh -NoProfile -File (Join-Path $main "scripts/perf_lock.ps1") -Owner "claude dc" -What "$name $Tag" -Cmd "pwsh -NoProfile -EncodedCommand $b64" | Out-Host
  $t = if (Test-Path $txt) { Get-Content $txt -Raw } else { "" }
  $pass = $t -match "DRAG CHECK: PASS"
  "$(if ($pass) { 'PASS' } else { 'FAIL' }) $name  $(Get-Date -Format HH:mm:ss)"
  if (Test-Path $txt) { Get-Content $txt | Where-Object { $_ -match 'stop |pageerror|DRAG CHECK' } | ForEach-Object { "   $_" } }
  $prev = $null
  Get-ChildItem $dir -Filter '*.png' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | ForEach-Object {
    $dt = if ($prev) { [int]($_.LastWriteTime - $prev).TotalSeconds } else { 0 }
    '   {0:HH:mm:ss} +{1,4}s {2}' -f $_.LastWriteTime, $dt, $_.Name; $prev = $_.LastWriteTime }
  return $pass
}
try {
  $deadline = (Get-Date).AddSeconds(900); $ready = $false
  while ((Get-Date) -lt $deadline) {
    if ($proc.HasExited) { throw "preview exited; see $log" }
    try { $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Seconds 5 }
  }
  if (-not $ready) { throw "preview not ready in 900 s" }
  $short = (git -C $main rev-parse --short $Ref).Trim()
  $hit = (Get-Content $log -Raw).Contains("Serving $short on")
  "served build is $short : $hit  profile $prof (exists: $(Test-Path $prof))  $(Get-Date -Format HH:mm:ss)"
  if (-not $hit) { throw "preview log does not name $short" }
  $base = "http://localhost:$Port"
  for ($i = 1; $i -le $Times; $i++) {
    if ($B) {
      $dcb = Join-Path $out "dcb_r$i"; New-Item -ItemType Directory $dcb -Force | Out-Null
      $cmd = "`$env:GF_KRETRY='1'; `$env:TLK='border'; node $(Q (Join-Path $main '.claude\probes\K1492\dragcheck_b.mjs')) $(Q $base) $(Q $dcb) $(Q $prof) gfh"
      $res = Invoke-Check "dragcheck_b r$i" $cmd (Join-Path $out "dragcheck_b_r$i.txt") $dcb
      $res | Where-Object { $_ -is [string] }
      if (-not ($res | Where-Object { $_ -is [bool] } | Select-Object -Last 1)) { $failed++ }
    }
    $dcf = Join-Path $out "dcf_r$i"; New-Item -ItemType Directory $dcf -Force | Out-Null
    $cmd = "`$env:GF_KRETRY='1'; node $(Q (Join-Path $main '.claude\probes\K1458\dragcheck.mjs')) $(Q $base) $(Q $dcf) $(Q $prof) gfh"
    $res = Invoke-Check "dragcheck r$i" $cmd (Join-Path $out "dragcheck_r$i.txt") $dcf
    $res | Where-Object { $_ -is [string] }
    if (-not ($res | Where-Object { $_ -is [bool] } | Select-Object -Last 1)) { $failed++ }
  }
  "DC $Tag failed=$failed  $(Get-Date -Format HH:mm:ss)"
} finally {
  if (-not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*vite*preview*--port $Port*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  "preview stopped"
}
exit $failed
