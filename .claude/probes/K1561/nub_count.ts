// K1561 (27Q): count, per K1436 bar scene, the thread-body pixels that lkGap's COVERAGE cut
// (src/render/gpu_field/gf_look.ts lkGap, the gA lane) removes through a piece that is a fused
// joint with the pixel's own (label) chain -- the j71 nub (g41_user_tw64: chain 32 under
// chain 22, ending on chain 30; chain 30's piece cuts chain 32's coverage beside the joint).
// Generalises .claude/probes/K1470/nub_probe.ts (which hard-codes chain 30 and one box).
//
//   $env:GF_KRETRY = '1'; node scripts/run_node.mjs .claude/probes/K1561/nub_count.ts [scene,scene|all] [--ppu=60] [--margin=0.15]
//
// Model of the cut (ledger K1561, confirmed there against the capture): a filled pixel
// (GfEval cov >= 0.5, label = its chain, label key = its own chain's nearest piece's key) is
// cut by a piece j when pkey[j] > labelKey + zt and pd[j] < h + margin (margin 0.15 =
// (casing 0.88 - thread 0.64)/2 + CUT_BIAS 0.03, fade 0, as in nub_probe).
// A cutter is a FUSED JOINT with the label when some junction group g (tables' arms, the
// arms eval.ts member() reads) holds both chains within their home interval of that group:
// for each chain an arm with aG == g whose directed arc distance from its root aSR to the
// piece's s lies in [0, aHome] (aL when aHome is absent). member() itself reports g = -1 at
// the notch (the pieces have left the arm's L), so the home interval is the reach used here;
// isJointPair (src/render/field/lean_input.ts) is the same fact stated on ctrls (both passes
// within JOINT_PAIR_REACH of one fused junction).
// The cut is live only inside a crossing window of the label (lkGap: lkCut is scaled by
// clamp(wm / pxw + 0.5), wm the label foot's signed distance to the window's end, so outside
// a window it is 0). A pixel counts when its label sample lies inside an under-crossing
// window (marched here on the scene polylines as gf_look.ts gapWindow marches: the window
// ends where the centreline distance clears 2h + margin + fade, or fade / max(sin, 0.2) of
// arc past clearing 2h + margin) and a fused cutter that is NOT that window's named over
// chain cuts it. --fixed models the fixed lkGap (coverage from the named over chain only):
// the same pixels then count only when the fused cutter IS the named over chain.
// Places: 8-connected components of counted pixels sharing (labelChain, cutterChain, g),
// reported by world centroid and bbox. Pixels are raster samples at --ppu (default 60).
// Only pixels within 0.55 world of a tables vertex are evaluated (a counted pixel lies
// within h of its label centreline and h + margin of its cutter's, and vertices sample the
// centrelines every ~0.05); the rest cannot be counted.
import { tablesOf, modelOf } from "../K1436/k1436_lib.ts";
import { GfEval, GF_FADE_LENGTH } from "../../../src/render/gpu_field/eval.ts";

const ALL = ["muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"];
const args = process.argv.slice(2);
const opt = (k: string, d: number): number => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? +a.slice(k.length + 3) : d; };
const PPU = opt("ppu", 60);
const MARGIN = opt("margin", 0.15);
const FIXED = args.includes("--fixed");
const sceneArg = args.find((x) => !x.startsWith("--"));
const scenes = !sceneArg || sceneArg === "all" ? ALL : sceneArg.split(",").filter(Boolean);

interface Place { label: number; cutter: number; g: number; n: number; sx: number; sy: number; x0: number; x1: number; y0: number; y1: number }

