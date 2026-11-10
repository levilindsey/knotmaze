// K1247 s15 step 2: the bound, before building. Over a recorded motion
// (k1247s15_record.mjs: out/s15/rec_<name>/f*.json.gz), per frame: how many
// units have inputs that moved more than delta since the unit was last
// computed (a unit recomputes when they did and its reference becomes that
// frame), and the frame cost projected from def's measured phase costs
// apportioned to those units. Units:
//   block    32 points of a chain, inputs = those points +-16 (borders)
//   chain    a whole chain (borders, stations, regions, pieces as built today)
//   junction every point within 6h of its centre at frame 0, and the centre
//   crossing both chains' points within +-4h of arc of the crossing, and
//            the crossing's s on each (a shift of s moves the cut)
// Motion is measured raw, and with the frame's mean translation removed
// ("rigid": a unit reused under a global shift).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s15_bound.ts <name> [--d=0.25,0.125,0.0625] [--prof=20]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const name = args.find((a) => !a.startsWith("--")) ?? "def";
const dList = (opt("d") ?? "0.25,0.125,0.0625").split(",").map(Number);
const nProf = +(opt("prof") ?? 20);
const dir = join(here, "..", "out", "s15", `rec_${name}`);
const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")) as { frames: { k: number; phase: string; maxMove: number; simTime: number }[] };
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const loadScene = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const scenes: SceneIn[] = files.map(loadScene);
const F = scenes.length;
const s0 = scenes[0];
const h = s0.look.halfWidth; const S = s0.camera.pxPerUnit * 2;
const nCh = s0.chains.length;
// Consistency: the diagram the frames carry.
const sig = (s: SceneIn): string => [s.chains.map((c) => `${c.id}:${c.pts.length}:${c.closed ? 1 : 0}`).join(","), s.crossings.map((x) => `${x.a.chain}/${x.b.chain}/${x.over}`).join(","),
  s.junctions.map((j) => `${j.id}:${j.arms.map((a) => `${a.chain}${a.kind[0]}${a.dir}`).join("")}`).join(","), s.deadEnds.map((d) => d.chain).join(",")].join("|");
const sig0 = sig(s0);
let sigBad = 0; for (let f = 1; f < F; f++) if (sig(scenes[f]) !== sig0) { sigBad++; if (sigBad <= 3) console.log(`frame ${f}: the diagram differs from frame 0`); }
console.log(`${name}: ${F} frames, ${nCh} chains, ${s0.chains.reduce((a, c) => a + c.pts.length / 2, 0)} points, ${s0.crossings.length} crossings, ${s0.junctions.length} junctions; frames whose diagram differs from frame 0: ${sigBad}`);

// Per frame, the mean translation of all points (against frame 0).
const T: [number, number][] = scenes.map((s) => {
  let sx = 0, sy = 0, n = 0;
  for (let c = 0; c < nCh; c++) { const p = s.chains[c].pts; const q = s0.chains[c].pts; for (let i = 0; i < p.length; i += 2) { sx += p[i] - q[i]; sy += p[i + 1] - q[i + 1]; n++; } }
  return [sx / n, sy / n];
});
// Arc length at frame 0 per chain point.
const arc0: Float64Array[] = s0.chains.map((c) => { const p = c.pts; const n = p.length / 2; const a = new Float64Array(n); for (let i = 1; i < n; i++) a[i] = a[i - 1] + Math.hypot(p[2 * i] - p[2 * i - 2], p[2 * i + 1] - p[2 * i - 1]); return a; });
// Units: lists of (chain, point) inputs plus extra scalar inputs.
interface Unit { kind: "block" | "chain" | "junction" | "crossing"; pts: Int32Array; /* chain*2^20 + idx */ w: number; extra?: (f: number) => [number, number]; chs: number[]; }
const units: Unit[] = [];
const pack = (c: number, i: number): number => c * 1048576 + i;
const nPts = (c: number): number => s0.chains[c].pts.length / 2;
const chainIdx = new Map<number, number>(); s0.chains.forEach((c, i) => chainIdx.set(c.id, i));
for (let c = 0; c < nCh; c++) {
  const n = nPts(c); const closed = s0.chains[c].closed;
  for (let b = 0; b * 32 < n; b++) {
    const ids: number[] = [];
    for (let i = b * 32 - 16; i < Math.min(n, b * 32 + 32) + 16; i++) { let k = i; if (closed) k = ((i % n) + n) % n; else if (k < 0 || k >= n) continue; ids.push(pack(c, k)); }
    units.push({ kind: "block", pts: Int32Array.from(ids), w: Math.min(32, n - b * 32), chs: [c] });
  }
  units.push({ kind: "chain", pts: Int32Array.from({ length: n }, (_, i) => pack(c, i)), w: n, chs: [c] });
}
for (let ji = 0; ji < s0.junctions.length; ji++) {
  const j = s0.junctions[ji]; const R = 6 * h; const ids: number[] = [];
  for (let c = 0; c < nCh; c++) { const p = s0.chains[c].pts; for (let i = 0; i < p.length / 2; i++) if (Math.hypot(p[2 * i] - j.c[0], p[2 * i + 1] - j.c[1]) < R) ids.push(pack(c, i)); }
  units.push({ kind: "junction", pts: Int32Array.from(ids), w: 1, extra: (f) => scenes[f].junctions[ji].c as [number, number], chs: [...new Set(j.arms.map((a) => chainIdx.get(a.chain)!))] });
}
for (let xi = 0; xi < s0.crossings.length; xi++) {
  const x = s0.crossings[xi]; const ids: number[] = [];
  for (const e of [x.a, x.b]) { const c = chainIdx.get(e.chain)!; const a = arc0[c]; const L = a[a.length - 1]; const closed = s0.chains[c].closed;
    for (let i = 0; i < a.length; i++) { let d = Math.abs(a[i] - e.s); if (closed) d = Math.min(d, L - d); if (d < 4 * h) ids.push(pack(c, i)); } }
  // The cut moves along each chain with its s: count |ds| as motion.
  units.push({ kind: "crossing", pts: Int32Array.from(ids), w: 1, extra: (f) => [scenes[f].crossings[xi].a.s, scenes[f].crossings[xi].b.s], chs: [chainIdx.get(x.a.chain)!, chainIdx.get(x.b.chain)!] });
}
const kinds = ["block", "chain", "junction", "crossing"] as const;
const totalW: Record<string, number> = {}; for (const u of units) totalW[u.kind] = (totalW[u.kind] ?? 0) + u.w;
console.log(`units: ${kinds.map((k) => `${k} ${units.filter((u) => u.kind === k).length}`).join(", ")}`);

