// K1040 S3f: the upload's CPU on the 12 S3 scenes, in Node (no GPU). The Pixel's
// upload calls cost 1.1-6.5 ms of main-thread time a frame, about as much at
// rest (0 bytes sent) as moving, so the CPU work dominates: tentSpanRecord's
// per-point span search and uploadLean's row diff. Per scene this prints the
// table sizes, the search's cost (today's binary search; the walk that
// label_b_tent.ts may take, checked bit for bit against it), and the at-rest
// row diff's cost (uploadLean's compare over every used row of the five
// tables), each the median of --reps calls after a warm-up.
// Usage: node scripts/run_node.mjs .claude/probes/K1040/s3/span_bench.ts [--reps 101] [--walk src]
//   --walk src: time label_b_tent.ts's own tentSpanRecord as "walk" (after the
//   lever lands) instead of the bench's copy.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { buildLabelB, FILL_TEXELS, TEX_W, type LabelBTables } from "../../../../src/render/field/label_b";
import * as tent from "../../../../src/render/field/label_b_tent";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SCENES = [
  "muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper",
  "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
];
const argv = process.argv.slice(2);
const val = (k: string, d: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const reps = Number(val("--reps", "101"));

/** today's search (label_b_tent.ts before S3f), verbatim. */
function binaryRecord(T: LabelBTables, out?: Float32Array): Float32Array {
  const ps = out && out.length === T.pts.length ? out : new Float32Array(T.pts.length);
  const { pts, chain, span } = T;
  const at = (i: number) => (i < span.length ? span[i] : 0);
  for (let ci = 0; ci < T.nChains; ci++) {
    const off = chain[8 * ci]; const n = chain[8 * ci + 1];
    const so = chain[8 * ci + 6]; const ns = chain[8 * ci + 7];
    for (let j = off; j < off + n; j++) {
      const s = pts[4 * j + 2];
      let lo = 0; let hi = ns - 1;
      for (let it = 0; it < 16; it++) {
        if (lo >= hi) break;
        const mid = (lo + hi + 1) >> 1;
        if (at(4 * (so + mid)) <= s) lo = mid; else hi = mid - 1;
      }
      ps[4 * j] = lo;
      ps[4 * j + 1] = Math.trunc(at(4 * (so + lo) + 1));
      ps[4 * j + 2] = lo + 1 < ns ? at(4 * (so + lo + 1)) : 1e30;
      ps[4 * j + 3] = 0;
    }
  }
  return ps;
}

/** The walk: from the previous point's span, forward then back (sorted chains). */
function walkRecord(T: LabelBTables, out?: Float32Array): Float32Array {
  const ps = out && out.length === T.pts.length ? out : new Float32Array(T.pts.length);
  const { pts, chain, span } = T;
  const L = span.length;
  for (let ci = 0; ci < T.nChains; ci++) {
    const off = chain[8 * ci]; const n = chain[8 * ci + 1];
    const so = chain[8 * ci + 6]; const ns = chain[8 * ci + 7];
    let k = 0;
    for (let j = off; j < off + n; j++) {
      const s = pts[4 * j + 2];
      while (k + 1 < ns) { const i = 4 * (so + k + 1); if ((i < L ? span[i] : 0) <= s) k++; else break; }
      while (k > 0) { const i = 4 * (so + k); if ((i < L ? span[i] : 0) <= s) break; k--; }
      const ic = 4 * (so + k) + 1; const inx = 4 * (so + k + 1);
      ps[4 * j] = k;
      ps[4 * j + 1] = Math.trunc(ic < L ? span[ic] : 0);
      ps[4 * j + 2] = k + 1 < ns ? (inx < L ? span[inx] : 0) : 1e30;
      ps[4 * j + 3] = 0;
    }
  }
  return ps;
}

/** uploadLean's at-rest compare over the used rows (no row differs). */
function diffRows(cur: Uint32Array, last: Uint32Array, rows: number, used: number): number {
  const RW = TEX_W * 4;
  const usedRows = Math.min(rows, Math.ceil(used / TEX_W));
  let dirtyRows = 0;
  for (let r = 0; r < usedRows; r++) {
    const end = Math.min((r + 1) * RW, 4 * used);
    for (let i = r * RW; i < end; i++) if (cur[i] !== last[i]) { dirtyRows++; break; }
  }
  return dirtyRows;
}

function med(f: () => void): number {
  for (let i = 0; i < 10; i++) f();
  const t: number[] = [];
  for (let i = 0; i < reps; i++) { const a = performance.now(); f(); t.push(performance.now() - a); }
  t.sort((x, y) => x - y);
  return t[t.length >> 1];
}

const useSrc = val("--walk", "") === "src";
const walk = useSrc ? (T: LabelBTables, o?: Float32Array) => tent.tentSpanRecord(T, o) : walkRecord;
const rows: string[] = [
  `# span_bench: the upload's CPU in Node (desktop), median of ${reps} calls, ms${useSrc ? " (walk = src's tentSpanRecord)" : ""}`,
  "",
  "| scene | points | chains | spans | max ns | s monotone | binary | walk | same bits | diff at rest (5 tables) | words diffed |",
  "|---|---|---|---|---|---|---|---|---|---|---|",
];
for (const name of SCENES) {
  const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as FieldScene;
  scene.look.ctrlArc ??= 0.47;
  const T = buildLabelB(new FormB(scene, { dpr: 2 }));
  const lc = 8 * (T.nChains - 1);
  const nPts = T.nChains > 0 ? T.chain[lc] + T.chain[lc + 1] : 0;
  const nSpan = T.nChains > 0 ? T.chain[lc + 6] + T.chain[lc + 7] : 0;
  let maxNs = 0; let mono = true;
  for (let ci = 0; ci < T.nChains; ci++) {
    const off = T.chain[8 * ci], n = T.chain[8 * ci + 1];
    maxNs = Math.max(maxNs, T.chain[8 * ci + 7]);
    for (let j = off + 1; j < off + n; j++) if (!(T.pts[4 * j + 2] >= T.pts[4 * (j - 1) + 2])) { mono = false; break; }
  }
  const a = binaryRecord(T); const b = walk(T);
  const ua = new Uint32Array(a.buffer), ub = new Uint32Array(b.buffer);
  let same = ua.length === ub.length;
  for (let i = 0; same && i < ua.length; i++) if (ua[i] !== ub[i]) same = false;
  const oa = new Float32Array(T.pts.length), ob = new Float32Array(T.pts.length);
  const tBin = med(() => binaryRecord(T, oa));
  const tWalk = med(() => walk(T, ob));
  const tabs: [Float32Array, number, number][] = [
    [T.pts, T.ptsRows, nPts], [T.chain, T.chainRows, 2 * T.nChains], [T.span, T.spanRows, nSpan],
    [T.fill, T.fillRows, FILL_TEXELS * T.nFills], [a, T.ptsRows, nPts],
  ];
  const pairs = tabs.map(([d, r, u]) => [new Uint32Array(d.buffer, d.byteOffset, d.length), new Uint32Array(d.buffer.slice(d.byteOffset, d.byteOffset + 4 * d.length)), r, u] as const);
  const words = tabs.reduce((acc, [, r, u]) => acc + 4 * Math.min(u, Math.min(r, Math.ceil(u / TEX_W)) * TEX_W), 0);
  let dr = 0;
  const tDiff = med(() => { dr = 0; for (const [c, l, r, u] of pairs) dr += diffRows(c, l, r, u); });
  rows.push(`| ${name} | ${nPts} | ${T.nChains} | ${nSpan} | ${maxNs} | ${mono ? "yes" : "no"} | ${tBin.toFixed(3)} | ${tWalk.toFixed(3)} | ${same ? "yes" : "NO"} | ${tDiff.toFixed(3)}${dr ? ` (${dr} dirty)` : ""} | ${words} |`);
}
console.log(rows.join("\n"));
