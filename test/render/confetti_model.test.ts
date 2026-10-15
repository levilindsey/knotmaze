import { describe, expect, it } from "vitest";
import {
  AGE,
  CONFETTI_AMOUNT_MAX,
  CONFETTI_MAX_DT,
  ConfettiPool,
  ConfettiSim,
  F,
  FLIP,
  FLIP_RATE,
  LIFE,
  RAIN_CAP,
  RAIN_FADE,
  RAIN_LIFE_MAX,
  RAIN_PER_AMOUNT,
  RAIN_REF_H,
  RAIN_REF_W,
  RAIN_SCREEN_MAX,
  RAIN_WINDOW,
  SPIN,
  SPRAY_CAP,
  SPRAY_LIFE_MAX,
  SPRAY_LIFE_MIN,
  SPRAY_LIFT,
  SPRAY_MIN_PX,
  SPRAY_PER_AMOUNT,
  VX,
  VY,
  X,
  Y,
  confettiPlan,
  pieceLook,
  rainScreenScale,
  shadeHex,
  spawnRain,
  spawnSpray,
  sprayUnit,
  stepRain,
  stepSpray,
  type PieceLook,
} from "../../src/render/confetti_model";

// A seeded uniform [0, 1) source (mulberry32), so every run is the same.
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DT = 1 / 60;

// Steps until the sim is idle; returns the simulated seconds it took.
function runOut(sim: ConfettiSim, height: number, cap = 30): number {
  let t = 0;
  while (sim.active && t < cap) {
    sim.step(DT, height);
    t += DT;
  }
  return t;
}

describe("confettiPlan: how many pieces a finish throws", () => {
  it("scales both effects with the amount", () => {
    expect(confettiPlan(true, 1, false)).toEqual({
      rain: RAIN_PER_AMOUNT,
      spray: SPRAY_PER_AMOUNT,
      slow: false,
    });
    expect(confettiPlan(true, 0.5, false)).toEqual({ rain: 140, spray: 80, slow: false });
    expect(confettiPlan(true, CONFETTI_AMOUNT_MAX, false)).toEqual({
      rain: RAIN_PER_AMOUNT * CONFETTI_AMOUNT_MAX,
      spray: SPRAY_CAP,
      slow: false,
    });
  });

  it("scales the rain (not the spray) with the screen, up to the cap", () => {
    // The reference phone, portrait or landscape, and anything smaller.
    expect(confettiPlan(true, 1, false, RAIN_REF_W, RAIN_REF_H).rain).toBe(RAIN_PER_AMOUNT);
    expect(confettiPlan(true, 1, false, RAIN_REF_H, RAIN_REF_W).rain).toBe(RAIN_PER_AMOUNT);
    expect(confettiPlan(true, 1, false, 320, 568).rain).toBe(RAIN_PER_AMOUNT);
    // Desktops: the same coverage in bigger pieces.
    expect(rainScreenScale(1400, 900)).toBeCloseTo(2.059, 3);
    expect(rainScreenScale(1920, 1080)).toBeCloseTo(2.537, 3);
    const desk = confettiPlan(true, 1, false, 1400, 900);
    expect(desk).toEqual({ rain: 576, spray: SPRAY_PER_AMOUNT, slow: false });
    // A huge screen at the top amount fills the pool exactly.
    expect(rainScreenScale(3840, 2160)).toBe(RAIN_SCREEN_MAX);
    expect(confettiPlan(true, CONFETTI_AMOUNT_MAX, false, 3840, 2160).rain).toBe(RAIN_CAP);
    // No screen, or a garbage one: the phone's count.
    for (const [w, h] of [
      [0, 0],
      [NaN, 900],
      [1400, -1],
    ]) {
      expect(rainScreenScale(w, h)).toBe(1);
    }
    // Reduced motion still throws no rain on any screen.
    expect(confettiPlan(true, 1, true, 1920, 1080).rain).toBe(0);
  });

  it("caps the amount and reads off, zero or garbage as none", () => {
    expect(confettiPlan(true, 50, false)).toEqual(confettiPlan(true, CONFETTI_AMOUNT_MAX, false));
    for (const [on, amount] of [
      [false, 1],
      [true, 0],
      [true, -2],
      [true, NaN],
      [true, Infinity * 0],
    ] as const) {
      const p = confettiPlan(on, amount, false);
      expect([on, amount, p.rain, p.spray]).toEqual([on, amount, 0, 0]);
    }
  });

  it("drops the rain and keeps a slow 10% spray with reduced motion", () => {
    expect(confettiPlan(true, 1, true)).toEqual({ rain: 0, spray: 16, slow: true });
    expect(confettiPlan(true, CONFETTI_AMOUNT_MAX, true)).toEqual({
      rain: 0,
      spray: 48,
      slow: true,
    });
    expect(confettiPlan(false, 1, true)).toEqual({ rain: 0, spray: 0, slow: true });
  });
});

