import { describe, expect, it } from "vitest";
import {
  AGE,
  CONFETTI_AMOUNT_MAX,
  CONFETTI_MAX_DT,
  CONFETTI_SHINE_MAX,
  COLOR,
  ConfettiPool,
  ConfettiSim,
  F,
  FLIP,
  FLIP_RATE,
  FOIL_SPEC,
  HALF,
  LEN,
  LIFE,
  LIGHT,
  MAT,
  PAPER_SPEC,
  RAIN_CAP,
  RAIN_FADE,
  RAIN_LIFE_MAX,
  RAIN_PER_AMOUNT,
  RAIN_REF_H,
  RAIN_REF_W,
  RAIN_SCREEN_MAX,
  RAIN_TAPER,
  RAIN_TOP_SPREAD,
  RAIN_WINDOW,
  ROT,
  SHINE_AMBIENT,
  SPIN,
  SPRAY_CAP,
  SPRAY_DRAG,
  SPRAY_GRAVITY,
  SPRAY_LIFE_MAX,
  SPRAY_LIFE_MIN,
  SPRAY_LIFT,
  SPRAY_MIN_PX,
  SPRAY_PER_AMOUNT,
  TERM,
  VX,
  VY,
  X,
  Y,
  confettiPlan,
  pieceLook,
  rainDelay,
  rainReleaseDensity,
  rainScreenScale,
  litHex,
  shadeNormal,
  spawnRain,
  spawnSpray,
  specular,
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
    expect(confettiPlan(1, false)).toEqual({
      rain: RAIN_PER_AMOUNT,
      spray: SPRAY_PER_AMOUNT,
      slow: false,
      foil: 0,
      shine: 0,
    });
    expect(confettiPlan(0.5, false)).toEqual({
      rain: 210,
      spray: 160,
      slow: false,
      foil: 0,
      shine: 0,
    });
    expect(confettiPlan(CONFETTI_AMOUNT_MAX, false)).toEqual({
      rain: RAIN_PER_AMOUNT * CONFETTI_AMOUNT_MAX,
      spray: SPRAY_CAP,
      slow: false,
      foil: 0,
      shine: 0,
    });
  });

  it("scales the rain (not the spray) with the screen, up to the cap", () => {
    // The reference phone, portrait or landscape, and anything smaller.
    expect(confettiPlan(1, false, RAIN_REF_W, RAIN_REF_H).rain).toBe(RAIN_PER_AMOUNT);
    expect(confettiPlan(1, false, RAIN_REF_H, RAIN_REF_W).rain).toBe(RAIN_PER_AMOUNT);
    expect(confettiPlan(1, false, 320, 568).rain).toBe(RAIN_PER_AMOUNT);
    // Desktops: the same coverage in bigger pieces.
    expect(rainScreenScale(1400, 900)).toBeCloseTo(2.059, 3);
    expect(rainScreenScale(1920, 1080)).toBeCloseTo(2.537, 3);
    const desk = confettiPlan(1, false, 1400, 900);
    expect(desk).toEqual({
      rain: 865,
      spray: SPRAY_PER_AMOUNT,
      slow: false,
      foil: 0,
      shine: 0,
    });
    // A huge screen at the top amount fills the pool exactly.
    expect(rainScreenScale(3840, 2160)).toBe(RAIN_SCREEN_MAX);
    expect(confettiPlan(CONFETTI_AMOUNT_MAX, false, 3840, 2160).rain).toBe(RAIN_CAP);
    // No screen, or a garbage one: the phone's count.
    for (const [w, h] of [
      [0, 0],
      [NaN, 900],
      [1400, -1],
    ]) {
      expect(rainScreenScale(w, h)).toBe(1);
    }
    // Reduced motion still throws no rain on any screen.
    expect(confettiPlan(1, true, 1920, 1080).rain).toBe(0);
  });

  it("caps the amount and reads zero or garbage as none", () => {
    expect(confettiPlan(50, false)).toEqual(confettiPlan(CONFETTI_AMOUNT_MAX, false));
    for (const amount of [0, -2, NaN, Infinity * 0]) {
      const p = confettiPlan(amount, false);
      expect([amount, p.rain, p.spray]).toEqual([amount, 0, 0]);
    }
  });

  it("drops the rain and keeps a slow 5% spray with reduced motion", () => {
    const none = { foil: 0, shine: 0 };
    expect(confettiPlan(1, true)).toEqual({ rain: 0, spray: 16, slow: true, ...none });
    expect(confettiPlan(CONFETTI_AMOUNT_MAX, true)).toEqual({
      rain: 0,
      spray: 48,
      slow: true,
      ...none,
    });
    expect(confettiPlan(0, true)).toEqual({ rain: 0, spray: 0, slow: true, ...none });
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
  // The tapered release's CDF (K335): P(delay < t).
  const releasedBy = (t: number): number =>
    1 - Math.pow(1 - t / RAIN_WINDOW, RAIN_TAPER + 1);

  it("releases over RAIN_WINDOW, front-loaded, from above the top edge", () => {
    const pool = new ConfettiPool(RAIN_CAP);
    spawnRain(pool, RAIN_CAP, 1400, 900, seeded(2));
    const delays: number[] = [];
    for (let i = 0; i < pool.alive; i++) {
      const o = i * F;
      expect(pool.data[o + AGE]).toBeLessThanOrEqual(0);
      expect(pool.data[o + AGE]).toBeGreaterThanOrEqual(-RAIN_WINDOW);
      expect(pool.data[o + Y]).toBeLessThan(0);
      delays.push(-pool.data[o + AGE]);
    }
    // The sampled delays follow the CDF (3780 draws: a share's sd ~0.008).
    for (const t of [0.1, 0.3, 0.6, 1, 1.5, 2.2]) {
      const share = delays.filter((d) => d < t).length / delays.length;
      expect(Math.abs(share - releasedBy(t)), `share by ${t} s`).toBeLessThan(0.04);
    }
    // The opening keeps K335's density in pieces per second: K568 stretched
    // the window 1.5x and the count with it, so at amount 1 on the phone
    // 636 pieces/s leave at first, 60 in the first 0.1 s and 159 by 0.3 s
    // (K335: 58 and 146 of 280; K140: 28 and 59 of 140).
    expect(RAIN_PER_AMOUNT * rainReleaseDensity(0)).toBeCloseTo((280 * (RAIN_TAPER + 1)) / 2.2, 3);
    expect(RAIN_PER_AMOUNT * releasedBy(0.1)).toBeGreaterThan(58);
    expect(RAIN_PER_AMOUNT * releasedBy(0.3)).toBeGreaterThan(145);
  });

  it("tapers the releases to nothing, with no step (K335)", () => {
    // rainDelay inverts the CDF, from 0 to the window's end.
    expect(rainDelay(0)).toBe(0);
    expect(rainDelay(1)).toBeCloseTo(RAIN_WINDOW, 12);
    for (const u of [0.05, 0.3, 0.5, 0.9, 0.99]) {
      expect(releasedBy(rainDelay(u))).toBeCloseTo(u, 9);
    }
    // The density integrates to 1, falls monotonically from its start to 0
    // at the window's end, and never jumps: no 1 ms step moves it by more
    // than 0.5% of its start (K140's window ended on a drop from 0.6 /s to 0).
    const n = Math.round(RAIN_WINDOW * 1000);
    const h = RAIN_WINDOW / n;
    const start = rainReleaseDensity(0);
    expect(start).toBeCloseTo((RAIN_TAPER + 1) / RAIN_WINDOW, 12);
    let area = 0;
    let prev = start;
    for (let k = 1; k <= n; k++) {
      const v = rainReleaseDensity(k * h);
      expect(v).toBeLessThanOrEqual(prev);
      expect(prev - v).toBeLessThan(0.005 * start);
      area += 0.5 * (prev + v) * h;
      prev = v;
    }
    expect(area).toBeCloseTo(1, 5);
    expect(rainReleaseDensity(RAIN_WINDOW)).toBe(0);
    expect(rainReleaseDensity(RAIN_WINDOW + 0.1)).toBe(0);
    expect(rainReleaseDensity(-0.1)).toBe(0);
    // The last tenth of the window releases almost nothing.
    expect(rainReleaseDensity(0.9 * RAIN_WINDOW)).toBeLessThan(0.001 * start);
    // And spawnRain's releases follow it: tenth-of-a-second bins fall off
    // (up to sampling noise) and the window's tail is near empty.
    const pool = new ConfettiPool(RAIN_CAP);
    spawnRain(pool, RAIN_CAP, 1400, 900, seeded(5));
    const bins = new Array(Math.ceil(RAIN_WINDOW / 0.1)).fill(0);
    for (let i = 0; i < pool.alive; i++) {
      bins[Math.min(bins.length - 1, Math.floor(-pool.data[i * F + AGE] / 0.1))]++;
    }
    for (let b = 1; b < bins.length; b++) {
      // A Poisson count's sd is sqrt(n): allow 3 sd of noise.
      expect(bins[b]).toBeLessThanOrEqual(bins[b - 1] + 3 * Math.sqrt(bins[b - 1] + 1));
    }
    expect(bins[bins.length - 1] + bins[bins.length - 2]).toBeLessThan(0.01 * bins[0]);
  });

  it("starts the later releases higher, the first wave at the edge (K335)", () => {
    const [w, h] = [1400, 900];
    const pool = new ConfettiPool(RAIN_CAP);
    spawnRain(pool, RAIN_CAP, w, h, seeded(6));
    let [early, earlySum, earlyMax] = [0, 0, 0];
    let [late, lateSum, lateMax] = [0, 0, 0];
    for (let i = 0; i < pool.alive; i++) {
      const o = i * F;
      const delay = -pool.data[o + AGE];
      // Height above the edge beyond the piece's own 2 lengths, in heights.
      const extra = (-pool.data[o + Y] - 2 * pool.data[o + LEN]) / h;
      expect(extra).toBeGreaterThanOrEqual(0);
      expect(extra).toBeLessThanOrEqual(
        0.05 + RAIN_TOP_SPREAD * (delay / RAIN_WINDOW) + 1e-6
      );
      if (delay < 0.1) {
        early++;
        earlySum += extra;
        earlyMax = Math.max(earlyMax, extra);
      }
      if (delay > 0.5 * RAIN_WINDOW) {
        late++;
        lateSum += extra;
        lateMax = Math.max(lateMax, extra);
      }
    }
    // The first 0.1 s leaves from just above the edge, as K140's did...
    expect(earlyMax).toBeLessThan(0.05 + RAIN_TOP_SPREAD * (0.1 / RAIN_WINDOW));
    // ... and the tail (about 1 piece in 32) starts higher and ragged: on
    // average about twice as far up (0.025 + 0.06 * 0.58 h against 0.026 h).
    expect(late).toBeGreaterThan(20);
    expect(lateSum / late).toBeGreaterThan(1.8 * (earlySum / early));
    expect(lateMax).toBeGreaterThan(earlyMax + 0.25 * RAIN_TOP_SPREAD);
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
      const plan = confettiPlan(CONFETTI_AMOUNT_MAX, false, w, h);
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
      // A ~3-5 s fall after a release that tapers out by about 2.7 s (the
      // window's last fifth releases next to nothing): the last piece goes
      // 6.2-7.7 s after the finish (K568's census; 5.6-6.8 s before).
      expect(t).toBeGreaterThan(6);
      expect(t).toBeLessThan(8);
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
    // The farthest each piece gets from the center before it dies, and
    // sideways (gravity pulls only down, so the drag alone bounds that).
    const far = new Float64Array(pool.alive);
    let side = 0;
    const n = pool.alive;
    const steps = Math.floor(SPRAY_LIFE_MIN / DT) - 1;
    for (let k = 0; k < steps; k++) {
      stepSpray(pool, DT);
      // Nothing dies before SPRAY_LIFE_MIN, so rows keep their pieces.
      expect(pool.alive).toBe(n);
      for (let i = 0; i < n; i++) {
        const r = Math.hypot(pool.data[i * F + X], pool.data[i * F + Y]);
        far[i] = Math.max(far[i], r);
        side = Math.max(side, Math.abs(pool.data[i * F + X]));
      }
    }
    const sorted = Array.from(far).sort((a, b) => a - b);
    expect(sorted[0]).toBeGreaterThan(1.5 * unit);
    // K568: the ring's 1.2 units plus the top speed's 30 / 3.4 of drag.
    expect(side).toBeLessThan(10.1 * unit);
    expect(side).toBeGreaterThan(8 * unit);
  });

  it("bends over into a fall under gravity (K570)", () => {
    const unit = 2;
    const pool = new ConfettiPool(SPRAY_CAP);
    spawnSpray(pool, SPRAY_PER_AMOUNT, 0, 0, unit, false, seeded(13));
    const n = pool.alive;
    for (let k = 0; k < Math.round(1.2 / DT); k++) stepSpray(pool, DT);
    expect(pool.alive).toBe(n);
    // By 1.2 s every piece falls, at nearly the terminal speed, and the
    // cloud has sunk well below the finish (its mean ~4 units down).
    const fall = (SPRAY_GRAVITY / SPRAY_DRAG) * unit;
    let vy = 0;
    let y = 0;
    for (let i = 0; i < n; i++) {
      expect(pool.data[i * F + VY]).toBeGreaterThan(0.85 * fall);
      vy += pool.data[i * F + VY] / n;
      y += pool.data[i * F + Y] / n;
    }
    // The step's explicit gravity settles 3% fast at 60 fps (5.14 units/s).
    expect(vy).toBeGreaterThan(0.95 * fall);
    expect(vy).toBeLessThan(1.05 * fall);
    expect(y).toBeGreaterThan(3 * unit);
  });

  it("dies within SPRAY_LIFE_MAX", () => {
    const sim = new ConfettiSim();
    sim.burst(confettiPlan(CONFETTI_AMOUNT_MAX, false), 0, 0, 5, 5, 1, seeded(5));
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
      expect(slow.data[o + TERM]).toBeCloseTo(fast.data[o + TERM] / 2, 5);
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
    expect(sim.burst(confettiPlan(1, false), 1400, 900, 0, 0, 1, seeded(7))).toBe(true);
    expect(sim.active).toBe(true);
    const t = runOut(sim, 900);
    expect(sim.active).toBe(false);
    expect(t).toBeLessThan(RAIN_WINDOW + RAIN_LIFE_MAX);
  });

  it("throws nothing (and stays idle) when the plan is empty", () => {
    const sim = new ConfettiSim();
    expect(sim.burst(confettiPlan(0, false), 1400, 900, 0, 0, 1)).toBe(false);
    expect(sim.burst(confettiPlan(0, false), 1400, 900, 0, 0, 1)).toBe(false);
    expect(sim.active).toBe(false);
  });

  it("goes idle with reduced motion too (spray only)", () => {
    const sim = new ConfettiSim();
    sim.burst(confettiPlan(1, true), 1400, 900, 0, 0, 1, seeded(8));
    expect([sim.rain.alive, sim.spray.alive]).toEqual([0, 16]);
    expect(runOut(sim, 900)).toBeLessThanOrEqual(SPRAY_LIFE_MAX * 0.8 + DT);
    expect(sim.active).toBe(false);
  });

  it("clamps a stalled frame, and a garbage step moves nothing", () => {
    const a = new ConfettiSim();
    const b = new ConfettiSim();
    a.burst(confettiPlan(1, false), 0, 0, 0, 0, 1, seeded(9));
    b.burst(confettiPlan(1, false), 0, 0, 0, 0, 1, seeded(9));
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
    sim.burst(confettiPlan(1, false), 1400, 900, 0, 0, 1, seeded(10));
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
    // Edge-on: a sliver.
    pool.data[AGE] = 0;
    pool.data[FLIP] = Math.PI / 2;
    pieceLook(pool.data, 0, true, look);
    expect(look.short).toBeLessThan(0.13 * look.long);
    pool.data[FLIP] = 0;
    pieceLook(pool.data, 0, true, look);
    expect(look.short).toBeLessThanOrEqual(look.long);
    expect(look.short).toBeGreaterThan(0.3 * look.long);
  });

  it("scales a color (saturating) and mixes it toward white", () => {
    expect(litHex(0xffffff, 1, 0)).toBe(0xffffff);
    expect(litHex(0xffffff, 0.5, 0)).toBe(0x808080);
    expect(litHex(0xffd23f, 0, 0)).toBe(0);
    // Each channel saturates at 255 before the mix.
    expect(litHex(0x204080, 4, 0)).toBe(0x80ffff);
    expect(litHex(0x000000, 1, 0.5)).toBe(0x808080);
    expect(litHex(0x204080, 1, 1)).toBe(0xffffff);
  });
});

