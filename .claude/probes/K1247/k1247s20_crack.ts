// K1247 s20: where the records' extra paper comes from. For a rest scene (K868 scenes), A = the fill off
// and C = the records on (fillRec 1: stage 18's CPU placement, which stage 19's shader matches within
// 0.006 px), both rastered with their triangle ids. Each C-only crack pixel (form B covers, A fills,
// C leaves paper): A's triangle there, its item, its vertices' rows/columns and on-minus-off moves.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s20_crack.ts <scene> [--ppu=40] [--list=20]
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn } from "../../../src/render/outline/outline";
import { fillResolution, fillStructure, fillFrame, rasterFill, itemVerts, type FillItem } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";
import { POLY } from "../../../src/render/outline/chain_frame";
if (process.env.POLY !== undefined) POLY.mode = Number(process.env.POLY);

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const nm = pos[0] ?? "def"; const ppu = Number(opt("ppu") ?? 40); const nList = Number(opt("list") ?? 20);
const rec = Number(opt("rec") ?? 1);
const scene = JSON.parse(readFileSync(join("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes", `${nm}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
for (const c of scene.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { x0 = Math.min(x0, c.pts[i]); x1 = Math.max(x1, c.pts[i]); y0 = Math.min(y0, c.pts[i + 1]); y1 = Math.max(y1, c.pts[i + 1]); }
x0 = Math.floor(x0 - 2); y0 = Math.floor(y0 - 2); x1 = Math.ceil(x1 + 2); y1 = Math.ceil(y1 + 2);
const W = Math.round((x1 - x0) * ppu); const H = Math.round((y1 - y0) * ppu);
const fbFile = join(here, "out", "s19", "fb14", `${nm}_${ppu}.bin`);
if (!existsSync(fbFile)) throw new Error(`no form B cache ${fbFile}`);
const b = readFileSync(fbFile); const top = new Int32Array(b.buffer.slice(b.byteOffset + 32, b.byteOffset + 32 + 4 * W * H));

const st = structure(scene); const tb = frame(st, scene);
const fs = fillStructure(st, fillResolution(st, tb)); const zz = zChains(scene);
const A = fillFrame(fs, st, tb, scene, zz);
const C = fillFrame(fs, st, tb, { ...scene, look: { ...scene.look, fillRec: rec } } as SceneIn, zz);
const wA = { tri: new Int32Array(W * H).fill(-1), bary: new Float32Array(3 * W * H) };
const wC = { tri: new Int32Array(W * H).fill(-1), bary: new Float32Array(3 * W * H) };
const gA = rasterFill(fs, A, x0, y0, W, H, ppu, wA); const gC = rasterFill(fs, C, x0, y0, W, H, ppu, wC);
// vertex -> item
const items = fs.items.map((it, i) => ({ it, i, b: it.base, n: itemVerts(it) })).sort((p, q) => p.b - q.b);
const itemOf = (v: number): { it: FillItem; i: number; b: number; n: number } => {
  let lo = 0; let hi = items.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (items[m].b <= v) lo = m; else hi = m - 1; }
  return items[lo];
};
const where = (v: number): string => {
  const o = itemOf(v); const it = o.it;
  if (it.kind === "strip") { const Wc = it.N + 1; const r = Math.floor((v - o.b) / Wc); const c = (v - o.b) % Wc; return `strip#${o.i}[${"LCR"[r] ?? "?"}${c}/${it.N}]`; }
  return `${it.kind}#${o.i}+${v - o.b}`;
};
const mv = (v: number): number => Math.hypot(C.pos[2 * v] - A.pos[2 * v], C.pos[2 * v + 1] - A.pos[2 * v + 1]);
const kinds = new Map<string, number>(); const rows: string[] = [];
const spills: string[] = []; let nCrack = 0; let nSpill = 0; let sameTri = 0;
for (let o = 0; o < W * H; o++) {
  const cov = top[o] >= 0;
  if (cov && gA[o] !== 0 && gC[o] === 0) {
    nCrack++;
    const t = wA.tri[o]; const I = fs.idx; const vs = [I[t], I[t + 1], I[t + 2]];
    const k = vs.map((v) => { const it = itemOf(v).it; if (it.kind !== "strip") return it.kind; const Wc = it.N + 1; const r = Math.floor((v - it.base) / Wc); const c = (v - it.base) % Wc; return `strip${"LCR"[r]}${c === 0 || c === it.N ? "end" : c === 1 || c === it.N - 1 ? "nearEnd" : "mid"}`; }).sort().join("+");
    kinds.set(k, (kinds.get(k) ?? 0) + 1);
    if (rows.length < nList) rows.push(`  (${(x0 + ((o % W) + 0.5) / ppu).toFixed(3)}, ${(y0 + (Math.floor(o / W) + 0.5) / ppu).toFixed(3)}) tri ${t / 3}: ${vs.map((v) => `${where(v)} mv ${mv(v).toFixed(4)}`).join(" | ")}`);
  }
  if (!cov && gA[o] === 0 && gC[o] !== 0) { nSpill++; if (spills.length < nList) { const t = wC.tri[o]; const I = fs.idx; const vs = [I[t], I[t + 1], I[t + 2]]; spills.push(`  spill (${(x0 + ((o % W) + 0.5) / ppu).toFixed(3)}, ${(y0 + (Math.floor(o / W) + 0.5) / ppu).toFixed(3)}) tri ${t / 3}: ${vs.map((v) => `${where(v)} mv ${mv(v).toFixed(4)}`).join(" | ")}`); } }
  if (gA[o] !== 0 && gC[o] !== 0 && wA.tri[o] === wC.tri[o]) sameTri++;
}
console.log(`${nm} ppu ${ppu} rec ${rec}: C-only crack px ${nCrack}, C-only spill px ${nSpill}`);
console.log(`by A's triangle's vertex kinds:`);
for (const [k, n] of [...kinds].sort((p, q) => q[1] - p[1]).slice(0, 14)) console.log(`  ${n}  ${k}`);
console.log(rows.join("\n")); console.log(spills.join("\n"));

// Side rows, on minus off at interior columns: tangential (along off's row) and normal parts, and the
// segment length ratio on/off, over every strip whose rows moved.
const tanA: number[] = []; const nrmA: number[] = []; const ratio: number[] = []; let nStrips = 0;
for (const it of fs.items) {
  if (it.kind !== "strip" || it.N < 3) continue;
  const Wc = it.N + 1; let moved = false;
  for (let v = it.base; v < it.base + 3 * Wc; v++) if (mv(v) > 1e-6) { moved = true; break; }
  if (!moved) continue; nStrips++;
  for (const r of [0, 2]) {
    const b0 = it.base + r * Wc;
    for (let i = 1; i < it.N; i++) {
      const v = b0 + i; const tx = A.pos[2 * (v + 1)] - A.pos[2 * (v - 1)]; const ty = A.pos[2 * (v + 1) + 1] - A.pos[2 * (v - 1) + 1];
      const L = Math.hypot(tx, ty); if (!(L > 1e-9)) continue;
      const dx = C.pos[2 * v] - A.pos[2 * v]; const dy = C.pos[2 * v + 1] - A.pos[2 * v + 1];
      tanA.push(Math.abs((dx * tx + dy * ty) / L)); nrmA.push(Math.abs((dx * -ty + dy * tx) / L));
      const la = Math.hypot(A.pos[2 * (v + 1)] - A.pos[2 * v], A.pos[2 * (v + 1) + 1] - A.pos[2 * v + 1]);
      const lc = Math.hypot(C.pos[2 * (v + 1)] - C.pos[2 * v], C.pos[2 * (v + 1) + 1] - C.pos[2 * v + 1]);
      if (la > 1e-9) ratio.push(lc / la);
    }
  }
}
const pct = (a: number[], p: number): number => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? NaN; };
const ps = (a: number[]): string => [0.5, 0.9, 0.99, 0.999, 1].map((p) => pct(a, p).toFixed(4)).join(" / ");
console.log(`side rows of ${nStrips} moved strips, ${tanA.length} interior vertices, p50/p90/p99/p99.9/max:`);
console.log(`  |tangential| ${ps(tanA)}`);
console.log(`  |normal|     ${ps(nrmA)}`);
console.log(`  seg on/off   ${ps(ratio)}  (min ${pct(ratio, 0).toFixed(4)}, p1 ${pct(ratio, 0.01).toFixed(4)})`);
// env DBG=<item>: that strip's rows, off vs on, every 8th column.
if (process.env.DBG) {
  const it = fs.items[Number(process.env.DBG)];
  if (it.kind === "strip") {
    const Wc = it.N + 1; console.log(`strip ${process.env.DBG}: chain ${it.pi} N ${it.N} closed ${zz.zc[it.pi].closed} n ${zz.zc[it.pi].n} len ${zz.zc[it.pi].len.toFixed(3)} h ${scene.look.halfWidth}`);
    for (let i = 0; i <= it.N; i += Math.max(1, Math.floor(it.N / 24))) {
      const f = (P: Float64Array, v: number): string => `${P[2 * v].toFixed(3)},${P[2 * v + 1].toFixed(3)}`;
      console.log(`  ${i}: L ${f(A.pos, it.base + i)} -> ${f(C.pos, it.base + i)} | R ${f(A.pos, it.base + 2 * Wc + i)} -> ${f(C.pos, it.base + 2 * Wc + i)} | s ${C.s[it.base + Wc + i]?.toFixed(3)}`);
    }
  }
}
console.log(`POLY calls ${POLY.calls} folds ${POLY.folds}`);
