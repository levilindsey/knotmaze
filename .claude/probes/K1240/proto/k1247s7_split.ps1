# K1247 s7: patch timers into outline.ts's corners phase (cpStat), run
# k1247s7_split.ts under the perf lock, and restore outline.ts byte for byte.
#   pwsh .claude\probes\K1240\proto\k1247s7_split.ps1 [-Rounds 8]
param([int]$Rounds = 8, [switch]$Oracle, [int]$Decimate = 1)
$src = Join-Path $PSScriptRoot 'outline.ts'
$bak = Join-Path $env:TEMP 'outline_split_backup.ts'
Copy-Item $src $bak -Force
try {
  $t = [IO.File]::ReadAllText($src)
  $fb = 'cornerFallbackC(C, st, scene, ci, aiA, aiB, sideA, sideB, th);'
  $n0 = ([regex]::Matches($t, [regex]::Escape("      $fb"))).Count
  if ($n0 -ne 3) { throw "expected 3 fallback calls, found $n0" }
  $reps = @(
    @('function cornersPhaseC(C: FCache', "export const cpStat: Record<string, number> = { all: 0, solve: 0, grow: 0, fb: 0, nGrow: 0, nSolve: 0, nFb: 0 };`nexport const cpCorner = new Float64Array(8192); export const cpClass = new Int8Array(8192); export const cpEv = new Int32Array(8192); export const cpNode = new Int32Array(8192); export const cpPc = new Int32Array(8192); let cpT = 0; let cpT0 = 0;`nfunction cornersPhaseC(C: FCache"),
    @("      $fb", "      cpT = performance.now(); $fb cpStat.fb += performance.now() - cpT; cpStat.nFb++;"),
    @('    let solveCode = trySolve(ci);', '    cpT = performance.now(); let solveCode = trySolve(ci); cpStat.solve += performance.now() - cpT; cpStat.nSolve++;'),
    @('    const r = cfOn ? growCFC(C, ci) : growIntegC(C, ci);', '    const cpF0 = cfStats.free; const cpZ0 = cfStats.zeroEnd; const cpE0 = cfStats.evals; const cpP0 = cfStats.pieces; cpT = performance.now(); const r = cfOn ? growCFC(C, ci) : growIntegC(C, ci); cpCorner[ci] = performance.now() - cpT; cpClass[ci] = cfStats.free > cpF0 ? 1 : cfStats.zeroEnd > cpZ0 ? 2 : 3; cpEv[ci] = cfStats.evals - cpE0; cpNode[ci] = C.nodeN[ci]; cpPc[ci] = cfStats.pieces - cpP0; cpStat.grow += cpCorner[ci]; cpStat.nGrow++;'),
    @('  cornersPhaseC(C, st, scene);', '  cpT0 = performance.now(); cornersPhaseC(C, st, scene); cpStat.all += performance.now() - cpT0;'),
    # The free-corner oracle (k1247s7_split.ts --oracle): w = 1 without evaluating, on masked corners.
    @('let cpT = 0; let cpT0 = 0;', 'let cpT = 0; let cpT0 = 0; export const cpMask = new Int8Array(8192); export const cpMO = [0]; let cpCurCi = -1;'),
    @('function wOfC(C: FCache): number {', "function wOfC(C: FCache): number {`n  if (cpMO[0] === 1 && cpMask[cpCurCi] === 1) return 1;"),
    @('cpT = performance.now(); const r = cfOn', 'cpCurCi = ci; cpT = performance.now(); const r = cfOn')
  )
  foreach ($r in $reps) {
    if (-not $t.Contains($r[0])) { throw "not found: $($r[0])" }
    $t = $t.Replace($r[0], $r[1])
  }
  [IO.File]::WriteAllText($src, $t)
  & (Join-Path $PSScriptRoot 'run_locked_k1247s4.ps1') -Script k1247s7_split.ts -RunArgs (@("--rounds=$Rounds") + @(if ($Oracle) { '--oracle' }) + @(if ($Decimate -gt 1) { "--decimate=$Decimate" }))
} finally {
  Copy-Item $bak $src -Force
  [IO.File]::Delete($bak)
}
