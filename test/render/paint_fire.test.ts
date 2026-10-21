// K410 + K409: the CPU twin of the explore shader's kCharAt
// (paint_math.ts kCharAtCpu, line-for-line with explore_glsl.ts) and the
// fire's FRONT and SMOLDER items in their K409 form: the char band and the
// ember are WORLD lengths (kArcU), and under gone the whole ember lies ahead
// of the cut. The scene is the KPAINT layout the renderer writes (items
// referenced from every control slot their range touches, +-1 slot, rings
// wrap; the burn flag at KPAINT texel `chain` .y), on chains whose control
// arcs are uneven, so a ctrl is not a fixed world length. The reference
// evaluates every item at every point with its own arc map, so a slot range
// that misses part of a front's reach fails here too.

import { describe, expect, it } from "vitest";
import {
  kChain,
  kCharAtCpu,
  writeChainHeader,
  writeGeomTable,
  type KData,
  type KFireState,
  type KUniforms,
} from "../../src/render/paint_math";
import {
  EXPLORE_CHAR_EDGE,
  EXPLORE_EMBER_AHEAD,
  EXPLORE_EMBER_BEHIND,
  EXPLORE_FRONT_BAND,
  EXPLORE_FRONT_CHAR,
  EXPLORE_FRONT_FUSE,
  EXPLORE_FRONT_GONE,
  EXPLORE_ITEM_FRONT,
  EXPLORE_VIS_GLSL,
  EXPLORE_WORLD_PER_CTRL,
  charItem,
  charRange,
  frontAheadWorld,
  frontItem,
  frontRange,
  frontShape,
  smolderItem,
} from "../../src/render/explore_glsl";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
}

function uniforms(): KUniforms {
  return {
    uKBase: new Float32Array([0, 0, 0, 1]),
    uKFx: new Float32Array(4),
    uKFx2: new Float32Array(4),
    uKShape: new Float32Array([1, 0, 1, 0]),
    uKInk: new Float32Array([1, 0, 0, 0]),
    uKKnots: new Float32Array(16),
    uKGamut: new Float32Array([0, 280, 0.45, 0.64]),
    uKSect: new Float32Array(4),
    uKPaint: new Float32Array([1, 0, 0, 0.5]),
    uKPulse: new Float32Array([0, 0.3, 1.5, 1]),
    uKReach: new Float32Array([1e6, 1, 0, 0]),
    uKGold: new Float32Array([1, 0.8235, 0.2902, 1]),
  };
}

interface Front {
  c: number;
  dir: number;
  kind: number;
}
interface Span {
  b0: number;
  b1: number;
}
interface FireChain {
  n: number;
  closed: boolean;
  // World length of each control step (n entries on a ring, n - 1 open).
  steps: number[];
  fronts: Front[];
  chars: Span[];
  smolders: Span[];
  // The burn flag (KPAINT texel `chain` .y).
  flag: boolean;
}

