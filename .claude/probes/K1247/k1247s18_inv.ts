// K1247 s18 inventory: over a captured drag (k1247s18_capture.mjs), which output vertices are FIXED
// RECORDS: a point (chain c, arc s, along a, across b) in the chain's smooth local frame, made once at
// frame 0, then placed from a later frame's chain samples, within TOL px of what the pipeline emits at
// every frame. Two record kinds:
//   V1 "fixed": s fixed at frame 0 (the vertex's own s, as the pipeline emitted it at frame 0);
//   V2 "ends":  s re-read per frame from the pipeline's own s for the vertex (fill: the strip row s,
//               s0 + ds i / N, so only the piece ends move; band: attr.x) - the moving ends solved,
//               the rest placed.
// Parts: fill (fillFrame pos), band (bandGpu pos, chain + own s per vertex), borders (frame()'s piece
// pts, chain = piece chain, s = the border point's foot by a local search).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s18_inv.ts <dragDir> [tolPx=0.25] [maxFrames]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure, type FillItem } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";
import { bandGpu } from "../../../src/render/outline/band_gpu";
import { chainFrameAt, frameAtIdx, locate, type CF } from "./k1247s18_rec";

const dir = process.argv[2]; const TOL = Number(process.argv[3] ?? 0.25); const MAXF = Number(process.argv[4] ?? 1e9);
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort().slice(0, MAXF);
const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; return s; });
const sc0 = scenes[0];
const px = sc0.camera.pxPerUnit * (sc0.camera.dpr || 1);
console.log(`${dir}: ${scenes.length} frames, pxPerUnit ${sc0.camera.pxPerUnit.toFixed(3)} dpr ${sc0.camera.dpr} -> ${px.toFixed(2)} device px/unit, tol ${TOL} px`);

const st = structure(sc0);
const t0 = frame(st, sc0);
const fs = fillStructure(st, fillResolution(st, t0));
// Per vertex kind (fill).
const kindOf = new Array<string>(fs.nV).fill("?");
for (const it of fs.items as FillItem[]) {
  if (it.kind === "strip") {
    const W = it.N + 1;
    for (let r = 0; r < 3; r++) for (let i = 0; i <= it.N; i++) kindOf[it.base + r * W + i] = (i === 0 || i === it.N) ? `strip end ${r === 1 ? "C" : "LR"}` : `strip ${r === 1 ? "C" : "LR"}${it.ghost ? " ghost" : ""}`;
  } else if (it.kind === "junc") { kindOf[it.base] = "junc hub"; for (let k = 1; k <= it.R; k++) kindOf[it.base + k] = "junc ring"; }
  else if (it.kind === "cap") { for (let k = 0; k <= 17; k++) kindOf[it.base + k] = k === 0 ? "cap hub" : "cap rim"; }
  else if (it.kind === "tail") { const M = 24; for (let k = 0; k < 2 * (M + 1); k++) kindOf[it.base + k] = k <= M ? "tail border" : "tail feet"; }
  else if (it.kind === "disk") { const n = 1 + 4 * 32; for (let k = 0; k < n; k++) kindOf[it.base + k] = k === 0 ? "disk hub" : "disk ring"; }
}

interface Rec { c: number; s: number; a: number; b: number; k: number; t: number }
const mk = (zc: CF[], c: number, s: number, x: number, y: number): Rec | null => {
  const f = zc[c]; if (!f || f.n < 2 || !(s === s)) return null;
  const [k, t] = locate(f, s); const q = frameAtIdx(f, k, t); const dx = x - q[0]; const dy = y - q[1];
  return { c, s, a: dx * q[2] + dy * q[3], b: -dx * q[3] + dy * q[2], k, t };
};
const placeM = (zc: CF[], r: Rec): [number, number] => {
  const q = frameAtIdx(zc[r.c], r.k, r.t); return [q[0] + r.a * q[2] - r.b * q[3], q[1] + r.a * q[3] + r.b * q[2]];
};
const place = (zc: CF[], r: Rec, s: number): [number, number] => {
  const q = chainFrameAt(zc[r.c], s); return [q[0] + r.a * q[2] - r.b * q[3], q[1] + r.a * q[3] + r.b * q[2]];
};

