// K1211 S2 (docs/design/K1211_s2_gold_edge.md, Task 2) and S3
// (docs/design/K1211_s3_lit_edge_web.md, Task 1): where a drawing pulse band
// meets the walked gold, the gold ends in one round edge, and while the pulse
// lights it that edge has no dark line.
//
// The model is the fan shader's mode-0 composite (junctionField, twin
// cpuJunctionField). The gold block paints the route's composed rows (the
// lit gold) at its cover gc. Each drawing pulse band paints its arms'
// untraveled rows (the lit band) at cw = cover x drawBandYield(dDraw,
// dShared, pxW), K1139's ramp to the shared band. The shared band is the
// pulse riding the gold route, so dShared is the gold's own centreline
// distance. Three rules have drawn it:
// - K1139: the bands OVER the gold at cw. On arm Q, which both bands share,
//   the distances tie, the yield is 1 and the drawing band painted over the
//   gold (x4 ji 125's break); past the tie it cut the gold's tube along the
//   bisector (x4 ji 149's straight edge and corner).
// - K1211 S2: the bands over the gold at cw (1 - gc). The gold's edge is the
//   tube's own, round, but an edge pixel inside a lit band keeps gc (1 - gc)
//   of the unlit base: a dark line, a quarter of the base at gc 0.5 (x4 ji
//   149, phase k6, device (1262, 532) read 194,224,212).
// - K1211 S3: the bands UNDER the gold (the shader's c0, cg and gT): the
//   gold over (the bands over the base). The gold's weight is gc, the
//   bands' (1 - gc) u and the base's (1 - gc)(1 - u), u = 1 - prod(1 - cw):
//   the gold's edge is the tube's own, and a blend of the lit gold and
//   whatever lies beside it, with no base of its own.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIELD_EXPLORE_EDITS, JUNCTION_FRAG, drawBandYield, pulseBandCover, withExploreField } from "../../src/render/junction_field";

type Pt = [number, number];
type Rule = "K1139" | "S2" | "S3";
const PX = 1; // one pixel
const FH = 12; // fill half-width in px (the stands draw about 23 px at dsf 1.5)
const REACH = FH + 0.5 * PX; // a fan pixel's reach (pulseBandCover, strip false)
const ZONE = 2.5 * FH; // "inside the junction": within this radius of its centre

// The colours at x4 ji 149, phase k6 (S2's Handoff): the lit gold, the lit
// band, and the unlit base that S2's dark edge pixel implies (gc 0.5).
const GOLD = [251, 243, 211];
const BAND = [221, 239, 236];
const BASE = [83, 175, 165];

function dir(deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a), Math.sin(a)];
}

// A band from arm a to arm b (degrees): a's centreline in, a quadratic corner
// through the centre, b's centreline out (the shape of junction_routes'
// routeCubic, simplified; any smooth corner tests the same rule).
function band(a: number, b: number): Pt[] {
  const ua = dir(a), ub = dir(b);
  const len = 4 * FH, corner = 0.6 * FH;
  const pts: Pt[] = [[ua[0] * len, ua[1] * len]];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, s = 1 - t;
    pts.push([s * s * corner * ua[0] + t * t * corner * ub[0], s * s * corner * ua[1] + t * t * corner * ub[1]]);
  }
  pts.push([ub[0] * len, ub[1] * len]);
  return pts;
}

function dist(p: Pt, pl: Pt[]): number {
  let best = Infinity;
  for (let k = 0; k + 1 < pl.length; k++) {
    const [ax, ay] = pl[k], [bx, by] = pl[k + 1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const u = l2 > 1e-12 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2)) : 0;
    const ox = p[0] - ax - dx * u, oy = p[1] - ay - dy * u;
    best = Math.min(best, ox * ox + oy * oy);
  }
  return Math.sqrt(best);
}

