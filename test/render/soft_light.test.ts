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
// After (junctionField's gN, gD, rm and jbT; the twin cpuJunctionField
// through pulseGlowFall, pulseGlowWeight and pulseRouteWeight): every band, a
// shared one too, lends the web its whitening at its nearest foot, falling
// off over PULSE_GLOW_W fill half-widths past its reach; where falls overlap
// the field is their blend, each band weighted by its fall over the square
// of its distance past its tube, so at a tube's edge that band's own light
// rules. The field counts 1 on a named arm's footprint, 0 on an unnamed
// one's, blended across a wedge by junctionBase's t. The light is the larger
// of master's and the field.
//
// What it cannot reach (K1211 S4's handoff): the gold tube's edge. There
// K81's route-band composite paints the gold band's own crest at its own
// tau over everything beneath, and off it the whitening; where the two
// taus disagree near the joint the step is master's and stays; and two bands
// sharing an arm read different taus at one point near the joint, so the
// field's blend must cross between their lights within a few pixels. The
// step tests therefore pin what the field does (every stand's largest step
// falls; the gold edge's grows nowhere) and keep the brief's bar as an
// it.fails.
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
  pulseGlowWeight,
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
  // Aligned on the child: its end reads LEN, so a child's tau is its
  // distance from the joint (the shader's per-end shift does this).
  const tau = cum.map((c) => c - cum[cum.length - 1] + LEN);
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
      if (lam > 0 && mu >= -1e-9 && mu <= 1 + 1e-9) {
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
function light(p: Pt, st: Stand, c: number): { before: number; after: number; ia: number; ib: number; gc: number } {
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
  let w = 0, gN = 0, gD = 0, rm = 0;
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
    const gk = pulseGlowWeight(x.d, REACH, FH, PX);
    gN += gk * x.g * pulseGlowFall(x.d, REACH, FH);
    gD += gk;
    rm |= (1 << x.a) | (1 << x.b);
  });
  const gl = gD > 0 ? gN / gD : 0;
  const wAfter = Math.max(w, gl * pulseRouteWeight(((rm >> ia) & 1) === 1, ((rm >> ib) & 1) === 1, t));
  // The gold composite: on the gold tube its own crest (the composed rows).
  const gold = f.find((x) => x.shared);
  const gc = gold ? pulseBandCover(gold.d, FH, PX, false) : 0;
  const gg = gold ? gold.g : 0;
  return { before: gc * gg + (1 - gc) * w, after: gc * gg + (1 - gc) * wAfter, ia, ib, gc };
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
    // The largest step per pixel across the lit fork, before and after, off
    // the gold tube's edge and on it (the pair straddles its cover ramp).
    let memo: { worstB: number; worstA: number; edgeB: number; edgeA: number; n: number } | null = null;
    const steps = () => {
      if (memo) return memo;
      let worstB = 0, worstA = 0, edgeB = 0, edgeA = 0, n = 0;
      for (const c of MOMENTS) {
        grid((p) => {
          const L = light(p, st, c);
          if (!named(st, L.ia) || !named(st, L.ib)) return;
          for (const [dx, dy] of [[PX, 0], [0, PX]] as const) {
            const q: Pt = [p[0] + dx, p[1] + dy];
            if (Math.hypot(q[0], q[1]) > ZONE) continue;
            const M = light(q, st, c);
            if (!named(st, M.ia) || !named(st, M.ib)) continue;
            const dB = Math.abs(M.before - L.before), dA = Math.abs(M.after - L.after);
            if (L.gc !== M.gc || (L.gc > 0 && L.gc < 1)) {
              edgeB = Math.max(edgeB, dB);
              edgeA = Math.max(edgeA, dA);
              continue;
            }
            worstB = Math.max(worstB, dB);
            worstA = Math.max(worstA, dA);
            n++;
          }
        });
      }
      return (memo = { worstB, worstA, edgeB, edgeA, n });
    };

    it(`${st.name}: across the lit fork the field lowers the largest step (master's were above 3x the bar)`, () => {
      // Measured (model, the bar 0.085): off the gold tube's edge / on it,
      // x4 ji 149 0.777 -> 0.273 / 0.861 -> 0.688, T fork 0.500 -> 0.308 /
      // 0.745 -> 0.408, sharp fork 0.098 -> 0.135 / 0.969 -> 0.320, four with
      // one child 0.501 -> 0.308 / 0.501 -> 0.496, with two 0.501 -> 0.369 /
      // 0.713 -> 0.496.
      const s = steps();
      expect(s.n).toBeGreaterThan(5000);
      const before = Math.max(s.worstB, s.edgeB), after = Math.max(s.worstA, s.edgeA);
      expect(before).toBeGreaterThan(3 * BAR);
      expect(after).toBeLessThan(before);
      expect(after).toBeLessThanOrEqual(0.7);
      // On the gold tube's edge the step is K81's composite (master's): the
      // field makes it no larger.
      expect(s.edgeA).toBeLessThanOrEqual(s.edgeB + 1e-9);
    });

    // The brief's bar, NOT MET (K1211 S4's handoff): two bands that share an
    // arm read different taus at one point near the joint (the gold band's
    // corner says 1.4 where a straight drawing band says -14, T fork at
    // (-14, 14)), so their lights differ there and the blend must cross
    // between them within the pixels between their tubes; and K81's composite
    // paints the gold band's own crest on its tube over everything beneath.
    // A field added under both cannot remove those steps. it.fails turns red
    // once the bar holds.
    it.fails(`${st.name}: no step above the bar per pixel across the lit fork (not met: the bands' taus disagree)`, () => {
      const s = steps();
      expect(Math.max(s.worstA, s.edgeA)).toBeLessThanOrEqual(BAR);
    });

    it(`${st.name}: two lit children at the same distance from the joint wear the same light`, () => {
      // Off every other band's tube: inside one, that band's own paint shows
      // (the sharp fork's children lie in each other's tubes out to 1.75 fh).
      const kids = [...new Set([...(st.gold ? [st.gold[1]] : []), ...st.draw.map(([, b]) => b)])];
      expect(kids.length).toBeGreaterThanOrEqual(2);
      const bds = [...(st.gold ? [band(st.arms, st.gold[0], st.gold[1])] : []), ...st.draw.map(([a, b]) => band(st.arms, a, b))];
      let n = 0;
      for (const c of MOMENTS) {
        for (let r = 1.5 * FH; r <= ZONE; r += 2) {
          const pts = kids.map((k): Pt => [dir(st.arms[k])[0] * r, dir(st.arms[k])[1] * r]);
          const clear = kids.every((k, i) => bds.every((bd) => bd.a === k || bd.b === k || at(pts[i], bd).d > REACH + PX));
          if (!clear) continue;
          const ls = pts.map((p) => light(p, st, c).after);
          expect(Math.max(...ls) - Math.min(...ls)).toBeLessThanOrEqual(0.05);
          n++;
        }
      }
      expect(n).toBeGreaterThan(20);
    });
  }

  for (const st of STANDS.filter((s) => s.off.length > 0)) {
    it(`${st.name}: an off-route arm's footprint is no lighter than master's`, () => {
      // Where junctionBase gives the off arm's material alone, the field
      // adds nothing. Nearer the centre its min-width blend still mixes in
      // a named neighbour (t strictly between 0 and 1), and the field
      // follows it there: a residual (0.308 T through, 0.302 four with one
      // child, of the pulse colour), bounded here.
      let n = 0, ramp = 0;
      for (const c of MOMENTS) {
        for (const k of st.off) {
          const u = dir(st.arms[k]);
          for (let r = 1.2 * FH; r <= ZONE; r += 1) {
            for (let l = -FH; l <= FH; l += 1) {
              const p: Pt = [u[0] * r - u[1] * l, u[1] * r + u[0] * l];
              const L = light(p, st, c);
              const B = bracket(p, st.arms);
              if ((B.ia === k && B.t === 0) || (B.ib === k && B.t === 1)) {
                expect(L.after).toBeLessThanOrEqual(L.before + 1e-12);
                n++;
              } else {
                ramp = Math.max(ramp, L.after - L.before);
              }
            }
          }
        }
      }
      expect(n).toBeGreaterThan(500);
      expect(ramp).toBeLessThanOrEqual(0.32);
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
      "    float gf = 1.0 - smoothstep(reach, reach + 2.50 * uJParams.x, sDist[r]);\n" +
      "    float ge = max(sDist[r] - reach, 0.0);\n" +
      "    float gk = gf / (ge * ge + 0.25 * pxW * pxW);\n" +
      "    gN += gk * gf * sG[r];\n" +
      "    gD += gk;\n" +
      "    rm |= bB >= 0 ? (1 << bA) | (1 << bB) : 1 << bA;\n";
    const mix =
      "  float gl = gN / max(gD, 1e-12);\n" +
      "  wW = max(wW, gl * (float((rm >> jbIa) & 1) * (1.0 - jbT) + float((rm >> jbIb) & 1) * jbT));\n  c = mix(c, uKHlPulse.rgb, wW);\n";
    expect(JUNCTION_FRAG).toContain(glow);
    expect(JUNCTION_FRAG).toContain(mix);
    expect(withExploreField(JUNCTION_FRAG)).toContain(glow);
    const jy = readFileSync(new URL("../../src/render/ribbon/joinery.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    expect(jy).toContain("const jbT = onlyB ? 1 : t;");
    expect(jy).toContain("PULSE_F[r] = J[r1 + 2] < 0.5 ? PULSE_G[r] : 0;");
    expect(jy).toContain(
      "const gk = pulseGlowWeight(PULSE_DIST[r], reach, fillHalf, pxW);\n" +
        "      gN += gk * pulseGlowFall(PULSE_DIST[r], reach, fillHalf) * PULSE_G[r];\n" +
        "      gD += gk;\n" +
        "      rm |= bB >= 0 ? (1 << bA) | (1 << bB) : 1 << bA;",
    );
    expect(jy).toContain(
      "const gl = gN / Math.max(gD, 1e-12);\n    wW = Math.max(wW, gl * pulseRouteWeight(((rm >> ia) & 1) === 1, ((rm >> ib) & 1) === 1, jbT));",
    );
    expect(pulseGlowWeight(REACH, REACH, FH, PX)).toBe(4);
    expect(pulseGlowWeight(REACH + PULSE_GLOW_W * FH, REACH, FH, PX)).toBe(0);
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
