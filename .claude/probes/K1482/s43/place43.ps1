# K1482 s43: one place on a link's scene: the mirror off and at each radius (pic43.ts), coloured like the render
# (colour43.py), and the change map (diff43.py). Short output only.
#   pwsh place43.ps1 -Name t81s -X 907 -Y 1137 [-Rf "0.5,1"] [-R 60] [-Scene A_3] [-Cap <frame.png>]
param([string]$Name, [int]$X, [int]$Y, [string]$Rf = "0.5,1", [int]$R = 60, [string]$Scene = "A_3",
  [string]$Cap = ".claude/probes/K1482/out/s42/start/gf_b2.png", [string]$Out = ".claude/probes/K1482/out/s43/pic")
$repo = Resolve-Path (Join-Path $PSScriptRoot "../../../..")
Push-Location $repo
try {
  $env:GF_KRETRY = '1'
  $sc = ".claude/probes/K1482/out/s42/scenes/$Scene"
  node scripts/run_node.mjs .claude/probes/K1482/s43/pic43.ts "$sc/scene_gf.json" "$sc/sites_gf.json" $Out $Name $X $Y $R $Rf 2>&1 | Select-String "bend c|changed" | Select-Object -Last 12 | ForEach-Object { $_.Line }
  $x0 = $X - $R; $y0 = $Y - $R; $n = 2 * $R
  $vs = @("off") + ($Rf.Split(",") | ForEach-Object { "b$_" })
  python .claude/probes/K1482/s43/colour43.py $Cap $Out $Name $x0 $y0 $n @vs | Select-Object -First 2
  python .claude/probes/K1482/s43/diff43.py $Out $Name $x0 $y0 $n @($vs | Select-Object -Skip 1)
} finally { $env:GF_KRETRY = $null; Pop-Location }