// Each kind: the gold route (arrival arm, shared arm Q) and the drawing bands
// the pulse splits into, every one leaving from Q (the stands' shapes:
// straight = cross ji 113, sharp = x4 ji 102 / loop ji 13, T = loop ji 89 /
// x4 ji 125, four = loop ji 12, where the pulse splits two ways).
const KINDS: { name: string; gold: [number, number]; draw: [number, number][] }[] = [
  { name: "straight", gold: [180, 0], draw: [[0, 90]] },
  { name: "sharp", gold: [50, 0], draw: [[0, 205]] },
  { name: "T", gold: [180, 90], draw: [[90, 0]] },
  { name: "four", gold: [180, 0], draw: [[0, 90], [0, 270]] },
];

// The weights at p of the lit gold (g), the lit bands (b) and the unlit base,
// under each rule; u is the bands' weight in the layer under the gold (the
// bands over the base alone), gc the gold's cover.
type W = { g: number; b: number; base: number; u: number; gc: number };
function weightsAt(p: Pt, gold: Pt[], draws: Pt[][], rule: Rule): W {
  const gc = pulseBandCover(dist(p, gold), FH, PX, false);
  const dg = dist(p, gold);
  let g = gc, b = 0, base = 1 - gc;
  let u = 0, under = 1;
  for (const d of draws) {
    const dd = dist(p, d);
    const cw = pulseBandCover(dd, FH, PX, false) * drawBandYield(dd, dg, PX);
    u = u * (1 - cw) + cw;
    under *= 1 - cw;
    if (rule === "S3") continue;
    const w = rule === "S2" ? cw * (1 - gc) : cw;
    g *= 1 - w;
    base *= 1 - w;
    b = b * (1 - w) + w;
  }
  if (rule === "S3") {
    b = (1 - gc) * u;
    base = (1 - gc) * under;
  }
  return { g, b, base, u, gc };
}

function geometry(kind: (typeof KINDS)[number]): { gold: Pt[]; draws: Pt[][] } {
  return { gold: band(kind.gold[0], kind.gold[1]), draws: kind.draw.map(([a, b]) => band(a, b)) };
}

// Where the gold's 0.5 level crosses a grid edge inside the junction zone:
// the crossings' distances to the gold route (min, max) and their count.
function edge(kind: (typeof KINDS)[number], rule: Rule): { min: number; max: number; n: number } {
  const { gold, draws } = geometry(kind);
  const h = 0.25 * PX, n = Math.round((2 * ZONE) / h);
  const at = (i: number, j: number) => weightsAt([-ZONE + i * h, -ZONE + j * h], gold, draws, rule).g;
  let min = Infinity, max = -Infinity, count = 0;
  let prev: number[] = [];
  for (let j = 0; j <= n; j++) {
    const row: number[] = [];
    for (let i = 0; i <= n; i++) row.push(at(i, j));
    for (let i = 0; i <= n; i++) {
      const cands: [number, number, number][] = [];
      if (i > 0) cands.push([row[i - 1], i - 1, j]);
      if (j > 0) cands.push([prev[i], i, j - 1]);
      for (const [g0, i0, j0] of cands) {
        const g1 = row[i];
        if ((g0 - 0.5) * (g1 - 0.5) >= 0) continue;
        const t = (0.5 - g0) / (g1 - g0);
        const p: Pt = [-ZONE + (i0 + (i - i0) * t) * h, -ZONE + (j0 + (j - j0) * t) * h];
        if (Math.hypot(p[0], p[1]) > ZONE) continue;
        const dg = dist(p, gold);
        min = Math.min(min, dg);
        max = Math.max(max, dg);
        count++;
      }
    }
    prev = row;
  }
  return { min, max, n: count };
}

