// K580 stage 3: the ribbon's round joins (src/render/ribbon_mesh.ts,
// extrudeRibbon and RibbonMesh's pool). Past a 110 deg turn a sample's
// outer side follows the round-joined ideal instead of mitering; below
// it every vertex is master's. Each case rasterizes the REAL mesh
// (RibbonMesh's own position and index buffers, pool and fans included)
// against the ideal outline - every point within h of the centerline -
// the way K580 stage 2's raster probe did: "outside" is the deepest mesh
// pixel beyond the ideal (dist - h), "bare" the deepest ideal pixel the
// mesh leaves uncovered (h - dist). The target is stage 2's visibility
// threshold, 0.01 LU (taperBulgeLU), at the a's half-width at xh 2.
import { describe, expect, it } from "vitest";
import {
  ROUND_ARC_SEGMENTS,
  ROUND_DOT_FULL,
  ROUND_DOT_START,
  RibbonMesh,
  RoundJoins,
  extrudeRibbon,
} from "../../src/render/ribbon_mesh";

const H = 0.25; // the a's half-width at xh 2 (LU), K580 stage 2
const TOL = 0.01; // stage 2's visibility threshold (taperBulgeLU)
const SP = 0.09; // sample spacing (LU)
const K = ROUND_ARC_SEGMENTS;

type Tangent = "center" | "a" | "b";
interface Scene {
  pos: Float32Array;
  tan: Float32Array;
  n: number;
  corner: number;
}

// An open run into a corner at the origin and out of it: leg a comes in
// along +x, leg b leaves turned `deg` to the left (mirror = to the right).
// legA / legB are the corner sample's own legs (unequal at a cusp); the
// other samples are SP apart over `len` LU each way. The corner's tangent
// is the centered difference (a sampler's), or follows one leg (the a's
// J: stage 2 found the tangent following one leg there).
function turn(
  deg: number,
  o: { legA?: number; legB?: number; tangent?: Tangent; mirror?: boolean; len?: number } = {}
): Scene {
  const legA = o.legA ?? SP;
  const legB = o.legB ?? SP;
  const len = o.len ?? 1.5;
  const sy = o.mirror ? -1 : 1;
  const th = (deg * Math.PI) / 180;
  const bx = Math.cos(th);
  const by = Math.sin(th) * sy;
  const pts: number[] = [];
  const na = Math.ceil(len / SP);
  for (let k = na; k >= 1; k--) pts.push(-(legA + SP * (k - 1)), 0);
  pts.push(0, 0);
  const corner = na;
  for (let k = 1; k <= na; k++) {
    const r = legB + SP * (k - 1);
    pts.push(bx * r, by * r);
  }
  const n = pts.length / 2;
  const pos = new Float32Array(pts);
  const tan = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const p = Math.max(i - 1, 0);
    const q = Math.min(i + 1, n - 1);
    let tx = pos[q * 2] - pos[p * 2];
    let ty = pos[q * 2 + 1] - pos[p * 2 + 1];
    if (i === corner && o.tangent === "a") {
      tx = 1;
      ty = 0;
    } else if (i === corner && o.tangent === "b") {
      tx = bx;
      ty = by;
    }
    const l = Math.hypot(tx, ty);
    tan[i * 2] = tx / l;
    tan[i * 2 + 1] = ty / l;
  }
  return { pos, tan, n, corner };
}

// The mesh RibbonMesh draws for a scene: its live position and index
// buffers after update().
function draw(s: Scene, h = H, widthMul: Float32Array | null = null, mesh?: RibbonMesh) {
  const m = mesh ?? new RibbonMesh(s.n, false, 0xffffff, true, 3);
  m.update(s.pos, s.tan, h, 0, widthMul);
  const g = m.mesh.geometry;
  return {
    m,
    V: g.getBuffer("aPosition").data as Float32Array,
    I: g.indexBuffer.data as Uint32Array,
  };
}