// Measured phase costs (frameFast on the recorded frames, warm).
const st = structure(s0);
for (let i = 0; i < 5; i++) frame(st, scenes[Math.min(F - 1, i * 7)]);
const prof: Record<string, number> = {}; const tot: number[] = [];
for (let i = 0; i < nProf; i++) { const t0 = performance.now(); frame(st, scenes[(i * 11) % F], prof); tot.push(performance.now() - t0); }
for (const k of Object.keys(prof)) prof[k] /= nProf;
const q = (xs: number[], p: number): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
console.log(`frame() on the recorded frames: median ${q(tot, 0.5).toFixed(2)} ms; phases ${Object.entries(prof).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(", ")}`);

const out: Record<string, unknown> = { name, frames: F, sigBad, prof, frameMedian: q(tot, 0.5) };
for (const rigid of [false, true]) for (const dPx of dList) {
  const delta = dPx / S;
  const ref = new Int32Array(units.length); // frame of the last compute
  const moved: Record<string, number[]> = {}; for (const k of kinds) moved[k] = [];
  const proj: { blk: number[]; ch: number[]; cl: number[] } = { blk: [], ch: [], cl: [] };
  for (let f = 1; f < F; f++) {
    const w: Record<string, number> = {}; for (const k of kinds) w[k] = 0;
    const clo = new Set<number>(); // chains whose outputs recompute: own points, or a corner or cut on them
    for (let u = 0; u < units.length; u++) {
      const U = units[u]; const r = ref[u]; const A = scenes[f].chains; const B = scenes[r].chains;
      const tx = rigid ? T[f][0] - T[r][0] : 0; const ty = rigid ? T[f][1] - T[r][1] : 0;
      let d = 0;
      for (const c of U.chs) if (A[c].pts.length !== B[c].pts.length) d = Infinity; // resampled: recompute
      for (let k = 0; k < U.pts.length && d <= delta; k++) {
        const c = Math.floor(U.pts[k] / 1048576); const i = U.pts[k] - c * 1048576;
        const pa = A[c].pts; const pb = B[c].pts;
        d = Math.max(d, Math.hypot(pa[2 * i] - pb[2 * i] - tx, pa[2 * i + 1] - pb[2 * i + 1] - ty));
      }
      if (U.extra && d <= delta) {
        const ea = U.extra(f); const eb = U.extra(r);
        d = U.kind === "junction" ? Math.max(d, Math.hypot(ea[0] - eb[0] - tx, ea[1] - eb[1] - ty)) : Math.max(d, Math.abs(ea[0] - eb[0]), Math.abs(ea[1] - eb[1]));
      }
      if (d > delta) { w[U.kind] += U.w; ref[u] = f; if (U.kind !== "block") for (const c of U.chs) clo.add(c); }
    }
    for (const k of kinds) moved[k].push(w[k] / totalW[k]);
    const fb = w.block / totalW.block; const fc = w.chain / totalW.chain; const fj = totalW.junction ? w.junction / totalW.junction : 0; const fx = totalW.crossing ? w.crossing / totalW.crossing : 0;
    const cut = prof.cutsEyesExposure ?? 0;
    proj.blk.push((prof.setupBorders ?? 0) * fb + (prof.corners ?? 0) * fj + cut * Math.max(fx, fb) + ((prof.regions ?? 0) + (prof.piecesCapsEtc ?? 0)) * fb);
    let wc = 0; for (const c of clo) wc += nPts(c); const fcl = wc / totalW.chain;
    proj.cl.push((prof.setupBorders ?? 0) * fcl + (prof.corners ?? 0) * fj + cut * Math.max(fx, fcl) + ((prof.regions ?? 0) + (prof.piecesCapsEtc ?? 0)) * fcl);
    moved.closure = moved.closure ?? []; moved.closure.push(fcl);
    proj.ch.push((prof.setupBorders ?? 0) * fc + (prof.corners ?? 0) * fj + cut * Math.max(fx, fc) + ((prof.regions ?? 0) + (prof.piecesCapsEtc ?? 0)) * fc);
  }
  const label = `${rigid ? "rigid" : "raw"} d=${dPx}px`;
  const phases = [...new Set(meta.frames.slice(1).map((m) => m.phase))];
  console.log(`\n${label} (delta ${delta.toExponential(2)} world): moved fraction median / p95 / max per unit kind`);
  for (const k of kinds) console.log(`  ${k.padEnd(9)} ${q(moved[k], 0.5).toFixed(3)} / ${q(moved[k], 0.95).toFixed(3)} / ${Math.max(...moved[k]).toFixed(3)}`);
  for (const ph of phases) {
    const idx = meta.frames.slice(1).map((m, i) => (m.phase === ph ? i : -1)).filter((i) => i >= 0 && i < F - 1);
    console.log(`  ${ph.padEnd(8)} ${String(idx.length).padStart(4)} frames: block ${q(idx.map((i) => moved.block[i]), 0.5).toFixed(3)}, chain ${q(idx.map((i) => moved.chain[i]), 0.5).toFixed(3)}, junction ${q(idx.map((i) => moved.junction[i]), 0.5).toFixed(3)}, crossing ${q(idx.map((i) => moved.crossing[i]), 0.5).toFixed(3)} (medians); closure ${q(idx.map((i) => moved.closure[i]), 0.5).toFixed(3)}; projected ms block-grained ${q(idx.map((i) => proj.blk[i]), 0.5).toFixed(2)}, chain-grained ${q(idx.map((i) => proj.ch[i]), 0.5).toFixed(2)}, chain closure ${q(idx.map((i) => proj.cl[i]), 0.5).toFixed(2)}`);
  }
  console.log(`  projected ms (no glue): block-grained median ${q(proj.blk, 0.5).toFixed(2)} p95 ${q(proj.blk, 0.95).toFixed(2)}; chain-grained median ${q(proj.ch, 0.5).toFixed(2)} p95 ${q(proj.ch, 0.95).toFixed(2)}; chain closure median ${q(proj.cl, 0.5).toFixed(2)} p95 ${q(proj.cl, 0.95).toFixed(2)} max ${Math.max(...proj.cl).toFixed(2)}`);
  const full = Object.values(prof).reduce((a, b) => a + b, 0);
  console.log(`  as a share of the full frame: block p95 ${(q(proj.blk, 0.95) / full).toFixed(3)}, chain p95 ${(q(proj.ch, 0.95) / full).toFixed(3)}, closure p95 ${(q(proj.cl, 0.95) / full).toFixed(3)}; frames over 6 ms at a 20 ms full frame: closure ${proj.cl.filter((v) => (v / full) * 20 > 6).length}, block ${proj.blk.filter((v) => (v / full) * 20 > 6).length}`);
  out[label] = { delta, moved, proj };
}
// Raw motion per frame (frame to frame), for the record.
const step: number[] = []; const tr: number[] = [];
for (let f = 1; f < F; f++) {
  let m = 0; for (let c = 0; c < nCh; c++) { const p = scenes[f].chains[c].pts; const o = scenes[f - 1].chains[c].pts; if (p.length !== o.length) continue; for (let i = 0; i < p.length; i += 2) m = Math.max(m, Math.hypot(p[i] - o[i], p[i + 1] - o[i + 1])); }
  step.push(m * S); tr.push(Math.hypot(T[f][0] - T[f - 1][0], T[f][1] - T[f - 1][1]) * S);
}
console.log(`\nframe-to-frame max point motion (device px): median ${q(step, 0.5).toFixed(3)} p95 ${q(step, 0.95).toFixed(3)} max ${Math.max(...step).toFixed(2)}; mean translation per frame median ${q(tr, 0.5).toFixed(4)} max ${Math.max(...tr).toFixed(4)} px`);
out.stepPx = step; out.transPx = tr;
writeFileSync(join(dir, "..", `bound_${name}.json`), JSON.stringify(out));
