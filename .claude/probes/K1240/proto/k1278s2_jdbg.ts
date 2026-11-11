// K1278 stage 2: k1278_jdbg.ts reading src/render/outline/.
// K1278: what paints one point. The winning triangle's item, its vertices'
// runs, weights and chains, the dominant slot, form B's chain there; for a
// junction, its arms (chain, end, strip) and owner.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1278_jdbg.ts --scene=muse_hash --x=1.858 --y=23.493
import { FormB } from "../../../../src/render/field/form_b";
import * as O from "../../../../src/render/outline/outline";
import * as F from "../../../../src/render/outline/fill_tri";
import { sectionPaint } from "../../../../src/render/outline/paint";
import { loadScene } from "./k1279_census";

const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const nm = opt("scene") ?? "muse_hash"; const X = Number(opt("x")); const Y = Number(opt("y"));
const scene = loadScene(nm);
const st = O.structure(scene); const table = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, table));
const fr = F.fillFrame(fs, st, table, scene);
const sp = sectionPaint(scene, "app"); const runs = F.fillRuns(fs, st, fr, sp);
const fb = new FormB(scene as never, { dpr: 2 });
const e = fb.evalPoint(X, Y) as { ink: number; top: number; chain: number };
const itemOf = new Int32Array(fs.nV).fill(-1);
fs.items.forEach((it, k) => { const n = it.kind === "junc" ? 1 + it.R : F.itemVerts(it); for (let q = 0; q < n; q++) itemOf[it.base + q] = k; });
const win = { tri: new Int32Array(1).fill(-1), bary: new Float32Array(3) };
const own = F.rasterFill(fs, fr, X - 0.0005, Y - 0.0005, 1, 1, 1000, win);
const t = win.tri[0];
console.log(`${nm} (${X}, ${Y}): form B chain ${e.chain} ink ${e.ink.toFixed(2)}; fill owner ${own[0] - 1}, tri ${t}`);
const chOf = (r: number): string => (r >= 0 ? `ch${sp.runs[r].pi}` : "-");
if (t >= 0) {
  const vs = [fs.idx[t], fs.idx[t + 1], fs.idx[t + 2]];
  for (const v of vs) {
    const I = fs.items[itemOf[v]];
    const rs = [0, 1, 2, 3].map((k) => `${runs[F.SLOTS * v + k]}(${chOf(runs[F.SLOTS * v + k])}) w${fr.w4[F.SLOTS * v + k].toFixed(2)}`).join(" ");
    console.log(`  v${v} item #${itemOf[v]} ${I.kind} off ${v - I.base} key ${fr.key[v].toFixed(3)} chain ${fr.vChain ? (fr as unknown as { vChain: Int32Array }).vChain[v] : "?"} | ${rs}`);
  }
  const r4 = new Int32Array(F.SLOTS); const w4 = new Float64Array(F.SLOTS); const s4 = new Float64Array(F.SLOTS);
  F.vertexPaint(fs, fr, runs, vs, [win.bary[0], win.bary[1], win.bary[2]], r4, w4, s4);
  console.log(`  pixel slots: ${[0, 1, 2, 3].map((k) => `${r4[k]}(${chOf(r4[k])}) w${w4[k].toFixed(2)}`).join(" ")}`);
  const I = fs.items[itemOf[vs[0]]];
  if (I.kind === "junc") {
    console.log(`  junction ji ${I.ji} owner ch${I.owner} R ${I.R}`);
    I.arms.forEach((a, k) => console.log(`    arm ${k}: ai ${a.ai} pi ${a.pi} atStart ${a.atStart} strip ${a.strip} corner ${a.corner} armRun ${sp.armRun ? sp.armRun[a.ai] : "?"}`));
  }
}
// The chain form B shows: its items with a vertex within 0.6 of the point.
const near = new Map<number, number>();
for (let v = 0; v < fs.nV; v++) {
  const d = Math.hypot(fr.pos[2 * v] - X, fr.pos[2 * v + 1] - Y); if (d > 0.6) continue;
  const it = itemOf[v]; const I = fs.items[it];
  const pi = I.kind === "junc" ? -1 : (I as { pi: number }).pi;
  if (pi === e.chain || (I.kind === "junc" && I.arms.some((a) => a.pi === e.chain))) near.set(it, Math.min(near.get(it) ?? 9, d));
}
for (const [it, d] of near) {
  const I = fs.items[it];
  const extra = I.kind === "strip" ? ` iv ${I.iv} ghost ${I.ghost}` : I.kind === "junc" ? ` ji ${I.ji} owner ch${I.owner} arms ${I.arms.map((a) => `ch${a.pi}${a.atStart ? "s" : "e"}`).join(",")}` : "";
  console.log(`  near item #${it} ${I.kind}${extra} at ${d.toFixed(3)}`);
}

