// K1362 s5: route the per-pixel pass by GEOMETRY instead of by stencil. The grid is cut into world-space tiles of tc x tc
// cells; each tile gets an upper bound, from the tables, on what any pixel in it can hold (pieces, corners, a ramp), and
// is drawn as an instanced quad by the smallest program whose arrays hold that bound. A tile no piece or corner can reach
// is not drawn at all: the pass clears the grid's rectangle to the program's empty output (0, 0, 0, 1).
//
// Exact by construction: a tier program never overflows inside a tile whose bound it holds, and where it does not
// overflow its state is the full program's step for step (K1362 s4, gf_glsl.ts), so every pixel gets the full
// program's output. The bounds are conservative against the shader's float32 arithmetic (the margins below).
//
// The pieces bound. Per pixel, the program takes each segment within rc (its value s: the projection's arc position,
// between the segment's ends' arc positions) and merges it into the first piece of the same chain whose position is
// within sigma (circular on a closed chain), else opens a new piece; a merged segment nearer the pixel moves the piece
// to its own s. Per tile:
// - the candidates: every segment of the tile's cells' chunks whose bounding box comes within rc of the padded tile,
//   as its arc interval [s0, s1];
// - GROUPS: per chain, intervals less than sigma apart chain into one group (and across a closed chain's seam). Values
//   of two groups are always sigma or more apart, so no piece ever holds both (a piece's position is always one of its
//   own group's values);
// - a group holds at most ONE piece at any pixel when every two of its values that can occur at one pixel are within
//   sigma: then the first opens the piece and every later one finds it. Two segments occur at one pixel only if they
//   are within 2 rc of each other (each is within rc of the pixel), so the check is: every pair of the group's
//   segments whose joint interval spans sigma or more lies 2 rc or more apart. A group that fails it has no bound and
//   sends the tile to the full program;
// - the pixel's piece count is the number of groups present there, and two groups are present at one pixel only if
//   some pair of their segments lies within 2 rc: the bound is the largest clique of that graph.
// The corners bound likewise: the largest clique of the corners whose reach touches the tile, two corners adjacent
// when their reaches (disks) meet. The ramps bound (for NORAMP tiers, gf_glsl.ts): member() gives a fractional ramp only
// where some arm of the piece's chain has d = (s - sR) * dir (mod len on a closed chain) inside (Lcut - h, Lcut), its
// ss() window; elsewhere ss is exactly 0 or 1. A tile none of whose candidate intervals meets such a window (padded)
// holds no ramping piece.
import type { GfTables } from "./tables";
import type { GfTier } from "./gf_glsl";

