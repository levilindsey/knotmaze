// K1362 s13 step 2: how much of each scene's ink lies in cells whose layering order is the same at every pixel.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s13_cov.ts <out.json> [scene,...] [w] [h]
// Runs the CPU mirror (GfEval) at every pixel centre of the bench's map (fit 0.917, aa 0.5 / s, ctrlArc 0.47) and
// records, per configuration, the surfaces layers() built: their ids, sorted keys, and whether composite() reaches
// a tie swap (an adjacent gap < zt). Per cell it aggregates:
// - emp1: every pixel has at most one surface in every configuration (no order, no swap);
// - empO: every pixel's surfaces appear in one cell-wide order (by surface id; lone pieces by chain) and no pixel
//   reaches a tie swap;
// - else the cell needs the per-pixel order.
// These are the ceiling (observed, not proved). A conservative bound (an optional k1362s13_prove.ts, proveCells) would be
// the shippable number; stage 13 wrote none, since the ceiling already stays below the 100% a per-frame choice needs.
import { readFileSync, writeFileSync } from "node:fs";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";
import { GfEval } from "../../../src/render/gpu_field/eval";
const proveCells = (await import("./k1362s13_prove").catch(() => ({ proveCells: null }))).proveCells as null | ((T: GfTables) => { kind: Uint8Array; why: unknown });

const SCENES = ["def", "muse_hash", "fat", "g41_ring_tw64", "g41_def_tw64", "user_tw42.lightpaper", "g41_user_tw42", "muse_default_tw", "ring", "g41_def_tw42", "g41_user_tw64", "g41_ring_tw42"];
const out = process.argv[2];
const names = process.argv[3] && process.argv[3] !== "-" ? process.argv[3].split(",") : SCENES;
const W = +(process.argv[4] ?? 822); const H = +(process.argv[5] ?? 1506); const FIT = 0.917;

// per-config record of layers(): surfaces (ids, keys) in sorted order
interface Rec { ids: number[]; keys: number[]; chains: number[]; tie: boolean }
let recs: Rec[] = [];
const proto = GfEval.prototype as unknown as Record<string, unknown>;
const origComp = proto.composite as (this: unknown) => number;
proto.composite = function (this: { ns: number; sid: Int32Array; skey: Float64Array; sord: Int32Array; np: number; psurf: Int32Array; pc: Int32Array; ps: Float64Array; pd: Float64Array; T: GfTables }) {
  const ids: number[] = []; const keys: number[] = []; const chains: number[] = []; let tie = false;
  for (let i = 0; i < this.ns; i++) {
    const e = this.sord[i]; const id = this.sid[e];
    // a lone piece's surface (-1 - j) named by its chain, so pixels compare
    let cid = id;
    if (id < 0) { const j = -1 - id; cid = -1000 - this.pc[j] * 100000 - Math.floor(this.ps[j] / this.T.sigma); }
    ids.push(cid); keys.push(this.skey[e]);
    if (i > 0 && !(keys[i - 1] - keys[i] >= this.T.zt)) tie = true;
  }
  recs.push({ ids, keys, chains, tie });
  return origComp.call(this);
};

