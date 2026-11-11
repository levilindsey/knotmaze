// K1279: k1247c_dump.ts on the f0c1111c outline snapshot (k1279_base_outline.ts), for the master side of the bars.
// K1247 (Claude's own check): frame() tables for the fast frame's
// same-output check. Cases: every scene at S, at the consistent 0.1h S', and
// def, ring and fat at the consistent 0.5h S' (s3f_exact.ts's perturb with
// --consistent, copied). Each table is written whole except diagnostics,
// typed arrays as plain arrays.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247c_dump.ts [outSubdir]
// Writes out/<outSubdir>/table_<scene>_<mult>.json (default k1247c_base).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn } from "./k1279_base_outline";

const here = dirname(fileURLToPath(import.meta.url));
const sub = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "k1247c_base";
const outDir = join(here, "..", "out", sub);
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];

function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
// s3f_exact.ts's perturb, --consistent on.
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const cumOf = (c: { closed: boolean; pts: number[] }): number[] => {
    const p = c.pts; const n = p.length / 2; const segs = c.closed ? n : n - 1; const cum = [0];
    for (let i = 0; i < segs; i++) { const j = (i + 1) % n; cum.push(cum[i] + Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1])); }
    return cum;
  };
  const before = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) {
    for (let i = 0; i + 1 < c.pts.length; i += 2) {
      const x = c.pts[i]; const y = c.pts[i + 1]; const d = dxy(x, y);
      c.pts[i] = x + d[0];
      c.pts[i + 1] = y + d[1];
    }
  }
  const after = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const closedOf = new Map(sc.chains.map((c) => [c.id, c.closed]));
  const remap = (chain: number, s: number): number => {
    const o = before.get(chain); const p = after.get(chain);
    if (!o || !p || o.length < 2) return s;
    const L = o[o.length - 1]; let u = s;
    if (closedOf.get(chain) && L > 0) u = ((u % L) + L) % L;
    let i = 0; while (i + 2 < o.length && o[i + 1] < u) i++;
    const t = o[i + 1] > o[i] ? (u - o[i]) / (o[i + 1] - o[i]) : 0;
    return p[i] + (p[i + 1] - p[i]) * t;
  };
  const any = sc as unknown as { crossings?: { a: { chain: number; s: number }; b: { chain: number; s: number } }[]; junctions?: { c: number[]; arms: { chain: number; s: number }[] }[]; deadEnds?: { chain: number; s: number }[] };
  for (const x of any.crossings ?? []) { x.a.s = remap(x.a.chain, x.a.s); x.b.s = remap(x.b.chain, x.b.s); }
  for (const j of any.junctions ?? []) { const d = dxy(j.c[0], j.c[1]); j.c[0] += d[0]; j.c[1] += d[1]; for (const a of j.arms) a.s = remap(a.chain, a.s); }
  for (const e of any.deadEnds ?? []) e.s = remap(e.chain, e.s);
  return sc;
}

const plain = (_k: string, v: unknown): unknown => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v);
for (const name of ALL) {
  const orig = load(name);
  const st = structure(orig);
  const mults = ["def", "ring", "fat"].includes(name) ? [0, 0.1, 0.5] : [0, 0.1];
  for (const mult of mults) {
    const sc = mult ? perturb(orig, mult * orig.look.halfWidth) : orig;
    const t0 = performance.now();
    const table = frame(st, sc);
    const ms = performance.now() - t0;
    const { diagnostics: _d, ...rest } = table;
    writeFileSync(join(outDir, `table_${name}_${mult}.json`), JSON.stringify({ name, mult, ms, table: rest }, plain));
    console.log(`${name} ${mult}: ${table.pieces.length} pieces, ${ms.toFixed(0)} ms`);
  }
}