// The lit edge: at every point of the gold's one-pixel ramp (0 < gc < 1)
// inside the zone, the colour's worst fall below both the lit gold and what
// lies beside the gold there (the layer under it: the bands over the base),
// and its worst rise above both, in 8-bit units per channel; nLit counts the
// ramp points inside a drawing band's full weight (u 1: the lit band itself
// beside the gold).
function litEdge(kind: (typeof KINDS)[number], rule: Rule): { dip: number; rise: number; n: number; nLit: number } {
  const { gold, draws } = geometry(kind);
  const h = 0.25 * PX;
  let dip = 0, rise = 0, n = 0, nLit = 0;
  for (let y = -ZONE; y <= ZONE; y += h) {
    for (let x = -ZONE; x <= ZONE; x += h) {
      if (Math.hypot(x, y) > ZONE) continue;
      const w = weightsAt([x, y], gold, draws, rule);
      if (!(w.gc > 0 && w.gc < 1)) continue;
      n++;
      if (w.u === 1) nLit++;
      for (let c = 0; c < 3; c++) {
        const col = w.g * GOLD[c] + w.b * BAND[c] + w.base * BASE[c];
        const beside = w.u * BAND[c] + (1 - w.u) * BASE[c];
        dip = Math.max(dip, Math.min(GOLD[c], beside) - col);
        rise = Math.max(rise, col - Math.max(GOLD[c], beside));
      }
    }
  }
  return { dip, rise, n, nLit };
}

