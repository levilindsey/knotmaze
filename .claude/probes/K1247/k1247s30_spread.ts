// K1247 s30 (4): the output spread of a 60 Hz frame mid-drag. Replays a captured drag interpolated to sub=N frames
// per captured pair (as k1247s30_inc.ts), runs frame() with the snap on (KF_INC.snap, T device px; the border cache
// on, which is exact), and counts per consecutive frame pair the share of each output that changed BIT FOR BIT
// (JSON): pieces (by count, and by points), regions, faces, corners, cuts; next to the share of chains (and of
// points) the snap released. An incremental frame must at least redo what changed: spread = output share / input
// share. Counting only (no timing):
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s30_spread.ts <dragDir> [sub=10] [T=0.5] [span=K: own snap per K points, 0 = chain]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { frame, alignJunctionArms, KF_INC, newSnapState, snapScene } from "../../../src/render/outline/outline";
import type { SceneIn, DiagramStructure } from "../../../src/render/outline/outline";

const dir = process.argv[2];
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const sub = +arg("sub", "10"); const T = +arg("T", "0.5");
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const cap = files.map((f) => {
  const S = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  const look = S.look as SceneIn["look"] & Record<string, number>;
  look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  return S;
});
const lerp = (a: SceneIn, b: SceneIn, t: number): SceneIn => {
  const s = structuredClone(b);
  s.chains.forEach((c, i) => { const p = a.chains[i].pts; if (p.length === c.pts.length) for (let k = 0; k < p.length; k++) c.pts[k] = p[k] + (c.pts[k] - p[k]) * t; });
  s.crossings.forEach((x, i) => { const y = a.crossings[i]; if (y) { x.a.s = y.a.s + (x.a.s - y.a.s) * t; x.b.s = y.b.s + (x.b.s - y.b.s) * t; } });
  s.junctions.forEach((j, i) => { const k = a.junctions[i]; if (k) { j.c = [k.c[0] + (j.c[0] - k.c[0]) * t, k.c[1] + (j.c[1] - k.c[1]) * t]; j.arms.forEach((r, q) => { if (k.arms[q]) r.s = k.arms[q].s + (r.s - k.arms[q].s) * t; }); } });
  return s;
};
const raw: SceneIn[] = [cap[0]];
for (let i = 1; i < cap.length; i++) { for (let k = 1; k < sub; k++) raw.push(lerp(cap[i - 1], cap[i], k / sub)); raw.push(cap[i]); }

