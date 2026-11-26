# K1584 s10: trial captures of the tight wedge's forms from a DEV server on this worktree. The form is gf_look.ts's
# TWV default (trial only): rp=gf's look module loads after the app rewrites the link, so a query key cannot reach
# it; this script rewrites the default between runs (no page is open then). One stream per maze (profiles 1..3),
# pinned to s1's "before" views. Run under scripts/perf_lock.ps1.
#   pwsh trial.ps1 -Port 5632 -Vars "0,a,b" [-Mazes "A_3,A_5,A_6"] [-Pre s10t]
param([int]$Port = 5632, [string]$Vars = "0,a,b", [string]$Mazes = "A_3,A_5,A_6", [string]$Pre = "s10t")
$cap = Join-Path $PSScriptRoot '..\s1\cap.ps1'; $out = Join-Path $PSScriptRoot 'out'
$look = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..\src\render\gpu_field\gf_look.ts')).Path
New-Item -ItemType Directory $out -Force | Out-Null
foreach ($v in ($Vars -split ',')) {
  $src = [IO.File]::ReadAllText($look)
  $new = [regex]::Replace($src, '(return g\.process\?\.env\?\.GF_TW \?\? ")[^"]*(";)', "`${1}$v`${2}")
  if ($new -ne $src) { [IO.File]::WriteAllText($look, $new) }
  "== variant $v $(Get-Date -Format HH:mm:ss)"
  Start-Sleep -Seconds 4
  $i = 0
  $jobs = foreach ($m in ($Mazes -split ',')) {
    $i++
    $cmd = "& '$cap' -Port $Port -Tag '$Pre$v' -Mazes '$m' -Prof 'profile$i' -OutRoot '$out' -PinFrom before"
    Start-Process pwsh -ArgumentList @('-NoProfile', '-Command', $cmd) -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $out "trial_$Pre${v}_$m.log")
  }
  $jobs | Wait-Process
}
"TRIAL DONE $(Get-Date -Format HH:mm:ss)"
