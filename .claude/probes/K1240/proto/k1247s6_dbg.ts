// K1247 s6: closed-form growth vs the stepping one, per corner (debug).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s6_dbg.ts [--scene=def] [--mult=0] [--n=12]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as O from "./outline";
import { sceneOf } from "./k1247s5_scenes";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const name = arg("scene") ?? "def"; const mult = +(arg("mult") ?? 0); const nShow = +(arg("n") ?? 12);
interface Cn { ok: boolean; r: number; qx: number; qy: number; tax: number; tay: number; tbx: number; tby: number }
const R = JSON.parse(readFileSync(join(here, "..", "out", "k1247s5", `ref_${name}_${mult}.json`), "utf8")) as { h: number; ref: Cn[] };
const sc = sceneOf(name, mult);
const st = O.structure(sc);
O.setClosedForm(false);
const a = (O.frame(st, sc).corners as unknown as Cn[]).map((c) => ({ ...c }));
O.setClosedForm(true);
for (const k of Object.keys(O.cfStats)) (O.cfStats as Record<string, number>)[k] = 0;
const b = (O.frame(st, sc).corners as unknown as Cn[]).map((c) => ({ ...c }));
console.log(JSON.stringify(O.cfStats));
const h = R.h;
const rows: { i: number; dq: number; ra: number; rb: number; rr: number; dRef: number }[] = [];
for (let i = 0; i < a.length; i++) {
  if (!(a[i].ok && b[i].ok)) continue;
  const dq = Math.hypot(a[i].qx - b[i].qx, a[i].qy - b[i].qy) / h;
  const r = R.ref[i];
  rows.push({ i, dq, ra: a[i].r / h, rb: b[i].r / h, rr: r.r / h, dRef: Math.hypot(b[i].qx - r.qx, b[i].qy - r.qy) / h });
}
if (arg("by") === "dq") rows.sort((x, y) => y.dq - x.dq); else rows.sort((x, y) => y.dRef - x.dRef);
const dbg = arg("ci");
if (dbg !== undefined) {
  O.setCfDebug(+dbg);
  O.frame(st, sc);
  for (const l of O.cfTrace.slice(0, 60)) console.log(l);
}
for (const r of rows.slice(0, nShow)) console.log(`c${r.i}: dq(step,cf) ${r.dq.toFixed(4)} r step ${r.ra.toFixed(4)} cf ${r.rb.toFixed(4)} ref ${r.rr.toFixed(4)} cf->ref ${r.dRef.toFixed(4)}`);
