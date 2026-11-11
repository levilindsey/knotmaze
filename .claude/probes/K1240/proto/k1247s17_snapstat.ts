// K1247 s17: the crossing snap (crossSnapInto) over a recording: per frame,
// how many crossings the walk failed on (kept the binding), the largest
// binding-to-intersection distance (px, on either chain), and any two
// crossings of the same chain pair that snapped to one intersection.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s17_snapstat.ts [scene] [--rest=<json>]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, debugCache, type SceneIn } from "./outline";
const a = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const scene = a[0] ?? "def";
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + scene);
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const s0 = L(files[0]); const st = structure(s0); const S = s0.camera.pxPerUnit * 2;
let fails = 0, worst = 0, worstAt = "", dups = 0; const failSet = new Map<number, number>(); const hist = [0, 0, 0, 0, 0];
for (let f = 0; f < files.length; f++) {
  const sc = f === 0 ? s0 : L(files[f]);
  frame(st, sc);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C: any = debugCache(st);
  const seen = new Map<string, number>();
  for (let xi = 0; xi < C.nX; xi++) {
    const x = sc.crossings[xi]; if (!x) continue;
    const ia = C.crossAPi[xi], ib = C.crossBPi[xi];
    if (!C.cpSnap[xi]) { fails++; failSet.set(xi, (failSet.get(xi) ?? 0) + 1); continue; }
    const pa = C.polys[ia], pb = C.polys[ib];
    const dd = (p: { closed: boolean; len: number; s0: number }, u: number, v: number): number => { let d = u - v; if (p.closed && p.len > 0) { d %= p.len; if (d > p.len / 2) d -= p.len; if (d < -p.len / 2) d += p.len; } return Math.abs(d); };
    const ba = Math.max(dd(pa, C.cpSA[xi], x.a.s), dd(pb, C.cpSB[xi], x.b.s)) * S;
    hist[ba < 0.25 ? 0 : ba < 0.5 ? 1 : ba < 1 ? 2 : ba < 2 ? 3 : 4]++;
    if (ba > worst) { worst = ba; worstAt = `f${f} x${xi} (chains ${ia} x ${ib})`; }
    const key = `${ia},${ib},${Math.round(C.cpSA[xi] * 1e5)},${Math.round(C.cpSB[xi] * 1e5)}`;
    if (seen.has(key)) { dups++; if (dups <= 10) console.log(`dup f${f}: x${xi} and x${seen.get(key)} snap to one intersection`); } else seen.set(key, xi);
  }
}
console.log(`${scene}: ${files.length} frames; walk failures ${fails} (crossings ${[...failSet.entries()].slice(0, 12).map(([k, v]) => `x${k}:${v}`).join(" ")}); |snap - bind| px <0.25 ${hist[0]}, <0.5 ${hist[1]}, <1 ${hist[2]}, <2 ${hist[3]}, >=2 ${hist[4]}; worst ${worst.toFixed(3)} px at ${worstAt}; shared intersections ${dups}`);