// --map: form B's chain vs the fill's top chain and item on a 40x40 grid of
// side 2*half around the point (A = form B's chain, o = other chain, . paper
// or ink; fill: J junction, S strip, T tail, C cap, lower case = not form B's chain).
if (process.argv.includes("--map")) {
  const half = Number(opt("half") ?? 0.5); const G = 40; const N2 = G * G;
  const win2 = { tri: new Int32Array(N2).fill(-1), bary: new Float32Array(3 * N2) };
  const own2 = F.rasterFill(fs, fr, X - half, Y - half, G, G, G / (2 * half), win2);
  const rows: string[] = [];
  for (let j = 0; j < G; j++) {
    let a = ""; let b = "";
    for (let i = 0; i < G; i++) {
      const px = X - half + (i + 0.5) * (2 * half) / G; const py = Y - half + (j + 0.5) * (2 * half) / G;
      const ee = fb.evalPoint(px, py) as { ink: number; top: number; chain: number };
      a += !(ee.top > 0) || ee.ink > 0.5 ? "." : ee.chain === e.chain ? "A" : String.fromCharCode(97 + (ee.chain % 26));
      const o = j * G + i; const t2 = win2.tri[o];
      if (own2[o] === 0 || t2 < 0) { b += "."; continue; }
      const I = fs.items[itemOf[fs.idx[t2]]];
      const c = I.kind === "junc" ? "J" : I.kind === "strip" ? "S" : I.kind === "tail" ? "T" : "C";
      b += own2[o] - 1 === e.chain ? c : c.toLowerCase();
    }
    rows.push(`${a}   ${b}`);
  }
  console.log(`map half ${half}: form B (A = ch${e.chain}) | fill (upper = ch${e.chain})`);
  console.log(rows.join("\n"));
}

// --under: the same fill map without junction items (what lies under the fans),
// with the key there.
if (process.argv.includes("--under")) {
  const half = Number(opt("half") ?? 0.5); const G = 40; const N2 = G * G;
  const keep: number[] = [];
  for (let q = 0; q < fs.idx.length; q += 3) if (fs.items[itemOf[fs.idx[q]]].kind !== "junc") keep.push(fs.idx[q], fs.idx[q + 1], fs.idx[q + 2]);
  const fs2 = { ...fs, idx: Uint32Array.from(keep) };
  const win2 = { tri: new Int32Array(N2).fill(-1), bary: new Float32Array(3 * N2) };
  const own2 = F.rasterFill(fs2, fr, X - half, Y - half, G, G, G / (2 * half), win2);
  const rows: string[] = [];
  for (let j = 0; j < G; j++) {
    let b = "";
    for (let i = 0; i < G; i++) {
      const o = j * G + i; const t2 = win2.tri[o];
      if (own2[o] === 0 || t2 < 0) { b += "."; continue; }
      const I = fs.items[itemOf[fs2.idx[t2]]];
      const c = I.kind === "strip" ? "S" : I.kind === "tail" ? "T" : "C";
      b += own2[o] - 1 === e.chain ? c : c.toLowerCase();
    }
    rows.push(b);
  }
  console.log(`under (no junctions), upper = ch${e.chain}`);
  console.log(rows.join("\n"));
}

// --only: the map of form B's chain's own items (strips, tails, caps) alone,
// with each pixel's key, next to the winning key of everything else there.
if (process.argv.includes("--only")) {
  const half = Number(opt("half") ?? 0.5); const G = 40; const N2 = G * G;
  const mine: number[] = []; const rest: number[] = [];
  for (let q = 0; q < fs.idx.length; q += 3) {
    const I = fs.items[itemOf[fs.idx[q]]];
    ((I.kind !== "junc" && (I as { pi: number }).pi === e.chain) ? mine : rest).push(fs.idx[q], fs.idx[q + 1], fs.idx[q + 2]);
  }
  const ras = (ix: number[]): { own: Int32Array; k: Float32Array; t: Int32Array } => {
    const w2 = { tri: new Int32Array(N2).fill(-1), bary: new Float32Array(3 * N2) };
    const fsx = { ...fs, idx: Uint32Array.from(ix) };
    const own2 = F.rasterFill(fsx, fr, X - half, Y - half, G, G, G / (2 * half), w2);
    const k = new Float32Array(N2).fill(NaN);
    for (let o = 0; o < N2; o++) { const t2 = w2.tri[o]; if (t2 < 0 || own2[o] === 0) continue; k[o] = w2.bary[3 * o] * fr.key[fsx.idx[t2]] + w2.bary[3 * o + 1] * fr.key[fsx.idx[t2 + 1]] + w2.bary[3 * o + 2] * fr.key[fsx.idx[t2 + 2]]; }
    return { own: own2, k, t: w2.tri };
  };
  const A = ras(mine); const B = ras(rest);
  const rows: string[] = [];
  for (let j = 0; j < G; j++) {
    let a = "";
    for (let i = 0; i < G; i++) {
      const o = j * G + i;
      if (!(A.k[o] === A.k[o])) { a += "."; continue; }
      a += !(B.k[o] === B.k[o]) ? "#" : A.k[o] >= B.k[o] ? "W" : "l";
    }
    rows.push(a);
  }
  console.log(`only ch${e.chain}'s items: # alone, W wins over the rest, l loses`);
  console.log(rows.join("\n"));
  const o = 20 * G + 20;
  console.log(`centre: ch${e.chain} key ${A.k[o]}, rest key ${B.k[o]}`);
  for (const [r, c] of [[30, 27], [35, 27], [25, 27]]) { const oo = r * G + c; const tB = B.t[oo]; const I = tB >= 0 ? fs.items[itemOf[fs.idx[tB]]] : null; console.log(`  row ${r} col ${c}: ch${e.chain} key ${A.k[oo]}, rest key ${B.k[oo]} by ${I ? I.kind + " " + ((I as { pi?: number }).pi ?? "") + (I.kind === "strip" ? " iv " + I.iv + " ghost " + I.ghost : "") : "-"}`); }
}