describe("sprayUnit: the spray's length unit", () => {
  it("is the marker radius, floored at SPRAY_MIN_PX CSS px", () => {
    // Desktop zoom: a 34 px marker is bigger than the floor.
    expect(sprayUnit(0.96, 17)).toBe(0.96);
    // The phone's default zoom (about 9 px per world unit): the floor.
    expect(sprayUnit(0.96, 9)).toBeCloseTo(SPRAY_MIN_PX / 9, 12);
    // A degenerate zoom falls back to the radius.
    expect(sprayUnit(0.96, 0)).toBe(0.96);
  });
});

describe("ConfettiPool", () => {
  it("allocates up to its capacity, then refuses", () => {
    const pool = new ConfettiPool(3);
    expect([pool.alloc(), pool.alloc(), pool.alloc(), pool.alloc()]).toEqual([0, 1, 2, -1]);
    expect(pool.alive).toBe(3);
  });

  it("kills by moving the last live row into the hole", () => {
    const pool = new ConfettiPool(3);
    for (let i = 0; i < 3; i++) pool.data[pool.alloc() * F + X] = 10 + i;
    pool.kill(0);
    expect(pool.alive).toBe(2);
    expect([pool.data[0 * F + X], pool.data[1 * F + X]]).toEqual([12, 11]);
    pool.kill(1);
    expect([pool.alive, pool.data[0 * F + X]]).toEqual([1, 12]);
  });

  it("caps a burst at the pool's size", () => {
    const pool = new ConfettiPool(RAIN_CAP);
    spawnRain(pool, RAIN_CAP + 100, 1400, 900, seeded(1));
    expect(pool.alive).toBe(RAIN_CAP);
  });
});

describe("the rain (screen space)", () => {
  it("releases over RAIN_WINDOW, front-loaded, from above the top edge", () => {
    const pool = new ConfettiPool(RAIN_CAP);
    spawnRain(pool, RAIN_PER_AMOUNT, 1400, 900, seeded(2));
    let early = 0;
    for (let i = 0; i < pool.alive; i++) {
      const o = i * F;
      expect(pool.data[o + AGE]).toBeLessThanOrEqual(0);
      expect(pool.data[o + AGE]).toBeGreaterThanOrEqual(-RAIN_WINDOW);
      expect(pool.data[o + Y]).toBeLessThan(0);
      if (pool.data[o + AGE] > -RAIN_WINDOW / 4) early++;
    }
    // Delay = window * r^1.5: P(delay < window / 4) = 0.25^(2/3), about 40%.
    expect(early / pool.alive).toBeGreaterThan(0.3);
    expect(early / pool.alive).toBeLessThan(0.5);
  });

  it("holds an unreleased piece still and invisible", () => {
    const pool = new ConfettiPool(8);
    spawnRain(pool, 8, 1400, 900, seeded(3));
    const i = [...Array(8).keys()].reduce((a, b) =>
      pool.data[b * F + AGE] < pool.data[a * F + AGE] ? b : a
    );
    const y0 = pool.data[i * F + Y];
    stepRain(pool, DT, 900);
    // The earliest-waiting row may have moved slots only if a piece died;
    // none can die in one frame from above the screen.
    expect(pool.alive).toBe(8);
    expect(pool.data[i * F + Y]).toBe(y0);
    const look: PieceLook = { alpha: 1, long: 1, short: 1, rotation: 0, tint: 0 };
    expect(pieceLook(pool.data, i, false, look).alpha).toBe(0);
  });

  it("falls out of the screen before its life backstop, on desktop and phone", () => {
    for (const [w, h] of [
      [1400, 900],
      [411, 753],
      [3840, 2160],
    ]) {
      const sim = new ConfettiSim();
      const plan = confettiPlan(true, CONFETTI_AMOUNT_MAX, false, w, h);
      sim.burst(plan, w, h, 0, 0, 1, seeded(w));
      expect(sim.rain.alive).toBe(plan.rain);
      // The oldest live piece after every frame: a piece that dies is at
      // most one frame older than it was there.
      let maxAge = -Infinity;
      let t = 0;
      while (sim.rain.alive > 0 && t < 30) {
        sim.step(DT, h);
        t += DT;
        for (let i = 0; i < sim.rain.alive; i++) {
          maxAge = Math.max(maxAge, sim.rain.data[i * F + AGE]);
        }
      }
      expect([w, h, sim.rain.alive]).toEqual([w, h, 0]);
      // Every piece fell out before the backstop's fade began.
      expect(maxAge + DT).toBeLessThan(RAIN_LIFE_MAX - RAIN_FADE);
      // A ~3-5 s fall after a ~1 s release window.
      expect(t).toBeGreaterThan(3);
      expect(t).toBeLessThan(RAIN_WINDOW + 5.2);
    }
  });
});

