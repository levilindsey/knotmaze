import { describe, it, expect } from "vitest";
import { ParticleSystem } from "../../src/physics/particle_system";
import { SleepGate, physicsQuiet } from "../../src/physics/sleep_gate";
import { fabricScene, fabricGraph } from "./fabric_scene";

// K1626 (Levi: "a junction with an adjacent crossing of one of the threads
// going over another from the junction. Physics isn't doing a good enough
// job of keeping these threads apart"). A fused joint's half segments get
// the material to hold the first crossing along each arm clear of the
// joint (JN_HALF_SEG_SCALE). Settle to sleep, then measure, in thread
// widths, the world distance from every fused joint to every crossing
// with a pass on one of the joint's chains (the K1626 census's near list).
function closestJointCrossing(query: string): {
  minW: number;
  slept: number;
  eyes: Map<string, number>;
} {
  const { params, tuning } = fabricScene(query);
  const ps = new ParticleSystem(fabricGraph(params));
  const gate = new SleepGate();
  let slept = Infinity;
  while (ps.simTime < 40) {
    const s0 = ps.simTime;
    ps.step(0.1, tuning);
    if (gate.frame(physicsQuiet(ps), ps.simTime - s0)) {
      slept = ps.simTime;
      break;
    }
  }
  const pos = ps.positions;
  const at = (c: number, f: number): [number, number] => {
    const ch = ps.chains[c];
    const n = ch.length;
    const i0 = Math.floor(f);
    const t = f - i0;
    const a = ch[((i0 % n) + n) % n];
    const b = ch[(((i0 + 1) % n) + n) % n];
    return [
      pos[a * 2] * (1 - t) + pos[b * 2] * t,
      pos[a * 2 + 1] * (1 - t) + pos[b * 2 + 1] * t,
    ];
  };
  const chainOf = new Map<number, number>();
  ps.chains.forEach((ch, c) => ch.forEach((p) => chainOf.set(p, c)));
  let minW = Infinity;
  for (const group of ps.fusedJunctions) {
    let jx = 0;
    let jy = 0;
    const jChains = new Set<number>();
    for (const m of group) {
      jx += pos[m * 2] / group.length;
      jy += pos[m * 2 + 1] / group.length;
      jChains.add(chainOf.get(m) as number);
    }
    for (const X of ps.crossings) {
      if (!jChains.has(X.over.chain) && !jChains.has(X.under.chain)) continue;
      const a = at(X.over.chain, X.over.ctrl);
      const b = at(X.under.chain, X.under.ctrl);
      const d = Math.hypot((a[0] + b[0]) / 2 - jx, (a[1] + b[1]) / 2 - jy);
      minW = Math.min(minW, d / tuning.threadWidth);
    }
  }
  // K1626 s2: the joint eyes. Two arms of one fused joint whose first
  // passes out (within 8 ctrl, no other pass between) are one crossing's
  // over and under close an eye between the joint and the crossing. Its
  // opening, in widths, is the largest distance from a point of one arm to
  // the other arm, centre line to centre line.
  const slotOf = new Map<number, number>();
  ps.chains.forEach((ch) => ch.forEach((p, s) => slotOf.set(p, s)));
  const passesOn = (c: number): number[] => {
    const out: number[] = [];
    for (const X of ps.crossings) {
      if (X.over.chain === c) out.push(X.over.ctrl);
      if (X.under.chain === c) out.push(X.under.ctrl);
    }
    return out;
  };
  const clear = (c: number, s: number, f: number): boolean =>
    !passesOn(c).some((v) => Math.abs(v - f) > 1e-9 && (v - s) * (f - v) > 0);
  const line = (c: number, s: number, f: number): Array<[number, number]> =>
    Array.from({ length: 25 }, (_, k) => at(c, s + ((f - s) * k) / 24));
  const toLine = (p: [number, number], Q: Array<[number, number]>): number => {
    let m = Infinity;
    for (let i = 0; i + 1 < Q.length; i++) {
      const [ux, uy] = Q[i];
      const dx = Q[i + 1][0] - ux;
      const dy = Q[i + 1][1] - uy;
      const L = dx * dx + dy * dy;
      const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - ux) * dx + (p[1] - uy) * dy) / L));
      m = Math.min(m, Math.hypot(p[0] - ux - t * dx, p[1] - uy - t * dy));
    }
    return m;
  };
  const eyes = new Map<string, number>();
  ps.fusedJunctions.forEach((group, j) => {
    ps.crossings.forEach((X, x) => {
      const [sa, sb] = [X.over, X.under].map((P) => {
        let best: number | null = null;
        for (const m of group) {
          if (chainOf.get(m) !== P.chain) continue;
          const s = slotOf.get(m) as number;
          if (Math.abs(P.ctrl - s) <= 8 && (best === null || Math.abs(P.ctrl - s) < Math.abs(P.ctrl - best))) best = s;
        }
        return best;
      });
      if (sa === null || sb === null || (X.over.chain === X.under.chain && sa === sb)) return;
      if (!clear(X.over.chain, sa, X.over.ctrl) || !clear(X.under.chain, sb, X.under.ctrl)) return;
      const A = line(X.over.chain, sa, X.over.ctrl);
      const B = line(X.under.chain, sb, X.under.ctrl);
      const open = Math.max(...A.map((p) => toLine(p, B)), ...B.map((p) => toLine(p, A)));
      eyes.set(`J${j}xX${x}`, open / tuning.threadWidth);
    });
  });
  return { minW, slept, eyes };
}

