# K1584 s7: tabdiff.ts then pxdiff.ts over every maze of a capture (default stage 6's s6a; the geometry is pinned, so
# any capture's gw_gf.json serves), one maze after another (parallel Start-Jobs printed nothing), outputs
# out/tab/<maze>.json and out/px/<maze>.json (untracked), then pxsum.py's summary.
#   pwsh taball.ps1 [-Cap <dir>] [-NoTab]
param([string]$Cap = (Join-Path $PSScriptRoot '..\s6\out\s6a'), [switch]$NoTab)
$P = $PSScriptRoot; $wt = (Resolve-Path "$P\..\..\..\..").Path
New-Item -ItemType Directory "$P\out\tab", "$P\out\px" -Force | Out-Null
$env:GF_SRC6 = "$P\out\v_s6"; $env:GF_KRETRY = '1'
Push-Location $wt
try {
  $ms = Get-ChildItem $Cap -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'gw_gf.json') } | ForEach-Object Name
  foreach ($m in $ms) {
    if (-not $NoTab) { npx tsx "$P\tabdiff.ts" "$Cap\$m" "$P\out\tab\$m.json" 2>&1 | Select-Object -Last 1 }
    npx tsx "$P\pxdiff.ts" "$Cap\$m" "$P\out\tab\$m.json" "$P\out\px\$m.json" 2>&1 | Select-Object -Last 1
  }
} finally { Pop-Location }
python "$P\pxsum.py" -o "$P\out\x.json"
