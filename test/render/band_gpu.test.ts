// K1240 S4b: the band's tie alpha per fragment (band_gpu) against the
// prototype's per vertex (draw.bandData's alphaAt, as draw.tieAlpha). The
// shader's CPU twin (alphaCpu), fed what a fragment gets (its quad's pass
// slots, own s, dC and own depth, the two float32 tables), must give
// alphaAt's value at points across every border quad: the passes it keeps
// per quad, footNear's window as k-ranges, the self skip and the "one
// partner stretch counts once" rule all reproduced. The GLSL in
// outline_app.ts is alphaCpu line for line.
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { structure, frame } from "../../src/render/outline/outline";
import { tieAlpha, zAtC, zChains } from "../../src/render/outline/draw";
import { alphaCpu, bandGpu, BAND_SLOTS } from "../../src/render/outline/band_gpu";
import { loadScene } from "./outline_digest";

describe("K1240 S4b GPU band", () => {
  it("alphaCpu equals bandData's alphaAt across the ring's band", () => {
    const sc = loadScene(fileURLToPath(new URL("./fixtures/outline_ring.json.gz", import.meta.url)));
    const tb = frame(structure(sc), sc);
    const zz = zChains(sc);
    const b = bandGpu(tb, sc, zz);
    const ref = tieAlpha(zz, tb.h, tb.W, 0.1 * sc.look.depthAmp);
    expect(b.dropped).toBe(0);
    // Quads in table order: map each to its piece's chain.
    const chainOf: number[] = [];
    for (const p of tb.pieces) { const np = p.pts.length / 2; for (let i = 0; i + 1 < np; i++) chainOf.push(p.chain); }
    expect(6 * chainOf.length).toBe(b.count);
    let n = 0; let tied = 0; let worst = 0;
    for (let q = 0; q < chainOf.length; q++) {
      const v = 6 * q;
      const sl = Array.from(b.slots.subarray(BAND_SLOTS * v, BAND_SLOTS * v + BAND_SLOTS));
      if (sl.every((x) => x < 0)) continue;
      tied++;
      const c = chainOf[q];
      // Vertices pO (v), cO (v+1), pI (v+2), cI (v+4): bilinear points.
      const P = (k: number, i: number): number => b.pos[2 * (v + k) + i];
      const A = (k: number, i: number): number => b.attr[4 * (v + k) + i];
      for (const t of [0, 0.3, 0.7, 1]) for (const u of [0, 0.25, 0.5, 1]) {
        const ox = P(0, 0) + (P(1, 0) - P(0, 0)) * t; const oy = P(0, 1) + (P(1, 1) - P(0, 1)) * t;
        const ix = P(2, 0) + (P(4, 0) - P(2, 0)) * t; const iy = P(2, 1) + (P(4, 1) - P(2, 1)) * t;
        const x = ox + (ix - ox) * u; const y = oy + (iy - oy) * u;
        const s = A(0, 0) + (A(1, 0) - A(0, 0)) * t;
        const dC = tb.h - tb.W * u;
        const want = ref(c, x, y, s, dC);
        const got = alphaCpu(b, x, y, s, dC, zAtC(zz.zc[c], s), sl);
        worst = Math.max(worst, Math.abs(got - want));
        n++;
      }
    }
    expect(tied).toBeGreaterThan(100);
    expect(n).toBeGreaterThan(1000);
    // float32 tables (positions, s, depth): the alphas agree to 1e-3.
    expect(worst).toBeLessThan(1e-3);
  }, 60_000);
  it("K1283 s3: a tail's own alpha (s9: and an untied run's end fade) reaches the band's vertices (attr .w), the rest at 1", () => {
    const sc = loadScene(fileURLToPath(new URL("./fixtures/outline_ring.json.gz", import.meta.url)));
    const tb = frame(structure(sc), sc);
    const zz = zChains(sc);
    const b = bandGpu(tb, sc, zz);
    let v = 0; let tails = 0; let faded = 0;
    for (const p of tb.pieces) {
      const np = p.pts.length / 2;
      if (np < 2) continue;
      // A tied piece's alpha is the tie's, in the shader (.w = 1).
      const tied = (p.kind === "run" || p.kind === "ghost") && p.chain >= 0 && p.chain < zz.zc.length && zz.passes[p.chain].length > 0;
      const pa = (p.kind === "tail" || (p.kind === "run" && !tied)) ? p.alpha : undefined;
      if (pa) expect(pa.length).toBe(2 * np);
      if (pa && p.kind === "tail") tails++;
      for (let i = 0; i + 1 < np; i++) {
        // pO, cO, pI, cO, cI, pI: outer i, outer i+1, inner i, outer i+1, inner i+1, inner i.
        const want = pa ? [pa[2 * i], pa[2 * i + 2], pa[2 * i + 1], pa[2 * i + 2], pa[2 * i + 3], pa[2 * i + 1]] : [1, 1, 1, 1, 1, 1];
        for (let k = 0; k < 6; k++) {
          expect(b.attr[4 * (v + k) + 3]).toBeCloseTo(want[k], 6);
          if (want[k] < 0 || want[k] > 1) throw new Error(`alpha ${want[k]} out of [0, 1]`);
          if (want[k] < 0.999) faded++;
        }
        v += 6;
      }
    }
    expect(v).toBe(b.count);
    expect(tails).toBeGreaterThan(0);
    expect(faded).toBeGreaterThan(0);
  }, 60_000);
  it("K1291 s2: each quad carries its piece's scene chain; chainInfo finds that chain's samples", () => {
    const sc = loadScene(fileURLToPath(new URL("./fixtures/outline_ring.json.gz", import.meta.url)));
    const tb = frame(structure(sc), sc);
    const zz = zChains(sc);
    const b = bandGpu(tb, sc, zz);
    let v = 0;
    for (const p of tb.pieces) {
      const np = p.pts.length / 2;
      for (let i = 0; i + 1 < np; i++, v += 6) for (let k = 0; k < 6; k++) expect(b.chain[v + k]).toBe(p.chain);
    }
    expect(v).toBe(b.count);
    expect(b.chainInfo.length).toBe(4 * zz.zc.length);
    zz.zc.forEach((c, i) => {
      const base = b.chainInfo[4 * i];
      expect(b.chainInfo[4 * i + 1]).toBe(c.n);
      expect(b.chainInfo[4 * i + 2]).toBe(c.closed && c.len > 0 ? Math.fround(c.len) : -1);
      for (const k of [0, c.n - 1]) {
        expect(b.chainTex[4 * (base + k)]).toBe(Math.fround(c.xs[k]));
        expect(b.chainTex[4 * (base + k) + 2]).toBe(Math.fround(c.s[k]));
      }
    });
  }, 60_000);});
