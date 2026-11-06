// K1211 S4 (docs/design/K1211_s4_soft_light.md, Task 3): the pulse's light
// inside a fan is one continuous field.
//
// Before: each pulse band lit its tube (a one-pixel cover ramp at its
// reach), S3's web rule lit the inside of a drawing band's turn, and the
// crotch rule lit the gap between two drawing bands that share an arm.
// Everywhere else the web kept the quiet colour, so the light ended at a
// tube's edge in one pixel: cross ji 33's crescent and the arc across its
// fork, x4 ji 149's edge down to the unlit crotch between its drawing band
// and its shared band (whose own light the gold block paints, so it never
// whitened the web).
//
// After (junctionField's gl, rm and jbT; the twin cpuJunctionField through
// pulseGlowFall and pulseRouteWeight): every band, a shared one too, lends
// the web its whitening at its nearest foot, falling off over PULSE_GLOW_W
// fill half-widths past its reach, weighted 1 on a named arm's footprint, 0
// on an unnamed one's and blended across a wedge by junctionBase's t. The
// light is the larger of master's and the field.
//
// The model: web_light.test.ts's bands (an arm's centreline in, a corner
// through the centre, the other arm's out) with tau the arc from the
// corner's middle, taken as the shader's pivot param (the ray from P, where
// the normals a half-width in from the band's two ends meet; a straight band
// projects), a smooth crest g(tau) per band, and the gold composite (the
// gold band's own light on its tube, the whitening off it, blended by its
// cover).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FIELD_BLEND_MIN,
  JUNCTION_FRAG,
  PULSE_GLOW_W,
  bandLightsWeb,
  bandTurnSide,
  drawBandYield,
  pulseBandCover,
  pulseGlowFall,
  pulseRouteWeight,
  withExploreField,
} from "../../src/render/junction_field";

type Pt = [number, number];
const PX = 1;
const FH = 12;
const REACH = FH + 0.5 * PX;
const ZONE = 2.5 * FH;
const LEN = 4 * FH;
const SIGMA = 1.5 * FH;

const dir = (deg: number): Pt => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];

type Band = { pl: Pt[]; tau: number[]; P: Pt | null; ub: Pt; a: number; b: number };

function band(arms: number[], a: number, b: number): Band {
  const ua = dir(arms[a]), ub = dir(arms[b]);
  const corner = 0.6 * FH;
  const pl: Pt[] = [[ua[0] * LEN, ua[1] * LEN]];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, s = 1 - t;
    pl.push([s * s * corner * ua[0] + t * t * corner * ub[0], s * s * corner * ua[1] + t * t * corner * ub[1]]);
  }
  pl.push([ub[0] * LEN, ub[1] * LEN]);
  const cum = [0];
  for (let k = 1; k < pl.length; k++) cum.push(cum[k - 1] + Math.hypot(pl[k][0] - pl[k - 1][0], pl[k][1] - pl[k - 1][1]));
  const tau = cum.map((c) => c - cum[9]);
  // The pivot: the normals a half-width in from each end meet on the
  // inside bisector; a near-straight band has none (it projects).
  const cosT = ua[0] * ub[0] + ua[1] * ub[1];
  let P: Pt | null = null;
  if (cosT > -0.996) {
    const bx = ua[0] + ub[0], by = ua[1] + ub[1], bl = Math.hypot(bx, by);
    const half = Math.acos(Math.max(-1, Math.min(1, cosT))) / 2;
    const r = (LEN - FH) / Math.cos(half);
    P = [(bx / bl) * r, (by / bl) * r];
  }
  return { pl, tau, P, ub, a, b };
}

// The nearest foot (distance, side) and the pivot tau at p.
function at(p: Pt, bd: Band): { d: number; side: number; tau: number } {
  const pl = bd.pl;
  let best = Infinity, side = 0, tauN = 0;
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
      tauN = bd.tau[k] + (bd.tau[k + 1] - bd.tau[k]) * u;
    }
  }
  let tau = tauN;
  if (!bd.P) {
    tau = p[0] * bd.ub[0] + p[1] * bd.ub[1];
  } else {
    const [Px, Py] = bd.P;
    const rx = p[0] - Px, ry = p[1] - Py;
    for (let k = 0; k + 1 < pl.length; k++) {
      const [ax, ay] = pl[k], [bx, by] = pl[k + 1];
      const ex = bx - ax, ey = by - ay;
      const den = rx * ey - ry * ex;
      if (Math.abs(den) < 1e-12) continue;
      const lam = ((ax - Px) * ey - (ay - Py) * ex) / den;
      const mu = ((ax - Px) * ry - (ay - Py) * rx) / den;
      if (lam > 0 && mu >= 0 && mu <= 1) {
        tau = bd.tau[k] + (bd.tau[k + 1] - bd.tau[k]) * mu;
        break;
      }
    }
  }
  return { d: Math.sqrt(best), side, tau };
}

