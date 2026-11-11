import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, armDbg, debugCache, type SceneIn } from "./outline";
// K1247 s16 (temp): one arm's Lcut terms over frames F-1, F.
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (process.argv[4] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as any).ctrlArc ??= 0.47; return s; };
const F = +(process.argv[2] ?? 1); const AI = +(process.argv[3] ?? 538);
const sc = files.slice(0, F + 1).map(L); const S = sc[0].camera.pxPerUnit * 2;
const st = structure(sc[0]);
for (let f = 0; f <= F; f++) {
  armDbg.ai = f >= F - 1 ? AI : -1; armDbg.rows.length = 0;
  frame(st, sc[f]);
  if (f >= F - 1) { console.log(`--- f${f}`); for (const r of armDbg.rows) console.log(r.map((v) => (typeof v === "number" ? +v.toFixed(6) : v)).join(" "));
    if (AI < 0) continue; const C: any = debugCache(st); const pi = C.armObj[AI].pi; const pl = C.polys[pi];
    for (const r of armDbg.rows) if (r[0] === "pass") { const e = r[1] as number; const s = C.passS[pi][e]; let k = 0; while (k + 1 < pl.n && pl.s[k + 1] <= s) k++; const k2 = (k + 1) % pl.n; const u = (s - pl.s[k]) / (pl.segLen[k] || 1); const x = pl.x[k] + u * (pl.x[k2] - pl.x[k]), y = pl.y[k] + u * (pl.y[k2] - pl.y[k]);
      const qi = C.passQi[pi][e]; let mv = 0; const a = sc[F - 1], b = sc[F]; for (let c = 0; c < a.chains.length; c++) { const P = a.chains[c].pts, Q = b.chains[c].pts; for (let i = 0; i < P.length; i += 2) if (Math.hypot(P[i] - x, P[i + 1] - y) < 2 * 0.26) mv = Math.max(mv, Math.hypot(Q[i] - P[i], Q[i + 1] - P[i + 1])); }
      console.log(`  pass ${e}: chain ${pi} s ${s.toFixed(5)} at (${x.toFixed(4)}, ${y.toFixed(4)}) other chain ${qi} sq ${C.passSq[pi][e].toFixed(5)}; input move within 2h ${(mv * S).toFixed(3)} px`); } }
}