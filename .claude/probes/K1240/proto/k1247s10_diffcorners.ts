// K1247 s10: which corners stage 10's outline changes moved, against master's outline. For
// every scene x mult (k1247s5_scenes, cold frames), each piece whose points differ from
// master's by more than --tol (world, default 1e-6) is attributed to the nearest corner (by
// its q, mine) to the piece's point of largest difference, and that corner's ok / why is
// printed. A change that is deliberate sits at a "V outside spans" fallback corner (the span
// ramp) or a tail at a fallback corner or an ok r = 0 V (the tail blend); anything else is OTHER.
// Master's outline must sit beside this file as outline_master.ts (untracked):
//   git show master:.claude/probes/K1240/proto/outline.ts > .claude/probes/K1240/proto/outline_master.ts
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s10_diffcorners.ts [--tol=1e-6] [--scene=def]
import { structure, frame, type OutlineTable } from "./outline";
import { ALL, multsOf, sceneOf } from "./k1247s5_scenes";

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const tol = +(arg("tol") ?? 1e-6);
const only = arg("scene");
type Mod = { structure: typeof structure; frame: typeof frame };
const M = (await import("./outline_master")) as unknown as Mod;

function worst(a: number[], b: number[]): { d: number; x: number; y: number } {
  if (a.length !== b.length) {
    // Unequal counts: the largest nearest-point distance from either side.
    let d = 0, x = 0, y = 0;
    const side = (p: number[], q: number[]): void => {
      for (let i = 0; i + 1 < p.length; i += 2) {
        let m = Infinity;
        for (let j = 0; j + 1 < q.length; j += 2) m = Math.min(m, Math.hypot(p[i] - q[j], p[i + 1] - q[j + 1]));
        if (m > d) { d = m; x = p[i]; y = p[i + 1]; }
      }
    };
    side(a, b); side(b, a);
    return { d: a.length && b.length ? d : Infinity, x: a.length ? x || a[0] : b[0], y: a.length ? y || a[1] : b[1] };
  }
  let d = 0, x = 0, y = 0;
  for (let i = 0; i + 1 < a.length; i += 2) { const e = Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1]); if (e > d) { d = e; x = a[i]; y = a[i + 1]; } }
  return { d, x, y };
}
const tally = new Map<string, number>();
for (const name of ALL) {
  if (only && name !== only) continue;
  for (const mult of multsOf(name)) {
    const sc = sceneOf(name, mult); const h = sc.look.halfWidth;
    const A: OutlineTable = M.frame(M.structure(sc), sc) as OutlineTable;
    const B: OutlineTable = frame(structure(sc), sc);
    const rows: string[] = [];
    const n = Math.min(A.pieces.length, B.pieces.length);
    if (A.pieces.length !== B.pieces.length) rows.push(`  PIECE COUNT ${A.pieces.length} vs ${B.pieces.length}`);
    for (let i = 0; i < n; i++) {
      const a = A.pieces[i], b = B.pieces[i];
      const key = `${b.kind}/${b.chain}/${b.side}/${b.corner}/${b.region}`;
      if (`${a.kind}/${a.chain}/${a.side}/${a.corner}/${a.region}` !== key) { rows.push(`  #${i} KEY ${a.kind}/${a.corner} vs ${key}`); continue; }
      const w = worst(a.pts, b.pts); if (!(w.d > tol)) continue;
      let ci = b.corner, cd = 0;
      if (ci < 0) { cd = Infinity; B.corners.forEach((c, j) => { const e = Math.hypot(c.qx - w.x, c.qy - w.y); if (e < cd) { cd = e; ci = j; } }); }
      const c = B.corners[ci]; const ca = A.corners[ci];
      // An ok r = 0 corner is the V: its tip (tb) sits off the border, so the blend moves its tail too.
      const cls = !c ? "OTHER" : c.ok ? (ca && !ca.ok ? `ok now (master ${ca.why})` : b.kind === "tail" && c.r < 1e-9 * h ? "tail at r = 0 V" : "OTHER (ok corner)") : c.why === "V outside spans" ? (b.kind === "tail" ? "tail at V-outside-spans" : "V outside spans") : (b.kind === "tail" ? `tail at ${c.why}` : `OTHER (${c.why})`);
      tally.set(cls, (tally.get(cls) ?? 0) + 1);
      rows.push(`  #${i} ${key} moved ${(w.d / h).toFixed(4)} h (n ${a.pts.length / 2} vs ${b.pts.length / 2}) at (${w.x.toFixed(3)}, ${w.y.toFixed(3)}); corner ${ci} ${c ? (c.ok ? "ok" : c.why) : "?"} ${cd ? `${(cd / h).toFixed(2)} h away` : "(own)"} -> ${cls}`);
    }
    console.log(`${name} ${mult}: ${rows.length} pieces differ`);
    for (const r of rows) console.log(r);
  }
}
console.log(`TALLY ${[...tally].map(([k, v]) => `${k}: ${v}`).join("; ")}`);
