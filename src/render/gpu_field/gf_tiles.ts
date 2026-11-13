// K1362 s5: route the per-pixel pass by GEOMETRY instead of by stencil. Each grid cell is cut into sub x sub
// world-space tiles; each tile gets an upper bound, from the tables, on what any pixel in it can hold (pieces, corners),
// and is drawn as an instanced quad by the smallest program whose arrays hold that bound. A tile no piece or corner
// can reach is not drawn at all: the pass clears the grid's rectangle to the program's empty output (0, 0, 0, 1).
//
// Exact by construction: a tier program never overflows inside a tile whose bound it holds, and where it does not
// overflow its state is the full program's step for step (K1362 s4, gf_glsl.ts), so every pixel gets the full
// program's output. The bounds are conservative against the shader's float32 arithmetic (the margins below).
//
// The pieces bound. Per pixel, the program merges a segment within rc into the first piece of the same chain whose
// arc position is within sigma (circular on a closed chain), else opens a new piece. Per tile and chain, take every
// segment of the tile's cells' chunks whose bounding box comes within rc of the (padded) tile, as its arc interval,
// and merge intervals less than sigma apart into groups. Two groups are at least sigma apart, so they never share a
// piece; a group spanning less than sigma holds at most one piece (any two of its positions are within sigma, so a
// segment always finds the group's piece once it exists). The bound is the number of groups; a group spanning
// sigma or more has no bound and sends the tile to the full program.
//
// The corners bound: the corners in the tile's cells' lists whose annulus (or through-pass reach) can touch the tile.
//
// The ramps bound (for NORAMP tiers, gf_glsl.ts): member() gives a fractional ramp only where some arm of the piece's
// chain has d = (s - sR) * dir (mod len on a closed chain) inside (Lcut - h, Lcut), its ss() window; elsewhere ss is
// exactly 0 or 1. A tile none of whose candidate intervals meets such a window (padded) holds no ramping piece.
import type { GfTables } from "./tables";
import type { GfTier } from "./gf_glsl";

export interface GfTileRoute {
  sub: number;
  /** The tile rects (x0, y0, x1, y1, world), class by class: class i < tiers.length is tier i, the last is full. */
  rects: Float32Array;
  /** Per class: first tile and count in rects. */
  first: number[];
  count: number[];
  /** Tiles nothing reaches (not drawn), and all tiles. */
  empty: number;
  total: number;
  ms: number;
}

const UNBOUNDED = 1 << 20;

