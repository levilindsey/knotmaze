// K1247 s17: an arm's length candidates at frames F-1 and F, rebuilt from the
// cache: the root span (Lroot), each pass's d - reach - h, and the behind
// pass's k*uB with k from the neighbouring arms' angles (outline.ts's arm
// lengths, ~line 3975).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s17_arm.ts <F> <arm> [scene]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, debugCache, type SceneIn } from "./outline";
const a = process.argv.slice(2);
const F = +a[0]; const AI = +a[1];
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (a[2] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const sc = files.slice(0, F + 1).map(L);
const st = structure(sc[0]); const S = sc[0].camera.pxPerUnit * 2;
for (let f = 0; f <= F; f++) {
  frame(st, sc[f]);
  if (f < F - 1) continue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C: any = debugCache(st); const h = C.h;
  const A = C.armObj[AI]; const p = C.polys[A.pi]; const sR = C.armSR[AI]; const dr = C.armDir[AI];
  const delta = (sv: number): number => { let d = (sv - sR) * dr; if (p.closed) d = ((d % p.len) + p.len) % p.len; return d; };
  let Lr = p.closed ? p.len : dr > 0 ? p.s0 + p.len - sR : sR - p.s0;
  for (const qs of C.chainRoots[A.pi]) { const d = delta(qs); if (d > 1e-9 && d < Lr) Lr = d; }
  const rows: string[] = []; let uB = Infinity;
  for (let e = 0; e < C.passN[A.pi]; e++) {
    const sv = C.passS[A.pi][e]; const d = delta(sv); const u = p.closed ? p.len - d : -d;
    if (p.closed || d < -1e-12) { if (u >= 0 && u < uB) uB = u; }
    if (d < -1e-12) continue;
    const rk = e * 2 + (dr > 0 ? 0 : 1); const reach = C.reachStamp[A.pi][rk] !== undefined ? C.reachArr[A.pi][rk] : NaN;
    rows.push(`    pass ${e} (q chain ${C.passQi[A.pi][e]}) d ${d.toFixed(5)} theta ${C.passTheta[A.pi][e].toFixed(4)} reach ${reach.toFixed(5)} -> cand ${(d - reach - h).toFixed(5)}`);
  }
  const list = C.armsOfJSorted[A.ji]; const n = list.length; const at = list.indexOf(AI);
  const J = sc[f].junctions[A.ji]; let gMax = 0; const g: string[] = [];
  for (const [aa, bb] of [[list[(at + n - 1) % n], AI], [AI, list[(at + 1) % n]]] as [number, number][]) {
    if (aa === bb) continue;
    let th = C.armAng[bb] - C.armAng[aa]; th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const xa = J.arms[C.armObj[aa].ei]; const xb = J.arms[C.armObj[bb].ei];
    const skip = xa && xb && xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6;
    g.push(`(${aa},${bb}) th ${th.toFixed(4)}${skip ? " skip" : ""}`);
    if (!skip && th < Math.PI) gMax = Math.max(gMax, Math.tan((Math.PI - th) / 4));
  }
  const k = gMax > 0 ? Math.min(4, Math.max(1, 1 / gMax)) : 4;
  console.log(`f${f} arm ${AI} chain ${A.pi} ji ${A.ji} kind ${A.kind} sR ${sR.toFixed(5)} dir ${dr} h ${h.toFixed(4)}: L ${C.armL[AI].toFixed(5)} Lcut ${C.armLcut[AI].toFixed(5)} Lroot ${Lr.toFixed(5)}; uB ${uB.toFixed(5)} gMax ${gMax.toFixed(4)} k ${k.toFixed(4)} k*uB ${(k * uB).toFixed(5)}  [${g.join(" ")}] (S ${S.toFixed(2)} px/unit)`);
  console.log(rows.join("\n"));
}
