# K1627 s1: K1604 s3's run.ps1 with -Patch/-PatchF/-PinFrom/-WarmMazes passed through to cap.ps1.
# K1604 s2 (from s1, copy of K1584 s11/run11.ps1): serve one commit with scripts/preview.ps1 (its own -Root), prove the listener
# serves that build, warm the three profiles one at a time (WARM=1 on A_3 and D_1, s7b's warm7 recipe), then capture all
# 21 mazes in three streams pinned to the stage 11 views (out/pins/<maze>/gf_b2view.txt, copied from k1584-s11).
# Profiles start as copies of k1584-s11's s11/out/profile1-3. Outputs: out/<Tag>/<maze>/. Run under the perf lock:
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1604 s1" -What "K1604 s1 cap <tag>" -Cmd "& '<this>' -Ref <sha> -Port 5635 -Tag m0"
param([Parameter(Mandatory)][string]$Ref, [int]$Port = 5660, [Parameter(Mandatory)][string]$Tag, [switch]$NoWarm, [string]$Patch = '', [string]$PatchF = '', [string]$PinFrom = 'pins', [string]$WarmMazes = 'A_3,D_1', [string]$Then = '', [switch]$OnlyThen, [string]$ThenPin = '', [string]$HashFrom = '',
      [string]$Streams = 'A_3,A_5,A_8,A_b,D_1,D_4,D_7;A_4,A_6,A_9,A_c,D_2,D_5,D_8;A_7,A_a,A_d,D_3,D_6,D_9,D_a')
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
$sha = (git -C $repo rev-parse $Ref).Trim()
$s7 = $sha.Substring(0, 7)
$root = Join-Path $env:TEMP "knotmaze-K1627s3-$Tag"
$out = Join-Path $here 'out'; New-Item -ItemType Directory $out -Force | Out-Null
$cap = Join-Path $here 'cap.ps1'
$log = Join-Path $out "preview_$Tag.log"
$proc = Start-Process pwsh -ArgumentList @('-NoProfile', '-File', (Join-Path $repo 'scripts/preview.ps1'), '-Port', "$Port", '-Ref', $sha, '-Root', $root) -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
try {
  $deadline = (Get-Date).AddSeconds(900); $ready = $false
  while ((Get-Date) -lt $deadline) {
    if ($proc.HasExited) { throw "preview $sha exited; see $log" }
    try { $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Seconds 5 }
  }
  if (-not $ready) { throw "preview $sha not ready in 900s" }
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object -First 1
  $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)").CommandLine
  if ($cmd -notlike "*$root*") { throw "listener on $Port is not this run's preview: $cmd" }
  if ((Get-Content $log -Raw) -notmatch "Serving $s7") { throw "preview log does not serve $s7" }
  "preview $sha on $Port ready $(Get-Date -Format HH:mm:ss)"
  if (-not $NoWarm -and -not $OnlyThen) {
    $env:WARM = '1'; $env:FRAME_TIMEOUT_MS = '480000'
    foreach ($i in 1..(($Streams -split ';').Count)) {
      "== warm profile$i $(Get-Date -Format HH:mm:ss)"
      & pwsh -NoProfile -File $cap -Port $Port -Tag "warm_${Tag}_$i" -Mazes $WarmMazes -Prof "out\profile$i" -OutRoot $out 2>&1 | Select-Object -Last 2
    }
    $env:WARM = $null
  }
  $env:FRAME_TIMEOUT_MS = '480000'
  $i = 0
  $jobs = if ($OnlyThen) { @() } else { foreach ($s in ($Streams -split ';')) {
    $i++
    $a = @('-NoProfile', '-File', $cap, '-Port', $Port, '-Tag', $Tag, '-Mazes', $s, '-Prof', "out\profile$i", '-OutRoot', $out)
    if ($PinFrom) { $a += @('-PinFrom', $PinFrom) }; if ($HashFrom) { $a += @('-HashFrom', $HashFrom) }; if ($Patch) { $a += @('-Patch', $Patch) }; if ($PatchF) { $a += @('-PatchF', $PatchF) }
    Start-Process pwsh -ArgumentList $a -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $out "capmany_${Tag}_$i.log")
  } }
  if ($jobs) { $jobs | Wait-Process }
  $pinTag = if ($ThenPin) { $ThenPin } else { $Tag }
  # K1627: -Then 'tag:patch.json;tag2:patchF=f.json' reruns stream 1's mazes per entry, pinned to this run's views
  $hl = if (Test-Path (Join-Path $out "$pinTag\L\cap.log")) { Select-String -Path (Join-Path $out "$pinTag\L\cap.log") -Pattern 'done ([0-9a-f]{8})' -ErrorAction SilentlyContinue | Select-Object -Last 1 } else { $null }
  if ($hl -and -not $env:LHASH) { $env:LHASH = $hl.Matches[0].Groups[1].Value; "LHASH $($env:LHASH)" }
  foreach ($t in ($Then -split ';' | Where-Object { $_ })) {
    $tt, $pp = $t -split ':', 2
    $a = @('-Port', $Port, '-Tag', $tt, '-Mazes', (($Streams -split ';')[0]), '-Prof', 'out\profile1', '-OutRoot', $out, '-PinFrom', $pinTag, '-HashFrom', $pinTag)
    if ($pp -like 'patchF=*') { $a += @('-PatchF', $pp.Substring(7)) } elseif ($pp) { $a += @('-Patch', $pp) }
    & pwsh -NoProfile -File $cap @a 2>&1 | Select-Object -Last 3
  }
  "CAPMANY $Tag DONE $(Get-Date -Format HH:mm:ss)"
} finally {
  $env:WARM = $null; $env:FRAME_TIMEOUT_MS = $null
  if (-not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
  Start-Sleep -Seconds 3
  # the killed preview.ps1 never ran its finally: unlink every junction under the root (its worktree's node_modules)
  # before the recursive delete, which would otherwise follow it into the main checkout's packages
  if (Test-Path $root) {
    Get-ChildItem $root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue | ForEach-Object { $_.Delete() }
    if (-not (Get-ChildItem $root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue }
  }
  git -C $repo worktree prune 2>$null | Out-Null
  "preview stopped $(Get-Date -Format HH:mm:ss)"
}
$global:LASTEXITCODE = 0