function fusedGroups(T: any, c: number, s: number): Set<number> {
  const out = new Set<number>();
  const a0 = T.cArm0[c], an = T.cArmN[c], closed = T.cClosed[c] === 1, len = T.cLen[c];
  for (let i = a0; i < a0 + an; i++) {
    let d = (s - T.aSR[i]) * T.aDir[i];
    if (closed && len > 0) { d = ((d % len) + len) % len; }
    const reach = (T.aHome && T.aHome[i] > 0 ? T.aHome[i] : T.aL[i]) + 1e-9;
    if (d >= -1e-9 && d <= reach) out.add(T.aG[i]);
  }
  return out;
}

interface Win { over: number; uC: number; neg: number; pos: number; closed: boolean; total: number }

for (const nm of scenes) {
  const T: any = tablesOf(nm);
  const E: any = new GfEval(T);
  const M: any = modelOf(nm);
  const h = T.h as number, zt = T.zt as number;
  const fade = GF_FADE_LENGTH;
  // scene polylines in arc space (crossings' and junctions' s are arcs over these points)
  const chains = (M.scene.chains as any[]).map((c: any) => {
    const pts = c.pts as number[]; const n = pts.length >> 1; const segs = c.closed ? n : n - 1;
    const cum = new Float64Array(n + 1);
    for (let i = 0; i < segs; i++) { const j = (i + 1) % n; cum[i + 1] = cum[i] + Math.hypot(pts[2 * j] - pts[2 * i], pts[2 * j + 1] - pts[2 * i + 1]); }
    if (c.closed) cum[n] = cum[n - 1] + Math.hypot(pts[0] - pts[2 * (n - 1)], pts[1] - pts[2 * (n - 1) + 1]);
    return { pts, n, closed: !!c.closed, cum, total: c.closed ? cum[n] : cum[n - 1] };
  });
  const ptAt = (ci: number, arc: number, o: { x: number; y: number }): void => {
    const C = chains[ci]; let a = C.closed && C.total > 0 ? ((arc % C.total) + C.total) % C.total : Math.max(0, Math.min(C.total, arc));
    let lo = 0, hi = C.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C.cum[m] <= a) lo = m; else hi = m; }
    const segLen = C.cum[lo + 1] - C.cum[lo] || 1; const u = Math.max(0, Math.min(1, (a - C.cum[lo]) / segLen));
    const i0 = lo % C.n, i1 = (lo + 1) % C.n; o.x = C.pts[2 * i0] + (C.pts[2 * i1] - C.pts[2 * i0]) * u; o.y = C.pts[2 * i0 + 1] + (C.pts[2 * i1 + 1] - C.pts[2 * i0 + 1]) * u;
  };
  // under-crossing windows of each chain, marched as gapWindow marches (cap 4.5, step 0.07)
  const winsByChain = new Map<number, Win[]>();
  {
    const tmp = { x: 0, y: 0 }, tmp2 = { x: 0, y: 0 };
    const distAt = (uCi: number, arcU: number, oCi: number, oC: number): { d: number; sin: number } => {
      ptAt(uCi, arcU, tmp);
      const O = chains[oCi]; let bd = Infinity, btx = 1, bty = 0;
      const segs = O.closed ? O.n : O.n - 1;
      for (let i = 0; i < segs; i++) {
        let ma = (O.cum[i] + O.cum[i + 1]) / 2; if (O.closed && O.total > 0) { let da = ma - oC; da -= O.total * Math.floor(da / O.total + 0.5); if (Math.abs(da) > 3.4) continue; } else if (Math.abs(ma - oC) > 3.4) continue;
        const j = (i + 1) % O.n; const ax = O.pts[2 * i], ay = O.pts[2 * i + 1], dx = O.pts[2 * j] - ax, dy = O.pts[2 * j + 1] - ay;
        const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.max(0, Math.min(1, ((tmp.x - ax) * dx + (tmp.y - ay) * dy) / l2)) : 0;
        const ex = tmp.x - ax - dx * u, ey = tmp.y - ay - dy * u, d2 = ex * ex + ey * ey;
        if (d2 < bd) { bd = d2; const l = Math.sqrt(l2) || 1; btx = dx / l; bty = dy / l; }
      }
      ptAt(uCi, arcU - 0.05, tmp); ptAt(uCi, arcU + 0.05, tmp2);
      let tux = tmp2.x - tmp.x, tuy = tmp2.y - tmp.y; const lu = Math.hypot(tux, tuy) || 1; tux /= lu; tuy /= lu;
      return { d: Math.sqrt(bd), sin: Math.abs(tux * bty - tuy * btx) };
    };
    for (const x of M.scene.crossings as any[]) {
      const overIsA = x.over === "a"; const ov = overIsA ? x.a : x.b, un = overIsA ? x.b : x.a;
      const march = (dir: number): number => {
        const allD = 2 * h + MARGIN, exitD = allD + fade; let all = NaN, allSin = 1;
        for (let s = 0; ; s += 0.07) {
          const sc = Math.min(s, 4.5); const { d, sin } = distAt(un.chain, un.s + dir * sc, ov.chain, ov.s);
          if (Number.isNaN(all) && d >= allD) { all = sc; allSin = sin; }
          if (d >= exitD) return Math.min(4.5, sc + 0.07 + 0.05);
          if (!Number.isNaN(all) && sc >= all + fade / Math.max(allSin, 0.2) + 0.07) return Math.min(4.5, sc + 0.05);
          if (sc >= 4.5) return 4.5;
        }
      };
      const w: Win = { over: ov.chain, uC: un.s, neg: march(-1), pos: march(1), closed: chains[un.chain].closed, total: chains[un.chain].total };
      let arr = winsByChain.get(un.chain); if (!arr) { arr = []; winsByChain.set(un.chain, arr); } arr.push(w);
    }
  }
  // the slot's winner at a sample, as GfGapTable bakes it: the crossing whose winM
  // v = (window end on that side) - |off| is largest there (later crossings win ties,
  // as their slot write overwrites); -1 when no window reaches the sample.
  const namedWinner = (ci: number, s: number): number => {
    const arr = winsByChain.get(ci); if (!arr) return -1;
    let best = -Infinity, over = -1;
    for (const w of arr) { let du = s - w.uC; if (w.closed && w.total > 0) du -= w.total * Math.floor(du / w.total + 0.5); const v = (du >= 0 ? w.pos : w.neg) - Math.abs(du); if (v >= best) { best = v; over = w.over; } }
    return best >= -0.01 ? over : -1;
  };
  // bounds from the tables vertices
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < T.nV; i++) { const x = T.vx[i], y = T.vy[i]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  x0 -= h + 0.1; y0 -= h + 0.1; x1 += h + 0.1; y1 += h + 0.1;
  const W = Math.max(1, Math.ceil((x1 - x0) * PPU)), H = Math.max(1, Math.ceil((y1 - y0) * PPU));
  // near-centreline mask from vertices (dense samples of every centreline)
  const R = 0.55, RP = Math.ceil(R * PPU);
  const near = new Uint8Array(W * H);
  for (let i = 0; i < T.nV; i++) {
    const cx = Math.round((T.vx[i] - x0) * PPU), cy = Math.round((T.vy[i] - y0) * PPU);
    for (let dy = -RP; dy <= RP; dy++) for (let dx = -RP; dx <= RP; dx++) {
      if (dx * dx + dy * dy > RP * RP) continue;
      const px = cx + dx, py = cy + dy; if (px >= 0 && px < W && py >= 0 && py < H) near[py * W + px] = 1;
    }
  }
  // counted pixels: grid cell -> key index (label,cutter,g), for clustering
  const keyOf = new Map<string, number>(); const keys: [number, number, number][] = [];
  const cellKey = new Int32Array(W * H).fill(-1);
  let total = 0;
  const fusedCache = new Map<string, Set<number>>();
  const fused = (c: number, s: number): Set<number> => {
    const k = `${c}:${Math.round(s * 200)}`; let v = fusedCache.get(k); if (!v) { v = fusedGroups(T, c, s); fusedCache.set(k, v); } return v;
  };
  for (let r = 0; r < H; r++) {
    const wy = y0 + (r + 0.5) / PPU;
    for (let c = 0; c < W; c++) {
      const idx = r * W + c; if (!near[idx]) continue;
      const wx = x0 + (c + 0.5) / PPU;
      const o = E.eval(wx, wy);
      if (o.cov < 0.5 || o.chain < 0) continue;
      let lk = Infinity, ls = 0;
      // label key: the own chain's piece nearest the pixel (nub_probe's rule)
      let ld = Infinity; lk = Infinity;
      for (let j = 0; j < E.np; j++) if (E.pc[j] === o.chain && E.pd[j] < ld) { ld = E.pd[j]; lk = E.pkey[j]; ls = E.ps[j]; }
      if (!(lk < Infinity)) continue;
      const lg = fused(o.chain, ls);
      if (lg.size === 0) continue;
      const named = namedWinner(o.chain, ls - ((T.cS0 && T.cS0[o.chain]) || 0)); // tables arcs carry the chain's start offset (cS0); scene arcs start at 0
      if (named < 0) continue; // lkGap's coverage cut is 0 outside a window
      for (let j = 0; j < E.np; j++) {
        if (E.pc[j] === o.chain) continue;
        if (!(E.pkey[j] > lk + zt) || !(E.pd[j] < h + MARGIN)) continue;
        if (FIXED ? E.pc[j] !== named : E.pc[j] === named) continue;
        const cg = fused(E.pc[j], E.ps[j]);
        let shared = -1; for (const g of lg) if (cg.has(g)) { shared = g; break; }
        if (shared < 0) continue;
        const ks = `${o.chain}<${E.pc[j]}@j${shared}`;
        let ki = keyOf.get(ks); if (ki === undefined) { ki = keys.length; keyOf.set(ks, ki); keys.push([o.chain, E.pc[j], shared]); }
        cellKey[idx] = ki; total++; break; // one cutter per pixel is enough: the cut removes it once
      }
    }
  }
  // cluster 8-connected pixels per key
  const seen = new Uint8Array(W * H); const places: Place[] = [];
  const stack: number[] = [];
  for (let i = 0; i < W * H; i++) {
    const ki = cellKey[i]; if (ki < 0 || seen[i]) continue;
    const [label, cutter, g] = keys[ki];
    const pl: Place = { label, cutter, g, n: 0, sx: 0, sy: 0, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    stack.length = 0; stack.push(i); seen[i] = 1;
    while (stack.length) {
      const cur = stack.pop()!; const cx = cur % W, cy = (cur / W) | 0;
      const wx = x0 + (cx + 0.5) / PPU, wy = y0 + (cy + 0.5) / PPU;
      pl.n++; pl.sx += wx; pl.sy += wy; pl.x0 = Math.min(pl.x0, wx); pl.x1 = Math.max(pl.x1, wx); pl.y0 = Math.min(pl.y0, wy); pl.y1 = Math.max(pl.y1, wy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const ni = ny * W + nx; if (!seen[ni] && cellKey[ni] === ki) { seen[ni] = 1; stack.push(ni); }
      }
    }
    places.push(pl);
  }
  places.sort((a, b) => b.n - a.n);
  console.log(`scene ${nm}: ${total} px at ppu ${PPU} (h ${h.toFixed(3)}, zt ${zt.toFixed(4)}, margin ${MARGIN}), ${places.length} place(s)`);
  for (const p of places) console.log(`  place label${p.label}<cutter${p.cutter}@j${p.g}: ${p.n} px, world ${(p.sx / p.n).toFixed(3)}:${(p.sy / p.n).toFixed(3)}, bbox ${p.x0.toFixed(3)}..${p.x1.toFixed(3)} x ${p.y0.toFixed(3)}..${p.y1.toFixed(3)}`);
}
