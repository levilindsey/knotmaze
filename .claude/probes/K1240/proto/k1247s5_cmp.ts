// K1247 s5: outline.ts's corners against the converged reference
// (out/k1247s5/ref_<scene>_<mult>.json from k1247s5_ref.ts). Per scene: the
// largest corner distance to the reference (new and today's 32 nodes), the
// largest move from today, corners whose ok flag differs, and the growth's
// evaluations (advances to a node) per frame. Corner distance = the largest
// of |dq|, |dta|, |dtb|, in h. Writes out/k1247s5/cmp<tag>.json (per corner
// moves, for the crops).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s5_cmp.ts [--E=0.002] [--H=0.25] [--scene=def] [--tag=x]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as O from "./outline";
import { ALL, multsOf, sceneOf } from "./k1247s5_scenes";

const here = dirname(fileURLToPath(import.meta.url));
const refDir = join(here, "..", "out", "k1247s5");
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const E = +(arg("E") ?? 0.002); const Hm = +(arg("H") ?? 0.25); const P = +(arg("P") ?? 1 / 64);
// No --N and no --E: outline.ts's own defaults.
if (arg("N") !== undefined) O.setGrowUniform(+arg("N")!, E, +(arg("Z") ?? 1e-3), arg("mid") !== "0"); else if (arg("E") !== undefined) O.setGrowKnobs(E, Hm, P);
const only = arg("scene"); const tag = arg("tag") ?? "";
interface Cn { ok: boolean; r: number; qx: number; qy: number; tax: number; tay: number; tbx: number; tby: number }
const cdist = (a: Cn, b: Cn): number => Math.max(Math.hypot(a.qx - b.qx, a.qy - b.qy), Math.hypot(a.tax - b.tax, a.tay - b.tay), Math.hypot(a.tbx - b.tbx, a.tby - b.tby));
const out: { name: string; mult: number; h: number; moves: { i: number; d: number; dRef: number; dToday: number; qx: number; qy: number }[] }[] = [];
let worstNew = 0; let worstToday = 0; let evalsTot = 0; let cornersTot = 0; let stepsTot = 0; let over = 0; let overT = 0; const hist = [0, 0, 0, 0]; const histT = [0, 0, 0, 0]; const edges = [0.01, 0.03, 0.1, 0.3];
for (const name of ALL) {
  if (only && name !== only) continue;
  for (const mult of multsOf(name)) {
    const f = join(refDir, `ref_${name}_${mult}.json`);
    if (!existsSync(f)) { console.log(`${name} ${mult}: no reference`); continue; }
    const R = JSON.parse(readFileSync(f, "utf8")) as { h: number; conv: number; N: number; ref: Cn[]; today: Cn[] };
    const sc = sceneOf(name, mult);
    const st = O.structure(sc);
    O.growStats.evals = 0; O.growStats.rejects = 0; O.growStats.corners = 0; O.growStats.steps = 0; O.growStats.fails = 0;
    const t = O.frame(st, sc);
    const ev = O.growStats.evals; const rj = O.growStats.rejects; const nc = O.growStats.corners; const stp = O.growStats.steps; const fl = O.growStats.fails;
    const h = R.h;
    const cs = t.corners as unknown as Cn[];
    if (cs.length !== R.ref.length) console.log(`  !! corner count ${cs.length} vs ${R.ref.length}`);
    let dRef = 0; let atR = -1; let dTod = 0; let atT = -1; let mv = 0; let atM = -1; let okDiff = 0;
    const moves: { i: number; d: number; dRef: number; dToday: number; qx: number; qy: number }[] = [];
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i]; const r = R.ref[i]; const td = R.today[i];
      if (c.ok !== td.ok || c.ok !== r.ok) okDiff++;
      if (!(c.ok && r.ok && td.ok)) continue;
      const a = cdist(c, r) / h; const b = cdist(td, r) / h; const m = cdist(c, td) / h;
      if (a > dRef) { dRef = a; atR = i; }
      if (b > dTod) { dTod = b; atT = i; }
      if (m > mv) { mv = m; atM = i; }
      moves.push({ i, d: m, dRef: a, dToday: b, qx: td.qx, qy: td.qy });
    }
    moves.sort((x, y) => y.d - x.d);
    out.push({ name, mult, h, moves: moves.slice(0, 12) });
    worstNew = Math.max(worstNew, dRef); worstToday = Math.max(worstToday, dTod); evalsTot += ev; cornersTot += nc; stepsTot += stp;
    for (const x of moves) for (let e = 0; e < 4; e++) { if (x.dRef > edges[e]) hist[e]++; if (x.dToday > edges[e]) histT[e]++; }
    const n01 = moves.filter((x) => x.dRef > 0.01).length; over += n01; const t01 = moves.filter((x) => x.dToday > 0.01).length; overT += t01;
    console.log(`${name} ${mult}${R.conv > 0 ? "" : " (ref not conv)"}: new->ref ${dRef.toFixed(4)} @${atR}; today->ref ${dTod.toFixed(4)} @${atT}; move ${mv.toFixed(4)} @${atM}; >0.01h ${n01} (today ${t01}); okDiff ${okDiff}; evals ${ev} (${(ev / Math.max(1, nc)).toFixed(1)}/corner, rej ${rj}); steps ${stp} fails ${fl}`);
  }
}
console.log(`ALL: worst new->ref ${worstNew.toFixed(4)} h, today->ref ${worstToday.toFixed(4)} h, evals ${evalsTot}, steps ${stepsTot}, grown corners ${cornersTot}, corners >0.01h ${over} (today ${overT}); >0.01/0.03/0.1/0.3h ${hist.join("/")} (today ${histT.join("/")})`);
writeFileSync(join(refDir, `cmp${tag}.json`), JSON.stringify(out));
