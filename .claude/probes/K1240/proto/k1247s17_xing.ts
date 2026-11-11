// K1247 s17: a chain's crossings (scene bindings) against the true
// intersections of the two centrelines (outline.ts's polys), frames F-1, F:
// per pass, the binding's s on both chains and the nearest polyline
// intersection's s, in px along the chain.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s17_xing.ts <F> <chain> [scene] [--all]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, debugCache, type SceneIn } from "./outline";
const a = process.argv.slice(2).filter((x) => !x.startsWith("--")); const all = process.argv.includes("--all");
const F = +a[0]; const PI = +a[1];
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (a[2] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const sc = files.slice(0, F + 1).map(L);
const st = structure(sc[0]); const S = sc[0].camera.pxPerUnit * 2;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any;
function inter(p: P, q: P, sp: number): [number, number, number] {
  // all segment intersections of p and q; return the one whose s on p is nearest sp
  let best: [number, number, number] = [NaN, NaN, Infinity];
  for (let i = 0; i < p.nseg; i++) {
    const i1 = (i + 1) % p.n; const ax = p.x[i], ay = p.y[i], bx = p.x[i1], by = p.y[i1];
    if (Math.abs(p.s[i] - sp) > 0.5) continue;
    for (let j = 0; j < q.nseg; j++) {
      const j1 = (j + 1) % q.n; const cx = q.x[j], cy = q.y[j], dx = q.x[j1], dy = q.y[j1];
      const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy; const den = rx * sy - ry * sx; if (Math.abs(den) < 1e-15) continue;
      const t = ((cx - ax) * sy - (cy - ay) * sx) / den; const u = ((cx - ax) * ry - (cy - ay) * rx) / den;
      if (t < 0 || t > 1 || u < 0 || u > 1) continue;
      const s1 = p.s[i] + t * p.segLen[i]; const s2 = q.s[j] + u * q.segLen[j];
      if (Math.abs(s1 - sp) < Math.abs(best[0] - sp) || !isFinite(best[0])) best = [s1, s2, Math.abs(s1 - sp)];
    }
  }
  return best;
}
const prev: Record<number, number[]> = {};
for (let f = 0; f <= F; f++) {
  frame(st, sc[f]);
  if (f < F - 1) continue;
  const C: P = debugCache(st); const p = C.polys[PI];
  for (let e = 0; e < C.passN[PI]; e++) {
    const qi = C.passQi[PI][e]; const q = C.polys[qi]; const s = C.passS[PI][e]; const sq = C.passSq[PI][e];
    const [gi, gq] = inter(p, q, s);
    const row = [s, sq, gi, gq];
    const pr = prev[e];
    const mv = pr ? ` | moves px: bind ${((s - pr[0]) * S).toFixed(3)} / ${((sq - pr[1]) * S).toFixed(3)}, true ${((gi - pr[2]) * S).toFixed(3)} / ${((gq - pr[3]) * S).toFixed(3)}` : "";
    if (all || f === F - 1 || Math.abs((s - (pr?.[0] ?? s)) * S) > 0.1) console.log(`f${f} chain ${PI} pass ${e} x chain ${qi}: bind s ${s.toFixed(5)} / ${sq.toFixed(5)}; true ${gi.toFixed(5)} / ${gq.toFixed(5)}; bind-true px ${((s - gi) * S).toFixed(3)} / ${((sq - gq) * S).toFixed(3)}${mv}`);
    prev[e] = row;
  }
}