function segDist(px: number, py: number, P: Float32Array, n: number): number {
  let best = Infinity;
  for (let i = 0; i + 1 < n; i++) {
    const ax = P[i * 2];
    const ay = P[i * 2 + 1];
    const dx = P[i * 2 + 2] - ax;
    const dy = P[i * 2 + 3] - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = px - ax - dx * t;
    const ey = py - ay - dy * t;
    const d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// Rasterize the mesh in a window of radius R around the corner, PPU pixels
// a unit, and score it against the ideal (every point within h of the
// centerline polyline).
function score(
  V: Float32Array,
  I: Uint32Array,
  s: Scene,
  h = H,
  R = 0.7,
  ppu = 500
): { outside: number; bare: number } {
  const cx = s.pos[s.corner * 2];
  const cy = s.pos[s.corner * 2 + 1];
  const N = Math.ceil(2 * R * ppu);
  const x0 = cx - R;
  const y0 = cy - R;
  const cov = new Uint8Array(N * N);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 2;
    const b = I[t + 1] * 2;
    const c = I[t + 2] * 2;
    const ax = V[a], ay = V[a + 1], bx = V[b], by = V[b + 1], qx = V[c], qy = V[c + 1];
    const area = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax);
    if (Math.abs(area) < 1e-12) continue;
    const sg = area > 0 ? 1 : -1;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx, qx) - x0) * ppu));
    const i1 = Math.min(N - 1, Math.ceil((Math.max(ax, bx, qx) - x0) * ppu));
    const j0 = Math.max(0, Math.floor((Math.min(ay, by, qy) - y0) * ppu));
    const j1 = Math.min(N - 1, Math.ceil((Math.max(ay, by, qy) - y0) * ppu));
    for (let j = j0; j <= j1; j++) {
      const py = y0 + (j + 0.5) / ppu;
      for (let i = i0; i <= i1; i++) {
        const px = x0 + (i + 0.5) / ppu;
        const e0 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) * sg;
        const e1 = ((qx - bx) * (py - by) - (qy - by) * (px - bx)) * sg;
        const e2 = ((ax - qx) * (py - qy) - (ay - qy) * (px - qx)) * sg;
        if (e0 >= 0 && e1 >= 0 && e2 >= 0) cov[j * N + i] = 1;
      }
    }
  }
  // Only the segments that can reach the window.
  const near: number[] = [];
  for (let i = 0; i < s.n; i++) {
    if (Math.hypot(s.pos[i * 2] - cx, s.pos[i * 2 + 1] - cy) < R * 1.5 + h + SP) {
      near.push(s.pos[i * 2], s.pos[i * 2 + 1]);
    }
  }
  const P = new Float32Array(near);
  const np = near.length / 2;
  let outside = 0;
  let bare = 0;
  for (let j = 0; j < N; j++) {
    const py = y0 + (j + 0.5) / ppu;
    for (let i = 0; i < N; i++) {
      const px = x0 + (i + 0.5) / ppu;
      if ((px - cx) ** 2 + (py - cy) ** 2 > R * R) continue;
      const d = segDist(px, py, P, np);
      if (cov[j * N + i]) {
        if (d - h > outside) outside = d - h;
      } else if (d <= h && h - d > bare) {
        bare = h - d;
      }
    }
  }
  return { outside, bare };
}

// Master's RibbonMesh.update() loop (4acbe0f..da03e7d), verbatim but for
// `this`: the reference the identity below the threshold is pinned to.
function masterExtrude(
  out: Float32Array,
  positions: Float32Array,
  tangents: Float32Array,
  n: number,
  closed: boolean,
  halfWidth: number,
  offset = 0,
  widthMul: Float32Array | null = null
): void {
  for (let i = 0; i < n; i++) {
    const s = (offset + i) * 2;
    const sPrev = (offset + ((i - 1 + n) % n)) * 2;
    const sNext = (offset + ((i + 1) % n)) * 2;
    const cx = positions[s];
    const cy = positions[s + 1];
    let ax = cx - positions[sPrev];
    let ay = cy - positions[sPrev + 1];
    let bx = positions[sNext] - cx;
    let by = positions[sNext + 1] - cy;
    if (!closed) {
      if (i === 0) {
        ax = bx;
        ay = by;
      } else if (i === n - 1) {
        bx = ax;
        by = ay;
      }
    }
    let la = Math.hypot(ax, ay);
    let lb = Math.hypot(bx, by);
    if (la < 1e-6 && lb < 1e-6) {
      ax = bx = 1;
      ay = by = 0;
      la = lb = 1;
    } else if (la < 1e-6) {
      ax = bx;
      ay = by;
      la = lb;
    } else if (lb < 1e-6) {
      bx = ax;
      by = ay;
      lb = la;
    }
    ax /= la;
    ay /= la;
    bx /= lb;
    by /= lb;
    const dot = ax * bx + ay * by;
    const cosHalf = Math.sqrt(Math.max((1 + dot) / 2, 0.25));
    const w = halfWidth / cosHalf;
    let wInner = w;
    let innerCap = Infinity;
    const sinHalf = Math.sqrt(Math.max((1 - dot) / 2, 0));
    if (sinHalf > 1e-4) {
      const radius = ((la + lb) / 4) * (cosHalf / sinHalf);
      innerCap = Math.max(radius * 0.95, halfWidth * 0.3);
      wInner = Math.min(w, innerCap);
    }
    const cross = ax * by - ay * bx;
    let wLeft = cross > 0 ? wInner : w;
    let wRight = cross > 0 ? w : wInner;
    if (widthMul) {
      const m = widthMul[i];
      if (m > 1) {
        const grown = w * m;
        const grownInner = Math.min(grown, Math.max(innerCap, wInner));
        wLeft = cross > 0 ? grownInner : grown;
        wRight = cross > 0 ? grown : grownInner;
      } else {
        wLeft *= m;
        wRight *= m;
      }
    }
    const nx = -tangents[s + 1];
    const ny = tangents[s];
    out[i * 4] = cx + nx * wLeft;
    out[i * 4 + 1] = cy + ny * wLeft;
    out[i * 4 + 2] = cx - nx * wRight;
    out[i * 4 + 3] = cy - ny * wRight;
  }
}

