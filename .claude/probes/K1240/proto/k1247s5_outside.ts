// K1247 s5: what a corner change does outside the corners, new outline.ts
// against master's tables (out/k1247s5_master/, k1247c_dump.ts run on
// master 2d452e0e's outline.ts). Per case: piece keys (count, order, kind,
// chain, side, corner, region); run pieces as curves (each point's distance
// to the other's polyline, points beyond the other's ends skipped: a run's
// end moves with its corner's tangent point) and their end moves; faces and
// regions: counts, keys (ownerChain, group, hole) as multisets and by index,
// point counts. Distances in h.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/_s5dump_base.ts k1247s5_master   (k1247c_dump.ts importing ./outline_base)
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s5_outside.ts [--base=<out sub, default k1247s5_master>]
// K1247 s9: --base=k1247c_base reads the step 0 tables (k1247c_dump.ts on master's outline).
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame } from "./outline";
import { sceneOf } from "./k1247s5_scenes";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "out", process.argv.find((a) => a.startsWith("--base="))?.slice(7) ?? "k1247s5_master");
type Pc = { kind: string; chain: number; side: number; corner: number; region: number; pts: number[] };
type Fc = { ownerChain: number; group: number; hole: boolean; pts: number[] };
type Tb = { h: number; pieces: Pc[]; faces: Fc[]; regions: (Fc & { id: number; pieces: number[] })[]; cuts: unknown[] };
// Distance from (x, y) to polyline P, or -1 when the nearest point is P's first or last point.
function toPoly(x: number, y: number, P: number[]): number {
  let best = Infinity; let atEnd = false; const n = P.length / 2;
  if (n === 1) return Math.hypot(x - P[0], y - P[1]);
  for (let i = 0; i + 1 < n; i++) {
    const ax = P[2 * i]; const ay = P[2 * i + 1]; const bx = P[2 * i + 2]; const by = P[2 * i + 3];
    const vx = bx - ax; const vy = by - ay; const l2 = vx * vx + vy * vy;
    let t = l2 > 0 ? ((x - ax) * vx + (y - ay) * vy) / l2 : 0; let clamped = false;
    if (t <= 0) { t = 0; clamped = i === 0; } else if (t >= 1) { t = 1; clamped = i + 2 === n; }
    const d = Math.hypot(x - ax - vx * t, y - ay - vy * t);
    if (d < best) { best = d; atEnd = clamped; }
  }
  return atEnd ? -1 : best;
}
const files = readdirSync(dir).filter((f) => f.startsWith("table_") && f.endsWith(".json"));
let worstRun = 0; let worstAt = "";
for (const f of files) {
  const J = JSON.parse(readFileSync(join(dir, f), "utf8")) as { name: string; mult: number; table: Tb };
  const sc = sceneOf(J.name, J.mult);
  // K1240 r4: tails (1a8732b0) are new pieces master lacks; compare the rest
  // (tails come after them, so indices hold).
  const A = J.table; const B0 = frame(structure(sc), sc) as unknown as Tb; const h = A.h;
  const B = { ...B0, pieces: B0.pieces.filter((p) => (p as { kind: string }).kind !== "tail") } as Tb;
  const key = (p: Pc): string => `${p.kind}|${p.chain}|${p.side}|${p.corner}|${p.region}`;
  let keyDiff = A.pieces.length === B.pieces.length ? 0 : -1;
  if (keyDiff === 0) for (let i = 0; i < A.pieces.length; i++) if (key(A.pieces[i]) !== key(B.pieces[i])) keyDiff++;
  let runCurve = 0; let runAt = -1; let runWhere = ""; let runIn = 0; let runEnd = 0; let ptsDiff = 0; let passedDiff = 0;
  if (keyDiff === 0) for (let i = 0; i < A.pieces.length; i++) {
    const a = A.pieces[i]; const b = B.pieces[i];
    if (a.kind !== "run") continue;
    if (a.pts.length !== b.pts.length) ptsDiff++;
    // K1240 r4: a passed run draws no points now (master drew one).
    if (!a.pts.length || !b.pts.length) { if (a.pts.length !== b.pts.length) passedDiff++; continue; }
    for (const [P, Q] of [[a.pts, b.pts], [b.pts, a.pts]]) for (let k = 0; k + 1 < P.length; k += 2) {
      const d = toPoly(P[k], P[k + 1], Q) / h; if (k > 0 && k + 2 < P.length && d > runIn) runIn = d; if (d > runCurve) { runCurve = d; runAt = i; runWhere = `${P === a.pts ? "master" : "new"} pt ${k / 2} of ${P.length / 2} (other ${Q.length / 2})`; }
    }
    const e = Math.max(Math.hypot(a.pts[0] - b.pts[0], a.pts[1] - b.pts[1]), Math.hypot(a.pts[a.pts.length - 2] - b.pts[b.pts.length - 2], a.pts[a.pts.length - 1] - b.pts[b.pts.length - 1])) / h;
    if (e > runEnd) runEnd = e;
  }
  const fk = (x: Fc): string => `${x.ownerChain}|${x.group}|${x.hole}`;
  const ms = (xs: Fc[]): string => xs.map(fk).sort().join(",");
  const fSame = ms(A.faces) === ms(B.faces); let fIdx = 0; let fPts = 0;
  for (let i = 0; i < Math.min(A.faces.length, B.faces.length); i++) { if (fk(A.faces[i]) !== fk(B.faces[i])) fIdx++; else if (A.faces[i].pts.length !== B.faces[i].pts.length) fPts++; }
  const rk = (x: Tb["regions"][number]): string => `${x.id}|${x.ownerChain}|${x.group}|${x.hole}|${x.pieces.join(".")}`;
  let rKey = A.regions.length === B.regions.length ? 0 : -1; let rPts = 0;
  if (rKey === 0) for (let i = 0; i < A.regions.length; i++) { if (rk(A.regions[i]) !== rk(B.regions[i])) rKey++; else if (A.regions[i].pts.length !== B.regions[i].pts.length) rPts++; }
  if (runCurve > worstRun) { worstRun = runCurve; worstAt = `${J.name} ${J.mult} piece ${runAt}`; }
  console.log(`${J.name} ${J.mult}: pieces ${B.pieces.length} key diffs ${keyDiff}; runs: curve ${runCurve.toExponential(2)} h @${runAt} [${runWhere}] (interior points ${runIn.toExponential(2)} h), ends ${runEnd.toFixed(3)} h, point-count diffs ${ptsDiff} (passed runs now empty ${passedDiff}); tails ${B0.pieces.length - B.pieces.length}; faces ${A.faces.length}->${B.faces.length} keys ${fSame ? "same set" : "DIFFERENT SET"}, ${fIdx} index moves, ${fPts} point-count diffs; regions ${A.regions.length}->${B.regions.length} key diffs ${rKey}, point-count diffs ${rPts}; cuts ${A.cuts.length}->${B.cuts.length}`);
}
console.log(`ALL: worst run curve distance ${worstRun.toExponential(2)} h (${worstAt})`);