// A seeded unit normal, uniform on the sphere.
function unitNormal(rand: () => number): [number, number, number] {
  const z = 2 * rand() - 1;
  const a = rand() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(a), r * Math.sin(a), z];
}

// H tipped `deg` degrees toward the screen's normal (or away, negative).
function tippedHalf(deg: number): [number, number, number] {
  const [hx, hy, hz] = HALF;
  // The unit vector in the plane of H and +z, perpendicular to H.
  let ux = -hz * hx;
  let uy = -hz * hy;
  let uz = 1 - hz * hz;
  const n = Math.hypot(ux, uy, uz);
  ux /= n;
  uy /= n;
  uz /= n;
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [hx * c + ux * s, hy * c + uy * s, hz * c + uz * s];
}

function channels(c: number): number[] {
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}

describe("the shine (K337)", () => {
  it("peaks where the normal is the half vector H", () => {
    const [hx, hy, hz] = HALF;
    // H = normalize(L + V), with the eye V = (0, 0, 1).
    const lx = LIGHT[0];
    const ly = LIGHT[1];
    const lz = LIGHT[2] + 1;
    const ln = Math.hypot(lx, ly, lz);
    expect([hx, hy, hz].map((v) => +v.toFixed(12))).toEqual(
      [lx / ln, ly / ln, lz / ln].map((v) => +v.toFixed(12))
    );
    expect(specular(hx, hy, hz, true, 1)).toBeCloseTo(FOIL_SPEC, 9);
    expect(specular(hx, hy, hz, false, 1)).toBeCloseTo(PAPER_SPEC, 9);
    const rand = seeded(21);
    for (let k = 0; k < 2000; k++) {
      const [x, y, z] = unitNormal(rand);
      for (const foil of [false, true]) {
        expect(specular(x, y, z, foil, 1)).toBeLessThanOrEqual(
          specular(hx, hy, hz, foil, 1)
        );
      }
    }
    for (const deg of [-5, 5]) {
      const [x, y, z] = tippedHalf(deg);
      expect(specular(x, y, z, false, 1)).toBeLessThan(PAPER_SPEC);
      expect(specular(x, y, z, true, 1)).toBeLessThan(FOIL_SPEC);
    }
    // Foil facing H flashes white, whatever its color.
    for (const c of [0xffd23f, 0x2040a0, 0x000000]) {
      expect(shadeNormal(c, hx, hy, hz, true, 1)).toBe(0xffffff);
    }
  });

  it("lights a piece's back as its front: the normal flips", () => {
    const rand = seeded(22);
    for (let k = 0; k < 500; k++) {
      const [x, y, z] = unitNormal(rand);
      for (const foil of [false, true]) {
        expect(shadeNormal(0x3fa0ff, -x, -y, -z, foil, 1)).toBe(
          shadeNormal(0x3fa0ff, x, y, z, foil, 1)
        );
      }
    }
    // In pieceLook: half a turn of the flip shows the back, lit the same.
    const pool = new ConfettiPool(1);
    spawnRain(pool, 1, 411, 753, seeded(23), 1);
    pool.data[AGE] = 0;
    const a: PieceLook = { alpha: 0, long: 0, short: 0, rotation: 0, tint: 0 };
    const b: PieceLook = { ...a };
    for (let flip = 0; flip < 6.3; flip += 0.05) {
      pool.data[FLIP] = flip;
      pieceLook(pool.data, 0, false, a, 1);
      pool.data[FLIP] = flip + Math.PI;
      pieceLook(pool.data, 0, false, b, 1);
      const ca = channels(a.tint);
      const cb = channels(b.tint);
      for (let j = 0; j < 3; j++) expect(Math.abs(ca[j] - cb[j])).toBeLessThanOrEqual(1);
    }
  });

  it("gives foil a brighter, sharper flash than paper", () => {
    expect(FOIL_SPEC).toBeGreaterThan(PAPER_SPEC);
    // The half-peak width: the first tip off H where each falls below half.
    const halfWidth = (foil: boolean): number => {
      const peak = foil ? FOIL_SPEC : PAPER_SPEC;
      for (let deg = 0; deg < 90; deg += 0.1) {
        const [x, y, z] = tippedHalf(deg);
        if (specular(x, y, z, foil, 1) < peak / 2) return deg;
      }
      return 90;
    };
    const foil = halfWidth(true);
    const paper = halfWidth(false);
    expect(foil).toBeLessThan(paper / 2);
    expect(foil).toBeGreaterThan(3);
    // A paper piece facing H only brightens toward white; foil reaches it.
    expect(shadeNormal(0x2040a0, ...HALF, false, 1)).not.toBe(0xffffff);
  });

  it("lights by the light alone at strength 0 (ambient + diffuse, no flash)", () => {
    // Strength 0 is the look reduced motion gets: no specular on either
    // material. A face-on piece shows its exact color...
    expect(shadeNormal(0xffd23f, 0, 0, 1, true, 0)).toBe(0xffd23f);
    expect(shadeNormal(0xffd23f, 0, 0, 1, false, 0)).toBe(0xffd23f);
    // ...one facing the light brightens (k = 1.331, saturating)...
    expect(shadeNormal(0xffd23f, ...LIGHT, true, 0)).toBe(0xffff54);
    // ...and one turned from it keeps SHINE_AMBIENT of its color.
    expect(SHINE_AMBIENT).toBe(0.5);
    expect(shadeNormal(0xffd23f, 0.8, 0.6, 0, false, 0)).toBe(0x806920);
    // No flash where the shine would peak, for either material.
    expect(specular(...HALF, true, 0)).toBe(0);
    expect(shadeNormal(0xffd23f, ...HALF, true, 0)).toBe(
      shadeNormal(0xffd23f, ...HALF, false, 0)
    );
    // Garbage strengths are 0 too.
    expect(specular(...HALF, true, NaN)).toBe(0);
    expect(specular(...HALF, true, -1)).toBe(0);
  });

  it("keeps the light and drops the flashes with reduced motion", () => {
    const plan = confettiPlan(1, true, 411, 753, CONFETTI_SHINE_MAX, 1);
    expect([plan.shine, plan.foil]).toEqual([0, 1]);
    const sim = new ConfettiSim();
    sim.burst(plan, 411, 753, 0, 0, 1, seeded(24));
    expect(sim.shine).toBe(0);
    // No flutter: every piece shows its full face, so its tint is its color.
    const look: PieceLook = { alpha: 0, long: 0, short: 0, rotation: 0, tint: 0 };
    for (let f = 0; f < 30; f++) {
      sim.step(DT, 753);
      const d = sim.spray.data;
      for (let i = 0; i < sim.spray.alive; i++) {
        expect(d[i * F + MAT]).toBe(1);
        expect(pieceLook(d, i, true, look, sim.shine).tint).toBe(d[i * F + COLOR]);
      }
    }
  });

  it("clamps the strength and the share, and reads garbage as none", () => {
    expect(confettiPlan(1, false, 0, 0, 50, 7)).toMatchObject({
      shine: CONFETTI_SHINE_MAX,
      foil: 1,
    });
    expect(confettiPlan(1, false, 0, 0, NaN, -1)).toMatchObject({ shine: 0, foil: 0 });
    expect(confettiPlan(1, false, 0, 0, 0.75, 0.4)).toMatchObject({ shine: 0.75, foil: 0.4 });
  });

  it("cuts the foil share from foil, and takes no draw at share 0", () => {
    // Share 0 draws no material: the same pieces as before K337.
    const counted = (seed: number): [() => number, () => number] => {
      const r = seeded(seed);
      let n = 0;
      return [
        () => {
          n++;
          return r();
        },
        () => n,
      ];
    };
    const [r0, n0] = counted(25);
    const [r1, n1] = counted(25);
    const p0 = new ConfettiPool(100);
    const p1 = new ConfettiPool(100);
    spawnRain(p0, 100, 411, 753, r0, 0);
    spawnRain(p1, 100, 411, 753, r1, 0.5);
    expect(n1() - n0()).toBe(100);
    for (let i = 0; i < 100; i++) expect(p0.data[i * F + MAT]).toBe(0);
    // The share holds over many pieces, rain and spray alike.
    const share = (pool: ConfettiPool): number => {
      let foil = 0;
      for (let i = 0; i < pool.alive; i++) foil += pool.data[i * F + MAT];
      return foil / pool.alive;
    };
    const spray = new ConfettiPool(SPRAY_CAP);
    spawnSpray(spray, SPRAY_CAP, 0, 0, 1, false, seeded(26), 0.3);
    expect(share(spray)).toBeCloseTo(0.3, 1);
    const rain = new ConfettiPool(RAIN_CAP);
    spawnRain(rain, RAIN_CAP, 1400, 900, seeded(27), 0.3);
    expect(share(rain)).toBeCloseTo(0.3, 1);
    const all = new ConfettiPool(200);
    spawnSpray(all, 200, 0, 0, 1, false, seeded(28), 1);
    expect(share(all)).toBe(1);
  });

  it("takes the burst's strength, and keeps it for pieces still in the air", () => {
    const sim = new ConfettiSim();
    expect(sim.shine).toBe(0);
    sim.burst(confettiPlan(1, false, 411, 753, 1.5, 0.3), 411, 753, 0, 0, 1, seeded(29));
    expect(sim.shine).toBe(1.5);
    // An empty plan throws nothing and changes nothing.
    sim.burst(confettiPlan(0, false, 411, 753, 0, 0), 411, 753, 0, 0, 1, seeded(30));
    expect(sim.shine).toBe(1.5);
    sim.burst(confettiPlan(1, false, 411, 753, 0.5, 0.3), 411, 753, 0, 0, 1, seeded(31));
    expect(sim.shine).toBe(0.5);
  });

  it("draws pieceLook's tint as shadeNormal lights the piece's normal", () => {
    // pieceLook's one-sine path against the reference, rain and spray,
    // paper and foil, through the flutter and the spin.
    const sim = new ConfettiSim();
    sim.burst(confettiPlan(1, false, 411, 753, 1, 0.5), 411, 753, 200, 400, 16, seeded(33));
    const look: PieceLook = { alpha: 0, long: 0, short: 0, rotation: 0, tint: 0 };
    let checked = 0;
    let exact = 0;
    let worst = 0;
    for (let f = 0; f < 90; f++) {
      sim.step(DT, 753);
      for (const [pool, spray] of [
        [sim.rain, false],
        [sim.spray, true],
      ] as const) {
        const d = pool.data;
        for (let i = 0; i < pool.alive; i++) {
          const o = i * F;
          if (d[o + AGE] < 0) continue;
          const cf = Math.cos(d[o + FLIP]);
          const sf = Math.sin(d[o + FLIP]);
          const rot = d[o + ROT];
          const foil = d[o + MAT] === 1;
          const want = shadeNormal(d[o + COLOR], sf * Math.sin(rot), -sf * Math.cos(rot), cf, foil, sim.shine);
          const got = pieceLook(d, i, spray, look, sim.shine).tint;
          const a = channels(want);
          const b = channels(got);
          for (let j = 0; j < 3; j++) worst = Math.max(worst, Math.abs(a[j] - b[j]));
          if (want === got) exact++;
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(20000);
    expect(worst).toBeLessThanOrEqual(1);
    expect(exact / checked).toBeGreaterThan(0.999);
  });
  it("flashes only a few foil pieces at once, some near white (defaults, phone)", () => {
    // The census (.claude/probes/K337/census.mjs) over six seeds read a
    // median of 2 foil pieces flashing (specular > 0.5) a frame in the
    // first 4 s, p90 4, max 9, and 1.55% of the foil's time on screen.
    const W = 411;
    const H = 753;
    const sim = new ConfettiSim();
    sim.burst(confettiPlan(1, false, W, H, 1, 0.3), W, H, W / 2, H * 0.6, 16, seeded(32));
    const perFrame: number[] = [];
    let foilSeen = 0;
    let flashing = 0;
    let nearWhite = 0;
    for (let f = 0; f < 240; f++) {
      sim.step(DT, H);
      let n = 0;
      for (const pool of [sim.rain, sim.spray]) {
        const d = pool.data;
        for (let i = 0; i < pool.alive; i++) {
          const o = i * F;
          if (d[o + AGE] < 0 || d[o + MAT] !== 1) continue;
          if (pool === sim.rain && (d[o + Y] < 0 || d[o + Y] > H)) continue;
          const cf = Math.cos(d[o + FLIP]);
          const sf = Math.sin(d[o + FLIP]);
          const rot = d[o + ROT];
          const z = cf < 0 ? -1 : 1;
          const s = specular(z * sf * Math.sin(rot), -z * sf * Math.cos(rot), z * cf, true, sim.shine);
          foilSeen++;
          if (s > 0.5) {
            flashing++;
            n++;
          }
          if (s > 0.8) nearWhite++;
        }
      }
      perFrame.push(n);
    }
    perFrame.sort((a, b) => a - b);
    expect(foilSeen).toBeGreaterThan(10000);
    expect(perFrame[120]).toBeLessThanOrEqual(4);
    expect(perFrame[239]).toBeLessThanOrEqual(15);
    expect(flashing / foilSeen).toBeLessThan(0.03);
    expect(flashing / foilSeen).toBeGreaterThan(0.005);
    expect(nearWhite).toBeGreaterThan(20);
  });
});