// A deterministic wiggly closed loop whose every turn stays under maxDeg.
function wiggle(n: number, seed: number, kinkDeg: number): { pos: Float32Array; tan: Float32Array } {
  let r = seed;
  const rnd = () => {
    r = (r * 1103515245 + 12345) % 2147483648;
    return r / 2147483648;
  };
  const pos = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const th = (2 * Math.PI * i) / n;
    const rr = 3 + 0.4 * Math.sin(5 * th + seed) + 0.05 * rnd();
    pos[i * 2] = rr * Math.cos(th);
    pos[i * 2 + 1] = rr * Math.sin(th);
  }
  // A few kinks: pull one sample sideways until its turn reads kinkDeg.
  for (let k = 1; k < 5; k++) {
    const i = Math.floor((k * n) / 5);
    const p = (i - 1 + n) % n;
    const q = (i + 1) % n;
    const mx = (pos[p * 2] + pos[q * 2]) / 2;
    const my = (pos[p * 2 + 1] + pos[q * 2 + 1]) / 2;
    const dx = pos[q * 2] - pos[p * 2];
    const dy = pos[q * 2 + 1] - pos[p * 2 + 1];
    const half = Math.hypot(dx, dy) / 2;
    // Turn = 2 atan(off / half) for an isosceles kink.
    const off = half * Math.tan(((kinkDeg * Math.PI) / 180) / 2) * (0.4 + 0.6 * rnd());
    pos[i * 2] = mx - (dy / (2 * half)) * off;
    pos[i * 2 + 1] = my + (dx / (2 * half)) * off;
  }
  const tan = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const p = (i - 1 + n) % n;
    const q = (i + 1) % n;
    const tx = pos[q * 2] - pos[p * 2];
    const ty = pos[q * 2 + 1] - pos[p * 2 + 1];
    const l = Math.hypot(tx, ty);
    tan[i * 2] = tx / l;
    tan[i * 2 + 1] = ty / l;
  }
  return { pos, tan };
}

