# K1247 s7: patch timers into outline.ts's corners phase (cpStat), run
# k1247s7_split.ts under the perf lock, and restore outline.ts byte for byte.
#   pwsh .claude\probes\K1240\proto\k1247s7_split.ps1 [-Rounds 8]
param([int]$Rounds = 8, [switch]$Oracle, [int]$Decimate = 1, [switch]$WReplay)
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
    @('cpT = performance.now(); const r = cfOn', 'cpCurCi = ci; cpT = performance.now(); const r = cfOn'),
    # w record/replay (k1247s7_split.ts --wreplay): cpWM 1 records every w, 2 returns the recorded ones.
    @('export const cpMO = [0];', 'export const cpMO = [0]; export const cpWRec = new Float64Array(1 << 20); export const cpWM = [0]; export const cpWS = [0];')
  )
  if ($WReplay) {
    $reps += ,@("function wOfC(C: FCache): number {`n  if (cpMO[0]", "function wOfC(C: FCache): number {`n  if (cpWM[0] === 2) return cpWRec[cpWS[0]++];`n  const w = wOfC0(C); if (cpWM[0] === 1) cpWRec[cpWS[0]++] = w; return w;`n}`nfunction wOfC0(C: FCache): number {`n  if (cpMO[0]")
    # cpWM 1 also records each margin; 3 replays the margins only (w's cheap factors still run).
    $reps += ,@('export const cpWS = [0];', 'export const cpWS = [0]; export const cpMRec = new Float64Array(1 << 20); export const cpMS = [0];')
    $reps += ,@('function marginOfC(C: FCache, ai: number, ft: FFoot, cache: WalkCache): number {', "function marginOfC(C: FCache, ai: number, ft: FFoot, cache: WalkCache): number {`n  if (cpWM[0] === 3) return cpMRec[cpMS[0]++];`n  if (cpWM[0] === 4) { const v = cpMRec[cpMS[0]++]; if (v === Infinity) return v; return marginOfC0(C, ai, ft, cache); }`n  const m = marginOfC0(C, ai, ft, cache); if (cpWM[0] === 1) cpMRec[cpMS[0]++] = m; return m;`n}`nfunction marginOfC0(C: FCache, ai: number, ft: FFoot, cache: WalkCache): number {")
  }
  foreach ($r in $reps) {
    if (-not $t.Contains($r[0])) { throw "not found: $($r[0])" }
    $t = $t.Replace($r[0], $r[1])
  }
  [IO.File]::WriteAllText($src, $t)
  & (Join-Path $PSScriptRoot 'run_locked_k1247s4.ps1') -Script k1247s7_split.ts -RunArgs (@("--rounds=$Rounds") + @(if ($Oracle) { '--oracle' }) + @(if ($Decimate -gt 1) { "--decimate=$Decimate" }) + @(if ($WReplay) { '--wreplay' }))
} finally {
  Copy-Item $bak $src -Force
  [IO.File]::Delete($bak)
}
