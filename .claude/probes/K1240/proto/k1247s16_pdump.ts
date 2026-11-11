// K1247 s16: pieces' s0/s1 and end points over frames F-1, F, plus the
// largest input move within r of a point.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s16_pdump.ts <F> <piece,piece,...> [x,y] [scene]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, type SceneIn } from "./outline";
const a = process.argv.slice(2);
const F = +a[0]; const PS = a[1].split(",").map(Number); const XY = (a[2] ?? "").split(",").map(Number);
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (a[3] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const sc = files.slice(0, F + 1).map(L);
const st = structure(sc[0]); const S = sc[0].camera.pxPerUnit * 2; const h = sc[0].look.halfWidth;
console.log(`files ${files.slice(F - 1, F + 1).join(" ")}`);
if (XY.length === 2 && Number.isFinite(XY[0])) {
  let m = 0;
  for (let c = 0; c < sc[F].chains.length; c++) { const p = sc[F - 1].chains[c].pts, q = sc[F].chains[c].pts; for (let i = 0; i < p.length; i += 2) if (Math.hypot(p[i] - XY[0], p[i + 1] - XY[1]) < 4 * h) m = Math.max(m, Math.hypot(q[i] - p[i], q[i + 1] - p[i + 1])); }
  console.log(`input move within 4h: ${(m * S).toFixed(4)} px`);
}
for (let f = 0; f <= F; f++) {
  const t = frame(st, sc[f]);
  if (f < F - 1) continue;
  for (const pi of PS) { const p = t.pieces[pi]; const n = p.pts.length; console.log(`f${f} piece ${pi} ${p.kind} c${p.chain} s${p.side} [${p.s0.toFixed(5)},${p.s1.toFixed(5)}] n${n >> 1} start (${(p.pts[0] * S).toFixed(3)},${(p.pts[1] * S).toFixed(3)}) end (${(p.pts[n - 2] * S).toFixed(3)},${(p.pts[n - 1] * S).toFixed(3)})`); }
}