function maxTurnDeg(pos: Float32Array, n: number): number {
  let best = 0;
  for (let i = 0; i < n; i++) {
    const p = (i - 1 + n) % n;
    const q = (i + 1) % n;
    const ax = pos[i * 2] - pos[p * 2];
    const ay = pos[i * 2 + 1] - pos[p * 2 + 1];
    const bx = pos[q * 2] - pos[i * 2];
    const by = pos[q * 2 + 1] - pos[i * 2 + 1];
    const c = (ax * bx + ay * by) / Math.hypot(ax, ay) / Math.hypot(bx, by);
    best = Math.max(best, (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI);
  }
  return best;
}

describe("round joins: the threshold constants", () => {
  it("start rounding at 110 deg and are fully round from 120 deg", () => {
    expect(ROUND_DOT_START).toBeCloseTo(Math.cos((110 * Math.PI) / 180), 15);
    expect(ROUND_DOT_FULL).toBe(-0.5);
  });
});

describe("round joins: below the threshold nothing moves", () => {
  it("a 100 deg turn keeps master's vertices, bit for bit", () => {
    for (const tangent of ["center", "a", "b"] as Tangent[]) {
      for (const mirror of [false, true]) {
        const s = turn(100, { legA: 0.03, legB: SP, tangent, mirror });
        const want = new Float32Array(s.n * 4);
        masterExtrude(want, s.pos, s.tan, s.n, false, H);
        const got = new Float32Array(s.n * 4);
        const joins = new RoundJoins();
        extrudeRibbon(got, joins, s.pos, s.tan, s.n, false, H);
        expect(joins.count).toBe(0);
        for (let k = 0; k < want.length; k++) expect(Object.is(got[k], want[k])).toBe(true);
        // And the mesh: no pool, the quads alone.
        const { V, I } = draw(s);
        expect(I.length).toBe((s.n - 1) * 6);
        for (let k = 0; k < want.length; k++) expect(Object.is(V[k], want[k])).toBe(true);
      }
    }
  });

  it("any ribbon whose turns all stay under 110 deg is bit-identical, widthMul too", () => {
    const n = 240;
    for (let seed = 1; seed <= 6; seed++) {
      const { pos, tan } = wiggle(n, seed, 108);
      expect(maxTurnDeg(pos, n)).toBeLessThan(110);
      const mulA = new Float32Array(n);
      const mulB = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        mulA[i] = (i % 7) / 6; // reveal: 0..1
        mulB[i] = 1 + (i % 5) * 0.1; // swell
      }
      for (const mul of [null, mulA, mulB]) {
        for (const closed of [true, false]) {
          const want = new Float32Array(n * 4);
          masterExtrude(want, pos, tan, n, closed, H, 0, mul);
          const got = new Float32Array(n * 4);
          const joins = new RoundJoins();
          extrudeRibbon(got, joins, pos, tan, n, closed, H, 0, mul);
          expect(joins.count).toBe(0);
          let same = 0;
          for (let k = 0; k < want.length; k++) if (Object.is(got[k], want[k])) same++;
          expect(same).toBe(want.length);
        }
      }
    }
  });
});

describe("round joins: past the threshold the outline is the round ideal", () => {
  it("a hairpin with unequal legs: no thorn, no bite, the concave clamp holds", () => {
    for (const tangent of ["center", "a", "b"] as Tangent[]) {
      for (const mirror of [false, true]) {
        const s = turn(172, { legA: 0.03, legB: SP, tangent, mirror });
        const { m, V, I } = draw(s);
        const sc = score(V, I, s);
        expect(sc.outside).toBeLessThan(TOL);
        expect(sc.bare).toBeLessThan(TOL);
        // Master drew the thorn here: h past the ideal.
        const want = new Float32Array(s.n * 4);
        masterExtrude(want, s.pos, s.tan, s.n, false, H);
        const mI = new Uint32Array((s.n - 1) * 6);
        for (let i = 0; i < s.n - 1; i++) {
          mI.set([2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2], i * 6);
        }
        expect(score(want, mI, s).outside).toBeGreaterThan(0.6 * H);
        // The inner vertex: master's concave clamp (0.3h at a cusp), on
        // the true inner bisector -(a - b) / |a - b|.
        const c = s.corner;
        const side = mirror ? 1 : 0; // a left turn's inner side is the left
        const ix = V[c * 4 + side * 2];
        const iy = V[c * 4 + side * 2 + 1];
        expect(Math.hypot(ix, iy)).toBeCloseTo(0.3 * H, 6);
        const th = (172 * Math.PI) / 180;
        const bx = Math.cos(th);
        const by = Math.sin(th) * (mirror ? -1 : 1);
        const mx = 1 - bx;
        const my = -by;
        const ml = Math.hypot(mx, my);
        expect((-ix * mx - iy * my) / ml / Math.hypot(ix, iy)).toBeCloseTo(1, 6);
        m.destroy();
      }
    }
  });

  it("a 130 deg turn (the i's joint) and a 180 deg fold meet the target", () => {
    for (const deg of [124.4, 129.8, 130, 150, 180]) {
      for (const tangent of ["center", "a", "b"] as Tangent[]) {
        for (const mirror of [false, true]) {
          for (const legA of [SP, 0.03]) {
            const s = turn(deg, { legA, tangent, mirror });
            const { m, V, I } = draw(s);
            const sc = score(V, I, s);
            expect(sc.outside, `${deg} ${tangent} ${mirror} ${legA}`).toBeLessThan(TOL);
            expect(sc.bare, `${deg} ${tangent} ${mirror} ${legA}`).toBeLessThan(TOL);
            m.destroy();
          }
        }
      }
    }
  });

  it("pool vertices carry their sample's static attributes, on the outer edge", () => {
    const s = turn(150, { legA: 0.03 });
    const { m, I } = draw(s);
    const g = m.mesh.geometry;
    const uv = g.getBuffer("aUV").data as Float32Array;
    const key = g.getBuffer("aKey").data as Float32Array;
    const arc = g.getBuffer("aArcPos").data as Float32Array;
    const v0 = 2 * s.n;
    const outer = 2 * s.corner + 1; // left turn: the outer side is the right
    for (let k = 0; k < K; k++) {
      expect(uv[(v0 + k) * 2]).toBe(uv[outer * 2]);
      expect(uv[(v0 + k) * 2 + 1]).toBe(1);
      expect(key[(v0 + k) * 2]).toBe(3);
      expect(key[(v0 + k) * 2 + 1]).toBe(s.corner);
      expect(arc[(v0 + k) * 2]).toBe(arc[outer * 2]);
    }
    // The outgoing quad's outer corner is B, the last pool vertex.
    expect(I[s.corner * 6 + 1]).toBe(v0 + K - 1);
    expect(I[s.corner * 6 + 3]).toBe(v0 + K - 1);
    // Mask ids follow setMaskIds onto the pool.
    const ids = new Float32Array(s.n * 4).fill(-1);
    ids[s.corner * 4] = 7;
    m.setMaskIds(ids);
    const md = g.getBuffer("aMaskId").data as Float32Array;
    for (let k = 0; k < K; k++) expect(md[(v0 + k) * 4]).toBe(7);
    m.destroy();
  });
});

