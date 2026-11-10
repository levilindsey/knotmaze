// K1247 s10: one acc row's piece, full vs reduced (k1247s8_acc's frames, cold). For each
// named piece index: its s0/s1 and point counts both ways, its first/last points, the
// drawn move's location, the same-chain-side neighbours' s spans, and the corners and
// cuts within --r h of the move (both ways), so a jump can be told from a slide.
// --tail: a tail piece's f terms along u (tailDbg, k1247s9_tail's columns), full vs reduced.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s10_piece.ts <scene> <mult> <eps px> <i,...> [--r=1.5] [--pts] [--tail]
import { structure, frame, tailDbg, type SceneIn, type OutlineTable } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene, drawnMoves } from "./k1247s8_reduce";

const [name, multS, epsS, idxS] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const R = +(arg("r") ?? 1.5);
const showPts = process.argv.includes("--pts");
const still = load(name);
const S = still.camera.pxPerUnit * 2; const h = still.look.halfWidth;
const K = selectKeep(still, { eps: +epsS / S });
const sc: SceneIn = sceneOf(name, +multS);
const A = frame(structure(still), sc);
const B = frame(structure(reduceScene(still, K)), reduceScene(sc, K));
const dm = drawnMoves(A.pieces, B.pieces, 0.5 * h);
const f = (v: number): string => v.toFixed(4);
const ends = (p: number[]): string => p.length ? `(${f(p[0])}, ${f(p[1])}) .. (${f(p[p.length - 2])}, ${f(p[p.length - 1])})` : "empty";
function near(t: OutlineTable, x: number, y: number, tag: string): void {
  t.corners.forEach((c, i) => { const d = Math.hypot(c.qx - x, c.qy - y) / h; if (d < R) console.log(`    ${tag} corner ${i} ${c.junction} a${c.aChain} b${c.bChain} ok=${c.ok} ${c.why ?? ""} r=${f(c.r / h)}h q=(${f(c.qx)}, ${f(c.qy)}) ta=(${f(c.tax)}, ${f(c.tay)}) tb=(${f(c.tbx)}, ${f(c.tby)}) d=${d.toFixed(2)}h`); });
  t.cuts.forEach((c, i) => { const d = Math.hypot(c.x - x, c.y - y) / h; if (d < R) console.log(`    ${tag} cut ${i} crossing ${c.crossing} ch${c.chain} side${c.side} s=${f(c.s)} over${c.overChain} at (${f(c.x)}, ${f(c.y)}) d=${d.toFixed(2)}h`); });
}
for (const i of idxS.split(",").map(Number)) {
  const a = A.pieces[i]; const b = B.pieces[i];
  console.log(`#${i} ${a.kind}/${a.chain}/${a.side}/${a.corner}/${a.region} vs ${b.kind}/${b.chain}/${b.side}/${b.corner}/${b.region}: drawn ${(dm.d[i] * S).toFixed(3)} px at (${f(dm.at[i][0])}, ${f(dm.at[i][1])})`);
  console.log(`  full: s ${f(a.s0)}..${f(a.s1)} n${a.pts.length / 2} ${ends(a.pts)}`);
  console.log(`  red : s ${f(b.s0)}..${f(b.s1)} n${b.pts.length / 2} ${ends(b.pts)}`);
  for (const [t, tag] of [[A, "full"], [B, "red "]] as [OutlineTable, string][]) {
    const nb = t.pieces.map((p, j) => ({ p, j })).filter(({ p }) => p.chain === a.chain && p.side === a.side && Math.abs(p.s0 - a.s0) < 4 * h);
    console.log(`  ${tag} same chain/side: ${nb.map(({ p, j }) => `#${j} ${p.kind} ${f(p.s0)}..${f(p.s1)} n${p.pts.length / 2}`).join("; ")}`);
  }
  near(A, dm.at[i][0], dm.at[i][1], "full"); near(B, dm.at[i][0], dm.at[i][1], "red ");
  if (showPts) { console.log(`  full pts ${a.pts.map(f).join(",")}`); console.log(`  red  pts ${b.pts.map(f).join(",")}`); }
  if (process.argv.includes("--tail") && a.kind === "tail") {
    // tailTerms per u (k1247s9_tail's columns): u/h f ad/h 0.5-ramp width margin/zt.
    const rowsOf = (run: () => void): number[][] => { tailDbg.ci = a.corner; tailDbg.rows = []; run(); const r = tailDbg.rows; tailDbg.ci = -1; return r; };
    const rf = rowsOf(() => frame(structure(still), sc));
    const rr = rowsOf(() => frame(structure(reduceScene(still, K)), reduceScene(sc, K)));
    console.log("  u/h | full f ad/h fR fW margin | red f ad/h fR fW margin");
    for (let m = 0; m < Math.min(rf.length, rr.length); m += 2) console.log(`  ${rf[m][0].toFixed(3)} | ${rf[m].slice(1, 6).map((v) => v.toFixed(3)).join(" ")} | ${rr[m].slice(1, 6).map((v) => v.toFixed(3)).join(" ")}`);
  }
}