describe("K1626 joint-to-crossing distance", () => {
  // Master: 2.32 widths on Levi's link and 1.26 on ?1; with the joint
  // half segments' material 2.74 and 1.70 (both sleep at 5.0 sim-s).
  it("holds the crossing beside a joint clear on Levi's link", () => {
    const r = closestJointCrossing("?3.FCBQ1H6L4-6NPbeg8HHN09w");
    expect(r.slept).toBeLessThan(10);
    expect(r.minW).toBeGreaterThan(2.6);
    // Stage 2's eye pressure: the smallest eye 0.29 widths on master
    // (J64), 1.84 now; Levi's J138 0.80 on master, 2.05 now.
    expect(r.eyes.size).toBeGreaterThan(10);
    expect(Math.min(...r.eyes.values())).toBeGreaterThan(1.75);
    expect(r.eyes.get("J138xX282")).toBeGreaterThan(1.95);
  }, 120_000);

  it("holds it clear on the default design (?1)", () => {
    const r = closestJointCrossing("?1");
    expect(r.slept).toBeLessThan(10);
    expect(r.minW).toBeGreaterThan(1.55);
    // The smallest eye: 1.34 widths on master, 1.15 on stage 1, 1.61 now.
    expect(Math.min(...r.eyes.values())).toBeGreaterThan(1.5);
  }, 120_000);
});

// K1626 s3: the width slider jumps across the half segments' fade on a
// knot that is still awake (40 sim-s at width 0.75, which neither link
// sleeps at on any build), then drops to 0.5. Stage 2's eye pressure kept
// Levi's link awake after that jump for good (joint eye J149xX305 parked
// below a target its short arm had not the material to reach, pushing on);
// the lens target now stops at the arms' material bound.
function widthJumpResleep(query: string): number {
  const { params, tuning } = fabricScene(query);
  const ps = new ParticleSystem(fabricGraph(params));
  const t = { ...tuning, threadWidth: 0.75 };
  while (ps.simTime < 40) ps.step(0.1, t);
  t.threadWidth = 0.5;
  const gate = new SleepGate();
  const t1 = ps.simTime;
  while (ps.simTime < t1 + 12) {
    const s0 = ps.simTime;
    ps.step(0.1, t);
    if (gate.frame(physicsQuiet(ps), ps.simTime - s0)) return ps.simTime - t1;
  }
  return Infinity;
}

describe("K1626 width jump", () => {
  it("re-sleeps after a 0.75 -> 0.5 width jump on Levi's link", () => {
    expect(widthJumpResleep("?3.FCBQ1H6L4-6NPbeg8HHN09w")).toBeLessThan(10);
  }, 300_000);

  it("re-sleeps after the jump on the default design (?1)", () => {
    expect(widthJumpResleep("?1")).toBeLessThan(10);
  }, 300_000);
});