const res: Record<string, unknown> = {};
for (const name of names) {
  const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8"));
  scene.look.ctrlArc ??= 0.47;
  let T: GfTables = buildTables(scene, { aa: 0.01 });
  let s = 1; let cx = 0; let cy = 0;
  for (let k = 0; k < 2; k++) {
    const bw = T.gW * T.G; const bh = T.gH * T.G;
    s = FIT * Math.min(W / bw, H / bh); cx = T.gx0 + bw / 2; cy = T.gy0 + bh / 2;
    T = buildTables(scene, { aa: 0.5 / s });
  }
  const e = W / 2 - s * cx; const f = H / 2 - s * cy;
  const map = [1 / s, -e / s, -1 / s, (H - f) / s];
  const ev = new GfEval(T);
  const nCell = T.gW * T.gH;
  // per cell: inked pixels, max surfaces, tie seen, order consistent
  const cInk = new Int32Array(nCell); const cMaxNs = new Int32Array(nCell); const cTie = new Uint8Array(nCell); const cBad = new Uint8Array(nCell);
  const prec = new Map<string, number>();
  let inked = 0; let px2 = 0; let pxTie = 0;
  const t0 = Date.now();
  for (let py = 0; py < H; py++) {
    const y = map[2] * (py + 0.5) + map[3];
    for (let pxx = 0; pxx < W; pxx++) {
      const x = map[0] * (pxx + 0.5) + map[1];
      const gx = Math.floor((x - T.gx0) / T.G); const gy = Math.floor((y - T.gy0) / T.G);
      if (gx < 0 || gy < 0 || gx >= T.gW || gy >= T.gH) continue;
      const cell = gy * T.gW + gx;
      recs = [];
      const o = ev.eval(x, y);
      const ink = o.ink > 0 || o.cov > 0;
      if (ink) { inked++; cInk[cell]++; }
      let ns = 0; let tie = false;
      for (const r of recs) {
        if (r.ids.length > ns) ns = r.ids.length; if (r.tie) tie = true;

      }
      if (ns > cMaxNs[cell]) cMaxNs[cell] = ns;
      if (tie) cTie[cell] = 1;
      if (ink && ns >= 2) px2++;
      if (ink && tie) pxTie++;
      // precedence consistency: keep a per-cell map of "a above b" pairs
      if (ns >= 2) for (const r of recs) for (let i = 0; i < r.ids.length; i++) for (let k = i + 1; k < r.ids.length; k++) {
        const a = r.ids[i]; const b = r.ids[k];
        if (a === b) { cBad[cell] |= 2; continue; } // two lone pieces of one chain: no per-chain code
        const key = a < b ? `${cell}|${a}|${b}` : `${cell}|${b}|${a}`; const dir = a < b ? 1 : -1;
        const was = prec.get(key); if (was === undefined) prec.set(key, dir); else if (was !== dir) cBad[cell] |= 4;
      }
    }
  }
  // cell classes (observed)
  let inkEmp1 = 0; let inkEmpO = 0; let cells1 = 0; let cellsO = 0; let cellsInk = 0; let inkTie = 0; let inkSame = 0; let inkFlip = 0;
  for (let c = 0; c < nCell; c++) {
    if (!cInk[c]) continue; cellsInk++;
    if (cMaxNs[c] <= 1) { inkEmp1 += cInk[c]; cells1++; }
    else if (!cTie[c] && !cBad[c]) { inkEmpO += cInk[c]; cellsO++; }
    else { if (cTie[c]) inkTie += cInk[c]; else if (cBad[c] & 2) inkSame += cInk[c]; else inkFlip += cInk[c]; }
  }
  // the conservative bound
  const P = proveCells ? proveCells(T) : { kind: new Uint8Array(nCell), why: null };
  let inkP1 = 0; let inkPO = 0; let viol = 0; let cellsP = 0;
  for (let c = 0; c < nCell; c++) {
    if (!cInk[c]) continue;
    if (P.kind[c] === 1) { inkP1 += cInk[c]; cellsP++; if (cMaxNs[c] > 1) viol++; }
    else if (P.kind[c] === 2) { inkPO += cInk[c]; cellsP++; if (cTie[c] || cBad[c]) viol++; }
  }
  const pc = (n: number): number => +(100 * n / Math.max(1, inked)).toFixed(2);
  const r = {
    s: +s.toFixed(3), h: T.h, W: T.W, aa: +T.aa.toFixed(5), G: T.G, rc: +T.rc.toFixed(4), sigma: +T.sigma.toFixed(4), zt: T.zt, amp: T.amp, win: T.win,
    grid: `${T.gW}x${T.gH}`, inked, cellsInk, px2: pc(px2), pxTie: pc(pxTie),
    emp1: pc(inkEmp1), empO: pc(inkEmpO), empAll: pc(inkEmp1 + inkEmpO), cells1, cellsO, lostTie: pc(inkTie), lostSameChain: pc(inkSame), lostFlip: pc(inkFlip),
    prove1: pc(inkP1), proveO: pc(inkPO), proveAll: pc(inkP1 + inkPO), cellsP, violations: viol, why: P.why,
    sec: +((Date.now() - t0) / 1000).toFixed(1),
  };
  res[name] = r;
  console.log(name, JSON.stringify(r));
}
writeFileSync(out, JSON.stringify(res, null, 1));
