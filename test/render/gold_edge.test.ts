// K1211 S2 (docs/design/K1211_s2_gold_edge.md, Task 2): the walked gold
// ends in one round edge where a drawing pulse band meets it.
//
// The model is the fan shader's mode-0 composite (junctionField, twin
// cpuJunctionField): the gold block paints the route's composed rows at
// its cover gc; then each drawing pulse band paints its arms' untraveled
// rows at cw = cover x drawBandYield(dDraw, dShared, pxW, gc). The shared
// band is the pulse riding the gold route, so dShared is the gold's own
// centreline distance. Before S2 the yield ignored the gold (goldCover 0):
// on arm Q, which both bands share, the distances tie, the yield is 1 and
// the drawing band painted over the gold (x4 ji 125's break), and past the
// tie it cut the gold's tube along the bisector (x4 ji 149's straight edge
// and corner). With S2 the gold's edge is a level set of the distance to
// the route, inside the tube's own one-pixel ramp: round, at each kind.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JUNCTION_FRAG, drawBandYield, pulseBandCover } from "../../src/render/junction_field";

type Pt = [number, number];
const PX = 1; // one pixel
const FH = 12; // fill half-width in px (the stands draw about 23 px at dsf 1.5)
const REACH = FH + 0.5 * PX; // a fan pixel's reach (pulseBandCover, strip false)
const ZONE = 2.5 * FH; // "inside the junction": within this radius of its centre

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

// The gold left at p (1 = all gold) under the S2 rule (fix) or K1139's.
function goldAt(p: Pt, gold: Pt[], draws: Pt[][], fix: boolean): { g: number; gc: number; dg: number } {
  const dg = dist(p, gold);
  const gc = pulseBandCover(dg, FH, PX, false);
  let g = gc;
  for (const d of draws) {
    const dd = dist(p, d);
    const cw = pulseBandCover(dd, FH, PX, false) * drawBandYield(dd, dg, PX, fix ? gc : 0);
    g *= 1 - cw;
  }
  return { g, gc, dg };
}

// Where the gold's 0.5 level crosses a grid edge inside the junction zone:
// the crossings' distances to the gold route (min, max) and their count.
function edge(kind: (typeof KINDS)[number], fix: boolean): { min: number; max: number; n: number } {
  const gold = band(kind.gold[0], kind.gold[1]);
  const draws = kind.draw.map(([a, b]) => band(a, b));
  const h = 0.25 * PX, n = Math.round((2 * ZONE) / h);
  const at = (i: number, j: number) => goldAt([-ZONE + i * h, -ZONE + j * h], gold, draws, fix).g;
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

describe("K1211 S2: the walked gold's edge where a drawing pulse band meets it", () => {
  for (const kind of KINDS) {
    it(`${kind.name}: one round edge, the tube's own (0.5 level within its one-pixel ramp)`, () => {
      const e = edge(kind, true);
      expect(e.n).toBeGreaterThan(100);
      // gc runs 1 -> 0 over [REACH - PX, REACH]; with k drawing bands over the
      // ramp the gold left is at least gc^(k + 1), so the 0.5 level sits at
      // gc 0.5 .. 0.79: a band 0.3 px wide around one distance to the route.
      expect(e.min).toBeGreaterThanOrEqual(REACH - 0.85 * PX);
      expect(e.max).toBeLessThanOrEqual(REACH - 0.45 * PX);
    });
    it(`${kind.name}: K1139's rule (gold cover 0) cut into the tube (what S2 removed)`, () => {
      const e = edge(kind, false);
      expect(e.min).toBeLessThan(REACH - FH / 2);
    });
  }

  it("off the gold, a drawing band's weight is K1139's, bit for bit (the split and its wedges keep)", () => {
    for (const kind of KINDS) {
      const gold = band(kind.gold[0], kind.gold[1]);
      for (const [a, b] of kind.draw) {
        const d = band(a, b);
        for (let y = -ZONE; y <= ZONE; y += 0.75) {
          for (let x = -ZONE; x <= ZONE; x += 0.75) {
            const dg = dist([x, y], gold);
            if (pulseBandCover(dg, FH, PX, false) > 0) continue;
            const dd = dist([x, y], d);
            const t = Math.max(0, Math.min(1, (dd - dg) / (3 * PX)));
            expect(drawBandYield(dd, dg, PX, 0)).toBe(1 - t * t * (3 - 2 * t));
          }
        }
      }
    }
  });

  it("drawBandYield: 1 on a tie, 0 three pixels past the shared band, 0 under full gold", () => {
    expect(drawBandYield(5, 5, PX, 0)).toBe(1);
    expect(drawBandYield(8, 5, PX, 0)).toBe(0);
    expect(drawBandYield(4, 5, PX, 0)).toBe(1);
    expect(drawBandYield(6.5, 5, PX, 0)).toBeCloseTo(0.5, 12);
    expect(drawBandYield(5, 5, PX, 1)).toBe(0);
    expect(drawBandYield(5, 5, PX, 0.25)).toBe(0.75);
  });

  it("the shader and its CPU twin run the same rule (mode 0 only; look B unchanged)", () => {
    expect(JUNCTION_FRAG).toContain("if (!lookB) gC = max(gC, cov);");
    expect(JUNCTION_FRAG).toContain(
      "float yr = (1.0 - smoothstep(0.0, 3.0 * pxW, sDist[r] - dShared)) * (1.0 - gC);",
    );
    const jy = readFileSync(new URL("../../src/render/ribbon/joinery.ts", import.meta.url), "utf8");
    expect(jy).toContain("if (!lookB) gCov = Math.max(gCov, cov);");
    expect(jy).toContain("const cw = PULSE_COV[r] * drawBandYield(PULSE_DIST[r], dShared, pxW, gCov);");
    expect(jy).toContain("const yr = PULSE_F[r] * drawBandYield(PULSE_DIST[r], dShared, pxW, gCov);");
  });
});
