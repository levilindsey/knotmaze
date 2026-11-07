// K1228: on the inside of a turn tighter than the half-width (R < h) the
// concave-side clamp (P3.34) capped the inner offset at 0.95 R, so the
// strip thinned into the turn and left background inside the half-width
// (cross ji 51: chain 61, R 19-21 device px against a 23.4 px half-width,
// a 40 deg turn over samples 532-533). The folding samples' inner
// vertices instead collapse onto the point where the two legs' inner
// offset lines cross, so the strip covers the full half-width there
// without a folded (negative-area) triangle - the sawtooth the clamp
// was for. Scenes are rasterized off RibbonMesh's own buffers against
// the ideal outline (every point within h of the centerline), the way
// ribbon_round.test.ts scores round joins.
import { describe, expect, it } from "vitest";
import { RibbonMesh } from "../../src/render/ribbon_mesh";

const H = 0.39; // ji 51 scale: R 0.33 against h 0.39 (device 20 / 23.4)

interface Scene {
  pos: Float32Array;
  tan: Float32Array;
  n: number;
  fx: number;
  fy: number;
}

function tangents(pos: Float32Array, n: number, closed = false): Float32Array {
  const tan = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const p = closed ? (i - 1 + n) % n : Math.max(i - 1, 0);
    const q = closed ? (i + 1) % n : Math.min(i + 1, n - 1);
    const tx = pos[q * 2] - pos[p * 2];
    const ty = pos[q * 2 + 1] - pos[p * 2 + 1];
    const l = Math.hypot(tx, ty) || 1;
    tan[i * 2] = tx / l;
    tan[i * 2 + 1] = ty / l;
  }
  return tan;
}

// Straight legs joined by corners: `dirs` are the leg directions (deg)
// in order, each leg `legLen` long with samples every `sp`. Focus is
// the middle corner.
function kink(dirs: number[], sp: number, legLen: number, mirror = false): Scene {
  const sy = mirror ? -1 : 1;
  const pts: number[] = [0, 0];
  let x = 0;
  let y = 0;
  for (const d of dirs) {
    const th = (d * Math.PI) / 180;
    const ux = Math.cos(th);
    const uy = Math.sin(th) * sy;
    const steps = Math.max(1, Math.round(legLen / sp));
    for (let k = 1; k <= steps; k++) {
      x += (ux * legLen) / steps;
      y += (uy * legLen) / steps;
      pts.push(x, y);
    }
  }
  // Recentre on the middle corner (the sample where leg m-1 meets m).
  const n = pts.length / 2;
  const per = Math.max(1, Math.round(legLen / sp));
  const ci = per * Math.floor(dirs.length / 2);
  const cx = pts[ci * 2];
  const cy = pts[ci * 2 + 1];
  for (let i = 0; i < n; i++) {
    pts[i * 2] -= cx;
    pts[i * 2 + 1] -= cy;
  }
  const pos = new Float32Array(pts);
  void x;
  void y;
  return { pos, tan: tangents(pos, n), n, fx: 0, fy: 0 };
}

// A circular arc of radius R, `step` deg a sample, `total` deg in all,
// with straight legs of the end tangents at both ends.
function arc(R: number, step: number, total: number, mirror = false): Scene {
  const sy = mirror ? -1 : 1;
  const pts: number[] = [];
  const na = Math.round(total / step);
  const sp = R * ((step * Math.PI) / 180);
  const pt = (aDeg: number): [number, number] => {
    const a = ((90 - total / 2 + aDeg) * Math.PI) / 180;
    return [R * Math.cos(a), R * Math.sin(a) * sy];
  };
  const [sx, sy0] = pt(0);
  const st = Math.cos(((90 - total / 2) * Math.PI) / 180 + Math.PI / 2);
  void st;
  // Start tangent (direction of travel) at aDeg 0.
  const a0 = ((90 - total / 2) * Math.PI) / 180;
  const tx0 = -Math.sin(a0);
  const ty0 = Math.cos(a0) * sy;
  for (let k = 14; k >= 1; k--) pts.push(sx - tx0 * sp * k, sy0 - ty0 * sp * k);
  for (let k = 0; k <= na; k++) pts.push(...pt(k * step));
  const [ex, ey] = pt(total);
  const a1 = ((90 - total / 2 + total) * Math.PI) / 180;
  const tx1 = -Math.sin(a1);
  const ty1 = Math.cos(a1) * sy;
  for (let k = 1; k <= 14; k++) pts.push(ex + tx1 * sp * k, ey + ty1 * sp * k);
  const n = pts.length / 2;
  const pos = new Float32Array(pts);
  const mid = Math.floor(n / 2);
  return { pos, tan: tangents(pos, n), n, fx: pos[mid * 2], fy: pos[mid * 2 + 1] };
}