// s of a point on chain c: nearest projection over all segments (frame 0 only, slow is fine).
const footOf = (c: CF, x: number, y: number): number => {
  let best = Infinity; let bs = NaN; const m = c.closed ? c.n : c.n - 1;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % c.n; const ax = c.xs[i]; const ay = c.ys[i]; const dx = c.xs[j] - ax; const dy = c.ys[j] - ay;
    const L2 = dx * dx + dy * dy; const tt = L2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
    const d = (ax + dx * tt - x) ** 2 + (ay + dy * tt - y) ** 2; if (d < best) { best = d; bs = c.s[i] + tt * Math.sqrt(L2); }
  }
  return bs;
};
// Frame 0 everything.
const fr0zz = zChains(sc0);
const fr0 = fillFrame(fs, st, t0, sc0, fr0zz);
const zc0 = fr0zz.zc as unknown as CF[];
const nV = fs.nV;
const r1: (Rec | null)[] = new Array(nV); const r2: (Rec | null)[] = new Array(nV);
for (let v = 0; v < nV; v++) {
  const x = fr0.pos[2 * v]; const y = fr0.pos[2 * v + 1];
  if (!(fr0.key[v] > -999) || !Number.isFinite(x)) { r1[v] = null; r2[v] = null; continue; }
  r1[v] = mk(zc0, fs.vChain[v], fr0.s[v], x, y); r2[v] = r1[v];
}
const band0 = bandGpu(t0, sc0, fr0zz);
const nB = band0.count; const bAttrW = band0.attr.length / nB;
const b1: (Rec | null)[] = new Array(nB);
for (let v = 0; v < nB; v++) b1[v] = band0.chain[v] >= 0 ? mk(zc0, band0.chain[v], band0.attr[bAttrW * v], band0.pos[2 * v], band0.pos[2 * v + 1]) : null;
// Borders: per piece point, record from the piece's s range (linear by index as a guess) - use the
// piece's cpts foot: s at a point = the s of its foot (cpts) found by a local search near s0..s1.
const nP = t0.pieces.length;
const pr: (Rec | null)[][] = t0.pieces.map((p) => {
  const out: (Rec | null)[] = []; const n = p.pts.length / 2;
  for (let k = 0; k < n; k++) {
    const sG = p.chain >= 0 && p.chain < zc0.length && p.cpts.length >= 2 * n ? footOf(zc0[p.chain], p.cpts[2 * k], p.cpts[2 * k + 1]) : NaN;
    out.push(p.chain >= 0 && p.chain < zc0.length ? mk(zc0, p.chain, sG, p.pts[2 * k], p.pts[2 * k + 1]) : null);
  }
  return out;
});

