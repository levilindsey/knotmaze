# K1139 on the Pixel: three round phone passes (scripts/phone_pass.ps1, K156) under ONE phone lock,
# for the steps no phone measured: S3b's fan shader (7474d09b -> df30a7f3), S3b's fix (1fe793f5 ->
# 71eedb94: K1139 Stage 4's handoff, first-parent steps 74-109), and S5's default flip (36aed2d5 ->
# the flip). The builds are made beforehand during the chain's hold (git worktrees: never while
# Muse runs); phone_pass reuses <Out>\builds\<sha> when index.html exists, so the passes touch
# neither git nor the build tools. phone_pass takes no perf lock by design (the phone's timings do
# not depend on the desktop's load). Masks addresses in everything it prints.
# -Suffix names a rerun's out folders (2026-11-05-k1139s5b for -Suffix b); the caller copies its builds in first
# (s5_cool_rerun.ps1 does): a missing build stops this script before the phone lock.
param([string]$Flip, [int]$Reps = 3, [string[]]$Only = @(), [switch]$AllowChrome, [string]$Suffix = '')
if (-not $Flip) { throw '-Flip <sha> is required' }
$k = 'C:\Users\lsl\Repositories\knotmaze'
$probes = "$k\.claude\probes\agents"
$owner = 'K1139 Pixel passes'
$rounds = "$k\.claude\probes\rounds"
$passes = @(
  @{ tag = 's3b'; base = '7474d09b'; head = 'df30a7f3'; out = "$rounds\2026-11-05-k1139s3b$Suffix" },
  @{ tag = 'fix'; base = '1fe793f5'; head = '71eedb94'; out = "$rounds\2026-11-05-k1139fix$Suffix" },
  @{ tag = 's5'; base = '36aed2d5'; head = $Flip; out = "$rounds\2026-11-05-k1139s5$Suffix" }
)
if ($Only.Count) { $passes = @($passes | Where-Object { $Only -contains $_.tag }) }
$mask = { param([string]$t) (($t -replace '\b\d{1,3}(\.\d{1,3}){3}(:\d+)?\b', '<addr>') -replace 'adb devices:[^)\r\n]*', 'adb devices: <masked>') }
function Say([string]$m) { "$(Get-Date -Format HH:mm:ss) $(& $mask $m)" }
# Every build must already exist: a missing one would make phone_pass build it (git + vite) mid-chain.
foreach ($p in $passes) {
  foreach ($sha in @($p.base, $p.head)) {
    $idx = Join-Path $p.out "builds\$sha\index.html"
    if (-not (Test-Path -LiteralPath $idx)) { Say "missing build $($p.tag) $sha ($idx): stopping before the lock"; exit 4 }
  }
}
$took = & "$probes\phone_lock_take.ps1" -Owner $owner -What 'K1139 S3b, fix and S5 round phone passes (scripts/phone_pass.ps1)' -MaxWaitMin 30
Say ($took -join ' / ')
if (-not ($took -match 'phone lock taken')) { Say 'no phone lock: stopping'; exit 3 }
$codes = @{}
try {
  $first = $true
  foreach ($p in $passes) {
    Say "pass $($p.tag): $($p.base) -> $($p.head), out $($p.out)"
    # K1142's guard (probes-phone.md): a pass chained after the last one's cleanup finds the Chrome
    # that pass left in front, so later passes take -AllowChrome with the 30 s window. The first
    # takes -AllowChrome only when the caller passed it, having checked that the Chrome in front is
    # the kit's own leftover (dumpsys power's mLastUserActivityTime at an earlier pass's cleanup).
    # @(...) keeps a one-flag result an array: a bare string would splat as its characters.
    $guard = @(if (-not $first) { '-AllowChrome', '-QuietS', '30' } elseif ($AllowChrome) { '-AllowChrome' })
    $first = $false
    # Not captured: run_pass.ps1's header records callers hanging on a piped pass (its servers and
    # watchdog inherit the pipe); the background task's own output file takes the stream instead.
    pwsh -NoProfile -File "$k\scripts\phone_pass.ps1" -Base $p.base -Head $p.head -Reps $Reps -Out $p.out -WaitReady 15 @guard
    $codes[$p.tag] = $LASTEXITCODE
    Say "pass $($p.tag): exit $($codes[$p.tag]) (summary: $($p.out)\summary.md)"
    # A failed pass (not ready, or the watchdog saw a person) ends the batch: the next pass's
    # Chrome allowance assumes this one finished cleanly. Rerun the rest with -Only.
    if ($codes[$p.tag] -ne 0) { Say "pass $($p.tag) failed: the later passes stay unrun"; break }
  }
} finally {
  & "$probes\phone_lock_release.ps1" -Owner $owner | ForEach-Object { Say $_ }
}
$bad = @($codes.GetEnumerator() | Where-Object { $_.Value -ne 0 })
Say "passes done: $(($codes.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ' ')"
exit ([int]($bad.Count -gt 0))