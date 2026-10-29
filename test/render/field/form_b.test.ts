// K1040 S1: pins for form B's float64 reference (src/render/field/form_b.ts).
// Each term on a straight tube, a T, a Y, an acute pair, a dead end and a
// crossing; the corner against a numeric rolling ball on a curved arm; each
// fade swept across its width; the max decomposition (every winning term
// lies in one of its strips).
import { describe, expect, it } from "vitest";
import { F_CAP, F_FOLD, F_TIE, FormB, OWN, T_ARC, T_FOOT } from "../../../src/render/field/form_b";
import type { FormBParams } from "../../../src/render/field/form_b";
import type { FieldScene, SceneArm, SceneCrossing, SceneJunction, SceneLook } from "../../../src/render/field/scene";

const H = 1;
const W = 0.38;
const AA = 0.05; // half a device px at 10 px per unit, dpr 1

function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return out;
}

function ray(cx: number, cy: number, deg: number, r0: number, r1: number, step = 0.2): number[] {
  const a = (deg * Math.PI) / 180;
  return line(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), cx + r1 * Math.cos(a), cy + r1 * Math.sin(a), step);
}

function scene(chains: number[][], junctions: SceneJunction[] = [], crossings: SceneCrossing[] = [], look: Partial<SceneLook> = {}): FieldScene {
  return {
    version: 1,
    name: "form_b.test",
    source: { kind: "synthetic", generator: "form_b.test", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
    look: { halfWidth: H, band: W, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000", ...look },
    chains: chains.map((pts, id) => ({ id, closed: false, pts, z: new Array(pts.length / 2).fill(0) })),
    crossings,
    junctions,
    deadEnds: [],
  };
}

function junction(c: [number, number], arms: SceneArm[]): SceneJunction {
  const ang = (a: SceneArm) => a.dir; // order is given by the caller
  void ang;
  return { id: "j0", c, arms, corners: arms.map(() => ({ style: "round" as const, pinned: false })) };
}

/** A through along x (chain 0, s = x + 10) and an END from c along `deg` (chain 1). */
function tee(deg: number, r0 = 0, extra: number[][] = [], crossings: SceneCrossing[] = [], look: Partial<SceneLook> = {}): FieldScene {
  const arms: SceneArm[] = [
    { chain: 0, s: 10, dir: 1, kind: "through" },
    { chain: 1, s: 0, dir: 1, kind: "end" },
    { chain: 0, s: 10, dir: -1, kind: "through" },
  ];
  return scene([line(-10, 0, 10, 0), ray(0, 0, deg, r0, 10), ...extra], [junction([0, 0], arms)], crossings, look);
}

const band = (D: number) => 1 - smooth(W - AA, W + AA, D);
const band2 = (D: number) => band(D) * smooth(-AA, AA, D);
function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function cornerNear(fb: FormB, x: number, y: number) {
  let best = -1;
  let bd = Infinity;
  fb.corners.forEach((c, i) => {
    const d = Math.hypot(c.Vx - x, c.Vy - y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return fb.corners[best];
}

describe("form B: the terms", () => {
  it("a straight tube's side feet: band2 of h − d, the outline at 0.5", () => {
    const fb = new FormB(scene([line(-10, 0, 10, 0)]));
    for (const y of [0.3, 0.5, 0.62, 0.7, 0.81, 0.9, 0.95, 0.99, 1.0, 1.02, 1.05, 1.2]) {
      const e = fb.evalPoint(0.37, y);
      expect(e.ink).toBeCloseTo(band2(H - y), 12);
    }
    expect(fb.evalPoint(0.37, 1).ink).toBeCloseTo(0.5, 12);
    const e = fb.evalPoint(0.37, 0.81);
    expect(e.term?.kind).toBe(T_FOOT);
    expect(e.top).toBe(OWN + 0);
    expect(e.chain).toBe(0);
    expect(e.s).toBeCloseTo(10.37, 12);
  });

  it("a dead end keeps the polyline's round end", () => {
    const fb = new FormB(scene([line(-10, 0, 0, 0)]));
    for (const a of [0, 30, 60, 90, -45]) {
      const t = (a * Math.PI) / 180;
      const e = fb.evalPoint((H - W / 2) * Math.cos(t), (H - W / 2) * Math.sin(t));
      expect(e.ink).toBeCloseTo(1, 12);
    }
    expect(fb.evalPoint(0.5, 0).ink).toBe(0);
    expect(fb.evalPoint(1.0, 0).ink).toBeCloseTo(0.5, 12);
  });

  it("a crossing: the over's outline runs across, the under's ends on it", () => {
    const sc = scene([line(-10, 0, 10, 0), line(0, -10, 0, 10)], [], [{ a: { chain: 0, s: 10 }, b: { chain: 1, s: 10 }, over: "a" }]);
    const fb = new FormB(sc);
    const c = fb.evalPoint(0.01, 0.02);
    expect(c.chain).toBe(0);
    expect(c.nSurf).toBe(2);
    expect(fb.evalPoint(0.003, 1 - W / 2).ink).toBeCloseTo(1, 12); // the over's outline across the under
    expect(fb.evalPoint(1 - W / 2, 0.5).ink).toBe(0); // the under's outline hidden under the over
    expect(fb.evalPoint(1 - W / 2, 1.2).ink).toBeCloseTo(1, 12); // and drawn past the over's outline
  });

  it("a T: V, θ, r, q and the feet in closed form; the mouth buried; the arc band inked", () => {
    const fb = new FormB(tee(90, 0.3));
    expect(fb.nGroups).toBe(1);
    expect(fb.corners.length).toBe(2);
    const c = cornerNear(fb, 1, 1);
    expect(c.Vx).toBeCloseTo(H, 9);
    expect(c.Vy).toBeCloseTo(H, 9);
    expect(c.theta).toBeCloseTo(Math.PI / 2, 9);
    expect(c.r).toBeCloseTo(1.5 * H, 9);
    expect(c.qx).toBeCloseTo(2.5 * H, 9);
    expect(c.qy).toBeCloseTo(2.5 * H, 9);
    const ta = [c.tax, c.tay].map((v) => +v.toFixed(9));
    const tb = [c.tbx, c.tby].map((v) => +v.toFixed(9));
    expect([ta, tb].sort()).toEqual([
      [1, 2.5],
      [2.5, 1],
    ]);
    expect(c.omega).toBe(1);
    // The mouth: the through's outline under the END is buried.
    expect(fb.evalPoint(0, H - W / 2).ink).toBe(0);
    expect(fb.evalPoint(0.4, H - W / 2).ink).toBe(0);
    // The arc's band centre, toward V.
    const u = Math.SQRT1_2;
    const e = fb.evalPoint(2.5 - (1.5 + W / 2) * u, 2.5 - (1.5 + W / 2) * u);
    expect(e.ink).toBeCloseTo(1, 12);
    expect(e.term?.kind).toBe(T_ARC);
    // Inside the fill, away from the band: covered, no ink.
    const f = fb.evalPoint(1.1, 1.1);
    expect(f.top).toBe(0);
    expect(f.ink).toBe(0);
    // The through's side band past t_a, the END's past t_b.
    expect(fb.evalPoint(3, H - W / 2).ink).toBeCloseTo(1, 12);
    expect(fb.evalPoint(H - W / 2, 3).ink).toBeCloseTo(1, 12);
    // The far side of the through is untouched.
    expect(fb.evalPoint(0.2, -(H - W / 2)).ink).toBeCloseTo(1, 12);
  });

  it("a Y: three 120° corners at r = 2h, q = c + bis·3h/sin 60°", () => {
    const pts = [...ray(0, 0, 210, 10, 0), ...ray(0, 0, 330, 0, 10).slice(2)];
    const arms: SceneArm[] = [
      { chain: 0, s: 10, dir: -1, kind: "through" },
      { chain: 0, s: 10, dir: 1, kind: "through" },
      { chain: 1, s: 0, dir: 1, kind: "end" },
    ];
    const fb = new FormB(scene([pts, ray(0, 0, 90, 0, 10)], [junction([0, 0], arms)]));
    expect(fb.corners.length).toBe(3);
    const s60 = Math.sin(Math.PI / 3);
    for (const bis of [270, 30, 150]) {
      const b = (bis * Math.PI) / 180;
      const c = cornerNear(fb, (Math.cos(b) * H) / s60, (Math.sin(b) * H) / s60);
      expect(c.theta).toBeCloseTo((2 * Math.PI) / 3, 9);
      expect(c.r).toBeCloseTo(2 * H, 9);
      expect(c.Vx).toBeCloseTo((Math.cos(b) * H) / s60, 9);
      expect(c.Vy).toBeCloseTo((Math.sin(b) * H) / s60, 9);
      expect(c.qx).toBeCloseTo((Math.cos(b) * 3 * H) / s60, 9);
      expect(c.qy).toBeCloseTo((Math.sin(b) * 3 * H) / s60, 9);
    }
  });

  it("an acute pair: r = 1.5h·tan(θ/2), the fit and the cap in closed form", () => {
    const fb = new FormB(tee(30, 0));
    const t15 = Math.tan(Math.PI / 12);
    const c = cornerNear(fb, 1 / t15, 1);
    expect(c.theta).toBeCloseTo(Math.PI / 6, 9);
    expect(c.r).toBeCloseTo(1.5 * H * t15, 9);
    expect(c.Vx).toBeCloseTo(H / t15, 9);
    expect(c.Vy).toBeCloseTo(H, 9);
    expect(c.qx).toBeCloseTo((H + c.r) / t15, 9);
    expect(c.qy).toBeCloseTo(H + c.r, 9);
    // With little room the fit clamps r: a crossing 7h up the END caps it (L = 5, room 0.888).
    const sc = tee(30, 0, [ray(7 * Math.cos(Math.PI / 6), 7 * Math.sin(Math.PI / 6), 120, -10, 10)], [{ a: { chain: 1, s: 7 }, b: { chain: 2, s: 10 }, over: "b" }]);
    const f2 = new FormB(sc);
    const c2 = cornerNear(f2, 1 / t15, 1);
    const end = f2.arms.find((a) => a.kind === "end")!;
    expect(end.L).toBeCloseTo(7 - 1 / Math.tan(Math.PI / 4) - 1, 9);
    expect(c2.room).toBeCloseTo(end.L - W - H / t15, 9);
    expect(c2.r).toBeCloseTo(Math.min(1.5 * H * t15, Math.max(0, c2.room) * t15), 9);
  });

  it("a curved arm: the corner matches a numeric rolling ball", () => {
    // Through: a circle of radius 8 about (0, −8), the dome's top at c; END up the y axis.
    const R = 8;
    const pts: number[] = [];
    for (let i = -400; i <= 400; i++) {
      const a = Math.PI / 2 + (i * 0.05) / R;
      pts.push(R * Math.cos(a), -R + R * Math.sin(a));
    }
    // Arc length 0 at i = −400 (the right end): the dome's top is s = 20.
    const arms: SceneArm[] = [
      { chain: 0, s: 20, dir: -1, kind: "through" },
      { chain: 1, s: 0, dir: 1, kind: "end" },
      { chain: 0, s: 20, dir: 1, kind: "through" },
    ];
    const fb = new FormB(scene([pts, ray(0, 0, 90, 0, 10, 0.05)], [junction([0, 0], arms)]));
    const c = cornerNear(fb, 1, 1);
    expect(c.theta).toBeCloseTo(Math.acos(-1 / 9), 2);
    const rho = H + c.r;
    expect(c.r).toBeCloseTo(Math.min(2 * H, 1.5 * H * Math.tan(c.theta / 2)), 9);
    // The circle's offset by ρ meets the END's offset x = ρ: y = √(R² + 2Rρ) − R (chord sag ≤ 4e-5).
    expect(Math.abs(c.qx - rho)).toBeLessThan(1e-9);
    expect(Math.abs(c.qy - (Math.sqrt(R * R + 2 * R * rho) - R))).toBeLessThan(2e-4);
    // The ball: tangent to both offset curves, crossing neither centreline.
    const dmin = (p: number[], x: number, y: number) => {
      let m = Infinity;
      for (let k = 0; k + 3 < p.length; k += 2) {
        for (let j = 0; j <= 64; j++) {
          const t = j / 64;
          m = Math.min(m, Math.hypot(p[k] + (p[k + 2] - p[k]) * t - x, p[k + 1] + (p[k + 3] - p[k + 1]) * t - y));
        }
      }
      return m;
    };
    expect(Math.abs(dmin(pts, c.qx, c.qy) - rho)).toBeLessThan(1e-6);
    expect(Math.abs(c.qx - rho)).toBeLessThan(1e-9);
    expect(Math.abs(Math.hypot(c.tax - c.qx, c.tay - c.qy) - c.r)).toBeLessThan(1e-9);
    expect(Math.abs(Math.hypot(c.tbx - c.qx, c.tby - c.qy) - c.r)).toBeLessThan(1e-9);
    expect(Math.abs(dmin(pts, c.tax, c.tay) - H)).toBeLessThan(1e-6);
  });
});

describe("form B: the fades are continuous", () => {
  it("D2 + D5: a crossing slides up the END; the cap ramp and r move the ink by what the step explains", () => {
    const probes: [number, number][] = [
      [0, H - W / 2],
      [0.5, H - W / 2],
      [0.9, 0.9],
      [1.1, 1.1],
      [1.4, 1.4],
      [1.6, 1.25],
      [H - W / 2, 1.8],
    ];
    const step = 0.002;
    let prev: number[] | null = null;
    let maxJump = 0;
    let capSeen = false;
    for (let dc = 2.05; dc <= 4.5; dc += step) {
      const sc = tee(90, 0.3, [line(-10, dc, 10, dc)], [{ a: { chain: 1, s: dc - 0.3 }, b: { chain: 2, s: 10 }, over: "b" }]);
      const fb = new FormB(sc);
      const ink = probes.map(([x, y]) => {
        const e = fb.evalPoint(x, y);
        if (e.fade & F_CAP) capSeen = true;
        return e.ink;
      });
      if (prev) for (let i = 0; i < ink.length; i++) maxJump = Math.max(maxJump, Math.abs(ink[i] - prev[i]));
      prev = ink;
    }
    expect(capSeen).toBe(true);
    // A step moves the arc by ≤ step (slope 1.5/(2aa)) and the ramp by ≤ 1.5·step/λ.
    expect(maxJump).toBeLessThan(1.5 * step * (1 / (2 * AA) + 1 / H) * 1.5);
    console.log(`[form_b] D2+D5 sweep: max |Δink| per step ${step} = ${maxJump.toFixed(4)}`);
  });

  it("D4: across the tie line the ink mixes; without the mix it jumps", () => {
    // A (y = 0) pinned over by a crossing with a far stub; B (y = 1) flat. The tie line is where key_A = key_B.
    const sc = scene([line(-10, 0, 10, 0), line(-10, 1, 10, 1), line(0, 50, 0, 51)], [], [{ a: { chain: 0, s: 10 }, b: { chain: 2, s: 0.5 }, over: "a" }]);
    const run = (p: FormBParams) => {
      const fb = new FormB(sc, p);
      let best = { x: 0, jump: 0, tie: false };
      for (const x of [2.0, 2.4, 2.6, 2.7, 2.8, 2.85, 2.9, 2.95]) {
        let prev = -1;
        let jump = 0;
        let tie = false;
        for (let y = 0.3; y <= 1.0; y += AA / 20) {
          const e = fb.evalPoint(x, y);
          if (e.fade & F_TIE) tie = true;
          if (prev >= 0) jump = Math.max(jump, Math.abs(e.ink - prev));
          prev = e.ink;
        }
        if (jump > best.jump) best = { x, jump, tie };
      }
      return best;
    };
    const off = run({ zt: 1e-9, coneK: H / 0.1 });
    expect(off.jump).toBeGreaterThan(0.5);
    const on = run({});
    expect(on.jump).toBeLessThan(0.1);
  });

  it("D6: ω from 0 to 1 moves the ink at most in proportion", () => {
    const fb = new FormB(tee(90, 0.3));
    const pts: [number, number][] = [];
    for (let x = 0.55; x < 3.2; x += 0.13) for (let y = 0.55; y < 3.2; y += 0.13) pts.push([x, y]);
    let prev: number[] | null = null;
    let maxJump = 0;
    for (let k = 0; k <= 100; k++) {
      for (const c of fb.corners) c.omega = k / 100;
      const ink = pts.map(([x, y]) => fb.evalPoint(x, y).ink);
      if (prev) for (let i = 0; i < ink.length; i++) maxJump = Math.max(maxJump, Math.abs(ink[i] - prev[i]));
      prev = ink;
    }
    expect(maxJump).toBeLessThanOrEqual(0.0100001);
    console.log(`[form_b] D6: max |Δink| per Δω 0.01 = ${maxJump.toFixed(5)}`);
  });

  it("D1: the fold across a hairpin moves the ink no faster than an outline's AA", () => {
    // A hairpin of radius 0.9h: two legs 1.8h apart; a pixel walks along the legs into the bend.
    const R = 0.9 * H;
    const pts: number[] = [...line(-10, -R, 0, -R)];
    for (let i = 1; i <= 60; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 60;
      pts.push(R * Math.cos(a), R * Math.sin(a));
    }
    pts.push(...line(0, R, -10, R).slice(2));
    const fb = new FormB(scene([pts]));
    let maxJump = 0;
    let fold = false;
    for (const y of [0, 0.3, -0.3]) {
      let prev = -1;
      for (let x = -8; x <= 2; x += AA / 10) {
        const e = fb.evalPoint(x, y);
        if (e.fade & F_FOLD) fold = true;
        if (prev >= 0) maxJump = Math.max(maxJump, Math.abs(e.ink - prev));
        prev = e.ink;
      }
    }
    expect(fold).toBe(true);
    // A step of aa/10 across an outline's AA ramp (slope 1.5/(2aa)) moves the ink by 0.075.
    expect(maxJump).toBeLessThan(0.075 * 1.05);
    console.log(`[form_b] D1 fold: max |Δink| along the hairpin walks = ${maxJump.toFixed(4)} (step aa/10)`);
  });
});

describe("form B: the max decomposition", () => {
  it("every winning term lies in one of its strips", () => {
    const pts = [...ray(0, 0, 210, 10, 0), ...ray(0, 0, 330, 0, 10).slice(2)];
    const yArms: SceneArm[] = [
      { chain: 0, s: 10, dir: -1, kind: "through" },
      { chain: 0, s: 10, dir: 1, kind: "through" },
      { chain: 1, s: 0, dir: 1, kind: "end" },
    ];
    const cases: [string, FieldScene][] = [
      ["tube", scene([line(-10, 0, 10, 0)])],
      ["dead end", scene([line(-10, 0, 0, 0)])],
      ["crossing", scene([line(-10, 0, 10, 0), line(0, -10, 0, 10)], [], [{ a: { chain: 0, s: 10 }, b: { chain: 1, s: 10 }, over: "a" }])],
      ["T", tee(90, 0.3)],
      ["acute", tee(30, 0)],
      ["Y", scene([pts, ray(0, 0, 90, 0, 10)], [junction([0, 0], yArms)])],
    ];
    const report: string[] = [];
    for (const [name, sc] of cases) {
      const fb = new FormB(sc);
      let n = 0;
      let bad = 0;
      const cls = new Map<string, number>();
      for (let x = -5.9863; x < 6; x += 0.07) {
        for (let y = -5.9771; y < 6; y += 0.07) {
          const e = fb.evalPoint(x, y);
          if (!e.term || e.ink <= 0) continue;
          n++;
          const r = fb.stripCheck(e.term, x, y);
          cls.set(r.cls, (cls.get(r.cls) ?? 0) + 1);
          if (!r.ok) bad++;
        }
      }
      report.push(`${name}: ${n} inked, ${bad} outside, ${[...cls].map(([k, v]) => `${k} ${v}`).join(", ")}`);
      expect(bad, name).toBe(0);
    }
    console.log(`[form_b] strips: ${report.join("; ")}`);
  });
});