describe("K1211 S2 and S3: the walked gold's edge where a drawing pulse band meets it", () => {
  for (const kind of KINDS) {
    it(`${kind.name}: one round edge, the tube's own (the 0.5 level at the cover's own 0.5)`, () => {
      const e = edge(kind, "S3");
      expect(e.n).toBeGreaterThan(100);
      // The gold's weight is its cover, 1 -> 0 over [REACH - PX, REACH]: its
      // 0.5 level is one distance to the route, FH.
      expect(e.min).toBeGreaterThanOrEqual(REACH - 0.55 * PX);
      expect(e.max).toBeLessThanOrEqual(REACH - 0.45 * PX);
    });
    it(`${kind.name}: K1139's rule (the bands over the gold at their own weight) cut into the tube (what S2 removed)`, () => {
      const e = edge(kind, "K1139");
      expect(e.min).toBeLessThan(REACH - FH / 2);
    });
    it(`${kind.name}: lit, every edge pixel lies between the lit gold and the lit band beside it (no dip, no rise)`, () => {
      const s3 = litEdge(kind, "S3");
      expect(s3.n).toBeGreaterThan(200);
      expect(s3.nLit).toBeGreaterThan(20);
      expect(s3.dip).toBeLessThan(1e-9);
      expect(s3.rise).toBeLessThan(1e-9);
    });
    it(`${kind.name}: S2's rule (the bands over the gold at cw (1 - gc)) left the dark line S3 removes`, () => {
      const s2 = litEdge(kind, "S2");
      // Inside the band, red falls gc (BAND - (1 - gc) BASE - gc GOLD) below
      // the band: 27 at gc 0.5 (the measured pixel), 28.3 at most.
      expect(s2.dip).toBeGreaterThan(20);
    });
  }

  it("at the measured pixel (gc 0.5, inside the band), S2's mix is the dark pixel and S3's lies between gold and band", () => {
    const s2 = [0, 1, 2].map((c) => 0.25 * BASE[c] + 0.25 * GOLD[c] + 0.5 * BAND[c]);
    expect(s2).toEqual([194, 224, 212]);
    const s3 = [0, 1, 2].map((c) => 0.5 * GOLD[c] + 0.5 * BAND[c]);
    for (let c = 0; c < 3; c++) {
      expect(s3[c]).toBeGreaterThanOrEqual(Math.min(GOLD[c], BAND[c]));
      expect(s3[c]).toBeLessThanOrEqual(Math.max(GOLD[c], BAND[c]));
    }
  });

  it("off the gold (cover 0), the composite is K1139's and S2's, bit for bit (the split and its wedges keep)", () => {
    let n = 0;
    for (const kind of KINDS) {
      const { gold, draws } = geometry(kind);
      for (let y = -ZONE; y <= ZONE; y += 0.75) {
        for (let x = -ZONE; x <= ZONE; x += 0.75) {
          const s3 = weightsAt([x, y], gold, draws, "S3");
          if (s3.gc > 0) continue;
          const k = weightsAt([x, y], gold, draws, "K1139");
          const s2 = weightsAt([x, y], gold, draws, "S2");
          for (const o of [k, s2]) {
            expect(s3.g).toBe(o.g);
            expect(s3.b).toBe(o.b);
            expect(s3.base).toBe(o.base);
          }
          if (s3.b > 0) n++;
        }
      }
    }
    expect(n).toBeGreaterThan(100);
  });

  it("inside the gold (cover 1), the composite is the gold alone, as S2's", () => {
    let n = 0;
    for (const kind of KINDS) {
      const { gold, draws } = geometry(kind);
      for (let y = -ZONE; y <= ZONE; y += 0.75) {
        for (let x = -ZONE; x <= ZONE; x += 0.75) {
          const s3 = weightsAt([x, y], gold, draws, "S3");
          if (s3.gc < 1) continue;
          const s2 = weightsAt([x, y], gold, draws, "S2");
          expect([s3.g, s3.b, s3.base]).toEqual([1, 0, 0]);
          expect([s2.g, s2.b, s2.base]).toEqual([1, 0, 0]);
          if (s3.u > 0) n++;
        }
      }
    }
    expect(n).toBeGreaterThan(100);
  });

  it("drawBandYield: 1 on a tie, 0 three pixels past the shared band (K1139's ramp)", () => {
    expect(drawBandYield(5, 5, PX)).toBe(1);
    expect(drawBandYield(8, 5, PX)).toBe(0);
    expect(drawBandYield(4, 5, PX)).toBe(1);
    expect(drawBandYield(6.5, 5, PX)).toBeCloseTo(0.5, 12);
  });

  it("the shader and its CPU twin run the same rule", () => {
    expect(JUNCTION_FRAG).toContain("  vec3 c0 = c;\n  float gT = 1.0;\n");
    expect(JUNCTION_FRAG).toContain("    gT *= 1.0 - cov;\n");
    expect(JUNCTION_FRAG).toContain("  vec3 cg = c;\n  if (gT < 1.0) c = c0;\n");
    expect(JUNCTION_FRAG).toContain("float yr = 1.0 - smoothstep(0.0, 3.0 * pxW, sDist[r] - dShared);");
    expect(JUNCTION_FRAG).toContain(
      "  c = mix(c, uKHlPulse.rgb, wW);\n  if (gT < 1.0) c = cg + gT * (c - c0);\n  return c;\n}",
    );
    expect(JUNCTION_FRAG).not.toContain("gC");
    // The explore variant carries the same lines on premultiplied colours.
    const ex = withExploreField(JUNCTION_FRAG);
    expect(ex).toContain("  vec4 c0 = c;\n  float gT = 1.0;\n");
    expect(ex).toContain("  vec4 cg = c;\n  if (gT < 1.0) c = c0;\n");
    expect(ex).toContain("if (gT < 1.0) c = cg + gT * (c - c0);");
    expect(FIELD_EXPLORE_EDITS.some(([a]) => a === "  vec3 c0 = c;")).toBe(true);
    const jy = readFileSync(new URL("../../src/render/ribbon/joinery.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    expect(jy).toContain("for (let c = 0; c < 4; c++) GOLD_C0[c] = out[c];");
    expect(jy).toContain("      gT *= 1 - cov;\n");
    expect(jy).toContain("GOLD_CG[c] = out[c];\n        out[c] = GOLD_C0[c];");
    expect(jy).toContain("const cw = PULSE_COV[r] * drawBandYield(PULSE_DIST[r], dShared, pxW);");
    expect(jy).toContain("const yr = PULSE_F[r] * drawBandYield(PULSE_DIST[r], dShared, pxW);");
    expect(jy).toContain("for (let c = 0; c < nc; c++) out[c] = GOLD_CG[c] + gT * (out[c] - GOLD_C0[c]);");
    expect(jy).not.toContain("gCov");
  });
});