/** Classify the grid's tiles for the tiers (smallest first; a tile goes to the first tier holding its bound). */
export function buildTileRoute(T: GfTables, tiers: GfTier[], sub: number, prev?: GfTileRoute): GfTileRoute {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const nx = T.gW * sub; const ny = T.gH * sub; const Gs = T.G / sub;
  const xs = new Float64Array(nx + 1); const ys = new Float64Array(ny + 1);
  for (let i = 0; i <= nx; i++) xs[i] = Math.fround(T.gx0 + i * Gs);
  for (let i = 0; i <= ny; i++) ys[i] = Math.fround(T.gy0 + i * Gs);
  // float32 slack: the shader's world point and the rasterizer's tile edge may disagree by a few ulps of the coordinates
  const ext = Math.abs(T.gx0) + Math.abs(T.gy0) + (T.gW + T.gH) * T.G;
  const pad = 1e-3 * Gs + 1e-5 * ext;
  const rcm = T.rc * (1 + 1e-5) + 1e-5 * ext;
  let maxLen = 0; for (let c = 0; c < T.nC; c++) if (T.cLen[c] > maxLen) maxLen = T.cLen[c];
  const sEps = 1e-5 * (maxLen + 1);
  const sigHi = T.sigma + sEps; const sigLo = T.sigma - sEps;
  const W = T.W; const aa = T.aa;
  const needRamp = tiers.some((t) => !t.ramps);
  // can a piece of chain c at an arc position in [a, b] ramp? (conservative: any overlap with an arm's ss window)
  const rampHit = (c: number, a: number, b: number): boolean => {
    const len = T.cLen[c]; const closed = T.cClosed[c] === 1;
    for (let i = T.cArm0[c]; i < T.cArm0[c] + T.cArmN[c]; i++) {
      const Lc = T.aLcut[i]; if (!(Lc < 1e29)) continue;
      const za = T.aSR[i] + T.aDir[i] * (Lc - T.h); const zb = T.aSR[i] + T.aDir[i] * Lc;
      const zlo = Math.min(za, zb) - sEps; const zhi = Math.max(za, zb) + sEps;
      if (!closed || !(len > 0)) { if (b >= zlo && a <= zhi) return true; continue; }
      const m0 = Math.floor((a - zhi) / len); const m1 = Math.ceil((b - zlo) / len);
      for (let m = m0; m <= m1; m++) if (b >= zlo + m * len && a <= zhi + m * len) return true;
    }
    return false;
  };
  const nCls = tiers.length + 1;
  const cls = new Uint8Array(nx * ny); const nPer = new Int32Array(nCls);
  const chStamp = new Int32Array(T.nCh).fill(-1); const kStamp = new Int32Array(T.nK).fill(-1);
  // candidate intervals of the current tile: chain, s0, s1
  let cap = 256; let iC = new Int32Array(cap); let iS0 = new Float64Array(cap); let iS1 = new Float64Array(cap);
  let ord = new Int32Array(cap);
  let empty = 0;
  for (let ty = 0; ty < ny; ty++) {
    for (let tx = 0; tx < nx; tx++) {
      const tile = ty * nx + tx;
      const x0 = xs[tx] - pad; const x1 = xs[tx + 1] + pad; const y0 = ys[ty] - pad; const y1 = ys[ty + 1] + pad;
      const cx0 = Math.max(0, Math.floor((x0 - T.gx0) / T.G)); const cx1 = Math.min(T.gW - 1, Math.floor((x1 - T.gx0) / T.G));
      const cy0 = Math.max(0, Math.floor((y0 - T.gy0) / T.G)); const cy1 = Math.min(T.gH - 1, Math.floor((y1 - T.gy0) / T.G));
      let n = 0; let nk = 0; let anyK = false;
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const cell = cy * T.gW + cx;
        const a0 = T.cellCh0[cell]; const an = T.cellChN[cell];
        for (let q = a0; q < a0 + an; q++) {
          const ch = T.cellChList[q];
          if (chStamp[ch] === tile) continue;
          chStamp[ch] = tile;
          const bx = Math.max(T.chBox[4 * ch] - x1, 0, x0 - T.chBox[4 * ch + 2]);
          const by = Math.max(T.chBox[4 * ch + 1] - y1, 0, y0 - T.chBox[4 * ch + 3]);
          if (bx * bx + by * by >= rcm * rcm) continue;
          const c = T.chC[ch]; const v0 = T.chV0[ch];
          for (let i = 0; i < T.chN[ch]; i++) {
            const v = v0 + i;
            const ax = T.vx[v]; const ay = T.vy[v]; const ex = T.vx[v + 1]; const ey = T.vy[v + 1];
            const sx = Math.max(Math.min(ax, ex) - x1, 0, x0 - Math.max(ax, ex));
            const sy = Math.max(Math.min(ay, ey) - y1, 0, y0 - Math.max(ay, ey));
            if (sx * sx + sy * sy >= rcm * rcm) continue;
            if (n === cap) {
              cap *= 2;
              const c2 = new Int32Array(cap); c2.set(iC); iC = c2;
              const a2 = new Float64Array(cap); a2.set(iS0); iS0 = a2;
              const b2 = new Float64Array(cap); b2.set(iS1); iS1 = b2;
              ord = new Int32Array(cap);
            }
            iC[n] = c; iS0[n] = Math.min(T.vs[v], T.vs[v + 1]) - sEps; iS1[n] = Math.max(T.vs[v], T.vs[v + 1]) + sEps; n++;
          }
        }
        const k0 = T.cellK0[cell]; const kn = T.cellKN[cell];
        for (let q = k0; q < k0 + kn; q++) {
          const k = T.cellKList[q];
          if (kStamp[k] === tile) continue;
          kStamp[k] = tile;
          const kx = T.kCx[k]; const ky = T.kCy[k];
          const dx = Math.max(x0 - kx, 0, kx - x1); const dy = Math.max(y0 - ky, 0, ky - y1);
          const dMin = Math.sqrt(dx * dx + dy * dy);
          const fx = Math.max(Math.abs(x0 - kx), Math.abs(x1 - kx)); const fy = Math.max(Math.abs(y0 - ky), Math.abs(y1 - ky));
          const dMax = Math.sqrt(fx * fx + fy * fy);
          const reach = T.kRmax[k] + W + 2 * aa + pad; const inner = T.kR[k] - aa - W - pad;
          if (T.kThru[k] && dMin <= T.kRV[k] + W + 4 * aa + pad) anyK = true;
          if (dMin <= reach && dMax > inner) { nk++; anyK = true; }
        }
      }
      // group the intervals per chain
      let np = 0; let ramp = false;
      if (needRamp) for (let i = 0; i < n && !ramp; i++) ramp = rampHit(iC[i], iS0[i], iS1[i]);
      if (n > 0) {
        for (let i = 0; i < n; i++) ord[i] = i;
        const o = ord.subarray(0, n);
        o.sort((a, b) => (iC[a] - iC[b]) || (iS0[a] - iS0[b]));
        let i = 0;
        while (i < n && np < UNBOUNDED) {
          const c = iC[o[i]]; const len = T.cLen[c]; const closed = T.cClosed[c] === 1;
          // the chain's run of intervals: o[i..j)
          let j = i; while (j < n && iC[o[j]] === c) j++;
          // linear groups
          const g0: number[] = []; const g1: number[] = [];
          let lo = iS0[o[i]]; let hi = iS1[o[i]];
          for (let m = i + 1; m < j; m++) {
            const a = iS0[o[m]]; const b = iS1[o[m]];
            if (a - hi < sigHi) { if (b > hi) hi = b; } else { g0.push(lo); g1.push(hi); lo = a; hi = b; }
          }
          g0.push(lo); g1.push(hi);
          // a closed chain's first and last groups merge across the seam
          let spans = g0.map((a, m) => g1[m] - a);
          if (closed && g0.length > 1 && g0[0] + len - g1[g1.length - 1] < sigHi) {
            const s = g1[0] + len - g0[g0.length - 1];
            spans = spans.slice(1, -1); spans.push(s);
          }
          for (const s of spans) { if (s >= sigLo) { np = UNBOUNDED; break; } np++; }
          i = j;
        }
      }
      let k = 0;
      if (np === 0 && !anyK) { k = -1; empty++; }
      else { while (k < tiers.length && !(np <= tiers[k].p && nk <= tiers[k].k && (tiers[k].ramps || !ramp))) k++; }
      cls[tile] = k < 0 ? 255 : k;
      if (k >= 0) nPer[k]++;
    }
  }
  const first: number[] = []; const count: number[] = [];
  let tot = 0; for (let k = 0; k < nCls; k++) { first.push(tot); count.push(nPer[k]); tot += nPer[k]; }
  const rects = prev && prev.rects.length >= 4 * tot ? prev.rects : new Float32Array(4 * Math.max(1, tot));
  const at = first.slice();
  for (let ty = 0; ty < ny; ty++) for (let tx = 0; tx < nx; tx++) {
    const k = cls[ty * nx + tx]; if (k === 255) continue;
    const r = 4 * at[k]++;
    rects[r] = xs[tx]; rects[r + 1] = ys[ty]; rects[r + 2] = xs[tx + 1]; rects[r + 3] = ys[ty + 1];
  }
  const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  return { sub, rects, first, count, empty, total: nx * ny, ms };
}