// junctionBase's bracketing arms and blend weight t at p.
function bracket(p: Pt, arms: number[]): { ia: number; ib: number; t: number } {
  const TAU = 2 * Math.PI;
  const phi = Math.atan2(p[1], p[0]);
  const rho = Math.hypot(p[0], p[1]);
  let relA = 1e9, relB = 1e9, ia = 0, ib = 0;
  arms.forEach((deg, i) => {
    let ra = phi - (deg * Math.PI) / 180;
    ra -= TAU * Math.floor(ra / TAU);
    const rb = ra > 0 ? TAU - ra : 0;
    if (ra < relA) { relA = ra; ia = i; }
    if (rb < relB) { relB = rb; ib = i; }
  });
  if (ia === ib) return { ia, ib, t: 0 };
  const span = relA + relB;
  const hw = rho > FH ? Math.asin(FH / rho) : Math.PI / 2;
  let lo = hw, hi = span - hw;
  const minW = span * FIELD_BLEND_MIN;
  if (hi - lo < minW) { lo = (span - minW) * 0.5; hi = lo + minW; }
  let t = hi > lo ? (relA - lo) / (hi - lo) : relA < span * 0.5 ? 0 : 1;
  t = Math.max(0, Math.min(1, t));
  t = t * t * (3 - 2 * t);
  return { ia, ib, t };
}

// The crest: a smooth bump of half-width SIGMA at tau = c on every band
// (the same distance from the junction on every child, K1139).
const crest = (tau: number, c: number): number => {
  const u = (tau - c) / SIGMA;
  return Math.abs(u) < 1 ? (1 - u * u) ** 2 : 0;
};

type Stand = { name: string; arms: number[]; gold: [number, number] | null; draw: [number, number][]; off: number[] };
const STANDS: Stand[] = [
  { name: "x4 ji 149", arms: [180, -64, 51], gold: [1, 0], draw: [[1, 2]], off: [] },
  { name: "T fork", arms: [180, 90, 0], gold: [0, 1], draw: [[0, 2]], off: [] },
  { name: "sharp fork", arms: [180, 20, -20], gold: [0, 1], draw: [[0, 2]], off: [] },
  { name: "T through", arms: [180, 0, 90], gold: [0, 1], draw: [], off: [2] },
  { name: "four, one child", arms: [180, 0, 90, 270], gold: [0, 1], draw: [[0, 2]], off: [3] },
  { name: "four, two children", arms: [180, 0, 90, 270], gold: [0, 1], draw: [[0, 2], [0, 3]], off: [] },
];
const MOMENTS = [-1.5, -0.75, 0, 0.75, 1.5, 2.25].map((k) => k * FH);