const worstM = new Float64Array(nV); const acrossM = new Float64Array(nV); const across2 = new Float64Array(nV); const moved = new Float64Array(nV); const worst1 = new Float64Array(nV); const worst2 = new Float64Array(nV); const worstB = new Float64Array(nB); const worstB2 = new Float64Array(nB);
const worstP = t0.pieces.map((p) => new Float64Array(p.pts.length / 2));
let restructured = 0; let pieceMismatch = 0;
for (let k = 1; k < scenes.length; k++) {
  const sc = alignJunctionArms(st, scenes[k]);
  const tb = frame(st, sc); const zz = zChains(sc); const zc = zz.zc as unknown as CF[];
  const fr = fillFrame(fs, st, tb, sc, zz);
  for (let v = 0; v < nV; v++) {
    const R = r1[v]; if (!R) continue;
    const x = fr.pos[2 * v]; const y = fr.pos[2 * v + 1];
    const p1 = place(zc, R, R.s); const d1 = Math.hypot(p1[0] - x, p1[1] - y) * px;
    if (!(d1 <= worst1[v])) worst1[v] = d1 === d1 ? d1 : Infinity;
    const pm = placeM(zc, R); const dm = Math.hypot(pm[0] - x, pm[1] - y) * px;
    if (!(dm <= worstM[v])) worstM[v] = dm === dm ? dm : Infinity;
    { const qm = frameAtIdx(zc[R.c], R.k, R.t); const e = Math.abs(-(x - pm[0]) * qm[3] + (y - pm[1]) * qm[2]) * px; if (!(e <= acrossM[v])) acrossM[v] = e === e ? e : Infinity; }
    { const mv = Math.hypot(x - fr0.pos[2 * v], y - fr0.pos[2 * v + 1]) * px; if (mv > moved[v]) moved[v] = mv; }
    const p2 = place(zc, R, fr.s[v]); const d2 = Math.hypot(p2[0] - x, p2[1] - y) * px;
    if (!(d2 <= worst2[v])) worst2[v] = d2 === d2 ? d2 : Infinity;
    { const q2 = chainFrameAt(zc[R.c], fr.s[v]); const e = Math.abs(-(x - p2[0]) * q2[3] + (y - p2[1]) * q2[2]) * px; if (!(e <= across2[v])) across2[v] = e === e ? e : Infinity; }
  }
  const bd = bandGpu(tb, sc, zz);
  if (bd.count !== nB) restructured++;
  else for (let v = 0; v < nB; v++) {
    const R = b1[v]; if (!R) continue;
    const p1 = place(zc, R, R.s); const d1 = Math.hypot(p1[0] - bd.pos[2 * v], p1[1] - bd.pos[2 * v + 1]) * px;
    if (!(d1 <= worstB[v])) worstB[v] = d1 === d1 ? d1 : Infinity;
    const p2 = place(zc, R, bd.attr[bAttrW * v]); const d2 = Math.hypot(p2[0] - bd.pos[2 * v], p2[1] - bd.pos[2 * v + 1]) * px;
    if (!(d2 <= worstB2[v])) worstB2[v] = d2 === d2 ? d2 : Infinity;
  }
  if (tb.pieces.length !== nP) { pieceMismatch++; continue; }
  tb.pieces.forEach((p, i) => {
    const W = worstP[i]; const RR = pr[i];
    if (p.pts.length / 2 !== W.length) { for (let j = 0; j < W.length; j++) W[j] = Infinity; return; }
    for (let j = 0; j < W.length; j++) {
      const R = RR[j]; if (!R) continue;
      const q = place(zc, R, R.s); const d = Math.hypot(q[0] - p.pts[2 * j], q[1] - p.pts[2 * j + 1]) * px;
      if (!(d <= W[j])) W[j] = d === d ? d : Infinity;
    }
  });
}
// Report.
const tally = new Map<string, [number, number, number, number, number]>(); // kind -> [n, V1 ok, V2 ok, dead, Vm ok]
for (let v = 0; v < nV; v++) {
  const t = tally.get(kindOf[v]) ?? [0, 0, 0, 0, 0]; t[0]++;
  if (!r1[v]) t[3]++; else { if (worst1[v] <= TOL) t[1]++; if (worst2[v] <= TOL) t[2]++; if (worstM[v] <= TOL) t[4]++; }
  tally.set(kindOf[v], t);
}
let tot = [0, 0, 0, 0, 0];
console.log("FILL kind: n | V1 fixed s | V2 ends | dead | Vm fixed material");
for (const [k, t] of [...tally].sort()) { console.log(`  ${k}: ${t.join(" | ")}`); tot = tot.map((a, i) => a + t[i]); }
console.log(`  TOTAL: ${tot.join(" | ")}  (V2 moving ${tot[0] - tot[2] - tot[3]})`);
const q = (a: Float64Array, keep: (i: number) => boolean): string => {
  const xs: number[] = []; for (let i = 0; i < a.length; i++) if (keep(i)) xs.push(a[i]); xs.sort((p, r) => p - r);
  const at = (f: number) => (xs.length ? xs[Math.min(xs.length - 1, Math.floor(f * xs.length))] : NaN);
  return `p50 ${at(0.5).toFixed(3)} p99 ${at(0.99).toFixed(3)} max ${xs.length ? xs[xs.length - 1].toFixed(2) : "-"}`;
};
console.log(`  fill V1 dev px: ${q(worst1, (i) => !!r1[i])}; Vm: ${q(worstM, (i) => !!r1[i])}; V2: ${q(worst2, (i) => !!r2[i])}`);
let bOk1 = 0; let bOk2 = 0; let bN = 0;
for (let v = 0; v < nB; v++) { if (!b1[v]) continue; bN++; if (worstB[v] <= TOL) bOk1++; if (worstB2[v] <= TOL) bOk2++; }
console.log(`BAND: ${nB} verts, ${bN} with a chain; V1 fixed ${bOk1}, V2 ends ${bOk2}; restructured frames ${restructured}; V1 ${q(worstB, (i) => !!b1[i])}`);
const pk = new Map<string, [number, number]>();
t0.pieces.forEach((p, i) => { const t = pk.get(p.kind) ?? [0, 0]; for (let j = 0; j < worstP[i].length; j++) { t[0]++; if (pr[i][j] && worstP[i][j] <= TOL) t[1]++; } pk.set(p.kind, t); });
console.log(`BORDERS (frame() piece points) kind: n | V1 fixed; piece-count mismatch frames ${pieceMismatch}`);
for (const [k, t] of pk) console.log(`  ${k}: ${t.join(" | ")}`);
console.log(`zChains: ${fr0zz.passes.reduce((a, p) => a + p.length, 0)} passes (moving s each), ${zc0.reduce((a, c) => a + c.n, 0)} samples; strips ${fs.items.filter((i) => i.kind === "strip").length}, pieces ${nP}, crossings ${sc0.crossings.length}, junctions ${sc0.junctions.length}`);
const hist = (name: string, a: Float64Array): void => {
  const th = [0.25, 0.5, 1, 2, 4, 8]; const cnt = th.map(() => 0); let n = 0;
  for (let v = 0; v < nV; v++) { if (!r1[v]) continue; n++; th.forEach((h, i) => { if (a[v] <= h) cnt[i]++; }); }
  console.log(`  ${name}: ` + th.map((h, i) => `<=${h}: ${((100 * cnt[i]) / n).toFixed(1)}%`).join("  "));
};
console.log("FILL worst-over-drag distribution (alive vertices):");
hist("moved |p_k - p_0|", moved); hist("Vm dist", worstM); hist("Vm across", acrossM); hist("V2 dist", worst2); hist("V2 across", across2);
let mvN = 0; let mvOk = 0; let mvOkA = 0; for (let v = 0; v < nV; v++) { if (!r1[v] || moved[v] <= 1) continue; mvN++; if (worstM[v] <= TOL) mvOk++; if (acrossM[v] <= TOL) mvOkA++; }
console.log(`  vertices that move > 1 px: ${mvN}; of them Vm within tol ${mvOk}, Vm across within tol ${mvOkA}`);