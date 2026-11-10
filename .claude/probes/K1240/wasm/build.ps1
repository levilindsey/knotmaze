# K1247 WASM: compile the AssemblyScript kernels into build/ (-O3, stub
# runtime, no asserts). Needs the probe-local toolchain:
#   npm install --prefix .claude/probes/K1240/wasm   (assemblyscript@0.28.20, package.json here)
# Usage: & .claude\probes\K1240\wasm\build.ps1 [-Source kernels.ts] [-Out kernels.wasm] [-Simd]
param([string]$Source = 'kernels.ts', [string]$Out = 'kernels.wasm', [switch]$Simd)
$asc = Join-Path $PSScriptRoot 'node_modules\assemblyscript\bin\asc.js'
if (-not (Test-Path $asc)) { throw "no asc: run npm install --prefix $PSScriptRoot" }
$build = Join-Path $PSScriptRoot 'build'
New-Item -ItemType Directory $build -Force | Out-Null
$wat = [IO.Path]::ChangeExtension($Out, '.wat')
$opts = @('-O3', '--runtime', 'stub', '--noAssert', '--outFile', (Join-Path $build $Out), '--textFile', (Join-Path $build $wat))
if ($Simd) { $opts += @('--enable', 'simd') }
& node $asc (Join-Path $PSScriptRoot "assembly\$Source") @opts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "$Out $((Get-Item (Join-Path $build $Out)).Length) bytes"
exit 0