describe("round joins: the K81 cover strip re-emits the fill's own triangles", () => {
  // The non-degenerate triangles of a mesh, as position triples in a
  // canonical order (orientation ignored).
  const tris = (V: ArrayLike<number>, I: ArrayLike<number>): Set<string> => {
    const out = new Set<string>();
    for (let t = 0; t + 2 < I.length; t += 3) {
      const p = [I[t], I[t + 1], I[t + 2]].map((v) => [V[v * 2], V[v * 2 + 1]]);
      const area = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
      if (Math.abs(area) < 1e-12) continue;
      out.add(p.map((q) => `${q[0]},${q[1]}`).sort().join("|"));
    }
    return out;
  };
  // pushStrip's triangulation of a pair list.
  const strip = (pts: number[]): Set<string> => {
    const V: number[] = [];
    const I: number[] = [];
    for (let q = 0; q < pts.length; q += 2) V.push(pts[q], pts[q + 1]);
    for (let s = 0; s + 1 < pts.length / 4; s++) {
      const a = 2 * s, b = a + 1, c = a + 2, d = a + 3;
      I.push(a, b, c, b, d, c);
    }
    return tris(V, I);
  };

  it("at a round join (either side) the strip's triangles are the fill's, fan included", () => {
    for (const deg of [100, 115, 150, 180]) {
      for (const mirror of [false, true]) {
        const s = turn(deg, { legA: 0.03, mirror });
        const { m, V, I } = draw(s);
        const pts: number[] = [];
        let pairs = 0;
        for (let k = 0; k < s.n; k++) pairs += m.coverPairs(k, pts, 1000);
        const want = deg > 110 ? s.n + K : s.n;
        expect(pairs, `${deg} ${mirror}`).toBe(want);
        expect(pts.length, `${deg} ${mirror}`).toBe(4 * want);
        expect([...strip(pts)].sort(), `${deg} ${mirror}`).toEqual([...tris(V, I)].sort());
        m.destroy();
      }
    }
  });

  it("without room for the fan a round sample falls back to its own pair", () => {
    const s = turn(150, { legA: 0.03 });
    const { m } = draw(s);
    const pts: number[] = [];
    expect(m.coverPairs(s.corner, pts, K)).toBe(1);
    expect(pts.length).toBe(4);
    expect(m.coverPairs(s.corner, pts, K + 1)).toBe(1 + K);
    expect(pts.length).toBe(4 * (2 + K));
    m.destroy();
  });
});