describe("the spray (world space)", () => {
  it("bursts from a ring around the finish", () => {
    const pool = new ConfettiPool(SPRAY_CAP);
    const unit = 2;
    spawnSpray(pool, SPRAY_PER_AMOUNT, 100, -50, unit, false, seeded(4));
    let mx = 0;
    let my = 0;
    for (let i = 0; i < pool.alive; i++) {
      const dx = pool.data[i * F + X] - 100;
      const dy = pool.data[i * F + Y] + 50;
      const r = Math.sqrt(dx * dx + dy * dy);
      expect(r).toBeGreaterThanOrEqual(0.9 * unit - 1e-5);
      expect(r).toBeLessThanOrEqual(1.2 * unit + 1e-5);
      mx += dx;
      my += dy;
      // Outward.
      expect(dx * pool.data[i * F + VX] + dy * (pool.data[i * F + VY] + SPRAY_LIFT * unit)).toBeGreaterThan(0);
    }
    // Evenly spread: the ring's centroid sits near its center.
    expect(Math.abs(mx / pool.alive)).toBeLessThan(0.15 * unit);
    expect(Math.abs(my / pool.alive)).toBeLessThan(0.15 * unit);
  });

  it("flies out a few units, in units of the marker", () => {
    const unit = 3;
    const pool = new ConfettiPool(SPRAY_CAP);
    spawnSpray(pool, SPRAY_PER_AMOUNT, 0, 0, unit, false, seeded(12));
    // The farthest each piece gets from the center before it dies.
    const far = new Float64Array(pool.alive);
    const n = pool.alive;
    const steps = Math.floor(SPRAY_LIFE_MIN / DT) - 1;
    for (let k = 0; k < steps; k++) {
      stepSpray(pool, DT);
      // Nothing dies before SPRAY_LIFE_MIN, so rows keep their pieces.
      expect(pool.alive).toBe(n);
      for (let i = 0; i < n; i++) {
        const r = Math.hypot(pool.data[i * F + X], pool.data[i * F + Y]);
        far[i] = Math.max(far[i], r);
      }
    }
    const sorted = Array.from(far).sort((a, b) => a - b);
    expect(sorted[0]).toBeGreaterThan(2 * unit);
    expect(sorted[n - 1]).toBeLessThan(7 * unit);
  });

  it("dies within SPRAY_LIFE_MAX", () => {
    const sim = new ConfettiSim();
    sim.burst(confettiPlan(true, CONFETTI_AMOUNT_MAX, false), 0, 0, 5, 5, 1, seeded(5));
    expect([sim.rain.alive, sim.spray.alive]).toEqual([0, SPRAY_CAP]);
    expect(runOut(sim, 900)).toBeLessThanOrEqual(SPRAY_LIFE_MAX + DT);
  });

  it("flies at half speed with no spin or flutter under reduced motion", () => {
    const fast = new ConfettiPool(SPRAY_CAP);
    const slow = new ConfettiPool(SPRAY_CAP);
    spawnSpray(fast, 16, 0, 0, 1, false, seeded(6));
    spawnSpray(slow, 16, 0, 0, 1, true, seeded(6));
    for (let i = 0; i < 16; i++) {
      const o = i * F;
      expect(slow.data[o + VX]).toBeCloseTo(fast.data[o + VX] / 2, 5);
      expect(slow.data[o + VY]).toBeCloseTo(fast.data[o + VY] / 2, 5);
      expect(slow.data[o + LIFE]).toBeCloseTo(fast.data[o + LIFE] * 0.8, 5);
      expect([slow.data[o + SPIN], slow.data[o + FLIP_RATE], slow.data[o + FLIP]]).toEqual([0, 0, 0]);
    }
  });
});

