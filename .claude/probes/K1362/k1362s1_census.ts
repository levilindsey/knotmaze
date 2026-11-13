// K1362 s1: the K1314 census, run on the GPU field's CPU mirror (src/render/gpu_field/eval.ts)
// instead of rp=outline. The census function below is K1314's census() copied verbatim but for
// three lines (the raster, the file label, and the K1049 check's corner: this renderer's own).
// Usage: node scripts/run_node.mjs .claude/probes/K1362/k1362s1_census.ts <tag> --scene=a,b --ppu=160 --min=40
//        (--merge=t0,t1,t2 merges group runs). Outputs: .claude/probes/K1362/out/s1/census_<tag>.{json,txt}.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildModel, rasterFormB, boxMax, boxMean, refCacheDirs, filletOf, reclassS1, chainPt, FILLET_REF,
  ARTIFACT_KINDS, KINDS, ALL, SCENE_DIR, type Art, type Kind, type Ras,
} from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";
import { GfEval } from "../../../src/render/gpu_field/eval";

type Model = ReturnType<typeof buildModel>;
const here = dirname(fileURLToPath(import.meta.url));
const COL = 0.06;

const TCACHE = new WeakMap<Model, GfTables>();
export function gfTablesOf(m: Model): GfTables {
  let t = TCACHE.get(m);
  if (!t) { const sc = m.scene as never as { camera: { pxPerUnit: number } }; t = buildTables(m.scene as never, { aa: 0.5 / (sc.camera.pxPerUnit * 2) }); TCACHE.set(m, t); }
  return t;
}
/** This renderer's corner for junction ji's arm pair (i, k), as the K1049 check reads it. */
function gfCornerFor(m: Model, ji: number, i: number, k: number): { r: number; theta: number } | undefined {
  const T = gfTablesOf(m);
  for (let q = 0; q < T.nK; q++) if (T.kJ[q] === ji && ((T.kA[q] === i && T.kB[q] === k) || (T.kA[q] === k && T.kB[q] === i)) && T.kR[q] > 0) return { r: T.kR[q], theta: T.kTheta[q] };
  return undefined;
}
export const STATS = { px: 0, ms: 0 };
const SEGH = new Float64Array(4096); const KH = new Float64Array(256);
export function rasterGf(m: Model, c0: number, r0: number, Wd: number, Hd: number, ppu: number): Ras {
  const T = gfTablesOf(m); const E = new GfEval(T); const n = Wd * Hd;
  const own = new Int32Array(n); const item = new Int32Array(n).fill(-1); const rgb = new Float32Array(3 * n).fill(-1);
  const ink = new Float32Array(n); const pc = new Int32Array(n).fill(-1); const pa = new Float32Array(n); const geo = new Uint8Array(n);
  const col: RGB = [0, 0, 0]; const t0 = Date.now();
  for (let r = 0; r < Hd; r++) for (let c = 0; c < Wd; c++) {
    const o = r * Wd + c; const ev = E.eval((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu);
    ink[o] = ev.ink; SEGH[Math.min(4095, ev.nSeg)]++; KH[Math.min(255, ev.nK)]++; STATS.px++;
    if (ev.chain < 0) continue;
    own[o] = ev.chain + 1;
    const ru = runAt(m.sp, ev.chain, ev.s); if (ru < 0) continue;
    runColour(m.sp.runs[ru], ev.s, col); rgb[3 * o] = col[0]; rgb[3 * o + 1] = col[1]; rgb[3 * o + 2] = col[2];
  }
  STATS.ms += Date.now() - t0;
  return { c0, r0, Wd, Hd, ppu, own, item, rgb, ink, pc, pa, geo };
}
function histStats(H: Float64Array): { mean: number; p95: number; max: number } {
  let n = 0; let s = 0; let mx = 0; for (let i = 0; i < H.length; i++) { n += H[i]; s += i * H[i]; if (H[i]) mx = i; }
  let acc = 0; let p95 = 0; for (let i = 0; i < H.length; i++) { acc += H[i]; if (acc >= 0.95 * n) { p95 = i; break; } }
  return { mean: n ? s / n : 0, p95, max: mx };
}

export function censusGf(nm: string, ppu: number, MIN_PX = 12): { arts: Art[]; m: Model } {
  const m = buildModel(nm); const sc = m.scene; const h = sc.look.halfWidth;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const c of sc.chains) for (let i = 0; i < c.pts.length; i += 2) { x0 = Math.min(x0, c.pts[i]); x1 = Math.max(x1, c.pts[i]); y0 = Math.min(y0, c.pts[i + 1]); y1 = Math.max(y1, c.pts[i + 1]); }
  const g0 = Math.floor((x0 - 3 * h) * ppu); const q0 = Math.floor((y0 - 3 * h) * ppu);
  const GW = Math.ceil((x1 + 3 * h) * ppu) - g0; const GH = Math.ceil((y1 + 3 * h) * ppu) - q0;
  // Tiles of T px with an M px margin: a component counts in the tile whose core holds its centroid.
  const T = 1280; const M = 24;
  const arts: Art[] = [];
  const { fbDir, fbfDir } = refCacheDirs(nm);
  const t0 = Date.now();
  for (let ty = 0; ty < GH; ty += T) for (let tx = 0; tx < GW; tx += T) {
  const kx0 = g0 + tx; const ky0 = q0 + ty; const kx1 = Math.min(g0 + GW, kx0 + T); const ky1 = Math.min(q0 + GH, ky0 + T);
  const c0 = kx0 - M; const r0 = ky0 - M; const Wd = kx1 - kx0 + 2 * M; const Hd = ky1 - ky0 + 2 * M; const n = Wd * Hd;
  const R = rasterGf(m, c0, r0, Wd, Hd, ppu);
  if (!R.ink.some((v) => v > 0) && !R.own.some((v) => v > 0)) continue; // empty paper tile
  const B = rasterFormB(m, c0, r0, Wd, Hd, ppu, join(fbDir, `${nm}_${ppu}_${c0}_${r0}_${Wd}_${Hd}.bin`), join(fbfDir, `${nm}_${ppu}_${c0}_${r0}_${Wd}_${Hd}.bin`));
  // Fields for the tolerance tests.
  const bInkMax3 = boxMax(B.ink, Wd, Hd, 3);
  const bCov = new Float32Array(n); for (let i = 0; i < n; i++) bCov[i] = B.chain[i] >= 0 || B.ink[i] >= 0.5 ? 1 : 0;
  const bCovMin2 = boxMax(bCov, Wd, Hd, 2, true); const bCovMax2 = boxMax(bCov, Wd, Hd, 2);
  const oInkMax3 = boxMax(R.ink, Wd, Hd, 3);
  // Area ink difference (outline - form B) over 7x7: a 1-2 px border offset averages under DM,
  // a solid block over form B's fading tail does not.
  const dIn = new Float32Array(n); for (let i = 0; i < n; i++) dIn[i] = R.ink[i] - B.ink[i];
  const dMean3 = boxMean(dIn, Wd, Hd, 3); const DM = 0.35;
  // Colour steps (max channel over the 4-neighbours, both covered and clean).
  const STEP = 0.1;
  const step = (rgb: Float32Array, ok: (i: number) => boolean): Float32Array => {
    const st = new Float32Array(n);
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const i = y * Wd + x; if (!ok(i)) continue;
      let v = 0;
      for (const j of [x + 1 < Wd ? i + 1 : -1, y + 1 < Hd ? i + Wd : -1]) {
        if (j < 0 || !ok(j)) continue;
        v = Math.max(v, Math.abs(rgb[3 * i] - rgb[3 * j]), Math.abs(rgb[3 * i + 1] - rgb[3 * j + 1]), Math.abs(rgb[3 * i + 2] - rgb[3 * j + 2]));
      }
      st[i] = v;
    }
    return st;
  };
  const oStep = step(R.rgb, (i) => R.own[i] > 0 && R.rgb[3 * i] >= 0 && R.ink[i] < 0.25);
  const oStepMax2 = boxMax(oStep, Wd, Hd, 2); // a wedge counts only where the outline itself shows a step (s1 FP: form B's own wedge)
  const bStep = step(B.rgb, (i) => B.chain[i] >= 0 && B.rgb[3 * i] >= 0);
  const bStepMax3 = boxMax(bStep, Wd, Hd, 3);
  // Ink steps: a hard ink edge (x134's cut-off tail) where form B's ink changes gently within 2 px.
  const iStep = (ink: Float32Array): Float32Array => {
    const st = new Float32Array(n);
    for (let y = 0; y + 1 < Hd; y++) for (let x = 0; x + 1 < Wd; x++) { const i = y * Wd + x; st[i] = Math.max(Math.abs(ink[i] - ink[i + 1]), Math.abs(ink[i] - ink[i + Wd])); }
    return st;
  };
  const oIStep = iStep(R.ink); const bIStepMax2 = boxMax(iStep(B.ink), Wd, Hd, 2);
  const flags: Record<Kind, Uint8Array> = { stray_ink: new Uint8Array(n), hard_edge: new Uint8Array(n), paper: new Uint8Array(n), broken_ink: new Uint8Array(n), k1049: new Uint8Array(n), owner_only: new Uint8Array(n), tail_look: new Uint8Array(n) };
  const sub = new Uint8Array(n); // paper: 1 hole, 2 covered; hard_edge: 1 wedge (owner mismatch), 2 step; stray: 3 hard cut
  const bInkMax2 = boxMax(B.ink, Wd, Hd, 2); const oInkMax2 = boxMax(R.ink, Wd, Hd, 2);
  const has = (i: number, want: (q: number) => boolean): boolean => {
    const x = i % Wd; const y = (i - x) / Wd;
    for (let dy = -2; dy <= 2; dy++) { const yy = y + dy; if (yy < 0 || yy >= Hd) continue; for (let dx = -2; dx <= 2; dx++) { const xx = x + dx; if (xx >= 0 && xx < Wd && want(yy * Wd + xx)) return true; } }
    return false;
  };
  for (let i = 0; i < n; i++) {
    const oInk = R.ink[i]; const oCov = R.own[i] > 0;
    // stray: solid outline ink where form B has none, or only a faint fade (x134's block, j59's bars)
    if (oInk >= 0.5 && (oInk - bInkMax3[i] > 0.4 || (oInk >= 0.6 && dMean3[i] > DM))) flags.stray_ink[i] = 1;
    else if (oIStep[i] > 0.35 && bIStepMax2[i] < 0.12 && bInkMax2[i] > 0.1) { flags.stray_ink[i] = 1; sub[i] = 3; }
    if (!oCov && oInk < 0.3 && bCovMin2[i] === 1) { flags.paper[i] = 1; sub[i] = 1; }
    if (oCov && oInk < 0.3 && bCovMax2[i] === 0) { flags.paper[i] = 1; sub[i] = 2; }
    if (B.ink[i] >= 0.5 && oCov && (B.ink[i] - oInkMax3[i] > 0.4 || (B.ink[i] >= 0.6 && -dMean3[i] > DM))) flags.broken_ink[i] = 1;
    // hard edge, wedge: a fill of one chain where form B paints another (no pixel of it within 2 px), away from ink
    if (oCov && B.chain[i] >= 0 && oInkMax2[i] < 0.25 && bInkMax2[i] < 0.25) {
      const oc = R.own[i] - 1; const bc = B.chain[i];
      if (oc !== bc && (!has(i, (q) => B.chain[q] === oc) || !has(i, (q) => R.own[q] === bc + 1))) {
        // visible in the app's paint only where the colours differ (junction colours converge): the
        // outline's colour here against the nearest form B colour within 2 px
        let dMin = Infinity;
        if (R.rgb[3 * i] >= 0) has(i, (q) => { if (B.rgb[3 * q] < 0) return false; dMin = Math.min(dMin, Math.max(Math.abs(R.rgb[3 * i] - B.rgb[3 * q]), Math.abs(R.rgb[3 * i + 1] - B.rgb[3 * q + 1]), Math.abs(R.rgb[3 * i + 2] - B.rgb[3 * q + 2]))); return false; });
        if (dMin > COL && dMin < Infinity && oStepMax2[i] > STEP) { flags.hard_edge[i] = 1; sub[i] = 1; } else flags.owner_only[i] = 1;
      }
    }
    if (!flags.hard_edge[i] && oStep[i] > STEP && bStepMax3[i] < STEP / 2 && bInkMax3[i] < 0.3) { flags.hard_edge[i] = 1; sub[i] = 2; }
  }
  const near = (x: number, y: number): { id: string; d: number } => {
    let best = { id: "-", d: Infinity };
    m.xPts.forEach((p, xi) => { const d = Math.hypot(p.x - x, p.y - y); if (d < best.d) best = { id: `x${xi}`, d }; });
    sc.junctions.forEach((J, ji) => { const d = Math.hypot(J.c[0] - x, J.c[1] - y); if (d < best.d) best = { id: `j${ji}`, d }; });
    return best;
  };
  const lab = new Int32Array(n); const stack: number[] = [];
  for (const kind of KINDS) {
    if (kind === "k1049" || kind === "tail_look") continue;
    const f = flags[kind]; const dil = boxMax(Float32Array.from(f), Wd, Hd, 2);
    lab.fill(0); let nl = 0;
    for (let s0 = 0; s0 < n; s0++) {
      if (!dil[s0] || lab[s0]) continue;
      nl++; stack.length = 0; stack.push(s0); lab[s0] = nl;
      const pix: number[] = [];
      while (stack.length) {
        const i = stack.pop()!; if (f[i]) pix.push(i);
        const x = i % Wd; const y = (i - x) / Wd;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; const yy = y + dy; if (xx < 0 || yy < 0 || xx >= Wd || yy >= Hd) continue;
          const j = yy * Wd + xx; if (dil[j] && !lab[j]) { lab[j] = nl; stack.push(j); }
        }
      }
      if (pix.length < (kind === "paper" ? Math.min(MIN_PX, 10) : MIN_PX)) continue; // paper: hairline cracks are short
      let sx = 0; let sy = 0; let bx0 = Infinity; let by0 = Infinity; let bx1 = -Infinity; let by1 = -Infinity;
      const votes = new Map<string, number>(); let nHole = 0; let nCut = 0; let geoOn = 0; let appD = 0; let inPaper = 0;
      for (const i of pix) {
        const x = i % Wd; const y = (i - x) / Wd; sx += x; sy += y; bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
        if (sub[i] === 1) nHole++; if (sub[i] === 3) nCut++;
        if (R.geo[i]) geoOn++;
        let key = "";
        if (kind === "stray_ink" && R.pc[i] >= 0) key = "band:" + m.table.pieces[R.pc[i]].kind;
        else if (kind === "broken_ink") key = R.geo[i] ? "band:" + m.table.pieces[R.pc[i]].kind + " faded" : "fill:" + (R.item[i] >= 0 ? m.fs.items[R.item[i]].kind : "none") + " unbordered";
        else if (kind === "paper") {
          // the fill item next to the hole (holes) or under it (covered)
          let it = R.item[i];
          if (it < 0) for (let d = 1; d <= 4 && it < 0; d++) for (const j of [i - d, i + d, i - d * Wd, i + d * Wd]) if (j >= 0 && j < n && R.item[j] >= 0) { it = R.item[j]; break; }
          key = "fill:" + (it >= 0 ? m.fs.items[it].kind : "none");
        } else if (kind === "hard_edge" || kind === "owner_only") {
          if (sub[i] === 1 || kind === "owner_only") key = "fill:" + (R.item[i] >= 0 ? m.fs.items[R.item[i]].kind : "none");
          else { const its = new Set<string>(); for (const j of [i, i + 1, i + Wd]) if (j < n && R.item[j] >= 0) its.add(m.fs.items[R.item[j]].kind); key = "fill:" + [...its].sort().join("|"); }
          if (R.rgb[3 * i] >= 0 && B.rgb[3 * i] >= 0) appD += Math.max(Math.abs(R.rgb[3 * i] - B.rgb[3 * i]), Math.abs(R.rgb[3 * i + 1] - B.rgb[3 * i + 1]), Math.abs(R.rgb[3 * i + 2] - B.rgb[3 * i + 2]));
        }
        if (bCovMax2[i] === 0) inPaper++;
        if (key) votes.set(key, (votes.get(key) ?? 0) + 1);
      }
      const cx = (c0 + sx / pix.length + 0.5) / ppu; const cy = (r0 + sy / pix.length + 0.5) / ppu;
      const gx = c0 + sx / pix.length; const gy = r0 + sy / pix.length;
      if (gx < kx0 || gx >= kx1 || gy < ky0 || gy >= ky1) continue; // another tile's
      const nb = near(cx, cy);
      const part = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "?";
      const bw = bx1 - bx0 + 1; const bh = by1 - by0 + 1;
      let shape = "";
      if (kind === "stray_ink" && nCut > pix.length / 2) shape = "cut";
      else if (kind === "stray_ink") shape = pix.length / (bw * bh) > 0.45 && Math.min(bw, bh) > 1.6 * m.table.W * ppu ? "block" : Math.max(bw, bh) > 3 * Math.min(bw, bh) ? "bar" : pix.length < 40 ? "fleck" : "spike";
      else if (kind === "paper") shape = nHole > pix.length / 2 ? (B.ink[pix[0]] >= 0.5 ? "notch" : "hole") : "covered";
      else if (kind === "broken_ink") shape = geoOn > pix.length / 2 ? "faded" : "missing";
      else shape = kind === "owner_only" || nHole > pix.length / 2 ? "wedge" : "step";
      // K1045: a covered eye, or ink inside form B's open paper, between two close junctions
      const jd = sc.junctions.map((J) => Math.hypot(J.c[0] - cx, J.c[1] - cy)).sort((a, b) => a - b);
      const eye = (shape === "covered" || (kind === "stray_ink" && inPaper > pix.length / 2)) && jd.length > 1 && jd[1] < 5 * h;
      let detail = eye ? "K1045 eye" : "";
      if (kind === "hard_edge" || kind === "owner_only") detail = `app colour diff ${(appD / pix.length).toFixed(3)}`;
      const pk = part.split(":")[1]?.split(" ")[0] ?? "";
      const file = "src/render/gpu_field";
      // a junction under-tail without a hard cut: tail_look (see KINDS)
      let kOut: Kind = kind;
      if (kind === "broken_ink" && (part.startsWith("band:tail") || part.startsWith("fill:junc"))) {
        let cut = 0;
        for (let y = Math.max(0, by0 - 3); y <= Math.min(Hd - 1, by1 + 3); y++) for (let x = Math.max(0, bx0 - 3); x <= Math.min(Wd - 1, bx1 + 3); x++) { const q = y * Wd + x; if (oIStep[q] > 0.35 && bIStepMax2[q] < 0.12 && bInkMax2[q] > 0.1) cut++; }
        if (cut < 6) kOut = "tail_look"; else shape = "cut short";
      }
      arts.push({ id: "", scene: nm, kind: kOut, sub: shape, x: +cx.toFixed(3), y: +cy.toFixed(3), px: pix.length, sizePx: Math.max(bw, bh), bbox: [+((c0 + bx0) / ppu).toFixed(3), +((r0 + by0) / ppu).toFixed(3), +((c0 + bx1 + 1) / ppu).toFixed(3), +((r0 + by1 + 1) / ppu).toFixed(3)], near: nb.id, dNear: +nb.d.toFixed(3), part, file, detail });
    }
  }
  }
  console.error(`${nm}: ${GW}x${GH} px at ${ppu} px/unit, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  // K1049: through-pass bends with a visible inner corner (rp=outline skips the through pair's corner).
  const rC = m.table.corners.filter((c) => c.ok && c.r > 0).map((c) => c.r).sort((a, b) => a - b);
  const rMed = rC.length ? rC[rC.length >> 1] : 0.5 * h;
  const cam = Math.abs((sc as any).camera?.worldToCss?.[0] ?? 20) * ((sc as any).camera?.dpr ?? 1);
  const idx = new Map<number, number>(); sc.chains.forEach((c, i) => idx.set(c.id, i));
  sc.junctions.forEach((J, ji) => {
    const ang = J.arms.map((a) => { const ch = sc.chains[idx.get(a.chain) ?? -1]; if (!ch) return NaN; const p = chainPt(ch.pts, ch.closed, a.s + a.dir * 2 * h); return Math.atan2(p.y - J.c[1], p.x - J.c[0]); });
    J.arms.forEach((a, i) => J.arms.forEach((b, k) => {
      if (k <= i || a.kind !== "through" || b.kind !== "through" || a.chain !== b.chain || Math.abs(a.s - b.s) > 1e-6) return;
      if (!Number.isFinite(ang[i]) || !Number.isFinite(ang[k])) return;
      // the empty side between the two arms: the gap (ccw from a to b, or b to a) with no other arm in it
      const others = ang.filter((_, q) => q !== i && q !== k && Number.isFinite(ang[q]));
      const ccw = (u: number, v: number): number => { let d = v - u; while (d < 0) d += 2 * Math.PI; while (d >= 2 * Math.PI) d -= 2 * Math.PI; return d; };
      for (const [u, v] of [[ang[i], ang[k]], [ang[k], ang[i]]] as [number, number][]) {
        const g = ccw(u, v); if (others.some((o) => ccw(u, o) < g)) continue;
        if (g >= Math.PI) continue; // the outer side of the bend
        const mid = u + g / 2; const d = h / Math.sin(g / 2);
        const vx = J.c[0] + Math.cos(mid) * d; const vy = J.c[1] + Math.sin(mid) * d;
        // the outline's corner at this bend: an ok same-chain corner at the junction, V nearest the bend's
        const oc = m.table.corners.filter((c) => c.junction === J.id && c.aChain === a.chain && c.bChain === a.chain && c.ok && c.r > 0)
          .sort((p, q) => Math.hypot(p.Vx - vx, p.Vy - vy) - Math.hypot(q.Vx - vx, q.Vy - vy))[0];
        const reach = (r: number, th: number): number => r * (1 / Math.sin(th / 2) - 1) * cam; // how far a rounded corner moves the inner edge, screen px at the scene's camera
        let dev: number; let sub = "sharp"; let ref = "";
        if (FILLET_REF.on) {
          // s3: the reference is the fillet's own corner at this bend (form_b_fillet, K1049): a find
          // when the outline's reach (0 with no corner) differs from the fillet's by 2.5 px or more.
          const fbf = filletOf(m);
          const fc = [...fbf.thruCi].map((ci) => fbf.corners[ci]).find((c) => c.j === ji && ((fbf.arms[c.a].ei === i && fbf.arms[c.b].ei === k) || (fbf.arms[c.a].ei === k && fbf.arms[c.b].ei === i)));
          const devF = fc && fc.ok && fc.r > 0 ? reach(fc.r, fc.theta) : 0;
          // The outline's corner for this same arm pair (its diagram corner flagged thru; outline arm
          // indices are form B's). s3b's nearest same-chain corner also took a chain's end-to-through
          // corner where the chain ends at the junction it passes (g41_ring j13, j22: 5 false finds).
          const ot = gfCornerFor(m, ji, i, k);
          const devO = ot ? reach(ot.r, ot.theta) : 0;
          dev = Math.abs(devO - devF);
          if (dev < 2.5) continue; // under 2.5 screen px the difference is not visible at the camera
          sub = ot ? (devF > 0 ? "radius" : "extra") : "sharp";
          ref = `, fillet r ${fc && fc.ok ? (fc.r / h).toFixed(3) : "none"} h (reach ${devF.toFixed(1)} px), outline r ${ot ? (ot.r / h).toFixed(3) : "none"} h (reach ${devO.toFixed(1)} px)`;
        } else {
          dev = rMed * (1 / Math.sin(g / 2) - 1) * cam;
          if (dev < 2.5) continue; // s1 FP: under 2.5 screen px a rounded corner is not visible at the camera
          if (oc) continue;
        }
        arts.push({ id: "", scene: nm, kind: "k1049", sub, x: +vx.toFixed(3), y: +vy.toFixed(3), px: Math.round(dev * dev), sizePx: +dev.toFixed(1), bbox: [+(vx - 2 * h).toFixed(3), +(vy - 2 * h).toFixed(3), +(vx + 2 * h).toFixed(3), +(vy + 2 * h).toFixed(3)], near: `j${ji}`, dNear: +d.toFixed(3), part: "corner: through pair's bend vs the fillet", file: "outline.ts (diagramOf's through-pair corners, cornersPhaseC) + fill_tri.ts (junction fan)", detail: `bend gap ${(g * 180 / Math.PI).toFixed(1)} deg, chain ${a.chain}${ref}` });
      }
    }));
  });
  arts.forEach((a, i) => { a.id = `${nm}#${i}`; });
  return { arts: arts.map(reclassS1).filter((a): a is Art => a !== null), m };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const pos = args.filter((a) => !a.startsWith("--"));
  const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const tag = pos[0] ?? "cur"; const ppu = Number(opt("ppu") ?? 80); const minPx = Number(opt("min") ?? 12);
  const scenes = (opt("scene") ?? ALL.join(",")).split(",").filter((s) => existsSync(join(SCENE_DIR, `${s}.json`)));
  const outDir = join(here, "out", "s1"); mkdirSync(outDir, { recursive: true });
  const all: Art[] = []; const lines: string[] = []; const stats: Record<string, unknown> = {};
  lines.push(["scene", ...ARTIFACT_KINDS, "total", "owner_only", "tail_look"].map((s, i) => (i ? s.padStart(11) : s.padEnd(22))).join(""));
  const merge = opt("merge")?.split(",");
  const waitLock = (): void => {
    const lock = join(process.env.TEMP ?? "", "claude-perf.lock"); const sab = new Int32Array(new SharedArrayBuffer(4));
    while (existsSync(lock) && Date.now() - statSync(lock).mtimeMs < 30 * 60e3) Atomics.wait(sab, 0, 0, 10e3);
  };
  for (const nm of scenes) {
    let arts: Art[];
    if (merge) arts = merge.flatMap((t) => (JSON.parse(readFileSync(join(outDir, `census_${t}.json`), "utf8")).arts as Art[]).filter((a) => a.scene === nm)).map(reclassS1).filter((a): a is Art => a !== null);
    else {
      if (!args.includes("--nolock")) waitLock();
      SEGH.fill(0); KH.fill(0); STATS.px = 0; STATS.ms = 0;
      const r = censusGf(nm, ppu, minPx); arts = r.arts;
      const T = gfTablesOf(r.m);
      stats[nm] = { px: STATS.px, evalMs: STATS.ms, seg: histStats(SEGH), corners: histStats(KH), tables: T.ms, nCh: T.nCh, nK: T.nK, nA: T.nA, cells: T.gW * T.gH };
    }
    all.push(...arts);
    const cnt = ARTIFACT_KINDS.map((k) => arts.filter((a) => a.kind === k).length);
    lines.push([nm.padEnd(22), ...[...cnt, cnt.reduce((a, b) => a + b, 0), arts.filter((a) => a.kind === "owner_only").length, arts.filter((a) => a.kind === "tail_look").length].map((v) => String(v).padStart(11))].join(""));
    writeFileSync(join(outDir, `census_${tag}.json`), JSON.stringify({ ppu, minPx, scenes, arts: all, stats }, null, 1));
  }
  const tot = ARTIFACT_KINDS.map((k) => all.filter((a) => a.kind === k).length);
  lines.push(["TOTAL".padEnd(22), ...[...tot, tot.reduce((a, b) => a + b, 0), all.filter((a) => a.kind === "owner_only").length, all.filter((a) => a.kind === "tail_look").length].map((v) => String(v).padStart(11))].join(""));
  writeFileSync(join(outDir, `census_${tag}.txt`), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
}
if (process.argv[1] && /k1362s1_census/.test(process.argv[1])) void main();
