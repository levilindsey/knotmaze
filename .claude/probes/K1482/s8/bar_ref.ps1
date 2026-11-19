# K1482 s8: the K1436 bar's ref half run by hand (the bar's own run waited on Muse's perf lock, which the s8 brief
# says not to take or wait on; nothing else differs from k1436_bar.ps1 lines 112-126 and its compare).
#   pwsh bar_ref.ps1 <refSha> <baseSha> <port> <tag>   (the bar already built, mirror-scanned and served the ref)
param([string]$Ref, [string]$Base, [int]$Port, [string]$Tag, [int]$Par = 3)
$ErrorActionPreference = "Stop"
$t0 = Get-Date; while ((((Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB) -lt 3 -or ((Get-PSDrive C).Free / 1GB) -lt 8) -and ((Get-Date) - $t0).TotalMinutes -lt 15) { [Threading.Thread]::Sleep(20000) }
$probeDir = Join-Path (Split-Path (Split-Path $PSScriptRoot)) "K1436"
$sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes"
$outRoot = Join-Path $probeDir "out\bar\$Tag"; $dst = Join-Path $outRoot "ref-$Ref"
$src = Join-Path $env:TEMP "k1436s3-prev\src-$Ref"; $profile1 = Join-Path $env:TEMP "k1436s3-profile-$Ref"; $jobsPath = Join-Path $dst "jobs.json"
$env:GF_HOME = "1"; $env:NOWD = ""; $env:STRICT = "1"
$tw = Get-Date; $env:WARM = "1"
node (Join-Path $probeDir "k1436_screen.mjs") "http://localhost:$Port" (Join-Path $dst "warm") $profile1 $jobsPath $Par
$env:WARM = ""; Write-Host "[$Ref] warm pass $([int]((Get-Date) - $tw).TotalSeconds) s"
$t1 = Get-Date
node (Join-Path $probeDir "k1436_screen.mjs") "http://localhost:$Port" (Join-Path $dst "cap") $profile1 $jobsPath $Par
if ($LASTEXITCODE -ne 0) { throw "capture failed ($Ref)" }
Write-Host "[$Ref] captures $([int]((Get-Date) - $t1).TotalSeconds) s"
$t2 = Get-Date; $Scenes = (Get-Content $jobsPath -Raw | ConvertFrom-Json).name
$q = [System.Collections.Queue]::new([string[]]$Scenes); $run = @()
while ($q.Count -or $run.Count) {
  while ($q.Count -and $run.Count -lt $Par) { $s = $q.Dequeue(); $run += Start-Process node -ArgumentList "scripts/run_node.mjs", ".claude/probes/K1436/k1436_screen_scan.ts", (Join-Path $dst "cap\$s"), (Join-Path $dst "$s.screen.json"), "$sceneDir/$s.json" -WorkingDirectory $src -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $dst "$s.screen.log") }
  Start-Sleep 2; $run = @($run | Where-Object { -not $_.HasExited })
}
Write-Host "[$Ref] screen scans $([int]((Get-Date) - $t2).TotalSeconds) s"
node (Join-Path $probeDir "k1436_bar_cmp.mjs") (Join-Path $outRoot "base-$Base") $dst $outRoot
Write-Host "bar exit $LASTEXITCODE"