function meshOf(s: Scene, closed = false): { V: Float32Array; I: Uint32Array; m: RibbonMesh } {
  const m = new RibbonMesh(s.n, closed, 0xffffff, true, 3);
  m.update(s.pos, s.tan, H);
  const g = m.mesh.geometry;
  return { V: g.getBuffer("aPosition").data as Float32Array, I: g.indexBuffer.data as Uint32Array, m };
}

// Count strip triangles flipped from the strip's own winding (the
// (L,R,L') / (R,R',L') triangles of a plain strip all read positive).
function flips(V: Float32Array, I: Uint32Array): number {
  let bad = 0;
  for (let t = 0; t + 2 < I.length; t += 3) {
    const a = I[t] * 2;
    const b = I[t + 1] * 2;
    const c = I[t + 2] * 2;
    const area =
      (V[b] - V[a]) * (V[c + 1] - V[a + 1]) - (V[b + 1] - V[a + 1]) * (V[c] - V[a]);
    if (area < -1e-12) bad++;
  }
  return bad;
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

// Deepest ideal point (within h of the centerline) the mesh leaves
// uncovered, in a window of radius R around the scene's focus.
function bare(V: Float32Array, I: Uint32Array, s: Scene, R = 0.55, ppu = 400): number {
  const N = Math.ceil(2 * R * ppu);
  const x0 = s.fx - R;
  const y0 = s.fy - R;
  const cov = new Uint8Array(N * N);
  for (let t = 0; t + 2 < I.length; t += 3) {
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
  let worst = 0;
  for (let j = 0; j < N; j++) {
    const py = y0 + (j + 0.5) / ppu;
    for (let i = 0; i < N; i++) {
      const px = x0 + (i + 0.5) / ppu;
      if ((px - s.fx) ** 2 + (py - s.fy) ** 2 > R * R) continue;
      if (cov[j * N + i]) continue;
      const d = segDist(px, py, s.pos, s.n);
      if (d <= H && H - d > worst) worst = H - d;
    }
  }
  return worst;
}

const SCENES: Array<[string, Scene]> = [
  // ji 51: a 40 deg turn over two samples (20 deg a sample), R ~ 0.33.
  ["ji51 kink 40deg over 2 samples", kink([0, 20, 40], 0.115, 1.2)],
  ["ji51 kink mirrored", kink([0, 20, 40], 0.115, 1.2, true)],
  ["single 40deg corner, R<h", kink([0, 40], 0.14, 1.2)],
  ["single 55deg corner, R<h", kink([0, 55], 0.12, 1.2)],
  ["arc R=0.85h, 80deg", arc(0.33, 10, 80)],
  ["arc R=0.5h, 90deg", arc(0.2, 15, 90)],
  ["arc R=0.5h, 90deg mirrored", arc(0.2, 15, 90, true)],
  ["arc R=0.5h, 120deg", arc(0.19, 10, 120)],
];

describe("inner turns with R < h (K1228)", () => {
  it("covers the full half-width on the inside and flips no triangle", () => {
    for (const [name, s] of SCENES) {
      const { V, I, m } = meshOf(s);
      expect(flips(V, I), name).toBe(0);
      expect(bare(V, I, s), name).toBeLessThan(0.01);
      m.destroy();
    }
  });
});