// The renderer's slot rule: every slot from floor(lo) - 1 to floor(hi) + 1,
// wrapped on a ring, clamped away on an open chain.
function touchSlots(lo: number, hi: number, n: number, closed: boolean): number[] {
  const out: number[] = [];
  for (let s = Math.floor(lo) - 1; s <= Math.floor(hi) + 1; s++) {
    let t = s;
    if (closed) t = ((s % n) + n) % n;
    else if (t < 0 || t > n - 1) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

// writePaintItems' minArcPerCtrl: the chain's smallest control step, floor
// 0.05.
function minArcPerCtrl(fc: FireChain): number {
  return Math.max(0.05, Math.min(...fc.steps));
}

// KSTATIC chain headers, KGEOM arc tables and KPAINT (flags, slot tables,
// refs and items), as PaintScene and writePaintItems lay them out.
function scene(chains: FireChain[], U: KUniforms, gone: boolean): KData {
  const nch = chains.length;
  const idxBase: number[] = [];
  let t = 2 * nch;
  for (const c of chains) {
    idxBase.push(t);
    t += c.n;
  }
  const idxEnd = t;
  const stat = new Float32Array(idxEnd * 4);
  const geomBase: number[] = [];
  let g = 0;
  for (const c of chains) {
    geomBase.push(g);
    g += 1 + Math.ceil(c.n / 4);
  }
  const geom = new Float32Array(g * 4);
  chains.forEach((c, ch) => {
    writeChainHeader(stat, ch, {
      nCtrl: c.n,
      closed: c.closed,
      count: 64,
      idxBase: idxBase[ch],
      geomBase: geomBase[ch],
      srcFirst: 0,
      srcCount: 0,
      paintBase: 0,
    });
    const cal: number[] = [0];
    for (let i = 1; i < c.n; i++) cal.push(cal[i - 1] + c.steps[i - 1]);
    const total = c.closed ? cal[c.n - 1] + c.steps[c.n - 1] : cal[c.n - 1];
    writeGeomTable(geom, geomBase[ch], total, 64, c.closed, cal);
  });
  const items: number[] = [];
  const slots: number[][][] = chains.map((c) => Array.from({ length: c.n }, () => []));
  const add = (ch: number, item: number[], lo: number, hi: number): void => {
    const id = items.length / 8;
    items.push(...item);
    const c = chains[ch];
    for (const s of touchSlots(lo, hi, c.n, c.closed)) slots[ch][s].push(id);
  };
  chains.forEach((c, ch) => {
    for (const s of c.chars) add(ch, charItem(s), ...charRange(s));
    for (const f of c.fronts) add(ch, frontItem(f, gone), ...frontRange(f, gone, minArcPerCtrl(c)));
    for (const s of c.smolders) add(ch, smolderItem(s), ...charRange(s));
  });
  let nRefs = 0;
  for (const sc of slots) for (const l of sc) nRefs += l.length;
  const refBase = idxEnd;
  const itemBase = refBase + Math.ceil(nRefs / 4);
  const paint = new Float32Array((itemBase + items.length / 4 + 1) * 4);
  let r = 0;
  chains.forEach((c, ch) => {
    paint[ch * 4 + 1] = c.flag ? 1 : 0;
    for (let s = 0; s < c.n; s++) {
      const l = slots[ch][s];
      expect(l.length).toBeLessThanOrEqual(32);
      paint[(idxBase[ch] + s) * 4] = r;
      paint[(idxBase[ch] + s) * 4 + 1] = l.length;
      for (const it of l) {
        paint[(refBase + (r >> 2)) * 4 + (r & 3)] = it;
        r++;
      }
    }
  });
  for (let i = 0; i < items.length; i++) paint[itemBase * 4 + i] = Math.fround(items[i]);
  U.uKPaint[1] = refBase;
  U.uKPaint[2] = itemBase;
  return { stat, geom, reveal: new Float32Array(8), paint };
}

// ---- The reference: every item, its own arc map, f32 inputs ----

const f32 = Math.fround;
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (e0: number, e1: number, x: number): number => {
  const u = clamp01((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
};

// Unwrapped world arc of an unwrapped ctrl, from the f32 control arcs.
function arcOf(fc: FireChain, x: number): number {
  const cal: number[] = [0];
  for (let i = 1; i < fc.n; i++) cal.push(f32(cal[i - 1] + fc.steps[i - 1]));
  const total = f32(fc.closed ? cal[fc.n - 1] + fc.steps[fc.n - 1] : cal[fc.n - 1]);
  let lap = 0;
  let y = x;
  if (fc.closed) {
    lap = Math.floor(x / fc.n);
    y = x - lap * fc.n;
  }
  const i = Math.max(0, Math.min(fc.n - 1, Math.floor(y)));
  const a1 = i + 1 < fc.n ? cal[i + 1] : total;
  return lap * total + cal[i] + (a1 - cal[i]) * (y - i);
}

// The ctrl copy of x nearest c on a ring (x itself on an open chain).
function nearestLap(fc: FireChain, x: number, c: number): number {
  return fc.closed ? x + fc.n * Math.floor((c - x) / fc.n + 0.5) : x;
}

interface Ref {
  ch: number;
  ember: number;
  smolder: number;
}

function reference(fc: FireChain, ctrl: number, gone: boolean): Ref {
  if (!fc.flag) return { ch: 0, ember: 0, smolder: 0 };
  let sum = 0;
  let ember = 0;
  let smolder = 0;
  const ramp = (x: number, c0: number, c1: number): number =>
    clamp01((x - c0) / EXPLORE_CHAR_EDGE + 0.5) * clamp01((c1 - x) / EXPLORE_CHAR_EDGE + 0.5);
  for (const s of fc.chars) {
    const c0 = f32(s.b0);
    const c1 = f32(s.b1);
    sum += ramp(nearestLap(fc, ctrl, 0.5 * (c0 + c1)), c0, c1);
  }
  for (const s of fc.smolders) {
    const c0 = f32(s.b0);
    const c1 = f32(s.b1);
    smolder = Math.max(smolder, ramp(nearestLap(fc, ctrl, 0.5 * (c0 + c1)), c0, c1));
  }
  for (const f of fc.fronts) {
    const c = f32(f.c);
    const dir = f.dir < 0 ? -1 : 1;
    const shape = frontShape(f.kind, gone);
    const x = nearestLap(fc, ctrl, c);
    const s = (x - c) * dir;
    const w = (arcOf(fc, x) - arcOf(fc, c)) * dir;
    // Levi's calls 1 and 3: the band, in world, ahead of every burning front
    // under both looks; the lit fuse has none.
    if (shape !== EXPLORE_FRONT_FUSE) {
      sum += (1 - ss(0, EXPLORE_FRONT_BAND, w)) * clamp01(s / EXPLORE_CHAR_EDGE + 0.5);
    }
    // Call 2: under gone the whole ember (ahead + behind) lies ahead.
    const ahead = shape === EXPLORE_FRONT_GONE ? EXPLORE_EMBER_AHEAD + EXPLORE_EMBER_BEHIND : EXPLORE_EMBER_AHEAD;
    ember = Math.max(ember, w >= 0 ? 1 - ss(0, ahead, w) : 1 - ss(0, EXPLORE_EMBER_BEHIND, -w));
  }
  return { ch: Math.min(sum, 1), ember, smolder };
}

const freshFire = (): KFireState => ({ ember: 0, smolder: 0 });

function randomChain(r: () => number, closed: boolean): FireChain {
  const n = 10 + Math.floor(r() * 30);
  // 0.25-1.1 world per ctrl: Daily #12's fronts sat at 0.30-0.80.
  const steps = Array.from({ length: closed ? n : n - 1 }, () => 0.25 + r() * 0.85);
  const top = closed ? n : n - 1;
  const fronts: Front[] = [];
  const chars: Span[] = [];
  const smolders: Span[] = [];
  for (let k = 0; k < 1 + Math.floor(r() * 3); k++) {
    const c = r() * top;
    fronts.push({ c, dir: r() < 0.5 ? -1 : 1, kind: r() < 0.25 ? 1 : 0 });
  }
  for (let k = 0; k < Math.floor(r() * 3); k++) {
    const b0 = r() * top;
    chars.push({ b0, b1: Math.min(closed ? b0 + n * 0.6 : top, b0 + 0.3 + r() * 4) });
  }
  if (r() < 0.5) {
    const b0 = r() * top;
    smolders.push({ b0, b1: Math.min(closed ? b0 + n * 0.6 : top, b0 + 0.5 + r() * 3) });
  }
  return { n, closed, steps, fronts, chars, smolders, flag: true };
}

describe("K410 kCharAtCpu, the CPU twin of kCharAt (K409's world-unit fronts)", () => {
  for (const gone of [false, true]) {
    it(`matches the every-item reference on random scenes (rings, wraps, open chains), ${gone ? "gone" : "char"}`, () => {
      const r = rng(gone ? 4090 : 4100);
      let checked = 0;
      let ember = 0;
      let band = 0;
      let smolder = 0;
      for (let trial = 0; trial < 30; trial++) {
        const chains = [0, 1, 2].map((k) => randomChain(r, (trial + k) % 2 === 0));
        const U = uniforms();
        const D = scene(chains, U, gone);
        chains.forEach((fc, ch) => {
          const c = kChain(D, ch);
          const top = fc.closed ? fc.n : fc.n - 1;
          for (let q = 0; q <= top * 32; q++) {
            const ctrl = Math.min(top - 1 / 1024, q / 32);
            const want = reference(fc, ctrl, gone);
            const out = freshFire();
            const got = kCharAtCpu(D, U, c, ctrl, out);
            expect(got).toBeCloseTo(want.ch, 9);
            expect(out.ember).toBeCloseTo(want.ember, 9);
            expect(out.smolder).toBeCloseTo(want.smolder, 9);
            checked++;
            if (want.ember > 0 && want.ember < 1) ember++;
            if (want.ch > 0 && want.ch < 1) band++;
            if (want.smolder > 0) smolder++;
          }
        });
      }
      expect(checked).toBeGreaterThan(40000);
      expect(ember).toBeGreaterThan(500);
      expect(band).toBeGreaterThan(500);
      expect(smolder).toBeGreaterThan(200);
    });
  }

  it("reads nothing on a chain without the burn flag (and resets the globals)", () => {
    const fc: FireChain = {
      n: 16,
      closed: true,
      steps: Array(16).fill(0.5),
      fronts: [{ c: 4, dir: 1, kind: 0 }],
      chars: [{ b0: 1, b1: 4 }],
      smolders: [{ b0: 8, b1: 10 }],
      flag: false,
    };
    const U = uniforms();
    const D = scene([fc], U, false);
    const out: KFireState = { ember: 0.7, smolder: 0.4 };
    expect(kCharAtCpu(D, U, kChain(D, 0), 4, out)).toBe(0);
    expect(out).toEqual({ ember: 0, smolder: 0 });
  });

  it("finds a front across a ring's seam, from either side", () => {
    // A ring of 12 ctrls, a front at 11.8 burning toward +ctrl: its unburnt
    // side runs on past the seam into ctrl 0.
    const fc: FireChain = {
      n: 12,
      closed: true,
      steps: Array(12).fill(0.6),
      fronts: [{ c: 11.8, dir: 1, kind: 0 }],
      chars: [],
      smolders: [],
      flag: true,
    };
    const U = uniforms();
    const D = scene([fc], U, false);
    const c = kChain(D, 0);
    for (const ctrl of [0, 0.05, 0.1, 0.3, 11.5, 11.7, 11.9]) {
      const out = freshFire();
      const got = kCharAtCpu(D, U, c, ctrl, out);
      const want = reference(fc, ctrl, false);
      expect(got).toBeCloseTo(want.ch, 9);
      expect(out.ember).toBeCloseTo(want.ember, 9);
    }
    // 0.1 is 0.3 ctrl = 0.18 world ahead of the front: past the ember's
    // reach (0.137 world), inside the band's (0.384).
    const out = freshFire();
    expect(kCharAtCpu(D, U, c, 0.1, out)).toBeGreaterThan(0.3);
    expect(out.ember).toBe(0);
  });
});

describe("K409: the fire's widths are world lengths", () => {
  // One front on a uniform chain of `apc` world per ctrl; the reach of a
  // quantity is the last ctrl offset (ahead > 0, behind < 0) where it is > 0.
  function reach(apc: number, kind: number, gone: boolean, dir: number): { band: number; ahead: number; behind: number } {
    const n = 64;
    const c0 = 32.25;
    const fc: FireChain = {
      n,
      closed: false,
      steps: Array(n - 1).fill(apc),
      fronts: [{ c: c0, dir, kind }],
      chars: [],
      smolders: [],
      flag: true,
    };
    const U = uniforms();
    const D = scene([fc], U, gone);
    const c = kChain(D, 0);
    let band = 0;
    let ahead = 0;
    let behind = 0;
    for (let q = -6000; q <= 6000; q++) {
      const off = q / 1000; // ctrl, signed toward the unburnt side
      const ctrl = c0 + off * dir;
      if (ctrl < 0 || ctrl > n - 1) continue;
      const out = freshFire();
      const ch = kCharAtCpu(D, U, c, ctrl, out);
      if (off > 0 && ch > 0) band = Math.max(band, off);
      if (off > 0 && out.ember > 0) ahead = Math.max(ahead, off);
      if (off < 0 && out.ember > 0) behind = Math.max(behind, -off);
    }
    return { band: band * apc, ahead: ahead * apc, behind: behind * apc };
  }

  it("keeps the median look: each width is its stage-3b ctrl value at 0.5486 world per ctrl", () => {
    expect(EXPLORE_WORLD_PER_CTRL).toBeCloseTo(0.5486, 4);
    expect(EXPLORE_FRONT_BAND / EXPLORE_WORLD_PER_CTRL).toBeCloseTo(0.7, 2);
    expect(EXPLORE_EMBER_AHEAD / EXPLORE_WORLD_PER_CTRL).toBeCloseTo(0.25, 2);
    expect(EXPLORE_EMBER_BEHIND / EXPLORE_WORLD_PER_CTRL).toBeCloseTo(0.55, 2);
    // Gone's ember ahead: 0.25 + 0.55 = 0.8 ctrl at the median.
    expect((EXPLORE_EMBER_AHEAD + EXPLORE_EMBER_BEHIND) / EXPLORE_WORLD_PER_CTRL).toBeCloseTo(0.8, 2);
  });

  for (const apc of [0.3, EXPLORE_WORLD_PER_CTRL, 0.8]) {
    for (const dir of [1, -1]) {
      it(`draws the same world widths at ${apc.toFixed(3)} world per ctrl, dir ${dir}`, () => {
        const tol = apc / 500; // one probe step
        const ch = reach(apc, 0, false, dir);
        expect(ch.band).toBeCloseTo(EXPLORE_FRONT_BAND, 2);
        expect(Math.abs(ch.band - EXPLORE_FRONT_BAND)).toBeLessThanOrEqual(tol);
        expect(Math.abs(ch.ahead - EXPLORE_EMBER_AHEAD)).toBeLessThanOrEqual(tol);
        expect(Math.abs(ch.behind - EXPLORE_EMBER_BEHIND)).toBeLessThanOrEqual(tol);
        // Gone: the band as under char (call 3), the whole ember ahead (call 2).
        const g = reach(apc, 0, true, dir);
        expect(Math.abs(g.band - EXPLORE_FRONT_BAND)).toBeLessThanOrEqual(tol);
        expect(Math.abs(g.ahead - (EXPLORE_EMBER_AHEAD + EXPLORE_EMBER_BEHIND))).toBeLessThanOrEqual(tol);
        // The lit fuse: no band, the ember on both sides, under both looks.
        for (const look of [false, true]) {
          const fz = reach(apc, 1, look, dir);
          expect(fz.band).toBe(0);
          expect(Math.abs(fz.ahead - EXPLORE_EMBER_AHEAD)).toBeLessThanOrEqual(tol);
          expect(Math.abs(fz.behind - EXPLORE_EMBER_BEHIND)).toBeLessThanOrEqual(tol);
        }
      });
    }
  }

  it("peaks the ember at the front, full char at the front under both looks", () => {
    for (const gone of [false, true]) {
      const fc: FireChain = {
        n: 20,
        closed: false,
        steps: Array(19).fill(0.4),
        fronts: [{ c: 10, dir: 1, kind: 0 }],
        chars: [],
        smolders: [],
        flag: true,
      };
      const U = uniforms();
      const D = scene([fc], U, gone);
      const out = freshFire();
      // At the front: the band's ramp is half on (it meets the burnt span's
      // own ramp there), the ember full.
      expect(kCharAtCpu(D, U, kChain(D, 0), 10, out)).toBeCloseTo(0.5, 9);
      expect(out.ember).toBe(1);
      // Gone's ember is at half strength halfway along its 0.439 world.
      const half = (EXPLORE_EMBER_AHEAD + (gone ? EXPLORE_EMBER_BEHIND : 0)) / 2;
      const o2 = freshFire();
      kCharAtCpu(D, U, kChain(D, 0), 10 + half / 0.4, o2);
      expect(o2.ember).toBeCloseTo(0.5, 6);
    }
  });

  it("frontRange covers every point a front touches, at the chain's tightest ctrl", () => {
    const r = rng(409);
    for (let trial = 0; trial < 200; trial++) {
      const fc = randomChain(r, trial % 2 === 0);
      fc.chars = [];
      fc.smolders = [];
      const gone = trial % 3 === 0;
      const apc = minArcPerCtrl(fc);
      for (const f of fc.fronts) {
        const [lo, hi] = frontRange(f, gone, apc);
        const solo: FireChain = { ...fc, fronts: [f] };
        // Walk out from the front in ctrl (unwrapped, both ways): the last
        // point with any band or ember must lie inside [lo, hi].
        for (const sgn of [-1, 1]) {
          let last = f.c;
          for (let q = 1; q <= 4000; q++) {
            const x = f.c + (sgn * q) / 400;
            if (!fc.closed && (x < 0 || x > fc.n - 1)) break;
            const v = reference(solo, x, gone);
            if (v.ch > 0 || v.ember > 0) last = x;
          }
          expect(last).toBeGreaterThanOrEqual(lo);
          expect(last).toBeLessThanOrEqual(hi);
        }
      }
    }
    // The reach ahead the range sizes: the band or the ember, whichever is
    // longer, in world.
    expect(frontAheadWorld(EXPLORE_FRONT_CHAR)).toBe(EXPLORE_FRONT_BAND);
    expect(frontAheadWorld(EXPLORE_FRONT_GONE)).toBe(Math.max(EXPLORE_FRONT_BAND, EXPLORE_EMBER_AHEAD + EXPLORE_EMBER_BEHIND));
    expect(frontAheadWorld(EXPLORE_FRONT_FUSE)).toBe(EXPLORE_EMBER_AHEAD);
  });

  it("writes the shape from the kind and the look", () => {
    expect(frontShape(0, false)).toBe(EXPLORE_FRONT_CHAR);
    expect(frontShape(0, true)).toBe(EXPLORE_FRONT_GONE);
    expect(frontShape(1, false)).toBe(EXPLORE_FRONT_FUSE);
    expect(frontShape(1, true)).toBe(EXPLORE_FRONT_FUSE);
    expect(frontItem({ c: 3.5, dir: -0.5, kind: 0 }, true)).toEqual([EXPLORE_ITEM_FRONT, 3.5, -1, EXPLORE_FRONT_GONE, 0, 0, 0, 0]);
  });

  it("the GLSL measures the same world arc and widths as the twin", () => {
    const f = (x: number): string => x.toFixed(5);
    expect(EXPLORE_VIS_GLSL).toContain("      highp float w = (kArcU(c, x) - kArcU(c, T0.y)) * T0.z;\n");
    expect(EXPLORE_VIS_GLSL).toContain(`      if (abs(T0.w - ${f(EXPLORE_FRONT_FUSE)}) > 0.5) {\n`);
    expect(EXPLORE_VIS_GLSL).toContain(
      `        sum += (1.0 - smoothstep(0.0, ${f(EXPLORE_FRONT_BAND)}, w)) *\n` +
        `          clamp(s * ${f(1 / EXPLORE_CHAR_EDGE)} + 0.5, 0.0, 1.0);\n`
    );
    expect(EXPLORE_VIS_GLSL).toContain(
      `      highp float e = w >= 0.0\n` +
        `        ? 1.0 - smoothstep(0.0, T0.w > ${f(EXPLORE_FRONT_GONE - 0.5)}\n` +
        `          ? ${f(EXPLORE_EMBER_AHEAD + EXPLORE_EMBER_BEHIND)}\n` +
        `          : ${f(EXPLORE_EMBER_AHEAD)}, w)\n` +
        `        : 1.0 - smoothstep(0.0, ${f(EXPLORE_EMBER_BEHIND)}, -w);\n`
    );
    // The emitted constants are the TS values to the shader's precision.
    for (const v of [EXPLORE_FRONT_BAND, EXPLORE_EMBER_AHEAD, EXPLORE_EMBER_BEHIND, EXPLORE_EMBER_AHEAD + EXPLORE_EMBER_BEHIND]) {
      expect(Math.abs(Number(f(v)) - v)).toBeLessThan(1e-9);
    }
  });
});
