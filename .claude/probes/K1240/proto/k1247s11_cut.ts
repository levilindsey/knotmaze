// K1247 s11: one crossing's cuts, full vs reduced (k1247s8_acc's frames, cold): every cut
// of the crossing both ways, the diagnostics naming it, and each piece with a point within
// --r h of the crossing's cuts (kind/key, s span, nearest point), so a cut that slides can
// be told from one whose pick switches.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s11_cut.ts <scene> <mult> <eps px> <crossing> [--r=1]
import { structure, frame, synthDbg, type SceneIn, type OutlineTable } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene } from "./k1247s8_reduce";

const [name, multS, epsS, xiS] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const R = +(arg("r") ?? 1);
const xi = +xiS;
const still = load(name);
const S = still.camera.pxPerUnit * 2; const h = still.look.halfWidth;
const K = selectKeep(still, { eps: +epsS / S });
const sc: SceneIn = sceneOf(name, +multS);
const stA = structure(still); const stB = structure(reduceScene(still, K)); const scB = reduceScene(sc, K);
synthDbg.xi = xi; synthDbg.rows = [];
const A = frame(stA, sc); const rowsA = synthDbg.rows; synthDbg.rows = [];
const B = frame(stB, scB); const rowsB = synthDbg.rows; synthDbg.xi = -1;
const f = (v: number): string => v.toFixed(4);
const px = (v: number): string => ((v / h) * still.look.halfWidth * S / 2).toFixed(2);
void px;
function show(t: OutlineTable, tag: string): { x: number; y: number }[] {
  const at: { x: number; y: number }[] = [];
  t.cuts.forEach((c, i) => { if (c.crossing === xi) { at.push({ x: c.x, y: c.y }); console.log(`  ${tag} cut ${i} ch${c.chain} side${c.side} s=${f(c.s)} over${c.overChain} at (${f(c.x)}, ${f(c.y)})`); } });
  t.diagnostics.forEach((d) => { if (d.includes(`crossing ${xi}`) || d.includes(`crossing ${xi}:`)) console.log(`  ${tag} diag ${d}`); });
  return at;
}
console.log(`${name} mult ${multS} eps ${epsS} px, crossing ${xi}, h ${f(h)} (1 h = ${(h * S / 2).toFixed(1)} px)`);
const atA = show(A, "full"); const atB = show(B, "red ");
const ref = atA.concat(atB);
for (const [t, tag] of [[A, "full"], [B, "red "]] as [OutlineTable, string][]) {
  t.pieces.forEach((p, i) => {
    const q = p.pts; let bd = Infinity; let bx = 0; let by = 0;
    for (let k = 0; k + 1 < q.length; k += 2) for (const r of ref) { const d = Math.hypot(q[k] - r.x, q[k + 1] - r.y); if (d < bd) { bd = d; bx = q[k]; by = q[k + 1]; } }
    if (bd / h < R) console.log(`  ${tag} #${i} ${p.kind}/${p.chain}/${p.side}/${p.corner ?? -1}/${p.region ?? -1} n${q.length >> 1} first (${f(q[0])}, ${f(q[1])}) last (${f(q[q.length - 2])}, ${f(q[q.length - 1])}) nearest (${f(bx)}, ${f(by)}) d=${(bd / h).toFixed(3)}h`);
  });
}
// Distance of each frame's cuts to every piece of the over chain (d in h), and the closest point.
const segD = (q: number[], x: number, y: number): [number, number, number] => {
  let bd = Infinity; let bx = 0; let by = 0;
  for (let k = 0; k + 3 < q.length; k += 2) {
    const ax = q[k]; const ay = q[k + 1]; const dx = q[k + 2] - ax; const dy = q[k + 3] - ay; const L2 = dx * dx + dy * dy;
    let u = L2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / L2 : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
    const cx = ax + dx * u; const cy = ay + dy * u; const d = Math.hypot(x - cx, y - cy); if (d < bd) { bd = d; bx = cx; by = cy; }
  }
  return [bd, bx, by];
};
for (const [t, tag] of [[A, "full"], [B, "red "]] as [OutlineTable, string][]) {
  for (const c of t.cuts) if (c.crossing === xi) for (const [u, utag] of [[A, "full"], [B, "red "]] as [OutlineTable, string][]) u.pieces.forEach((p, i) => {
    if (p.chain !== c.overChain && p.chain !== c.chain) return;
    const [d, cx, cy] = segD(p.pts, c.x, c.y);
    if (d / h < R) console.log(`  ${tag} cut side${c.side} s=${f(c.s)} -> ${utag} #${i} ${p.kind}/${p.chain}/${p.side}: d=${(d / h).toFixed(4)}h at (${f(cx)}, ${f(cy)})`);
  });
}
// --synth: the synthesized cut's distance profile, per under segment the nearest over pair (s, d/h).
if (process.argv.includes("--synth")) for (const [rows, tag] of [[rowsA, "full"], [rowsB, "red "]] as [number[][], string][]) {
  const best = new Map<string, number[]>();
  for (const r of rows) { const k = `${r[0]}|${r[1]}|${r[4]}`; const b = best.get(k); if (!b || r[3] < b[3]) best.set(k, r); }
  const list = [...best.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  let last = "";
  for (const r of list) { const g = `u${r[0]} o${r[1]}`; if (g !== last) { console.log(`  ${tag} synth ${g}: ${rows.filter((q) => q[0] === r[0] && q[1] === r[1]).length} pairs`); last = g; } console.log(`    s=${f(r[2])} d=${(r[3] / h).toFixed(4)}h seg ${r[4]}`); }
}