export interface GfTileRoute {
  /** Cells per tile side. */
  tc: number;
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
/** Per tile (row-major, ceil(gW / tc) wide): the pieces and corners bounds and the ramp flag (benches). */
export interface GfTileDiag { nx?: number; np?: Int32Array; nk?: Int32Array; ramp?: Uint8Array }

/** Squared distance between segments ab and cd (0 when they cross). */
function segDist2(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): number {
  const ux = bx - ax; const uy = by - ay; const vx = dx - cx; const vy = dy - cy;
  const den = ux * vy - uy * vx;
  if (den !== 0) {
    const t = ((cx - ax) * vy - (cy - ay) * vx) / den; const s = ((cx - ax) * uy - (cy - ay) * ux) / den;
    if (t >= 0 && t <= 1 && s >= 0 && s <= 1) return 0;
  }
  const pt = (px: number, py: number, qx: number, qy: number, ex: number, ey: number): number => {
    const l2 = ex * ex + ey * ey; let t = l2 > 0 ? ((px - qx) * ex + (py - qy) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const fx = qx + ex * t - px; const fy = qy + ey * t - py; return fx * fx + fy * fy;
  };
  return Math.min(pt(ax, ay, cx, cy, vx, vy), pt(bx, by, cx, cy, vx, vy), pt(cx, cy, ax, ay, ux, uy), pt(dx, dy, ax, ay, ux, uy));
}

/** The largest clique of an undirected graph of n <= 31 nodes (adj[i]: bitmask of i's neighbours). */
function maxClique(n: number, adj: Int32Array): number {
  let best = 0;
  const grow = (size: number, cand: number): void => {
    if (cand === 0) { if (size > best) best = size; return; }
    // bound: size + popcount(cand)
    let pc = cand - ((cand >>> 1) & 0x55555555); pc = (pc & 0x33333333) + ((pc >>> 2) & 0x33333333);
    pc = (((pc + (pc >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
    if (size + pc <= best) return;
    while (cand !== 0) {
      const i = 31 - Math.clz32(cand & -cand);
      cand &= ~(1 << i);
      grow(size + 1, cand & adj[i]);
      let p2 = cand - ((cand >>> 1) & 0x55555555); p2 = (p2 & 0x33333333) + ((p2 >>> 2) & 0x33333333);
      p2 = (((p2 + (p2 >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
      if (size + p2 <= best) return;
    }
  };
  grow(0, n >= 31 ? 0x7fffffff : (1 << n) - 1);
  return best;
}

/**
 * Classify the grid's tiles for the tiers (smallest first; a tile goes to the first tier holding its bound). opt 0 is
 * the exact bound. opt 1 is OPTIMISTIC: every group counts as one piece (no within-group span check), so a tier tile can
 * overflow at a pixel; opt 2 also drops the ramp test (a NORAMP tier discards a ramping pixel). Both need the pass's
 * stencil fallback: a tier's discard leaves the pixel to the full program, which redraws every pixel no tier wrote.
 */
export function buildTileRoute(T: GfTables, tiers: GfTier[], tc: number, prev?: GfTileRoute, diag?: GfTileDiag, opt = 0): GfTileRoute {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const nx = Math.ceil(T.gW / tc); const ny = Math.ceil(T.gH / tc);
  const xs = new Float64Array(nx + 1); const ys = new Float64Array(ny + 1);
  for (let i = 0; i <= nx; i++) xs[i] = Math.fround(T.gx0 + Math.min(T.gW, i * tc) * T.G);
  for (let i = 0; i <= ny; i++) ys[i] = Math.fround(T.gy0 + Math.min(T.gH, i * tc) * T.G);
  // float32 slack: the shader's world point and the rasterizer's tile edge may disagree by a few ulps of the coordinates
  const ext = Math.abs(T.gx0) + Math.abs(T.gy0) + (T.gW + T.gH) * T.G;
  const pad = 1e-3 * T.G + 1e-5 * ext;
  const rcm = T.rc * (1 + 1e-5) + 1e-5 * ext;
  const far2 = (2 * rcm) * (2 * rcm);
  let maxLen = 0; for (let c = 0; c < T.nC; c++) if (T.cLen[c] > maxLen) maxLen = T.cLen[c];
  const sEps = 1e-5 * (maxLen + 1);
  const sigHi = T.sigma + sEps; const sigLo = T.sigma - sEps;
  const W = T.W; const aa = T.aa;
  const needRamp = opt < 2 && tiers.some((t) => !t.ramps);
  const maxP = tiers.reduce((m, t) => Math.max(m, t.p), 0); const maxK = tiers.reduce((m, t) => Math.max(m, t.k), 0);
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
  const near = (p: number, q: number): boolean => {
    const vp = iV[p]; const vq = iV[q];
    const pax = T.vx[vp]; const pay = T.vy[vp]; const pbx = T.vx[vp + 1]; const pby = T.vy[vp + 1];
    const qax = T.vx[vq]; const qay = T.vy[vq]; const qbx = T.vx[vq + 1]; const qby = T.vy[vq + 1];
    const bx = Math.max(Math.min(qax, qbx) - Math.max(pax, pbx), 0, Math.min(pax, pbx) - Math.max(qax, qbx));
    const by = Math.max(Math.min(qay, qby) - Math.max(pay, pby), 0, Math.min(pay, pby) - Math.max(qay, qby));
    if (bx * bx + by * by >= far2) return false;
    return segDist2(pax, pay, pbx, pby, qax, qay, qbx, qby) < far2;
  };
  const nCls = tiers.length + 1;
  const cls = new Uint8Array(nx * ny); const nPer = new Int32Array(nCls);
  const chStamp = new Int32Array(T.nCh).fill(-1); const kStamp = new Int32Array(T.nK).fill(-1);
  // candidate intervals of the current tile: chain, s0, s1, vertex
  let cap = 256; let iC = new Int32Array(cap); let iS0 = new Float64Array(cap); let iS1 = new Float64Array(cap);
  let iV = new Int32Array(cap); let ord = new Int32Array(cap); let gOf = new Int32Array(cap);
  // groups of the current tile: their members are ord[gA[g]..gB[g]) (a seam group: two runs, see below)
  const gA: number[] = []; const gB: number[] = []; const gA2: number[] = []; const gB2: number[] = [];
  const gBox: number[] = [];
  const kList: number[] = [];
  const adj = new Int32Array(31);
  let empty = 0;
  if (diag) { diag.nx = nx; diag.np = new Int32Array(nx * ny); diag.nk = new Int32Array(nx * ny); diag.ramp = new Uint8Array(nx * ny); }
  for (let ty = 0; ty < ny; ty++) {
    for (let tx = 0; tx < nx; tx++) {
      const tile = ty * nx + tx;
      const x0 = xs[tx] - pad; const x1 = xs[tx + 1] + pad; const y0 = ys[ty] - pad; const y1 = ys[ty + 1] + pad;
      const cx0 = Math.max(0, Math.floor((x0 - T.gx0) / T.G)); const cx1 = Math.min(T.gW - 1, Math.floor((x1 - T.gx0) / T.G));
      const cy0 = Math.max(0, Math.floor((y0 - T.gy0) / T.G)); const cy1 = Math.min(T.gH - 1, Math.floor((y1 - T.gy0) / T.G));
      let n = 0; let anyK = false; kList.length = 0;
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
              const v2 = new Int32Array(cap); v2.set(iV); iV = v2;
              ord = new Int32Array(cap); gOf = new Int32Array(cap);
            }
            iC[n] = c; iV[n] = v;
            iS0[n] = Math.min(T.vs[v], T.vs[v + 1]) - sEps; iS1[n] = Math.max(T.vs[v], T.vs[v + 1]) + sEps; n++;
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
          if (dMin <= reach && dMax > inner) { kList.push(k); anyK = true; }
        }
      }
      // the corners bound: the largest clique of corners whose reach disks meet
      let nk = kList.length;
      if (nk > maxK && nk <= 31) {
        for (let a = 0; a < nk; a++) adj[a] = 0;
        for (let a = 0; a < nk; a++) for (let b = a + 1; b < nk; b++) {
          const ka = kList[a]; const kb = kList[b];
          const ra = T.kRmax[ka] + W + 2 * aa + pad; const rb = T.kRmax[kb] + W + 2 * aa + pad;
          const ddx = T.kCx[ka] - T.kCx[kb]; const ddy = T.kCy[ka] - T.kCy[kb];
          if (ddx * ddx + ddy * ddy <= (ra + rb) * (ra + rb)) { adj[a] |= 1 << b; adj[b] |= 1 << a; }
        }
        nk = maxClique(nk, adj);
      }
      // group the intervals per chain
      let ng = 0; let np = 0; let ramp = false;
      if (needRamp) for (let i = 0; i < n && !ramp; i++) ramp = rampHit(iC[i], iS0[i], iS1[i]);
      if (n > 0) {
        for (let i = 0; i < n; i++) ord[i] = i;
        const o = ord.subarray(0, n);
        o.sort((a, b) => (iC[a] - iC[b]) || (iS0[a] - iS0[b]));
        gA.length = 0; gB.length = 0; gA2.length = 0; gB2.length = 0;
        let i = 0;
        while (i < n) {
          const c = iC[o[i]]; const len = T.cLen[c]; const closed = T.cClosed[c] === 1;
          let j = i; while (j < n && iC[o[j]] === c) j++;
          const first = gA.length;
          let hi = iS1[o[i]]; let start = i;
          for (let m = i + 1; m < j; m++) {
            const a = iS0[o[m]];
            if (a - hi >= sigHi) { gA.push(start); gB.push(m); gA2.push(0); gB2.push(0); start = m; }
            if (iS1[o[m]] > hi) hi = iS1[o[m]];
          }
          gA.push(start); gB.push(j); gA2.push(0); gB2.push(0);
          // a closed chain's first and last groups merge across the seam (the first one's values shift by len)
          const last = gA.length - 1;
          if (closed && last > first) {
            let lastHi = -Infinity; for (let m = gA[last]; m < gB[last]; m++) if (iS1[o[m]] > lastHi) lastHi = iS1[o[m]];
            if (iS0[o[gA[first]]] + len - lastHi < sigHi) {
              gA2[last] = gA[first]; gB2[last] = gB[first];
              gA.splice(first, 1); gB.splice(first, 1); gA2.splice(first, 1); gB2.splice(first, 1);
            }
          }
          i = j;
        }
        ng = gA.length;
        // one piece per group, unless two of its values that can occur at one pixel lie sigma or more apart
        for (let g = 0; g < ng && np < UNBOUNDED; g++) {
          const shift = T.cLen[iC[o[gA[g]]]];
          const cnt = gB[g] - gA[g] + gB2[g] - gA2[g];
          const at = (m: number): number => (m < gB[g] - gA[g] ? o[gA[g] + m] : o[gA2[g] + m - (gB[g] - gA[g])]);
          const lo = (m: number): number => (m < gB[g] - gA[g] ? iS0[at(m)] : iS0[at(m)] + shift);
          const hiOf = (m: number): number => (m < gB[g] - gA[g] ? iS1[at(m)] : iS1[at(m)] + shift);
          let span = -Infinity; let base = Infinity;
          for (let m = 0; m < cnt; m++) { if (hiOf(m) > span) span = hiOf(m); if (lo(m) < base) base = lo(m); }
          if (opt === 0 && span - base >= sigLo) {
            let ok = true; const closedG = T.cClosed[iC[o[gA[g]]]] === 1;
            for (let p = 0; p < cnt && ok; p++) for (let q = p + 1; q < cnt; q++) {
              // the farthest two values of the pair can lie, circularly on a closed chain (the merge test's distance)
              let b = Math.max(hiOf(p), hiOf(q)) - Math.min(lo(p), lo(q));
              if (closedG && b <= shift) b = Math.min(b, shift - Math.max(0, Math.max(lo(p), lo(q)) - Math.min(hiOf(p), hiOf(q))));
              if (b < sigLo) continue;
              if (near(at(p), at(q))) { ok = false; break; }
            }
            if (!ok) { np = UNBOUNDED; break; }
          }
          for (let m = 0; m < cnt; m++) gOf[at(m)] = g;
          np++;
        }
        // the groups present at one pixel: the largest clique of groups with segments within 2 rc
        if (np < UNBOUNDED && np > maxP && ng <= 31) {
          gBox.length = 0;
          for (let g = 0; g < ng; g++) { adj[g] = 0; gBox.push(Infinity, Infinity, -Infinity, -Infinity); }
          for (let m = 0; m < n; m++) {
            const g = gOf[m]; const v = iV[m];
            gBox[4 * g] = Math.min(gBox[4 * g], T.vx[v], T.vx[v + 1]); gBox[4 * g + 1] = Math.min(gBox[4 * g + 1], T.vy[v], T.vy[v + 1]);
            gBox[4 * g + 2] = Math.max(gBox[4 * g + 2], T.vx[v], T.vx[v + 1]); gBox[4 * g + 3] = Math.max(gBox[4 * g + 3], T.vy[v], T.vy[v + 1]);
          }
          for (let a = 0; a < ng; a++) for (let b = a + 1; b < ng; b++) {
            const bx = Math.max(gBox[4 * b] - gBox[4 * a + 2], 0, gBox[4 * a] - gBox[4 * b + 2]);
            const by = Math.max(gBox[4 * b + 1] - gBox[4 * a + 3], 0, gBox[4 * a + 1] - gBox[4 * b + 3]);
            if (bx * bx + by * by >= far2) continue;
            let hit = false;
            for (let p = 0; p < n && !hit; p++) {
              if (gOf[p] !== a) continue;
              for (let q = 0; q < n; q++) if (gOf[q] === b && near(p, q)) { hit = true; break; }
            }
            if (hit) { adj[a] |= 1 << b; adj[b] |= 1 << a; }
          }
          np = maxClique(ng, adj);
        }
      }
      let k = 0;
      if (ng === 0 && !anyK) { k = -1; empty++; }
      else { while (k < tiers.length && !(np <= tiers[k].p && nk <= tiers[k].k && (tiers[k].ramps || !ramp))) k++; }
      if (diag) { diag.np![tile] = np; diag.nk![tile] = nk; diag.ramp![tile] = ramp ? 1 : 0; }
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
  return { tc, rects, first, count, empty, total: nx * ny, ms };
}
