# K1456 s3: the picture and behaviour checks, one Chrome at a time, master build against branch build.
#   pwsh checks.ps1 -Master <distDir> -Branch <distDir>       (ports 5640, 5642; shots under s3/shots, untracked)
# 1. restab link A frozen (SIMT 20): master cold (warms), master again (control), branch cold, branch again.
# 2. liveshots first visit on the branch (fresh profile) at 3, 5, 7 s; repeat visit on the warmed branch profile.
# 3. takeover.mjs repeat visit on the warmed branch profile.
# 4. nogf.mjs, the link without rp=gf, master and branch.
# 5. hold.mjs warm on link A, branch.
param([string]$Master, [string]$Branch, [string]$Only = "12345")
$ErrorActionPreference = "Continue"
$here = $PSScriptRoot
$wt = (Resolve-Path "$here\..\..\..\..").Path
$vite = Join-Path $wt "node_modules\vite\bin\vite.js"
$shots = Join-Path $here "shots"; New-Item -ItemType Directory $shots -Force | Out-Null
$P = ".claude\probes"
$linkA = "?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1"
$linkR = "?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1"
$linkN = "?3.FGH1HtvQeDjm6e4BII"
$pm = Join-Path $env:TEMP "k1456s3-prof-chk-master"; $pb = Join-Path $env:TEMP "k1456s3-prof-chk-branch"
function Wait-Room {
  $t0 = Get-Date
  while (((Get-Date) - $t0).TotalMinutes -lt 15) {
    $vm = (Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB
    if ($vm -ge 3 -and (Get-PSDrive C).Free / 1GB -ge 4) { return }
    Start-Sleep 30
  }
}
$servers = @()
try {
  $servers += Start-Process node -ArgumentList @($vite, "preview", "--outDir", $Master, "--port", "5640", "--strictPort") -WorkingDirectory $wt -PassThru -WindowStyle Hidden
  $servers += Start-Process node -ArgumentList @($vite, "preview", "--outDir", $Branch, "--port", "5642", "--strictPort") -WorkingDirectory $wt -PassThru -WindowStyle Hidden
  Start-Sleep 4
  if ($Only -match "1") {
    foreach ($r in @(@("m1", 5640, $pm), @("m2", 5640, $pm), @("b1", 5642, $pb), @("b2", 5642, $pb))) {
      Wait-Room
      $env:PROFILE = $r[2]
      Write-Host "== restab $($r[0]) $(Get-Date -Format T)"
      node "$wt\$P\K1472\restab.mjs" "http://localhost:$($r[1])" $linkA.TrimStart("?") "$shots\rest" $r[0] 2>&1 | Select-Object -Last 3
    }
    Remove-Item Env:PROFILE
    python "$wt\$P\K1456\s2\inkbox.py" "$shots\rest_m1.png" "$shots\rest_m2.png" "$shots\rest_b1.png" "$shots\rest_b2.png"
    python -c "import sys;from PIL import Image,ImageChops;d=lambda a,b:sum(1 for v in ImageChops.difference(Image.open(a).convert('RGB'),Image.open(b).convert('RGB')).convert('L').getdata() if v>0);s=sys.argv[1];print('px m1-m2',d(s+'/rest_m1.png',s+'/rest_m2.png'),'m2-b2',d(s+'/rest_m2.png',s+'/rest_b2.png'),'m1-b1',d(s+'/rest_m1.png',s+'/rest_b1.png'),'b1-b2',d(s+'/rest_b1.png',s+'/rest_b2.png'))" $shots
  }
  if ($Only -match "2") {
    Wait-Room
    $pf = Join-Path $env:TEMP "k1456s3-prof-chk-first"
    Write-Host "== liveshots first visit $(Get-Date -Format T)"
    node "$wt\$P\K1472\liveshots.mjs" "http://localhost:5642/$linkR" $pf "$shots\live_first" "3,5,7" 2>&1 | Select-Object -Last 6
    Remove-Item $pf -Recurse -Force -ErrorAction SilentlyContinue
    Wait-Room
    Write-Host "== liveshots repeat visit $(Get-Date -Format T)"
    node "$wt\$P\K1472\liveshots.mjs" "http://localhost:5642/$linkR" $pb "$shots\live_repeat" "3,5,7" 2>&1 | Select-Object -Last 6
  }
  if ($Only -match "3") {
    Wait-Room
    Write-Host "== takeover repeat visit $(Get-Date -Format T)"
    node "$wt\$P\K1472\takeover.mjs" "http://localhost:5642/$linkR" $pb "$shots\take" 60 2>&1 | Select-Object -Last 8
  }
  if ($Only -match "4") {
    foreach ($r in @(@("master", 5640), @("branch", 5642))) {
      Wait-Room
      $pn = Join-Path $env:TEMP "k1456s3-prof-chk-nogf"
      Write-Host "== nogf $($r[0]) $(Get-Date -Format T)"
      node "$wt\$P\K1456\s3\nogf.mjs" "http://localhost:$($r[1])/$linkN" $pn 20 2>&1 | Select-Object -Last 2
      Remove-Item $pn -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
  if ($Only -match "5") {
    Wait-Room
    Write-Host "== hold warm link A $(Get-Date -Format T)"
    node "$wt\$P\K1450\hold.mjs" "http://localhost:5642/$linkA" "$shots\hold" $pb 60 250 5000 2>&1 | Select-Object -Last 4
  }
} finally {
  foreach ($s in $servers) { try { Stop-Process -Id $s.Id -Force -ErrorAction SilentlyContinue } catch {} }
}
