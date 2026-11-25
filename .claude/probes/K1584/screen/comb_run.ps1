# K1584 / K1588: serve one commit, capture the 21 test mazes with K1588's capall.ps1 (views pinned to stage 4's)
# under the perf lock, stop the server. Captures land in <Kw>\.claude\probes\K1588\s1\out\<Tag>\<maze>\gf_b2.png.
# -Kw is the worktree that holds K1588's probe tools (default: the K1588 stage worktree). The preview's log goes
# beside this script (untracked).
#   pwsh -NoProfile -File comb_run.ps1 -Ref <commit> -Port <port> -Tag <tag> [-Kw <worktree>]
param([Parameter(Mandatory)][string]$Ref, [Parameter(Mandatory)][int]$Port, [Parameter(Mandatory)][string]$Tag, [string]$Kw)
$main = Split-Path (git -C $PSScriptRoot rev-parse --path-format=absolute --git-common-dir)
if (-not $Kw) { $Kw = "$main\.claude\worktrees\agent-af202ca51788156a0" }
$log = Join-Path $PSScriptRoot "preview_$Tag.log"
$proc = Start-Process pwsh -ArgumentList '-NoProfile','-File',"$main\scripts\preview.ps1",'-Port',"$Port",'-Ref',$Ref -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
try {
  $deadline = (Get-Date).AddSeconds(900); $ready = $false
  while ((Get-Date) -lt $deadline) {
    if ($proc.HasExited) { throw "preview exited; see $log" }
    try { $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Seconds 5 }
  }
  if (-not $ready) { throw "preview not ready in 900 s" }
  # the build's identity: the bundle carries the short sha only for a clean tree, so fall back on the preview's log
  $short = (git -C $main rev-parse --short $Ref).Trim()
  $html = (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 10).Content
  $jsPath = [regex]::Match($html, 'assets/[^"'']+\.js').Value
  $hit = $html.Contains($short)
  if ($jsPath) { $js = (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/$jsPath" -TimeoutSec 30).Content; $hit = $hit -or $js.Contains($short) }
  if (-not $hit) { $hit = (Get-Content $log -Raw).Contains("Serving $short on") }
  "served build is $short : $hit  $(Get-Date -Format HH:mm:ss)"
  if (-not $hit) { throw "served bundle does not carry $short" }
  Push-Location $Kw
  pwsh -NoProfile -File "$main\scripts\perf_lock.ps1" -Owner "claude K1588 comb" -What "21-maze capture $Tag" -Cmd "& '.claude\probes\K1588\s1\capall.ps1' -Port $Port -Tag $Tag"
  Pop-Location
  "CAPTURE $Tag DONE $(Get-Date -Format HH:mm:ss)"
} finally {
  if (-not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*vite*preview*--port $Port*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  "preview stopped"
}
