// K1211 S3 (docs/design/K1211_s3_lit_edge_web.md, Task 2): the web carries
// a drawing pulse band's light.
//
// The bite (x4 ji 149, K1190's pulse moments k4 and k6): the pulse enters
// from arm 1 and splits, its shared band riding the gold back along arm 0
// and its drawing band turning into arm 2. Between arms 1 and 2, inside the
// drawing band's turn, the web reaches past the band's tube (its reach, the
// fill half-width plus half a pixel). In mode 0 a banded record's base is
// the arms' quiet rows (no crest), so the light stopped at the tube's edge
// and the sliver beyond it kept the quiet colour: a ")" cut out of the light
// at the junction's rim. The fix (junctionField's sIn and its web test, twin
// cpuJunctionField through bandTurnSide and bandLightsWeb): there, the band
// lights the web at its whitening times its yield, off the tube as on it.
//
// The model: each drawing band is junction_routes' shape, simplified (an
// arm's centreline in, a corner through the centre, the other arm's out),
// the bracketing arms are the two arm directions on either side of p (the
// shader's ia and ib, from the arms' profile angles), and the band's
// whitening sF is 1 (one crest).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JUNCTION_FRAG, bandLightsWeb, bandTurnSide, drawBandYield, pulseBandCover, withExploreField } from "../../src/render/junction_field";

type Pt = [number, number];
const PX = 1;
const FH = 12;
const REACH = FH + 0.5 * PX;
const ZONE = 2.5 * FH;

function dir(deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a), Math.sin(a)];
}

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

