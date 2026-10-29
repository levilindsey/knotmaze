# K1040 S1c: run the gate's probes in parallel on the worktree's form_b.ts.
# Usage (from anywhere): pwsh .claude/probes/K1040/s1/run_s1c_gate.ps1 -Tag f4j [-What pins,pops,scenes,q5,q4,rate,npm]
#   then, once pops is done: -What mech (pops_mech per sequence, the merge, corner_why).
# Outputs: out/s1c/<kind>_<Tag>/ and out/s1c/logs/<kind>_<Tag>*.txt|.err.
# Blocks until every launched job exits (or -MaxMin), then prints each job's exit code.
param(
  [string]$Tag = "f4j",
  [string[]]$What = @("pins", "pops", "scenes", "q5", "q4", "rate", "npm"),
  [int]$MaxMin = 40
)
$ErrorActionPreference = "Stop"
$What = @($What | ForEach-Object { $_ -split "," } | Where-Object { $_ })
$W =(Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$P = $PSScriptRoot
$O = Join-Path $P "out\s1c"
$L = Join-Path $O "logs"
New-Item -ItemType Directory -Force $L | Out-Null
$seqs = @("def_drag", "def_flow", "muse_drag", "muse_flow")
$jobs = @()
function Start-Job1([string]$name, [string]$cmd) {
  $full = "Set-Location -LiteralPath '$W' -ErrorAction Stop; $cmd"
  $p = Start-Process pwsh -ArgumentList @("-NoProfile", "-Command", $full) -WorkingDirectory $W -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $L "$name.txt") -RedirectStandardError (Join-Path $L "$name.err")
  $script:jobs += [pscustomobject]@{ Name = $name; Proc = $p }
}
$vn = "npx.cmd vite-node"
$S1 = ".claude/probes/K1040/s1"
foreach ($item in $What) {
  switch ($item) {
    "pins" { Start-Job1 "pins_$Tag" "npx.cmd vitest run test/render/field/form_b.test.ts" }
    "npm" { Start-Job1 "npm_test_$Tag" "npm.cmd test" }
    "pops" {
      foreach ($s in $seqs) {
        Start-Job1 "pops_${Tag}_$s" "`$env:WINDOWS='0'; `$env:WLEN='41'; `$env:OUTSUB='s1c/pops_$Tag'; `$env:DUMP='1'; $vn $S1/pops.ts $s"
      }
    }
    "scenes" { Start-Job1 "scenes_$Tag" "`$env:OUT='$O\scenes_$Tag'; $vn $S1/scenes.ts" }
    "q5" { Start-Job1 "q5holes_$Tag" "`$env:OUT='$O\q5_$Tag'; $vn $S1/q5holes.ts" }
    "q4" {
      Start-Job1 "q4_${Tag}_1" "`$env:OUT='$O\q4_${Tag}_1'; $vn $S1/q4.ts def fat ring user_tw42.lightpaper g41_def_tw42 g41_def_tw64"
      Start-Job1 "q4_${Tag}_2" "`$env:OUT='$O\q4_${Tag}_2'; $vn $S1/q4.ts muse_hash muse_default_tw g41_ring_tw42 g41_ring_tw64 g41_user_tw42 g41_user_tw64"
    }
    "rate" { Start-Job1 "omega_rate_$Tag" "`$env:OUT='$O\rate\omega_rate_$Tag.txt'; $vn $S1/omega_rate.ts" }
    "mech" {
      $pd = "$O\pops_$Tag"
      foreach ($s in $seqs) {
        Start-Job1 "mech_${Tag}_$s" "`$env:OUT='$pd\mech_$s'; $vn $S1/pops_mech.ts '$pd' $s"
      }
    }
  }
}
$deadline = (Get-Date).AddMinutes($MaxMin)
foreach ($j in $jobs) {
  $left = [int][Math]::Max(1, ($deadline - (Get-Date)).TotalSeconds)
  try { $j.Proc | Wait-Process -Timeout $left -ErrorAction Stop } catch { }
}
if ($What -contains "mech") {
  $pd = "$O\pops_$Tag"
  Start-Job1 "mech_${Tag}_merge" "`$env:OUT='$pd\mech'; $vn $S1/pops_mech.ts '$pd' merge"
  Start-Job1 "corner_why_$Tag" "$vn $S1/corner_why.ts '$pd'"
  foreach ($j in $jobs | Select-Object -Last 2) { try { $j.Proc | Wait-Process -Timeout 900 -ErrorAction Stop } catch { } }
}
foreach ($j in $jobs) {
  $j.Proc.Refresh()
  "{0}: {1}" -f $j.Name, $(if ($j.Proc.HasExited) { "exit $($j.Proc.ExitCode)" } else { "RUNNING" })
}
