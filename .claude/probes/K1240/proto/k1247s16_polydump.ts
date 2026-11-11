import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, debugCache, type SceneIn } from "./outline";
// K1247 s16 (temp): an arm's centreline vertices in [sLo, sHi] at frame F, with
// segment lengths, turns and the distance from a point q.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s16_polydump.ts <F> <arm> <sLo> <sHi> <qx> <qy> [rec]
const a = process.argv.slice(2);
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (a[6] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as any).ctrlArc ??= 0.47; return s; };
const F = +a[0]; const AI = +a[1]; const sLo = +a[2], sHi = +a[3], qx = +a[4], qy = +a[5];
const sc = files.slice(0, F + 1).map(L); const st = structure(sc[0]);
for (let f = 0; f <= F; f++) frame(st, sc[f]);
const C: any = debugCache(st); const pi = C.armObj[AI].pi; const p = C.polys[pi];
console.log(`arm ${AI} chain ${pi} closed ${p.closed} n ${p.n} len ${p.len}`);
for (let k = 0; k < p.n; k++) {
  if (p.s[k] < sLo || p.s[k] > sHi) continue;
  const kp = k > 0 ? k - 1 : p.n - 1, kn = k + 1 < p.n ? k + 1 : 0;
  const a1 = Math.atan2(p.y[k] - p.y[kp], p.x[k] - p.x[kp]), a2 = Math.atan2(p.y[kn] - p.y[k], p.x[kn] - p.x[k]);
  let t = a2 - a1; t = Math.atan2(Math.sin(t), Math.cos(t));
  console.log(`k ${k} s ${p.s[k].toFixed(5)} seg ${p.segLen[k]?.toFixed(5)} turn ${t.toFixed(5)} dq ${Math.hypot(p.x[k] - qx, p.y[k] - qy).toFixed(5)}`);
}