const st = (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st;
type Tab = ReturnType<typeof frame>;
const J = (x: unknown): string => JSON.stringify(x, (_k, v) => (ArrayBuffer.isView(v) ? Array.from(v as unknown as number[]) : v));
const keyed = <T>(a: T[], key: (x: T, k: number) => string): Map<string, string> => { const m = new Map<string, string>(); a.forEach((x, k) => m.set(key(x, k), J(x))); return m; };
// Share of b's entries that are new or differ from a's under the same key.
const changed = (a: Map<string, string>, b: Map<string, string>): number => { let n = 0; for (const [k, v] of b) if (a.get(k) !== v) n++; return b.size ? n / b.size : 0; };
type Pc = { kind: string; chain: number; side: number; corner: number; pts?: ArrayLike<number> };
const pieceKey = (p: Pc, k: number): string => `${p.kind}:${p.chain}:${p.side}:${p.corner}:${k}`;
const sets = (t: Tab): Record<string, Map<string, string>> => ({
  pieces: keyed(t.pieces as unknown as Pc[], (p) => `${p.kind}:${p.chain}:${p.side}:${p.corner}`),
  regions: keyed(t.regions, (_g, k) => String(k)),
  faces: keyed(t.faces, (_g, k) => String(k)),
  corners: keyed(t.corners, (_c, k) => String(k)),
  cuts: keyed(t.cuts, (_c, k) => String(k)),
});
void pieceKey;
const nPts = (t: Tab): Map<string, number> => { const m = new Map<string, number>(); for (const p of t.pieces as unknown as Pc[]) m.set(`${p.kind}:${p.chain}:${p.side}:${p.corner}`, (p.pts?.length ?? 0) >> 1); return m; };
KF_INC.T = T;
const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr;
const R: Record<string, number[]> = {};
const push = (k: string, v: number): void => { (R[k] ??= []).push(v); };
let prev: { s: Record<string, Map<string, string>>; chains: unknown[] } | null = null;
// A mirror of frame()'s own snap (same algorithm, same inputs): which chains it released this frame.
const myS = newSnapState();
let prevPts: (number[] | ArrayLike<number>)[] = [];
let prevPieces = new Map<string, Pc>();
const mv: Record<string, number[]> = { heldMaxPx: [], relMaxPx: [] };
let heldCh = 0; let relCh = 0; let heldResampled = 0;
// New piece points by device px to the nearest released span point (<10, <40, <160, beyond): in-between frames,
// and the captured frames (i % sub 0), where the camera and dead ends may change too.
const newNear = [0, 0, 0, 0]; const newNearCap = [0, 0, 0, 0];
let newOnRelChain = 0; let newOnHeldChain = 0; // new piece points on chains with a released span / with none
let newHeldCrossRel = 0; let newHeldJuncRel = 0; let newHeldEither = 0; // of newOnHeldChain: crosses / shares a junction with / either, a released chain
let newSide = 0; let newSideHeld = 0; // ... and absent from EVERY previous piece of the same chain side (key-proof)
// span=K (K >= 0): this tool's own snap instead of frame()'s, per span of K points (0 = the whole chain): a span is
// re-committed when any of its points drifts past T; a crossing end or junction arm is held while the span under it
// is held and its s moved at most T; a junction centre while it moved at most T (no END-arm foot hold). frame()
// then runs with KF_INC.snap off on that scene. span=0 is the control for the method; compare span=32 against it.
const SPAN = +arg("span", "-1"); const HOLDX = arg("holdx", "0") === "1";
// holdc=<chain id> (attribution only): that chain never releases a span (its points stay committed throughout).
const HOLDC = arg("holdc", "");
const ts = T / px;
const SS = { C: [] as number[][], rel: [] as boolean[][], cross: [] as SceneIn["crossings"], junc: [] as SceneIn["junctions"] };
const spanOf = (C: number[], K: number, s: number): number => {
  if (!K) return 0;
  let acc = 0; const n = C.length >> 1;
  for (let k = 0; k + 1 < n; k++) { const l = Math.hypot(C[2 * k + 2] - C[2 * k], C[2 * k + 3] - C[2 * k + 1]); if (acc + l >= s) return Math.floor(k / K); acc += l; }
  return Math.floor((n - 1) / K);
};
function spanSnap(al: SceneIn, K: number): { sc: SceneIn; ptsRel: number; chainRel: boolean[] } {
  const idx = new Map<number, number>(); let nP = 0; let nR = 0; const chainRel: boolean[] = [];
  const chains = al.chains.map((c, i) => {
    idx.set(c.id, i);
    const p = c.pts as number[]; const n = p.length >> 1; nP += n; const span = K || n; const ns = Math.ceil(n / span);
    let C = SS.C[i]; const rel: boolean[] = new Array(ns).fill(false);
    if (!C || C.length !== p.length) { C = SS.C[i] = Array.from(p); rel.fill(true); nR += n; }
    else if (String(c.id) !== HOLDC) for (let q = 0; q < ns; q++) {
      const s0 = q * span; const s1 = Math.min(n, s0 + span); let m = false;
      for (let k = s0; k < s1 && !m; k++) m = Math.hypot(p[2 * k] - C[2 * k], p[2 * k + 1] - C[2 * k + 1]) * px > T;
      if (m) { rel[q] = true; nR += s1 - s0; for (let k = 2 * s0; k < 2 * s1; k++) C[k] = p[k]; }
    }
    SS.rel[i] = rel; chainRel[i] = rel.some(Boolean);
    return { ...c, pts: C.slice() };
  });
  // holdx=1 (attribution only, not an identity): every crossing end and junction arm keeps its first value.
  const keep = (chain: number, s0: number, s1: number): boolean => { if (HOLDX) return true; const i = idx.get(chain); if (i === undefined || Math.abs(s1 - s0) > ts) return false; return !SS.rel[i][spanOf(SS.C[i], K, s0)]; };
  const crossings = al.crossings.map((x, xi) => {
    const o = SS.cross[xi];
    if (o && o.a.chain === x.a.chain && o.b.chain === x.b.chain && o.over === x.over) {
      const y = { ...x, a: { ...x.a, s: keep(x.a.chain, o.a.s, x.a.s) ? o.a.s : x.a.s }, b: { ...x.b, s: keep(x.b.chain, o.b.s, x.b.s) ? o.b.s : x.b.s } };
      SS.cross[xi] = y; return y;
    }
    const y = { ...x, a: { ...x.a }, b: { ...x.b } }; SS.cross[xi] = y; return y;
  });
  const junctions = al.junctions.map((j, ji) => {
    const o = SS.junc[ji]; const y = structuredClone(j);
    if (o && o.id === j.id && o.arms.length === j.arms.length) {
      if (HOLDX || Math.hypot(j.c[0] - o.c[0], j.c[1] - o.c[1]) <= ts) y.c = [o.c[0], o.c[1]];
      y.arms.forEach((a, k) => { if (o.arms[k].chain === a.chain && keep(a.chain, o.arms[k].s, a.s)) a.s = o.arms[k].s; });
    }
    SS.junc[ji] = y; return y;
  });
  return { sc: { ...al, chains, crossings, junctions }, ptsRel: nR / nP, chainRel };
}
for (let i = 0; i < raw.length; i++) {
  const al = alignJunctionArms(st, raw[i]);
  let t: Tab; let released: boolean[]; let sn: SceneIn; let relPts: number[] = [];
  if (SPAN >= 0) {
    const r = spanSnap(al, SPAN); sn = r.sc; released = r.chainRel; if (i > 0) push("ptsReleased", r.ptsRel);
    // The released spans' points (world), for the distance of each new piece point to the nearest of them.
    relPts = [];
    sn.chains.forEach((c, ci) => { const p = c.pts as number[]; const n = p.length >> 1; const span = SPAN || n; SS.rel[ci].forEach((on, q) => { if (on) for (let k = q * span; k < Math.min(n, q * span + span); k++) relPts.push(p[2 * k], p[2 * k + 1]); }); });
    t = frame(st, sn);
  } else {
    sn = snapScene(myS, al, T);
    released = sn.chains.map((c, k) => c.pts !== prevPts[k]);
    prevPts = sn.chains.map((c) => c.pts);
    KF_INC.snap = true; KF_INC.cache = true;
    t = frame(st, al);
    KF_INC.snap = false; KF_INC.cache = false;
  }
  const s = sets(t);
  const pcs = new Map<string, Pc>(); for (const p of t.pieces as unknown as Pc[]) pcs.set(`${p.kind}:${p.chain}:${p.side}:${p.corner}`, p);
  if (prev) {
    let pwCh = 0; let newCh = 0; let pwTot = 0; for (const p of pcs.values()) pwTot += (p.pts?.length ?? 0) >> 1;
    const rel = new Set(sn.chains.flatMap((c, k) => (released[k] ? [c.id] : [])));
    const sideSets = new Map<string, Set<string>>();
    for (const a of prevPieces.values()) { if (!a.pts) continue; const key = `${a.chain}:${a.side}`; let ss = sideSets.get(key); if (!ss) sideSets.set(key, (ss = new Set())); for (let q2 = 0; q2 + 1 < a.pts.length; q2 += 2) ss.add(`${a.pts[q2]},${a.pts[q2 + 1]}`); }
    push("chainsReleased", rel.size / sn.chains.length);
    // Chains that cross a released chain (the partner arc-length path: armLcut's reachOf samples the partner by s).
    const crossRel = new Set<number>();
    for (const x of sn.crossings) { if (rel.has(x.a.chain)) crossRel.add(x.b.chain); if (rel.has(x.b.chain)) crossRel.add(x.a.chain); }
    // Chains sharing a junction with a released chain (a junction's corners read every arm's chain).
    const juncRel = new Set<number>();
    for (const j of sn.junctions) if (j.arms.some((r) => rel.has(r.chain))) for (const r of j.arms) juncRel.add(r.chain);
    for (const [k, v] of s.pieces) {
      if (prev.s.pieces.get(k) === v) continue;
      const a = prevPieces.get(k); const b = pcs.get(k)!;
      const isRel = rel.has(b.chain);
      if (isRel) relCh++; else heldCh++;
      let m = Infinity;
      if (a?.pts && b.pts && a.pts.length === b.pts.length) { m = 0; for (let q2 = 0; q2 < b.pts.length; q2++) m = Math.max(m, Math.abs(b.pts[q2] - a.pts[q2])); m *= px; for (let q2 = 0; q2 + 1 < b.pts.length; q2 += 2) if (b.pts[q2] !== a.pts[q2] || b.pts[q2 + 1] !== a.pts[q2 + 1]) pwCh++; }
      else { pwCh += (b.pts?.length ?? 0) >> 1; if (!isRel) heldResampled++; }
      // Set membership: points whose exact (x, y) the piece's previous version lacks (an index shift costs nothing).
      const had = new Set<string>(); if (a?.pts) for (let q2 = 0; q2 + 1 < a.pts.length; q2 += 2) had.add(`${a.pts[q2]},${a.pts[q2 + 1]}`);
      if (b.pts) for (let q2 = 0; q2 + 1 < b.pts.length; q2 += 2) if (!had.has(`${b.pts[q2]},${b.pts[q2 + 1]}`)) {
        newCh++; if (isRel) newOnRelChain++; else { newOnHeldChain++; if (crossRel.has(b.chain)) newHeldCrossRel++; if (juncRel.has(b.chain)) newHeldJuncRel++; if (crossRel.has(b.chain) || juncRel.has(b.chain)) newHeldEither++; }
        if (!sideSets.get(`${b.chain}:${b.side}`)?.has(`${b.pts[q2]},${b.pts[q2 + 1]}`)) { newSide++; if (!isRel) newSideHeld++; }
        if (SPAN >= 0) {
          let d2 = Infinity; const x = b.pts[q2]; const y = b.pts[q2 + 1];
          for (let r2 = 0; r2 < relPts.length; r2 += 2) { const dx = relPts[r2] - x; const dy = relPts[r2 + 1] - y; const e = dx * dx + dy * dy; if (e < d2) d2 = e; }
          const dpx = Math.sqrt(d2) * px; (i % sub === 0 ? newNearCap : newNear)[dpx < 10 ? 0 : dpx < 40 ? 1 : dpx < 160 ? 2 : 3]++;
        }
      }
      (isRel ? mv.relMaxPx : mv.heldMaxPx).push(m);
    }
    // trace=<frame>: units, then the changed held-chain piece farthest from any released point, point by point.
    if (+arg("trace", "-1") === i && SPAN >= 0) {
      const c0 = sn.chains[0].pts as number[]; const p0 = [...pcs.values()][0];
      console.log(`TRACE units: chain0 pt0 ${c0[0].toFixed(3)},${c0[1].toFixed(3)}; piece0 pt0 ${p0.pts?.[0]?.toFixed(3)},${p0.pts?.[1]?.toFixed(3)}; px ${px}`);
      const bb = (arrs: (ArrayLike<number> | undefined)[]): string => { let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity; for (const a of arrs) if (a) for (let q2 = 0; q2 + 1 < a.length; q2 += 2) { x0 = Math.min(x0, a[q2]); x1 = Math.max(x1, a[q2]); y0 = Math.min(y0, a[q2 + 1]); y1 = Math.max(y1, a[q2 + 1]); } return `x ${x0.toFixed(2)}..${x1.toFixed(2)} y ${y0.toFixed(2)}..${y1.toFixed(2)}`; };
      console.log(`TRACE bbox chains ${bb(sn.chains.map((c) => c.pts as number[]))}; pieces.pts ${bb([...pcs.values()].map((p) => p.pts))}; camera ${JSON.stringify(sn.camera)}`);
      const dRel = (x: number, y: number): number => { let d2 = Infinity; for (let r2 = 0; r2 < relPts.length; r2 += 2) { const dx = relPts[r2] - x; const dy = relPts[r2 + 1] - y; d2 = Math.min(d2, dx * dx + dy * dy); } return Math.sqrt(d2) * px; };
      let best: [string, number] | null = null;
      for (const [k, v] of s.pieces) {
        if (prev.s.pieces.get(k) === v) continue; const b = pcs.get(k)!; if (rel.has(b.chain) || !b.pts?.length) continue;
        let dmin = Infinity; for (let q2 = 0; q2 + 1 < b.pts.length; q2 += 2) dmin = Math.min(dmin, dRel(b.pts[q2], b.pts[q2 + 1]));
        if (!best || dmin > best[1]) best = [k, dmin];
      }
      if (best) {
        const a = prevPieces.get(best[0])!; const b = pcs.get(best[0])!;
        const n = Math.min(a.pts!.length, b.pts!.length) >> 1; const dif: string[] = [];
        for (let q2 = 0; q2 < n; q2++) { const d = Math.hypot(b.pts![2 * q2] - a.pts![2 * q2], b.pts![2 * q2 + 1] - a.pts![2 * q2 + 1]) * px; if (d > 0) dif.push(`${q2}:${d.toExponential(1)}`); }
        console.log(`TRACE frame ${i}: piece ${best[0]} min ${best[1].toFixed(0)} px from any released point; pts ${a.pts!.length >> 1} -> ${b.pts!.length >> 1}; differing ${dif.length}: ${dif.slice(0, 12).join(" ")}${dif.length > 12 ? " ... " + dif.slice(-4).join(" ") : ""}`);
        console.log(`TRACE piece fields: ${Object.keys(b).join(",")}`);
        const SA = st as unknown as { corners: Record<string, unknown>[]; arms?: Record<string, unknown>[]; armsOfJ?: number[][] };
        const dc = SA.corners[b.corner as number];
        if (dc) {
          const armChain = (ai: number): unknown => SA.arms?.[ai]?.chain ?? SA.arms?.[ai]?.pi ?? "?";
          const relChains = new Set(sn.chains.flatMap((c, k) => (SS.rel[k].some(Boolean) ? [c.id] : [])));
          console.log(`TRACE corner ${b.corner}: ${JSON.stringify(dc).slice(0, 200)}; arms keys ${SA.arms ? Object.keys(SA.arms[0] ?? {}).join(",") : "none"}; aArm chain ${armChain(dc.aArm as number)} bArm chain ${armChain(dc.bArm as number)}; released chains ${[...relChains].slice(0, 30).join(",")}`);
          const ji = dc.ji as number; const J = sn.junctions[ji];
          if (J) console.log(`TRACE junction ${ji}: arms on chains ${J.arms.map((a) => `${a.chain}${relChains.has(a.chain) ? "(released)" : ""}@s${(+a.s).toFixed(3)}`).join(" ")}`);
        }
      }
      if (arg("traceexit", "0") === "1") process.exit(0);
    }
    push("piecePtsPointwise", pwTot ? pwCh / pwTot : 0);
    push("piecePtsNew", pwTot ? newCh / pwTot : 0);
  }
  prevPieces = pcs;
  // The snapped scene's chains are what frame() saw; held chains keep the committed arrays (identity), so compare by
  // value via the table's own pieces only. Released chains: those whose pieces' pts changed anywhere.
  // Purity: the same scene again (every input now held) must give the same table, or frame() carries history.
  if (i % 20 === 5) {
    if (SPAN < 0) { KF_INC.snap = true; KF_INC.cache = true; }
    const t2 = SPAN >= 0 ? frame(st, sn) : frame(st, alignJunctionArms(st, raw[i]));
    KF_INC.snap = false; KF_INC.cache = false;
    const s2 = sets(t2);
    for (const k of Object.keys(s)) push(`again:${k}`, changed(s[k], s2[k]));
  }
  if (i > 0) {
    push("in:camera", J(raw[i].camera) !== J(raw[i - 1].camera) ? 1 : 0);
    push("in:deadEnds", J(raw[i].deadEnds) !== J(raw[i - 1].deadEnds) ? 1 : 0);
  }
  if (prev) {
    for (const k of Object.keys(s)) push(k, changed(prev.s[k], s[k]));
    const np = nPts(t); let tot = 0; let ch = 0; const chainsCh = new Set<number>();
    for (const [k, v] of s.pieces) { const n = np.get(k) ?? 0; tot += n; if (prev.s.pieces.get(k) !== v) { ch += n; chainsCh.add(+k.split(":")[1]); } }
    push("piecePts", tot ? ch / tot : 0);
    push("chainsWithChangedPieces", chainsCh.size / raw[i].chains.length);
  }
  prev = { s, chains: [] };
}
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
console.log(`${dir.split(/[\\/]/).filter(Boolean).pop()}: ${raw.length} frames (sub ${sub}), T ${T} px, ${SPAN < 0 ? "frame()'s snap" : `own snap, span ${SPAN || "chain"}`}, chains ${cap[0].chains.length}; outputs changed bit-exact per frame, p50 / p95 / mean:`);
for (const k of Object.keys(R)) console.log(`  ${k.padEnd(24)} ${pct(q(R[k], 0.5))} / ${pct(q(R[k], 0.95))} / ${pct(R[k].reduce((s, x) => s + x, 0) / R[k].length)}`);
const qs = (a: number[]): string => (a.length ? [0.5, 0.9, 0.99].map((p) => (q(a, p) === Infinity ? "inf" : q(a, p).toExponential(1))).join(" / ") : "-");
console.log(`changed pieces on RELEASED chains ${relCh}, on HELD chains ${heldCh} (resampled ${heldResampled}); max |d| px p50/p90/p99: released ${qs(mv.relMaxPx)}; held ${qs(mv.heldMaxPx)}`);const over = (a: number[], t: number): string => `${(100 * a.filter((x) => x > t).length / Math.max(1, a.length)).toFixed(0)}%`;
console.log(`held-chain changes above 0.01 / 0.05 / 0.1 / 0.5 px: ${[0.01, 0.05, 0.1, 0.5].map((t) => over(mv.heldMaxPx, t)).join(" / ")} (of ${mv.heldMaxPx.length}); per frame: released ${(relCh / (raw.length - 1)).toFixed(0)}, held ${(heldCh / (raw.length - 1)).toFixed(0)}, held > 0.05 px ${(mv.heldMaxPx.filter((x) => x > 0.05).length / (raw.length - 1)).toFixed(0)} pieces`);
console.log(`new piece points on chains with a released span ${newOnRelChain}, on fully held chains ${newOnHeldChain} (of which on a chain crossing a released chain ${newHeldCrossRel}, sharing a junction with one ${newHeldJuncRel}, either ${newHeldEither}); absent from every previous piece of the chain side: ${newSide} (on fully held chains ${newSideHeld})`);
if (SPAN >= 0) {
  for (const [lab, a] of [["in-between frames", newNear], ["captured frames", newNearCap]] as const) {
    const nt = Math.max(1, a.reduce((s, x) => s + x, 0));
    console.log(`new piece points by device px to the nearest released span point, ${lab}: <10 ${(100 * a[0] / nt).toFixed(1)}%, 10-40 ${(100 * a[1] / nt).toFixed(1)}%, 40-160 ${(100 * a[2] / nt).toFixed(1)}%, >=160 ${(100 * a[3] / nt).toFixed(1)}% (of ${nt})`);
  }
}