describe("round joins: a turn swept through the threshold moves continuously", () => {
  // The corner's outline vertices at one turn: its two main vertices, then
  // its K pool vertices (a sample with no join: K copies of its outer
  // vertex, where the pool spreads from).
  function cornerVerts(deg: number, mesh: RibbonMesh): number[] {
    const s = turn(deg, { legA: 0.05, tangent: "a" });
    const { V } = draw(s, H, null, mesh);
    const c = s.corner;
    const outer = 2 * c + 1;
    const out = [V[c * 4], V[c * 4 + 1], V[c * 4 + 2], V[c * 4 + 3]];
    const joins = (mesh as unknown as { joins: RoundJoins }).joins;
    if (joins.count > 0) {
      for (let f = 0; f < K * 2; f++) out.push(joins.pos[f]);
    } else {
      for (let k = 0; k < K; k++) out.push(V[outer * 2], V[outer * 2 + 1]);
    }
    return out;
  }
  function maxJump(a: number[], b: number[]): number {
    let best = 0;
    for (let k = 0; k < a.length; k += 2) {
      best = Math.max(best, Math.hypot(a[k] - b[k], a[k + 1] - b[k + 1]));
    }
    return best;
  }

  it("1 deg steps from 100 to 130 deg: the largest step is bounded, and shrinks with the step", () => {
    const n = turn(100, { legA: 0.05 }).n;
    const mesh = new RibbonMesh(n, false, 0xffffff, true, 0);
    let worst = 0;
    let worstAt = 0;
    let prev = cornerVerts(100, mesh);
    for (let deg = 101; deg <= 130; deg++) {
      const cur = cornerVerts(deg, mesh);
      const j = maxJump(prev, cur);
      if (j > worst) {
        worst = j;
        worstAt = deg;
      }
      prev = cur;
    }
    // The fastest vertex is the pool's last one, B: it travels about 2.4h
    // across the 10 deg band (from the miter tip to h out along leg b's
    // normal), and a smoothstep's peak slope is 1.5x its mean, so it moves
    // 0.36h in the degree at 116 deg (measured 0.090 LU at h 0.25).
    // Outside the band a corner vertex moves about 0.02h a degree.
    expect(worst).toBeLessThan(0.4 * H);
    expect(worstAt).toBeGreaterThan(110);
    expect(worstAt).toBeLessThanOrEqual(120);
    // A pop would not shrink with the step: at 0.1 deg the worst is ~10x
    // smaller.
    let fine = 0;
    prev = cornerVerts(109, mesh);
    for (let k = 1; k <= 120; k++) {
      const cur = cornerVerts(109 + k * 0.1, mesh);
      fine = Math.max(fine, maxJump(prev, cur));
      prev = cur;
    }
    expect(fine).toBeLessThan(worst / 6);
    // The pool starts collapsed on the miter vertex.
    const before = cornerVerts(109.999, mesh);
    const after = cornerVerts(110.001, mesh);
    expect(maxJump(before, after)).toBeLessThan(1e-4);
    mesh.destroy();
  });

  it("the outline meets the target at every degree from 120 deg up", () => {
    for (let deg = 120; deg <= 180; deg += 2) {
      const s = turn(deg, { legA: 0.05, tangent: "a" });
      const { m, V, I } = draw(s);
      const sc = score(V, I, s, H, 0.6, 300);
      expect(sc.outside, `${deg}`).toBeLessThan(TOL);
      expect(sc.bare, `${deg}`).toBeLessThan(TOL);
      m.destroy();
    }
  });

  it("a sample that crosses the threshold back and forth stops allocating", () => {
    const n = turn(100).n;
    const mesh = new RibbonMesh(n, false, 0xffffff, true, 0);
    const a = turn(105, { legA: 0.05 });
    const b = turn(140, { legA: 0.05 });
    mesh.update(b.pos, b.tan, H);
    const g = mesh.mesh.geometry;
    const pos0 = g.getBuffer("aPosition").data;
    const idx0 = g.indexBuffer.data;
    for (let k = 0; k < 20; k++) {
      const s = k % 2 ? a : b;
      mesh.update(s.pos, s.tan, H);
    }
    expect(g.getBuffer("aPosition").data).toBe(pos0);
    expect(g.indexBuffer.data).toBe(idx0);
    // Below the threshold again: the fan is unwired and the quad restored.
    mesh.update(a.pos, a.tan, H);
    const I = g.indexBuffer.data as Uint32Array;
    for (let i = 0; i < n - 1; i++) {
      expect(I[i * 6 + 1]).toBe(2 * i + 1);
      expect(I[i * 6]).toBe(2 * i);
    }
    for (let k = (n - 1) * 6; k < I.length; k++) expect(I[k]).toBe(0);
    mesh.destroy();
  });
});
