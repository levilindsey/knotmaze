# K1584 / K1588: serve one commit and run K1482's capture guards (-NoBar) on it from the main checkout, then stop
# the server. npm test inside guards.ps1 runs on the main checkout's own tree, not on -Ref: run -Ref's own suite
# separately. Results: <main>\.claude\probes\K1482\out\guards\<Tag>\summary.txt; the last line printed is
# "GUARDS <Tag> exit <failed guards>". The preview's log goes beside this script (untracked).
#   pwsh -NoProfile -File guards_run.ps1 -Ref <commit> -Port <port> -Tag <tag>
param([Parameter(Mandatory)][string]$Ref, [Parameter(Mandatory)][int]$Port, [Parameter(Mandatory)][string]$Tag)
$main = Split-Path (git -C $PSScriptRoot rev-parse --path-format=absolute --git-common-dir)
$log = Join-Path $PSScriptRoot "gpreview_$Tag.log"
$proc = Start-Process pwsh -ArgumentList '-NoProfile','-File',"$main\scripts\preview.ps1",'-Port',"$Port",'-Ref',$Ref -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
$code = 99
try {
  $deadline = (Get-Date).AddSeconds(900); $ready = $false
  while ((Get-Date) -lt $deadline) {
    if ($proc.HasExited) { throw "preview exited; see $log" }
    try { $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Seconds 5 }
  }
  if (-not $ready) { throw "preview not ready in 900 s" }
  $short = (git -C $main rev-parse --short $Ref).Trim()
  $hit = (Get-Content $log -Raw).Contains("Serving $short on")
  "served build is $short : $hit  $(Get-Date -Format HH:mm:ss)"
  if (-not $hit) { throw "preview log does not name $short" }
  Push-Location $main
  pwsh -NoProfile -File .claude/probes/K1482/guards.ps1 -Tag $Tag -Port $Port -Ref $Ref -NoBar -Owner "claude guards $Tag"
  $code = $LASTEXITCODE
  Pop-Location
  "GUARDS $Tag exit $code  $(Get-Date -Format HH:mm:ss)"
} finally {
  if (-not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*vite*preview*--port $Port*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  "preview stopped"
}
exit $code
