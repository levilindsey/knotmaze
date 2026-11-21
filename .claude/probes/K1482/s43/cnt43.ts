// K1482 s43: every place the mirror's bend fillet changes on one scene's whole frame. Renders the mirror with the
// switch off and at each radius (GfEval.BEND = rf; GF_BENDIN etc. as set in env), counts pixels whose ink moves by
// >= 1/255, and groups them into places (pixels within GAP px of each other). Writes <out>_<rf>.txt (one place per
// line: x,y of its centre, px, ink added, ink removed, bbox) and prints the counts and the five largest places.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s43/cnt43.ts <scene.json> <sites.json> <W> <H> <out> <rf,rf2...>
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const G = join(SRC, "src/render/gpu_field");
const { buildTables, withHome } = await import(pathToFileURL(join(G, "tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(G, "gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(G, "eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { const o: any = {}; for (const k in v) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, Ws, Hs, out, rfs] = process.argv;
const W = +Ws, H = +Hs, GAP = 6;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const render = (bend: number): Uint8Array => {
  GfEval.BEND = bend; const E: any = new GfEval(T); const img = new Uint8Array(W * H);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) img[Y * W + X] = Math.round(255 * E.eval((X + 0.5 - e) / a, (Y + 0.5 - f) / d).ink);
  return img;
};
const off = render(0);
for (const rf of rfs.split(",").map(Number)) {
  const on = render(rf);
  const ch: number[] = []; for (let i = 0; i < W * H; i++) if (on[i] !== off[i]) ch.push(i);
  // group: union-find over changed pixels within GAP (chebyshev), via a coarse grid of GAP-sized cells
  const par = new Int32Array(ch.length).map((_, i) => i); const find = (i: number): number => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const cell = new Map<number, number[]>(); const CW = Math.ceil(W / GAP) + 2;
  ch.forEach((p, k) => { const c = Math.floor((p % W) / GAP) + 1 + (Math.floor(p / W / GAP) + 1) * CW; (cell.get(c) ?? cell.set(c, []).get(c)!).push(k); });
  for (const [c, ks] of cell) for (const dc of [0, 1, CW - 1, CW, CW + 1]) { const o = cell.get(c + dc); if (!o) continue; for (const k of ks) for (const m of o) { if (m === k) continue; const dx = Math.abs((ch[k] % W) - (ch[m] % W)), dy = Math.abs(Math.floor(ch[k] / W) - Math.floor(ch[m] / W)); if (dx <= GAP && dy <= GAP) par[find(k)] = find(m); } }
  const pl = new Map<number, { n: number; add: number; rem: number; x0: number; x1: number; y0: number; y1: number; sx: number; sy: number }>();
  ch.forEach((p, k) => { const r = find(k); const X = p % W, Y = Math.floor(p / W); const q = pl.get(r) ?? pl.set(r, { n: 0, add: 0, rem: 0, x0: X, x1: X, y0: Y, y1: Y, sx: 0, sy: 0 }).get(r)!; q.n++; if (on[p] > off[p]) q.add++; else q.rem++; q.x0 = Math.min(q.x0, X); q.x1 = Math.max(q.x1, X); q.y0 = Math.min(q.y0, Y); q.y1 = Math.max(q.y1, Y); q.sx += X; q.sy += Y; });
  const rows = [...pl.values()].sort((u, v) => v.n - u.n).map((q) => `${Math.round(q.sx / q.n)},${Math.round(q.sy / q.n)} px ${q.n} +${q.add} -${q.rem} bbox ${q.x0}..${q.x1} x ${q.y0}..${q.y1}`);
  writeFileSync(`${out}_${rf}.txt`, rows.join("\n") + "\n");
  const add = ch.filter((p) => on[p] > off[p]).length;
  console.log(`rf ${rf}: changed ${ch.length} px (+${add} -${ch.length - add}) at ${rows.length} places; largest: ${rows.slice(0, 5).join(" | ")}`);
}
