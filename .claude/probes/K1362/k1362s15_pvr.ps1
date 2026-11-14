# K1362 s15: PowerVR offline-compiler footprint of fragment shaders (a desktop proxy for the Pixel's register use).
# The compiler: Imagination's "Profiling Compilers" zip (developer.imaginationtech.com/downloads/, Windows build,
# /download/8639/, no account), extracted with Expand-Archive to -Dir. Series B (35.3.408.101) is the newest library
# it ships (the Series 8/9 ones stack-overflow on the corner program); rank forms within one BVNC only.
#   pwsh -NoProfile -File k1362s15_pvr.ps1 -Dir <extracted zip dir> <a.frag> [<b.frag> ...]   (wildcards allowed)
param([Parameter(Mandatory)][string]$Dir, [string]$Bvnc = '35.3.408.101', [Parameter(Position = 0, ValueFromRemainingArguments)][string[]]$Frags)
# a fresh work directory per run: the compiler writes <name>.prof / .asm into the working directory
$work = Join-Path ([IO.Path]::GetTempPath()) ("k1362s15_pvr\" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory $work -Force | Out-Null
foreach ($f in $Frags) { foreach ($g in (Get-Item $f)) {
  $n = $g.Name; Copy-Item $g.FullName (Join-Path $work $n) -Force
  Push-Location $work
  try { & (Join-Path $Dir "ProfilingCompilerCLIWrapper.exe") -i (Join-Path $work $n) -b $Bvnc -p $Dir -x -t f *> (Join-Path $work "$n.log") } finally { Pop-Location }
  $prof = Join-Path $work "$n.prof"
  if (-not (Test-Path $prof)) { "{0,-28} COMPILER FAILED" -f $n; continue }
  $p = @{}; Get-Content $prof | ForEach-Object { if ($_ -match '^(\w+)\s*=\s*([\d.]+)') { $p[$matches[1]] = $matches[2] } }
  "{0,-28} temps {1,4}  instr {2,5}  cycles {3,6}  maxPar {4,5}" -f $n, $p.uTempRegisterCount, $p.uInstructionCount, $p.uNaiveCycleCount, $p.uMaxParallelInstances
} }
"(work: $work)"