// The light at p (0..1 of the way to the pulse colour), before (master:
// S3's tube, web and crotch rules) and after (the soft field too).
function light(p: Pt, st: Stand, c: number): { before: number; after: number; ia: number; ib: number } {
  const bands: { bd: Band; shared: boolean }[] = [];
  if (st.gold) bands.push({ bd: band(st.arms, st.gold[0], st.gold[1]), shared: true });
  for (const [a, b] of st.draw) bands.push({ bd: band(st.arms, a, b), shared: false });
  const { ia, ib, t } = bracket(p, st.arms);
  const f = bands.map(({ bd, shared }) => {
    const q = at(p, bd);
    const g = crest(q.tau, c);
    const v0 = bd.pl[0], v1 = bd.pl[1], qe = bd.pl[bd.pl.length - 1];
    return { ...q, g, shared, F: shared ? 0 : g, inTurn: bandTurnSide(q.side, v0[0], v0[1], v1[0], v1[1], qe[0], qe[1]), a: bd.a, b: bd.b };
  });
  const dShared = f.filter((x) => x.shared).reduce((m, x) => Math.min(m, x.d), 1e20);
  let w = 0, gl = 0, rm = 0;
  f.forEach((x, r) => {
    const yr = drawBandYield(x.d, dShared, PX);
    if (!x.shared) w = Math.max(w, x.F * pulseBandCover(x.d, FH, PX, false) * yr);
    if (bandLightsWeb(ia, ib, x.a, x.b, x.inTurn)) w = Math.max(w, x.F * yr);
    for (let s = r + 1; s < f.length; s++) {
      const y = f[s];
      const fl = x.a === y.a || x.b === y.b ? 1 : x.a === y.b || x.b === y.a ? -1 : 0;
      const sm = (e0: number, e1: number, v: number) => { const k = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
      const sdx = x.side < 0 ? -x.d : x.d, sdy = y.side < 0 ? -y.d : y.d;
      w = Math.max(w, sm(0, REACH * REACH, -sdx * sdy * fl) * (1 - sm(2 * FH, 6 * FH, x.d + y.d - 2 * REACH)) * Math.min(x.F * yr, y.F * drawBandYield(y.d, dShared, PX)));
    }
    gl = Math.max(gl, x.g * pulseGlowFall(x.d, REACH, FH));
    rm |= (1 << x.a) | (1 << x.b);
  });
  const wAfter = Math.max(w, gl * pulseRouteWeight(((rm >> ia) & 1) === 1, ((rm >> ib) & 1) === 1, t));
  // The gold composite: on the gold tube its own crest (the composed rows).
  const gold = f.find((x) => x.shared);
  const gc = gold ? pulseBandCover(gold.d, FH, PX, false) : 0;
  const gg = gold ? gold.g : 0;
  return { before: gc * gg + (1 - gc) * w, after: gc * gg + (1 - gc) * wAfter, ia, ib };
}

// The bar: the crest's own largest step per pixel along a plain arm.
const BAR = (() => {
  let m = 0;
  for (let s = -3 * SIGMA; s < 3 * SIGMA; s += 0.25) m = Math.max(m, Math.abs(crest(s + PX, 0) - crest(s, 0)));
  return m;
})();

function grid(f: (p: Pt) => void, step = 1): void {
  for (let y = -ZONE; y <= ZONE; y += step) {
    for (let x = -ZONE; x <= ZONE; x += step) {
      if (Math.hypot(x, y) <= ZONE) f([x, y]);
    }
  }
}

const named = (st: Stand, i: number): boolean =>
  (st.gold !== null && st.gold.includes(i)) || st.draw.some(([a, b]) => a === i || b === i);

describe("K1211 S4 task 3: the pulse's light in a fan is one continuous field", () => {
  it("the model's bar is the crest's own slope (sanity)", () => {
    expect(BAR).toBeGreaterThan(0.05);
    expect(BAR).toBeLessThan(0.1);
    expect(PULSE_GLOW_W).toBe(2.5);
  });

  for (const st of STANDS.filter((s) => s.draw.length > 0)) {
    it(`${st.name}: across the lit fork no step is above the bar per pixel (master's were)`, () => {
      let worstB = 0, worstA = 0, n = 0;
      for (const c of MOMENTS) {
        grid((p) => {
          const L = light(p, st, c);
          if (!named(st, L.ia) || !named(st, L.ib)) return;
          for (const [dx, dy] of [[PX, 0], [0, PX]] as const) {
            const q: Pt = [p[0] + dx, p[1] + dy];
            if (Math.hypot(q[0], q[1]) > ZONE) continue;
            const M = light(q, st, c);
            if (!named(st, M.ia) || !named(st, M.ib)) continue;
            worstB = Math.max(worstB, Math.abs(M.before - L.before));
            worstA = Math.max(worstA, Math.abs(M.after - L.after));
            n++;
          }
        });
      }
      expect(n).toBeGreaterThan(5000);
      expect(worstB).toBeGreaterThan(3 * BAR);
      expect(worstA).toBeLessThanOrEqual(BAR);
    });

    it(`${st.name}: two lit children at the same distance from the joint wear the same light`, () => {
      const kids = [...new Set([...(st.gold ? [st.gold[1]] : []), ...st.draw.map(([, b]) => b)])];
      expect(kids.length).toBeGreaterThanOrEqual(2);
      for (const c of MOMENTS) {
        for (let r = 1.5 * FH; r <= ZONE; r += 2) {
          const ls = kids.map((k) => light([dir(st.arms[k])[0] * r, dir(st.arms[k])[1] * r], st, c).after);
          const lo = Math.min(...ls), hi = Math.max(...ls);
          expect(hi - lo).toBeLessThanOrEqual(0.05 * Math.max(hi, 1e-9) + 1e-9);
        }
      }
    });
  }

  for (const st of STANDS.filter((s) => s.off.length > 0)) {
    it(`${st.name}: an off-route arm's footprint is no lighter than master's`, () => {
      let n = 0;
      for (const c of MOMENTS) {
        for (const k of st.off) {
          const u = dir(st.arms[k]);
          for (let r = 1.2 * FH; r <= ZONE; r += 1) {
            for (let l = -FH; l <= FH; l += 1) {
              const p: Pt = [u[0] * r - u[1] * l, u[1] * r + u[0] * l];
              const L = light(p, st, c);
              expect(L.after).toBeLessThanOrEqual(L.before + 1e-12);
              n++;
            }
          }
        }
      }
      expect(n).toBeGreaterThan(1000);
    });
  }

  it("away from every band the field is master's, bit for bit (no pulse, no change)", () => {
    for (const st of STANDS) {
      grid((p) => {
        const L = light(p, st, 40 * FH);
        expect(L.after).toBe(L.before);
      }, 3);
    }
  });

  it("the shader and its CPU twin run the same rule", () => {
    expect(JUNCTION_FRAG).toContain("  jbT = onlyB ? 1.0 : t;\n  jbIa = ia;\n");
    expect(JUNCTION_FRAG).toContain("    sG[r] = clamp((K_BAND * cr - fa) / max(1.0 - fa, 1e-3), 0.0, 1.0);\n    sF[r] = r1.z < 0.5 ? sG[r] : 0.0;\n");
    const glow =
      "    gl = max(gl, sG[r] * (1.0 - smoothstep(reach, reach + 2.50 * uJParams.x, sDist[r])));\n" +
      "    rm |= bB >= 0 ? (1 << bA) | (1 << bB) : 1 << bA;\n";
    const mix =
      "  wW = max(wW, gl * (float((rm >> jbIa) & 1) * (1.0 - jbT) + float((rm >> jbIb) & 1) * jbT));\n  c = mix(c, uKHlPulse.rgb, wW);\n";
    expect(JUNCTION_FRAG).toContain(glow);
    expect(JUNCTION_FRAG).toContain(mix);
    expect(withExploreField(JUNCTION_FRAG)).toContain(glow);
    const jy = readFileSync(new URL("../../src/render/ribbon/joinery.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    expect(jy).toContain("const jbT = onlyB ? 1 : t;");
    expect(jy).toContain("PULSE_F[r] = J[r1 + 2] < 0.5 ? PULSE_G[r] : 0;");
    expect(jy).toContain(
      "gl = Math.max(gl, PULSE_G[r] * pulseGlowFall(PULSE_DIST[r], reach, fillHalf));\n      rm |= bB >= 0 ? (1 << bA) | (1 << bB) : 1 << bA;",
    );
    expect(jy).toContain("wW = Math.max(wW, gl * pulseRouteWeight(((rm >> ia) & 1) === 1, ((rm >> ib) & 1) === 1, jbT));");
    // The helpers are the shader's expressions.
    expect(pulseGlowFall(REACH, REACH, FH)).toBe(1);
    expect(pulseGlowFall(REACH + PULSE_GLOW_W * FH, REACH, FH)).toBe(0);
    expect(pulseGlowFall(REACH + 0.5 * PULSE_GLOW_W * FH, REACH, FH)).toBeCloseTo(0.5, 12);
    expect(pulseRouteWeight(true, false, 0.25)).toBe(0.75);
    expect(pulseRouteWeight(false, true, 0.25)).toBe(0.25);
    expect(pulseRouteWeight(true, true, 0.4)).toBeCloseTo(1, 12);
    expect(pulseRouteWeight(false, false, 0.4)).toBe(0);
  });
});