describe("ConfettiSim: the animating flag", () => {
  it("is false until a burst and returns to false after the last piece", () => {
    const sim = new ConfettiSim();
    expect(sim.active).toBe(false);
    sim.step(DT, 900);
    expect(sim.active).toBe(false);
    expect(sim.burst(confettiPlan(true, 1, false), 1400, 900, 0, 0, 1, seeded(7))).toBe(true);
    expect(sim.active).toBe(true);
    const t = runOut(sim, 900);
    expect(sim.active).toBe(false);
    expect(t).toBeLessThan(RAIN_WINDOW + RAIN_LIFE_MAX);
  });

  it("throws nothing (and stays idle) when the plan is empty", () => {
    const sim = new ConfettiSim();
    expect(sim.burst(confettiPlan(false, 1, false), 1400, 900, 0, 0, 1)).toBe(false);
    expect(sim.burst(confettiPlan(true, 0, false), 1400, 900, 0, 0, 1)).toBe(false);
    expect(sim.active).toBe(false);
  });

  it("goes idle with reduced motion too (spray only)", () => {
    const sim = new ConfettiSim();
    sim.burst(confettiPlan(true, 1, true), 1400, 900, 0, 0, 1, seeded(8));
    expect([sim.rain.alive, sim.spray.alive]).toEqual([0, 16]);
    expect(runOut(sim, 900)).toBeLessThanOrEqual(SPRAY_LIFE_MAX * 0.8 + DT);
    expect(sim.active).toBe(false);
  });

  it("clamps a stalled frame, and a garbage step moves nothing", () => {
    const a = new ConfettiSim();
    const b = new ConfettiSim();
    a.burst(confettiPlan(true, 1, false), 0, 0, 0, 0, 1, seeded(9));
    b.burst(confettiPlan(true, 1, false), 0, 0, 0, 0, 1, seeded(9));
    a.step(5, 900);
    b.step(CONFETTI_MAX_DT, 900);
    expect(Array.from(a.spray.data)).toEqual(Array.from(b.spray.data));
    const before = Array.from(a.spray.data);
    a.step(NaN, 900);
    a.step(-1, 900);
    expect(Array.from(a.spray.data)).toEqual(before);
  });

  it("clear() drops every piece", () => {
    const sim = new ConfettiSim();
    sim.burst(confettiPlan(true, 1, false), 1400, 900, 0, 0, 1, seeded(10));
    sim.clear();
    expect(sim.active).toBe(false);
  });
});

describe("pieceLook", () => {
  it("fades a spray piece over the end of its life and shades its back", () => {
    const pool = new ConfettiPool(1);
    spawnSpray(pool, 1, 0, 0, 1, false, seeded(11));
    const look: PieceLook = { alpha: 0, long: 0, short: 0, rotation: 0, tint: 0 };
    const life = pool.data[LIFE];
    pool.data[AGE] = 0;
    expect(pieceLook(pool.data, 0, true, look).alpha).toBe(1);
    pool.data[AGE] = life * 0.8;
    expect(pieceLook(pool.data, 0, true, look).alpha).toBeCloseTo(0.5, 5);
    pool.data[AGE] = life;
    expect(pieceLook(pool.data, 0, true, look).alpha).toBe(0);
    // Edge-on: a sliver at 0.55 of the color.
    pool.data[AGE] = 0;
    pool.data[FLIP] = Math.PI / 2;
    pieceLook(pool.data, 0, true, look);
    expect(look.short).toBeLessThan(0.13 * look.long);
    pool.data[FLIP] = 0;
    pieceLook(pool.data, 0, true, look);
    expect(look.short).toBeLessThanOrEqual(look.long);
    expect(look.short).toBeGreaterThan(0.3 * look.long);
  });

  it("shades a color toward black", () => {
    expect(shadeHex(0xffffff, 1)).toBe(0xffffff);
    expect(shadeHex(0xffffff, 0.5)).toBe(0x808080);
    expect(shadeHex(0xffd23f, 0)).toBe(0);
  });
});
