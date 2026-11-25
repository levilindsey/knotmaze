# K1588 s3: K1482's two drag checks on an already-served build, as guards.ps1 runs them (dragcheck_b with
# TLK=border, then dragcheck; GF_KRETRY=1, mode gfh, the guards' warm profile), both under ONE take of
# scripts/perf_lock.ps1. A check that fails without a pixel verdict (a stop with a lost WebGL context, a missing
# stop line or no DRAG CHECK line: a timeout or crash) runs once more, in the same take; both runs are reported.
#   pwsh -NoProfile -File dc_both.ps1 -Port 5640 -Tag j5 -Prof $env:TEMP\k1588s3-guards-550cb6874   (-NoLock: inner)
# Outputs (untracked): .claude/probes/K1588/s3/out/dc_<Tag>/ (<check>_r<i>.txt, dcb_r<i>/, dcf_r<i>/, summary.txt).
param([Parameter(Mandatory)][int]$Port, [Parameter(Mandatory)][string]$Tag, [Parameter(Mandatory)][string]$Prof, [switch]$NoLock)
$here = $PSScriptRoot
$main = Split-Path (git -C $here rev-parse --path-format=absolute --git-common-dir)
$OutDir = Join-Path $here "out/dc_$Tag"; New-Item -ItemType Directory $OutDir -Force | Out-Null
$summary = Join-Path $OutDir 'summary.txt'
$base = "http://localhost:$Port"
function Q([string]$s) { "'" + $s.Replace("'", "''") + "'" }
if (-not $NoLock) {
  "drag checks $Tag page $base profile $Prof (exists: $(Test-Path $Prof)) waiting for the perf lock from $(Get-Date -Format s)" | Out-File $summary -Encoding utf8
  $cmd = "pwsh -NoProfile -File $(Q $PSCommandPath) -Port $Port -Tag $(Q $Tag) -Prof $(Q $Prof) -NoLock"
  & pwsh -NoProfile -File (Join-Path $main 'scripts/perf_lock.ps1') -Owner 'claude K1588 s3 dc' -What "dragcheck_b + dragcheck $Tag" -Cmd $cmd -MaxWaitMin 120 | Out-Host
  exit $LASTEXITCODE
}
"started $(Get-Date -Format s)" | Out-File $summary -Append -Encoding utf8
function Invoke-Check([string]$Name, [string]$Script, [string]$EnvCode, [string]$Dir, [string]$Txt) {
  New-Item -ItemType Directory $Dir -Force | Out-Null
  $child = "$EnvCode node $(Q (Join-Path $main $Script)) $(Q $base) $(Q $Dir) $(Q $Prof) gfh"
  $inner = "Set-Location $(Q $main); `$o = & { $child } 2>&1; `$c = `$LASTEXITCODE; `$o | ForEach-Object { [string]`$_ } | Set-Content $(Q $Txt) -Encoding utf8; exit `$c"
  $b64 = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($inner))
  $t0 = Get-Date
  & pwsh -NoProfile -EncodedCommand $b64 | Out-Host
  $code = $LASTEXITCODE
  $t = if (Test-Path $Txt) { Get-Content $Txt -Raw } else { '' }
  $stops = [regex]::Matches($t, 'stop (\S+): .*?\| (\d+) of (\d+) px differ > (\d+)[^\r\n]*?-> (PASS|FAIL)')
  $lost = [regex]::Matches($t, 'context was lost (\d+)x')
  $errs = [regex]::Matches($t, '(?m)^pageerror .*$')
  $pass = $code -eq 0 -and $t -match 'DRAG CHECK: PASS'
  $noVerdict = (-not $pass) -and ($lost.Count -gt 0 -or $stops.Count -lt 4 -or $t -notmatch 'DRAG CHECK: (PASS|FAIL)')
  $per = ($stops | ForEach-Object { "$($_.Groups[1].Value): $($_.Groups[2].Value) px $($_.Groups[5].Value)" }) -join ', '
  $line = "$(if ($pass) { 'PASS' } else { 'FAIL' }) ${Name}: stops [$per]; context lost $($lost.Count) stop(s); pageerrors $($errs.Count); exit $code; $([int]((Get-Date) - $t0).TotalSeconds) s$(if ($noVerdict) { '; NO PIXEL VERDICT' }) -> $Txt"
  Write-Host $line; $line | Out-File $summary -Append -Encoding utf8
  foreach ($e in $errs) { "   $($e.Value)" | Out-File $summary -Append -Encoding utf8 }
  return @{ Pass = $pass; NoVerdict = $noVerdict }
}
$failed = 0
foreach ($c in @(
    @{ Name = 'dragcheck_b'; Script = '.claude/probes/K1492/dragcheck_b.mjs'; Env = "`$env:GF_KRETRY='1'; `$env:TLK='border';"; Sub = 'dcb' },
    @{ Name = 'dragcheck'; Script = '.claude/probes/K1458/dragcheck.mjs'; Env = "`$env:GF_KRETRY='1';"; Sub = 'dcf' })) {
  for ($i = 1; $i -le 2; $i++) {
    "== $($c.Name) r$i $(Get-Date -Format HH:mm:ss)"
    $r = Invoke-Check "$($c.Name) r$i" $c.Script $c.Env (Join-Path $OutDir "$($c.Sub)_r$i") (Join-Path $OutDir "$($c.Name)_r$i.txt")
    if ($r.Pass -or -not $r.NoVerdict) { break }
  }
  if (-not $r.Pass) { $failed++ }
}
"DC $Tag failed=$failed $(Get-Date -Format HH:mm:ss)" | Tee-Object -FilePath $summary -Append
exit $failed
