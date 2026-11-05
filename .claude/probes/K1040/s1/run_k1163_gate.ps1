# K1163 (copied from run_s1i_gate.ps1, outputs under out/k1163): run the gate's probes in parallel on the main checkout's form_b.ts.
# Usage (from anywhere): pwsh .claude/probes/K1040/s1/run_k1163_gate.ps1 -Tag k1163_before [-What pins,pops,scenes,q5,q4,rate,npm]
#   then, once pops is done: -What mech (pops_mech per sequence, the merge, corner_why).
# "rate" is b_rate.ts (the 161 sites; S1d's omega_rate.ts imports a stale copy).
# Outputs: out/k1163/<kind>_<Tag>/, out/k1163/rate/rate_<Tag>.txt and out/k1163/logs/<kind>_<Tag>*.txt|.err.
# Blocks until every launched job exits (or -MaxMin), then prints each job's exit code.
param(
  [string]$Tag = "c1",
  [string[]]$What = @("pins", "pops", "scenes", "q5", "q4", "rate", "npm"),
  [int]$MaxMin = 40
)
$ErrorActionPreference = "Stop"
$What = @($What | ForEach-Object { $_ -split "," } | Where-Object { $_ })
$WtRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$TopLevel = (& git -C $WtRoot rev-parse --show-toplevel).Trim()
if ($TopLevel -ne "C:/Users/lsl/Repositories/knotmaze") {
  throw "run_k1163_gate.ps1: toplevel is '$TopLevel', not the main checkout; stopping."
}
$ProbeDir = $PSScriptRoot
$OutDir = Join-Path $ProbeDir "out\k1163"
$LogDir = Join-Path $OutDir "logs"
New-Item -ItemType Directory -Force $LogDir | Out-Null
New-Item -ItemType Directory -Force "$OutDir\rate" | Out-Null
$seqs = @("def_drag", "def_flow", "muse_drag", "muse_flow")
$jobs = @()
function Start-Job1([string]$name, [string]$cmd) {
  $full = "Set-Location -LiteralPath '$WtRoot' -ErrorAction Stop; $cmd"
  $proc = Start-Process pwsh -ArgumentList @("-NoProfile", "-Command", $full) -WorkingDirectory $WtRoot -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $LogDir "$name.txt") -RedirectStandardError (Join-Path $LogDir "$name.err")
  $script:jobs += [pscustomobject]@{ Name = $name; Proc = $proc }
}
$vn = "npx.cmd vite-node"
$Rel = ".claude/probes/K1040/s1"
foreach ($item in $What) {
  switch ($item) {
    "pins" { Start-Job1 "pins_$Tag" "npx.cmd vitest run test/render/field/form_b.test.ts" }
    "npm" { Start-Job1 "npm_test_$Tag" "npm.cmd test" }
    "pops" {
      foreach ($sq in $seqs) {
        Start-Job1 "pops_${Tag}_$sq" "`$env:WINDOWS='0'; `$env:WLEN='41'; `$env:OUTSUB='k1163/pops_$Tag'; `$env:DUMP='1'; $vn $Rel/pops.ts $sq"
      }
    }
    "scenes" { Start-Job1 "scenes_$Tag" "`$env:OUT='$OutDir\scenes_$Tag'; $vn $Rel/scenes.ts" }
    "q5" { Start-Job1 "q5holes_$Tag" "`$env:OUT='$OutDir\q5_$Tag'; $vn $Rel/q5holes.ts" }
    "q4" {
      Start-Job1 "q4_${Tag}_1" "`$env:OUT='$OutDir\q4_${Tag}_1'; $vn $Rel/q4.ts def fat ring user_tw42.lightpaper g41_def_tw42 g41_def_tw64"
      Start-Job1 "q4_${Tag}_2" "`$env:OUT='$OutDir\q4_${Tag}_2'; $vn $Rel/q4.ts muse_hash muse_default_tw g41_ring_tw42 g41_ring_tw64 g41_user_tw42 g41_user_tw64"
    }
    "rate" { Start-Job1 "b_rate_$Tag" "`$env:OUT='$OutDir\rate'; `$env:TAG='_$Tag'; $vn $Rel/b_rate.ts" }
    "mech" {
      $pd = "$OutDir\pops_$Tag"
      foreach ($sq in $seqs) {
        Start-Job1 "mech_${Tag}_$sq" "`$env:OUT='$pd\mech_$sq'; $vn $Rel/pops_mech.ts '$pd' $sq"
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
  $pd = "$OutDir\pops_$Tag"
  Start-Job1 "mech_${Tag}_merge" "`$env:OUT='$pd\mech'; $vn $Rel/pops_mech.ts '$pd' merge"
  Start-Job1 "corner_why_$Tag" "$vn $Rel/corner_why.ts '$pd'"
  foreach ($j in $jobs | Select-Object -Last 2) { try { $j.Proc | Wait-Process -Timeout 900 -ErrorAction Stop } catch { } }
}
foreach ($j in $jobs) {
  $j.Proc.Refresh()
  "{0}: {1}" -f $j.Name, $(if ($j.Proc.HasExited) { "exit $($j.Proc.ExitCode)" } else { "RUNNING" })
}
