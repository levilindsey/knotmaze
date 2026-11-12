// K1247 s26 (K1322): the record fill (what the app draws: fillRec 2, its CPU twin fillRec 3) against
// fillFrame (what the K1314 census rasters) on the census scenes at rest. Per scene: the largest
// per-vertex |key|, |s| (slot 0) and position (px at --ppu) differences, split by the strip's case
// (equal border ranges, matched: ranges differ, jend: they part at a junction end), the worst vertex's
// spot (nearest crossing x<i> / junction j<i>), and the rastered fill (rasterFill's owner) differences:
// pixels and components of at least --min px, each with its spot.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s26_tie.ts [--scene=a,b] [--ppu=40] [--min=4] [--out=file.json]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { structure, frame, type SceneIn } from "../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure, rasterFill, type FillFrame, type FillStructure, type StripItem } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const names = opt("scene")?.split(",") ?? ALL;
const ppu = Number(opt("ppu") ?? 40); const minPx = Number(opt("min") ?? 4);

function load(nm: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${nm}.json`), "utf8"));
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; delete (s.look as { fillRec?: number }).fillRec;
  return s;
}
function chainPt(pts: number[], closed: boolean, s: number): [number, number] {
  const n = pts.length >> 1; const segs = closed ? n : n - 1;
  let L = 0; for (let i = 0; i < segs; i++) { const j = (i + 1) % n; L += Math.hypot(pts[2 * j] - pts[2 * i], pts[2 * j + 1] - pts[2 * i + 1]); }
  let t = s; if (closed && L > 0) t = ((t % L) + L) % L; t = Math.max(0, Math.min(L, t));
  let acc = 0;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n; const dx = pts[2 * j] - pts[2 * i]; const dy = pts[2 * j + 1] - pts[2 * i + 1]; const l = Math.hypot(dx, dy);
    if (acc + l >= t || i === segs - 1) { const u = l > 0 ? Math.min(1, Math.max(0, (t - acc) / l)) : 0; return [pts[2 * i] + dx * u, pts[2 * i + 1] + dy * u]; }
    acc += l;
  }
  return [pts[0], pts[1]];
}

export interface TieScene { scene: string; key: Record<string, number>; s: Record<string, number>; px: Record<string, number>; worst: string; rasterPx: number; nCase: Record<string, number>; comps: { n: number; at: string }[] }

/** One scene's tie: fillFrame against fillRec 3 (the app's record fill), per vertex and rastered. */
export function tieScene(nm: string, sceneIn?: SceneIn): TieScene {
  const scene = sceneIn ?? load(nm);
  const st = structure(scene); const table = frame(st, scene); const zz = zChains(scene);
  const fs: FillStructure = fillStructure(st, fillResolution(st, table));
  const frA: FillFrame = fillFrame(fs, st, table, scene, zz);
  const frB: FillFrame = fillFrame(fs, st, table, { ...scene, look: { ...scene.look, fillRec: 3 } } as SceneIn, zz);
  const idx = new Map<number, number>(); scene.chains.forEach((c, i) => idx.set(c.id, i));
  const xPts = scene.crossings.map((x) => {
    const ca = scene.chains[idx.get(x.a.chain) ?? -1]; const cb = scene.chains[idx.get(x.b.chain) ?? -1];
    if (!ca || !cb) return [NaN, NaN];
    const a = chainPt(ca.pts, ca.closed, x.a.s); const b = chainPt(cb.pts, cb.closed, x.b.s);
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  });
  const spot = (x: number, y: number): string => {
    let best = Infinity; let lab = "?";
    xPts.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < best) { best = d; lab = `x${i}`; } });
    scene.junctions.forEach((J, i) => { const d = Math.hypot(J.c[0] - x, J.c[1] - y); if (d < best) { best = d; lab = `j${i}`; } });
    return `${lab} (${x.toFixed(2)}, ${y.toFixed(2)})`;
  };
  // Each strip's case, from its border pieces as fillFrame reads them.
  const caseOf = new Map<number, string>(); const nCase: Record<string, number> = {};
  const zc = zz.zc;
  const stationJ = (sti: number): boolean => { const q = st.stationsD[sti]; return !!q && q.kind === "junction" && q.arm >= 0; };
  fs.items.forEach((it) => {
    if (it.kind !== "strip") return;
    const S = it as StripItem; const pl = S.pL >= 0 ? table.pieces[S.pL] : null; const pr = S.pR >= 0 ? table.pieces[S.pR] : null;
    let cs = "other";
    if (pl && pr && pl.pts.length >= 4 && pr.pts.length >= 4) {
      const cz = zc[S.pi]; const wrapZ = (d: number): number => (cz && cz.closed && cz.len > 0 ? ((d % cz.len) + cz.len) % cz.len : d);
      const a0 = pl.s0; const a1 = wrapZ(pl.s1 - pl.s0); let b0 = pr.s0; const b1 = wrapZ(pr.s1 - pr.s0);
      if (cz && cz.closed && cz.len > 0) b0 += cz.len * Math.round((a0 - b0) / cz.len);
      const I = st.intervalsD[S.iv];
      const jEnd = (a0 !== b0 && stationJ(I.aSt)) || (a0 + a1 !== b0 + b1 && stationJ(I.bSt));
      cs = a0 === b0 && a1 === b1 ? "equal" : jEnd ? "jend" : "matched";
    }
    nCase[cs] = (nCase[cs] ?? 0) + 1;
    for (let r = 0; r < 3; r++) for (let i = 0; i <= S.N; i++) caseOf.set(S.base + r * (S.N + 1) + i, cs);
  });
  const key: Record<string, number> = {}; const s: Record<string, number> = {}; const px: Record<string, number> = {};
  let wk = 0; let worst = "none";
  for (let v = 0; v < fs.nV; v++) {
    const cs = caseOf.get(v) ?? "item";
    const dk = Math.abs(frA.key[v] - frB.key[v]); const ds = Math.abs(frA.s4[4 * v] - frB.s4[4 * v]);
    const dp = Math.hypot(frA.pos[2 * v] - frB.pos[2 * v], frA.pos[2 * v + 1] - frB.pos[2 * v + 1]) * ppu;
    if (!(dk <= (key[cs] ?? 0))) key[cs] = dk; if (!(ds <= (s[cs] ?? 0))) s[cs] = ds; if (!(dp <= (px[cs] ?? 0))) px[cs] = dp;
    if (dk > wk) { wk = dk; worst = `${cs} v${v} ${spot(frA.pos[2 * v], frA.pos[2 * v + 1])} key ${frA.key[v].toFixed(4)} vs ${frB.key[v].toFixed(4)}`; }
  }
  // Rastered owners over the fill's bounds.
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let v = 0; v < fs.nV; v++) { const x = frA.pos[2 * v]; const y = frA.pos[2 * v + 1]; if (!(Math.abs(x) < 1e4 && Math.abs(y) < 1e4) || frA.key[v] < -100) continue; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const Wd = Math.ceil((x1 - x0) * ppu) + 2; const Hd = Math.ceil((y1 - y0) * ppu) + 2;
  const oA = rasterFill(fs, frA, x0, y0, Wd, Hd, ppu); const oB = rasterFill(fs, frB, x0, y0, Wd, Hd, ppu);
  const diff = new Uint8Array(Wd * Hd); let rasterPx = 0;
  for (let o = 0; o < diff.length; o++) if (oA[o] !== oB[o]) { diff[o] = 1; rasterPx++; }
  const seen = new Uint8Array(Wd * Hd); const comps: { n: number; at: string }[] = [];
  const stack: number[] = [];
  for (let o = 0; o < diff.length; o++) {
    if (!diff[o] || seen[o]) continue;
    let n = 0; let sx = 0; let sy = 0; stack.push(o); seen[o] = 1;
    while (stack.length) {
      const q = stack.pop()!; n++; const qx = q % Wd; const qy = (q / Wd) | 0; sx += qx; sy += qy;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const X = qx + dx; const Y = qy + dy; if (X < 0 || Y < 0 || X >= Wd || Y >= Hd) continue;
        const r = Y * Wd + X; if (diff[r] && !seen[r]) { seen[r] = 1; stack.push(r); }
      }
    }
    if (n >= minPx) comps.push({ n, at: spot(x0 + (sx / n + 0.5) / ppu, y0 + (sy / n + 0.5) / ppu) });
  }
  comps.sort((a, b) => b.n - a.n);
  return { scene: nm, key, s, px, worst, rasterPx, nCase, comps };
}

if (process.argv[1]?.includes("k1247s26_tie")) {
  const out: TieScene[] = [];
  const f = (r: Record<string, number>): string => Object.entries(r).map(([k, v]) => `${k} ${v.toExponential(2)}`).join(", ");
  for (const nm of names) {
    const r = tieScene(nm); out.push(r);
    console.log(`${nm}: raster ${r.rasterPx} px, ${r.comps.length} comps >= ${minPx}${r.comps.length ? ": " + r.comps.slice(0, 6).map((c) => `${c.n}@${c.at}`).join("; ") : ""}`);
    console.log(`  key ${f(r.key)} | s ${f(r.s)} | px ${f(r.px)}`);
    console.log(`  worst ${r.worst} | strips ${JSON.stringify(r.nCase)}`);
  }
  const o = opt("out"); if (o) writeFileSync(o, JSON.stringify(out, null, 1));
}
