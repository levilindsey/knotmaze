# K1482 s42: a debug patch of src/render/gpu_field/tables.ts (never committed; revert with git checkout after the run):
# with globalThis.__k42 = [ca, cb] it logs each corner pair of the junctions holding both chains and where it drops out;
# with globalThis.__k42all it logs every through pair's chain, root s and arms (sR, dir, L). Run from the repo root.
$f = Join-Path (Get-Location) 'src\render\gpu_field\tables.ts'
$t = [IO.File]::ReadAllText($f)
$reps = @(
  @('const g = jGroup[ji]; const ne = J.arms.length; const styles = J.corners ?? [];',
    'const g = jGroup[ji]; const ne = J.arms.length; const styles = J.corners ?? []; const K42 = !!(globalThis as any).__k42 && J.arms.some((a: any) => a.chain === (globalThis as any).__k42[0]) && J.arms.some((a: any) => a.chain === (globalThis as any).__k42[1]); if (K42) console.log(`k42 j${ji} g${g} c ${J.c[0].toFixed(3)},${J.c[1].toFixed(3)} arms ${J.arms.map((a: any) => a.chain + ":" + a.kind + ":" + a.s.toFixed(3)).join(" ")} sibs ${S.map((u: any) => u.ei + "@" + (u.ang * 57.2958).toFixed(1)).join(" ")}`);'),
  @('      if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;',
    '      if (th <= 1e-6 || th >= Math.PI - 1e-6) { if (K42) console.log(`k42  pair ${A0.ei}|${B0.ei} th ${(th * 57.2958).toFixed(1)} reflex`); continue; }'),
  @('      const thru = xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6 ? 1 : 0;',
    ('      const thru = xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6 ? 1 : 0;' + "`n" + '      if ((globalThis as any).__k42all && thru) console.log(`thru j${ji} c${xa.chain} s ${xa.s} th ${th} A ${A0.sR} ${A0.dir} ${A0.L} B ${B0.sR} ${B0.dir} ${B0.L}`);')),
  @('      if (st === "sharp") continue;',
    ('      const say = (m: string): void => { if (K42) console.log(`k42  pair ${A0.ei}|${B0.ei} ${xa.chain}:${xa.kind}|${xb.chain}:${xb.kind} th ${(th * 57.2958).toFixed(1)} thru ${thru} ${m}`); };' + "`n" + '      if (st === "sharp") { say("sharp"); continue; }')),
  @('      if (!(A.L > 1e-9 && B.L > 1e-9)) continue;',
    '      if (!(A.L > 1e-9 && B.L > 1e-9)) { say(`pass ${pass} L ${A.L} ${B.L}`); continue; }'),
  @('      if (!vsol) continue;', '      if (!vsol) { say(`pass ${pass} no V`); continue; }'),
  @('      if (!(dVa > tolV && dVa < A.L - tolV && dVb > tolV && dVb < B.L - tolV)) continue;',
    '      if (!(dVa > tolV && dVa < A.L - tolV && dVb > tolV && dVb < B.L - tolV)) { say(`pass ${pass} V feet out dVa ${(dVa / h).toFixed(3)} La ${(A.L / h).toFixed(3)} dVb ${(dVb / h).toFixed(3)} Lb ${(B.L / h).toFixed(3)} V ${vsol.x.toFixed(2)},${vsol.y.toFixed(2)}`); continue; }'),
  @('        if (!(crA * sgn > 0 && crB * sgn < 0)) continue;',
    '        if (!(crA * sgn > 0 && crB * sgn < 0)) { say(`pass ${pass} V outside wedge ${vsol.x.toFixed(2)},${vsol.y.toFixed(2)}`); continue; }'),
  @('      if (!(r > 1e-9)) { // K1407 23A',
    ('      if (K42) { const dcA = Math.hypot(V.x - V.fax, V.y - V.fay); const dcB = Math.hypot(V.x - V.fbx, V.y - V.fby); say(`pass ${pass} r ${(r / h).toFixed(3)}h r0 ${(r0 / h).toFixed(3)}h cfZero ${cfZero} qCF ${!!qCF} wV ${wOf(V).toFixed(3)} V ${V.x.toFixed(2)},${V.y.toFixed(2)} dV ${(dVa / h).toFixed(3)},${(dVb / h).toFixed(3)} L ${(A.L / h).toFixed(3)},${(B.L / h).toFixed(3)} slack ${(Math.min(A.L - W - V.ua, B.L - W - V.ub) / h).toFixed(3)} ua/rb ${(V.ua / rb).toFixed(3)} ub/rb ${(V.ub / rb).toFixed(3)} denV ${denV.toFixed(3)} mA ${(marginAt(SA, V.ua, V.x, V.y, dcA, mCut(dcA)) / h).toFixed(3)} mB ${(marginAt(SB, V.ub, V.x, V.y, dcB, mCut(dcB)) / h).toFixed(3)}`); }' + "`n" + '      if (!(r > 1e-9)) { // K1407 23A'))
)
foreach ($r in $reps) {
  $n = ([regex]::Matches($t, [regex]::Escape($r[0]))).Count
  if ($n -ne 1) { throw "match count $n for: $($r[0].Substring(0,60))" }
  $t = $t.Replace($r[0], $r[1])
}
[IO.File]::WriteAllText($f, $t)
'patched'