// The shader's nearest-segment walk: the distance, and side = cross(segment,
// p - its start) at the nearest segment (the first on a tie, as dd < best).
function nearest(p: Pt, pl: Pt[]): { d: number; side: number } {
  let best = Infinity, side = 0;
  for (let k = 0; k + 1 < pl.length; k++) {
    const [ax, ay] = pl[k], [bx, by] = pl[k + 1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const wx = p[0] - ax, wy = p[1] - ay;
    const u = l2 > 1e-12 ? Math.max(0, Math.min(1, (wx * dx + wy * dy) / l2)) : 0;
    const ox = wx - dx * u, oy = wy - dy * u;
    const dd = ox * ox + oy * oy;
    if (dd < best) {
      best = dd;
      side = dx * wy - dy * wx;
    }
  }
  return { d: Math.sqrt(best), side };
}

// junctionBase's bracketing arms: ia the arm whose angle lies just below
// p's, ib the one just above (indices into `arms`, in degrees).
function bracket(p: Pt, arms: number[]): [number, number] {
  const phi = Math.atan2(p[1], p[0]);
  const TAU = 2 * Math.PI;
  let relA = 1e9, relB = 1e9, ia = 0, ib = 0;
  arms.forEach((deg, i) => {
    let ra = phi - (deg * Math.PI) / 180;
    ra -= TAU * Math.floor(ra / TAU);
    const rb = ra > 0 ? TAU - ra : 0;
    if (ra < relA) { relA = ra; ia = i; }
    if (rb < relB) { relB = rb; ib = i; }
  });
  return [ia, ib];
}

// Each stand: its arms (degrees), the gold route (the shared band, if a
// pulse rides it) and the drawing bands as arm-index pairs. x4 ji 149's arm
// directions are its record's (arm 0 left, arm 1 up-right, arm 2
// down-right, y down); the others are gold_edge.test.ts's kinds; "bend" is a
// two-arm joint, where both sides of the band lie between the same two arms
// and only the turn tells the inside.
type Stand = { name: string; arms: number[]; gold: [number, number] | null; draw: [number, number][] };
const STANDS: Stand[] = [
  { name: "x4 ji 149", arms: [180, -64, 51], gold: [1, 0], draw: [[1, 2]] },
  { name: "straight", arms: [180, 0, 90], gold: [0, 1], draw: [[1, 2]] },
  { name: "sharp", arms: [50, 0, 205], gold: [0, 1], draw: [[1, 2]] },
  { name: "T", arms: [180, 90, 0], gold: [0, 1], draw: [[1, 2]] },
  { name: "four", arms: [180, 0, 90, 270], gold: [0, 1], draw: [[1, 2], [1, 3]] },
  { name: "bend", arms: [0, 135], gold: null, draw: [[0, 1]] },
];

// The angular wedge from arm a to arm b that holds no other arm and is under
// 180 degrees (the inside of a band from a to b), as a test on p's angle.
function inWedge(p: Pt, arms: number[], a: number, b: number): boolean {
  const ang = (q: number) => ((q % 360) + 360) % 360;
  const phi = ang((Math.atan2(p[1], p[0]) * 180) / Math.PI);
  const from = ang(arms[a]), to = ang(arms[b]);
  const span = ang(to - from);
  const [lo, w] = span < 180 ? [from, span] : [to, 360 - span];
  const rel = ang(phi - lo);
  if (!(rel > 0 && rel < w)) return false;
  return arms.every((deg, i) => i === a || i === b || !(ang(deg - lo) > 0 && ang(deg - lo) < w));
}

// The whitening at p, before (S2/S3 task 1: on the tube only) and after the
// fix (the web inside the turn too), with sF 1.
function whitening(p: Pt, st: Stand): { before: number; after: number; dDraw: number[]; lit: boolean[] } {
  const gold = st.gold ? band(st.arms[st.gold[0]], st.arms[st.gold[1]]) : null;
  const dShared = gold ? nearest(p, gold).d : 1e20;
  const [ia, ib] = bracket(p, st.arms);
  let before = 0, after = 0;
  const dDraw: number[] = [], lit: boolean[] = [];
  for (const [a, b] of st.draw) {
    const pl = band(st.arms[a], st.arms[b]);
    const { d, side } = nearest(p, pl);
    const yd = drawBandYield(d, dShared, PX);
    const cw = pulseBandCover(d, FH, PX, false) * yd;
    const v0 = pl[0], v1 = pl[1], q = pl[pl.length - 1];
    const on = bandLightsWeb(ia, ib, a, b, bandTurnSide(side, v0[0], v0[1], v1[0], v1[1], q[0], q[1]), false);
    before = Math.max(before, cw);
    after = Math.max(after, cw, on ? yd : 0);
    dDraw.push(d);
    lit.push(on);
  }
  return { before, after, dDraw, lit };
}

function grid(f: (p: Pt) => void): void {
  for (let y = -ZONE; y <= ZONE; y += 0.5) {
    for (let x = -ZONE; x <= ZONE; x += 0.5) {
      if (Math.hypot(x, y) <= ZONE) f([x, y]);
    }
  }
}

describe("K1211 S3 task 2: the web carries a drawing pulse band's light (the bite)", () => {
  it("x4 ji 149 before the fix: the web inside band 1 -> 2's turn, off its tube, wore no light (the bite)", () => {
    const st = STANDS[0];
    let n = 0;
    grid((p) => {
      if (!inWedge(p, st.arms, 1, 2)) return;
      const w = whitening(p, st);
      if (w.dDraw[0] > REACH) {
        expect(w.before).toBe(0);
        n++;
      }
    });
    expect(n).toBeGreaterThan(500);
  });

  for (const st of STANDS) {
    it(`${st.name}: inside each drawing band's turn, the light runs from the tube to the rim with no dip`, () => {
      let off = 0;
      st.draw.forEach(([a, b], k) => {
        grid((p) => {
          if (!inWedge(p, st.arms, a, b)) return;
          const w = whitening(p, st);
          // The band's own yield (1 except within 3 px of a nearer shared
          // band) is the whole of its light there, on the tube and off it.
          const gold = st.gold ? band(st.arms[st.gold[0]], st.arms[st.gold[1]]) : null;
          const yd = drawBandYield(w.dDraw[k], gold ? nearest(p, gold).d : 1e20, PX);
          expect(w.after).toBeGreaterThanOrEqual(yd);
          // Off the tube, every point of the wedge lies inside the turn.
          if (w.dDraw[k] > REACH) {
            expect(w.lit[k]).toBe(true);
            off++;
          }
        });
      });
      expect(off).toBeGreaterThan(200);
    });

    it(`${st.name}: outside every drawing band's turn the light is the tube's alone, bit for bit`, () => {
      let n = 0;
      grid((p) => {
        if (st.draw.some(([a, b]) => inWedge(p, st.arms, a, b))) return;
        const w = whitening(p, st);
        expect(w.lit.every((x) => !x)).toBe(true);
        expect(w.after).toBe(w.before);
        n++;
      });
      expect(n).toBeGreaterThan(1000);
    });
  }

  it("a one-arm band (the head's, bB -1) and look B never light the web", () => {
    expect(bandLightsWeb(1, 2, 1, -1, 5, false)).toBe(false);
    expect(bandLightsWeb(2, 1, 1, -1, 5, false)).toBe(false);
    expect(bandLightsWeb(1, 2, 1, 2, 5, true)).toBe(false);
    expect(bandLightsWeb(2, 1, 1, 2, 5, false)).toBe(true);
    expect(bandLightsWeb(1, 2, 1, 2, -5, false)).toBe(false);
    expect(bandLightsWeb(1, 2, 1, 2, 0, false)).toBe(false);
  });

  it("the shader and its CPU twin run the same rule (mode 0 only)", () => {
    // The shader: the turn per band, then the web test in the draw loop;
    // junctionBase leaves its bracketing arms in every mode.
    expect(JUNCTION_FRAG).toContain("  jbIa = ia;\n  jbIb = ib;\n  if (uJParams.z > 0.5) {\n    jbT = ");
    expect(JUNCTION_FRAG).toContain("float sIn[4];");
    expect(JUNCTION_FRAG).toContain(
      "    vec2 v1 = jAt(pb + 5).xy - v0.xy;\n    sIn[r] = side * (v1.x * (q0.y - v0.y) - v1.y * (q0.x - v0.x));\n",
    );
    const web =
      "    int bA = int(r0.z + 0.5);\n    int bB = r0.w > -0.5 ? int(r0.w + 0.5) : -1;\n" +
      "    if (!lookB && sIn[r] > 0.0 && ((jbIa == bA && jbIb == bB) || (jbIa == bB && jbIb == bA))) wW = max(wW, sF[r] * yr);\n";
    expect(JUNCTION_FRAG).toContain(web);
    // The explore variant carries it unchanged.
    expect(withExploreField(JUNCTION_FRAG)).toContain(web);
    // The twin: the same cross, through the helpers this test runs.
    const jy = readFileSync(new URL("../../src/render/ribbon/joinery.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    expect(jy).toContain("const v1 = at(pb + 5);\n      PULSE_IN[r] = bandTurnSide(side, J[v0], J[v0 + 1], J[v1], J[v1 + 1], J[q0], J[q0 + 1]);");
    expect(jy).toContain("const bB = J[PULSE_R0[r] + 3] > -0.5 ? Math.round(J[PULSE_R0[r] + 3]) : -1;");
    expect(jy).toContain(
      "if (bandLightsWeb(ia, ib, bA, bB, PULSE_IN[r], lookB)) {\n        wW = Math.max(wW, PULSE_F[r] * drawBandYield(PULSE_DIST[r], dShared, pxW));\n      }",
    );
    // bandTurnSide is the shader's expression: side x cross(v1 - v0, q - v0).
    expect(bandTurnSide(2, 1, 1, 4, 1, 1, 5)).toBe(2 * (3 * 4 - 0 * 0));
    expect(bandTurnSide(-1, 0, 0, 1, 0, 0, -1)).toBe(1);
  });
});
