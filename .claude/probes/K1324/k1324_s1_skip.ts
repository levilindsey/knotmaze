// K1324 s1: what the s26 group skip (draw.ts contactPasses + groupArms) removed, per census find.
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s1_skip.ts <newTag> <baseTag> [--scene=a,b] [--dir=<census dir>]
// Lists the stray_ink finds in census_<newTag> with no match in census_<baseTag>, and for each the nearest
// sample pair the skip dropped (own chain, partner, distance), with form B's group membership (member():
// group and cap ramp) of both sides there, and the outline arm (groupArms) each side lies on.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as D from "../../../src/render/outline/draw";
import { FormB } from "../../../src/render/field/form_b";
import { loadScene } from "../K1314/k1314_census";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const dir = opt("dir") ?? "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/out/s1";
type Art = { scene: string; kind: string; x: number; y: number; px: number; near: string };
const load = (t: string): Art[] => JSON.parse(readFileSync(join(dir, `census_${t}.json`), "utf8")).arts;
const nw = load(args[0]); const bs = load(args[1]);
const scenes = opt("scene")?.split(",") ?? [...new Set(nw.map((a) => a.scene))];
const kinds = (opt("kinds") ?? "stray_ink").split(",");
for (const nm of scenes) {
  const fresh = nw.filter((a) => a.scene === nm && kinds.includes(a.kind) && !bs.some((b) => b.scene === nm && b.kind === a.kind && Math.hypot(b.x - a.x, b.y - a.y) < 0.3));
  if (!fresh.length) continue;
  const scene = loadScene(nm);
  const skips: { i: number; s: number; j: number; so: number; x: number; y: number; xo: number; yo: number }[] = [];
  D.contactOpts.groups = true;
  let zz: ReturnType<typeof D.zChains> | null = null;
  D.contactOpts.onSkip = (i, s, j, so) => { skips.push({ i, s, j, so, x: NaN, y: NaN, xo: NaN, yo: NaN }); };
  zz = D.zChains(scene);
  D.contactOpts.onSkip = null;
  const at = (ci: number, s: number): [number, number] => {
    const c = zz!.zc[ci]; let k = 0; while (k + 1 < c.n && c.s[k + 1] < s) k++;
    const k1 = Math.min(c.n - 1, k + 1); const u = c.s[k1] > c.s[k] ? (s - c.s[k]) / (c.s[k1] - c.s[k]) : 0;
    return [c.xs[k] + (c.xs[k1] - c.xs[k]) * u, c.ys[k] + (c.ys[k1] - c.ys[k]) * u];
  };
  for (const k of skips) { [k.x, k.y] = at(k.i, k.s); [k.xo, k.yo] = at(k.j, k.so); }
  const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { idxOf: Map<number, number>; member(pi: number, s: number): { g: number; ramp: number }; polys: { s0: number; len: number; closed: boolean }[]; h: number };
  const ids = [...zz.idx.entries()].sort((a, b) => a[1] - b[1]).map((e) => e[0]);
  const mem = (ci: number, s: number): string => { const pi = fb.idxOf.get(ids[ci]); if (pi === undefined) return "?"; const m = fb.member(pi, s); return m.g < 0 ? "own" : `g${m.g}@${m.ramp.toFixed(2)}`; };
  console.log(`${nm}: ${fresh.length} new, ${skips.length} skipped samples, h ${fb.h}`);
  for (const a of fresh) {
    let best = Infinity; let bk = -1;
    skips.forEach((k, q) => { const d = Math.min(Math.hypot(k.x - a.x, k.y - a.y), Math.hypot(k.xo - a.x, k.yo - a.y)); if (d < best) { best = d; bk = q; } });
    const k = skips[bk];
    // every skipped sample within 1.5h of the find, summarized by chain pair
    const near = skips.filter((q) => Math.min(Math.hypot(q.x - a.x, q.y - a.y), Math.hypot(q.xo - a.x, q.yo - a.y)) < 1.5 * fb.h);
    const pairs = new Map<string, { n: number; mi: string; mj: string }>();
    for (const q of near) { const key = `c${ids[q.i]}s${q.s.toFixed(2)}`; void key; const pk = `${ids[q.i]}/${ids[q.j]}`; const e = pairs.get(pk); if (!e) pairs.set(pk, { n: 1, mi: mem(q.i, q.s), mj: mem(q.j, q.so) }); else e.n++; }
    console.log(`  (${a.x.toFixed(2)}, ${a.y.toFixed(2)}) ${a.px} px near ${a.near}: nearest skip ${best.toFixed(3)} c${k ? ids[k.i] : "-"}@${k?.s.toFixed(2)} [${k ? mem(k.i, k.s) : ""}] vs c${k ? ids[k.j] : "-"}@${k?.so.toFixed(2)} [${k ? mem(k.j, k.so) : ""}]; within 1.5h: ${[...pairs].map(([p, e]) => `${p} x${e.n} ${e.mi}|${e.mj}`).join("; ")}`);
  }
}
