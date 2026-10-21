import { describe, expect, it } from "vitest";
import {
  AGE,
  CANNON_AMOUNT_MAX,
  CANNON_APEX_X,
  CANNON_APEX_Y,
  CANNON_CAP,
  CANNON_DELAY_MAX,
  CANNON_LIFE_MAX,
  CANNON_PER_AMOUNT,
  CANNON_SPEED_MIN,
  CANNON_SPEED_SPAN,
  CANNON_SPREAD,
  CANNON_STAGGER,
  CANNON_TERM,
  CANNON_Y,
  CONFETTI_AMOUNT_MAX,
  CONFETTI_COLORS,
  CONFETTI_MAX_DT,
  CONFETTI_SHINE_MAX,
  COLOR,
  ConfettiPool,
  ConfettiSim,
  F,
  FINISH_CANNONS,
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
  STREAMER_CAP,
  STREAMER_FADE,
  STREAMER_LIFE_MAX,
  STREAMER_SEGS,
  STREAMER_STRIDE,
  SWAY,
  SWAY_AMP,
  SWAY_RATE,
  S_AGE,
  S_COLOR,
  S_LIFE,
  S_MAT,
  S_PTS,
  S_SEG,
  S_SWAY,
  S_SWAY_AMP,
  S_SWAY_RATE,
  S_TERM,
  S_TWIST,
  S_TWIST_RATE,
  S_TWIST_STEP,
  S_VX,
  S_VY,
  S_WIDTH,
  TERM,
  VX,
  VY,
  X,
  Y,
  aimCannon,
  confettiPlan,
  confettiPlanFor,
  finishCannons,
  pieceLook,
  planThrows,
  rainDelay,
  rainPieceScale,
  rainReleaseDensity,
  rainScreenScale,
  litHex,
  shadeNormal,
  spawnCannon,
  spawnRain,
  spawnSpray,
  spawnStreamers,
  specular,
  sprayUnit,
  stepCannon,
  stepRain,
  stepSpray,
  stepStreamers,
  streamerSegLook,
  type CannonSpec,
  type ConfettiSettings,
  type PieceLook,
  type SegLook,
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
      cannon: 0,
      streamers: 0,
      foil: 0,
      shine: 0,
    });
    expect(confettiPlan(0.5, false)).toEqual({
      rain: 210,
      spray: 160,
      cannon: 0,
      streamers: 0,
      foil: 0,
      shine: 0,
    });
    expect(confettiPlan(CONFETTI_AMOUNT_MAX, false)).toEqual({
      rain: RAIN_PER_AMOUNT * CONFETTI_AMOUNT_MAX,
      spray: SPRAY_CAP,
      cannon: 0,
      streamers: 0,
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
      cannon: 0,
      streamers: 0,
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
    // Reduced motion throws nothing on any screen (K186).
    expect(confettiPlan(1, true, 1920, 1080)).toMatchObject({ rain: 0, spray: 0 });
  });

  it("caps the amount and reads zero or garbage as none", () => {
    expect(confettiPlan(50, false)).toEqual(confettiPlan(CONFETTI_AMOUNT_MAX, false));
    for (const amount of [0, -2, NaN, Infinity * 0]) {
      const p = confettiPlan(amount, false);
      expect([amount, p.rain, p.spray]).toEqual([amount, 0, 0]);
    }
  });

  it("throws nothing with reduced motion, whatever the settings (K186)", () => {
    // Levi (2026-10-20): "None on reduced motion."
    for (const amount of [0, 0.5, 1, CONFETTI_AMOUNT_MAX, 50]) {
      for (const [w, h] of [
        [0, 0],
        [411, 753],
        [1920, 1080],
      ]) {
        const p = confettiPlan(amount, true, w, h, CONFETTI_SHINE_MAX, 1);
        expect([amount, w, p.rain, p.spray]).toEqual([amount, w, 0, 0]);
      }
    }
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
    spawnSpray(pool, SPRAY_PER_AMOUNT, 100, -50, unit, seeded(4));
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
    spawnSpray(pool, SPRAY_PER_AMOUNT, 0, 0, unit, seeded(12));
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
    spawnSpray(pool, SPRAY_PER_AMOUNT, 0, 0, unit, seeded(13));
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

});

describe("the side cannons (screen space, K336)", () => {
  it("throws CANNON_PER_AMOUNT a cannon at amount 1 on the phone, scaled as the rain is", () => {
    const phone = (ca: number) =>
      confettiPlan(1, false, RAIN_REF_W, RAIN_REF_H, 0, 0, ca).cannon;
    expect([phone(0), phone(0.5), phone(1), phone(3)]).toEqual([
      0,
      CANNON_PER_AMOUNT / 2,
      CANNON_PER_AMOUNT,
      3 * CANNON_PER_AMOUNT,
    ]);
    // The rain's screen scale: a desktop's blasts are as dense.
    expect(confettiPlan(1, false, 1400, 900, 0, 0, 1).cannon).toBe(309);
    expect(confettiPlan(1, false, 1400, 900, 0, 0, 3).cannon).toBe(926);
    // The top amount on a huge screen fills the pool exactly.
    expect(
      FINISH_CANNONS *
        confettiPlan(1, false, 3840, 2160, 0, 0, CANNON_AMOUNT_MAX).cannon
    ).toBe(CANNON_CAP);
    // Garbage reads as none, too much as the max.
    for (const ca of [-1, NaN, Infinity * 0]) expect([ca, phone(ca)]).toEqual([ca, 0]);
    expect(phone(50)).toBe(phone(CANNON_AMOUNT_MAX));
    // The confetti amount is the master switch, and reduced motion throws
    // none (K186).
    expect(confettiPlan(0, false, 1400, 900, 0, 0, 1).cannon).toBe(0);
    expect(confettiPlan(1, true, 1400, 900, 0, 0, 1).cannon).toBe(0);
    // The cannons change nothing else in the plan.
    const off = confettiPlan(1, false, 1400, 900, 1, 0.3, 0);
    const on = confettiPlan(1, false, 1400, 900, 1, 0.3, 2);
    expect({ ...on, cannon: 0 }).toEqual(off);
  });

  it("reads the app's params: cannons off throws none (confettiPlanFor)", () => {
    const s: ConfettiSettings = {
      confettiAmount: 1,
      confettiShine: 1,
      foilShare: 0.3,
      confettiCannons: true,
      cannonAmount: 1,
      streamerShare: 0.2,
    };
    const on = confettiPlanFor(s, false, 1400, 900);
    expect(on).toEqual(confettiPlan(1, false, 1400, 900, 1, 0.3, 1, 0.2));
    expect([on.cannon, on.streamers]).toEqual([247, 62]);
    for (const cannonAmount of [1, 3]) {
      expect(
        confettiPlanFor({ ...s, confettiCannons: false, cannonAmount }, false, 1400, 900)
      ).toEqual({ ...on, cannon: 0, streamers: 0 });
    }
    expect(planThrows(on)).toBe(true);
    expect(planThrows({ rain: 0, spray: 0, cannon: 1, streamers: 0, foil: 0, shine: 0 })).toBe(true);
    expect(planThrows({ rain: 0, spray: 0, cannon: 0, streamers: 1, foil: 0, shine: 0 })).toBe(true);
    expect(planThrows(confettiPlanFor(s, true, 1400, 900))).toBe(false);
    expect(planThrows(confettiPlanFor({ ...s, confettiAmount: 0 }, false, 1400, 900))).toBe(false);
  });

  it("aims a piece so its arc tops out at the aimed point (aimCannon)", () => {
    for (const [w, h] of [
      [411, 753],
      [1400, 900],
    ]) {
      const x0 = -20;
      const y0 = CANNON_Y * h;
      const ax = CANNON_APEX_X * w;
      const ay = CANNON_APEX_Y * h;
      const aim = aimCannon(x0, y0, ax, ay, h);
      const pool = new ConfettiPool(1);
      const o = pool.alloc() * F;
      const d = pool.data;
      d[o + X] = x0;
      d[o + Y] = y0;
      d[o + VX] = Math.cos(aim.angle) * aim.speed;
      d[o + VY] = Math.sin(aim.angle) * aim.speed;
      d[o + LIFE] = CANNON_LIFE_MAX;
      d[o + TERM] = CANNON_TERM * h;
      d[o + LEN] = 10;
      // No sway (SWAY_AMP 0): the drag and the fall alone.
      let topX = x0;
      let topY = y0;
      const fine = 1 / 2000;
      for (let k = 0; k < CANNON_LIFE_MAX / fine && pool.alive > 0; k++) {
        stepCannon(pool, fine, h);
        if (pool.alive > 0 && d[o + Y] < topY) {
          topY = d[o + Y];
          topX = d[o + X];
        }
      }
      expect([w, Math.abs(topX - ax) < 1, Math.abs(topY - ay) < 1]).toEqual([w, true, true]);
    }
  });

  it("fires inward and upward from just off each side (finishCannons)", () => {
    for (const [w, h] of [
      [411, 753],
      [753, 411],
      [1400, 900],
      [3840, 2160],
    ]) {
      const [left, right] = finishCannons(w, h, 100);
      expect(left.x).toBeLessThan(0);
      expect(right.x).toBeGreaterThan(w);
      for (const c of [left, right]) {
        expect(c.y).toBeCloseTo(CANNON_Y * h, 9);
        expect([c.paper, c.spread]).toEqual([100, CANNON_SPREAD]);
        expect(c.delay + c.volley).toBeLessThanOrEqual(CANNON_DELAY_MAX);
        // Every direction in the spread points up (screen +y is down) and in.
        for (const da of [-c.spread, 0, c.spread]) {
          expect(Math.sin(c.angle + da)).toBeLessThan(0);
          expect(Math.cos(c.angle + da) * (w / 2 - c.x)).toBeGreaterThan(0);
        }
      }
      // Mirror images, the right one CANNON_STAGGER s later.
      expect(right.x - w).toBeCloseTo(-left.x, 9);
      expect(right.angle).toBeCloseTo(Math.PI - left.angle, 12);
      expect([left.delay, right.delay]).toEqual([0, CANNON_STAGGER]);
    }
  });

  it("arcs every piece up over the screen, its top well inside, and out by the bottom", () => {
    for (const [w, h] of [
      [411, 753],
      [753, 411],
      [1400, 900],
    ]) {
      const per = confettiPlan(1, false, w, h, 0, 0, 1).cannon;
      const pool = new ConfettiPool(CANNON_CAP);
      const rand = seeded(w + 1);
      for (const c of finishCannons(w, h, per)) {
        spawnCannon(pool, c, h, rainPieceScale(w, h), 0.3, rand);
      }
      expect(pool.alive).toBe(FINISH_CANNONS * per);
      const worst = { top: Infinity, edge: Infinity, exit: Infinity, age: 0 };
      for (let i = 0; i < pool.alive; i++) {
        // Each piece flown alone, so its row never moves.
        const one = new ConfettiPool(1);
        one.alloc();
        one.data.set(pool.data.subarray(i * F, (i + 1) * F));
        const d = one.data;
        const fromLeft = d[X] < w / 2;
        // Released within CANNON_DELAY_MAX, wholly off the screen.
        expect(-d[AGE]).toBeGreaterThanOrEqual(0);
        expect(-d[AGE]).toBeLessThanOrEqual(CANNON_DELAY_MAX);
        expect(fromLeft ? -d[X] : d[X] - w).toBeGreaterThan(d[LEN] / 2);
        let topX = 0;
        let topY = Infinity;
        let last = { x: 0, y: 0, age: 0 };
        while (one.alive > 0) {
          stepCannon(one, DT, h);
          if (one.alive === 0 || d[AGE] <= 0) continue;
          if (d[Y] < topY) {
            topY = d[Y];
            topX = d[X];
          }
          last = { x: d[X], y: d[Y], age: d[AGE] };
        }
        // The top of the arc lands inside the screen, above the cannons.
        expect(topY).toBeLessThan(CANNON_Y * h);
        worst.top = Math.min(worst.top, topY / h);
        worst.edge = Math.min(worst.edge, topX / w, 1 - topX / w);
        // It fell out of the bottom (the step kills a piece past the edge),
        // inside the screen's width, before the backstop's fade.
        expect(last.y - d[LEN]).toBeGreaterThan(h);
        worst.exit = Math.min(worst.exit, last.x / w, 1 - last.x / w);
        worst.age = Math.max(worst.age, last.age);
      }
      // Census (8 seeds): tops 0.18-0.53 h down, 0.08-0.51 w in from their
      // own side; every piece out by the bottom within 5.1 s of release.
      expect([w, worst.top > 0.12]).toEqual([w, true]);
      expect([w, worst.edge > 0.04]).toEqual([w, true]);
      expect([w, worst.exit > 0.04]).toEqual([w, true]);
      expect(worst.age).toBeLessThan(CANNON_LIFE_MAX - RAIN_FADE);
    }
  });

  it("flies the same path at any frame rate, a mid-frame release included", () => {
    const h = 900;
    const fly = (fps: number, t: number): number[] => {
      const pool = new ConfettiPool(1);
      const o = pool.alloc() * F;
      const d = pool.data;
      d[o + X] = -30;
      d[o + Y] = 720;
      d[o + VX] = 500;
      d[o + VY] = -900;
      d[o + AGE] = -0.0123;
      d[o + LIFE] = CANNON_LIFE_MAX;
      d[o + TERM] = CANNON_TERM * h;
      d[o + LEN] = 12;
      d[o + SWAY] = 0.7;
      d[o + SWAY_RATE] = 2.1;
      d[o + SWAY_AMP] = 14;
      d[o + SPIN] = 3;
      d[o + FLIP_RATE] = 9;
      const n = Math.round(t * fps);
      for (let k = 0; k < n; k++) stepCannon(pool, 1 / fps, h);
      return [X, Y, VX, VY, ROT, FLIP].map((f) => d[o + f]);
    };
    // Whole frames at every rate: multiples of 1 / 6 s.
    for (const t of [1 / 6, 0.5, 1.5]) {
      const ref = fly(240, t);
      for (const fps of [30, 60, 144]) {
        // Float32 rows: rounding, not the frame rate, is the difference.
        const got = fly(fps, t);
        for (let f = 0; f < ref.length; f++) {
          expect([t, fps, f, Math.abs(got[f] - ref[f]) < 0.05]).toEqual([t, fps, f, true]);
        }
      }
    }
    // Before its release a piece holds still.
    expect(fly(60, 0)).toEqual(fly(240, 0));
    const held = fly(100, 0.01);
    expect([held[0], held[1]]).toEqual([-30, 720]);
  });

  it("bounds every life: none outlives CANNON_DELAY_MAX + CANNON_LIFE_MAX", () => {
    const pool = new ConfettiPool(CANNON_CAP);
    const rand = seeded(77);
    const [left, right] = finishCannons(1400, 900, 300);
    // A spec past the bounds is clamped into them.
    const wild: CannonSpec = { ...right, delay: 50, volley: NaN };
    for (const c of [left, wild]) spawnCannon(pool, c, 900, 1, 0, rand);
    for (let i = 0; i < pool.alive; i++) {
      const wait = -pool.data[i * F + AGE];
      expect(wait >= 0 && wait <= CANNON_DELAY_MAX).toBe(true);
    }
    // A screen too tall to fall out of: only the backstop ends them.
    let t = 0;
    while (pool.alive > 0 && t < 30) {
      stepCannon(pool, DT, 1e9);
      t += DT;
    }
    expect(pool.alive).toBe(0);
    expect(t).toBeGreaterThan(CANNON_LIFE_MAX);
    expect(t).toBeLessThanOrEqual(CANNON_DELAY_MAX + CANNON_LIFE_MAX + DT);
  });

  it("throws the cannons last, so the rain and spray are unchanged", () => {
    const [w, h] = [1400, 900];
    const plain = confettiPlan(1, false, w, h, 1, 0.3, 0);
    const full = confettiPlan(1, false, w, h, 1, 0.3, 1);
    const a = new ConfettiSim();
    const b = new ConfettiSim();
    a.burst(plain, w, h, 3, 4, 1, seeded(21));
    expect(b.burst(full, w, h, 3, 4, 1, seeded(21))).toBe(true);
    expect([a.cannon.alive, b.cannon.alive]).toEqual([0, FINISH_CANNONS * full.cannon]);
    const live = (p: ConfettiPool) => Array.from(p.data.subarray(0, p.alive * F));
    expect(live(b.rain)).toEqual(live(a.rain));
    expect(live(b.spray)).toEqual(live(a.spray));
    b.clear();
    expect(b.active).toBe(false);
    // Cannons alone hold the sim active until their last piece falls out.
    const c = new ConfettiSim();
    const only = { rain: 0, spray: 0, cannon: 100, streamers: 0, foil: 0, shine: 1 };
    expect(c.burst(only, w, h, 0, 0, 1, seeded(22))).toBe(true);
    expect(c.active).toBe(true);
    const t = runOut(c, h);
    expect(c.active).toBe(false);
    expect(t).toBeGreaterThan(3);
    expect(t).toBeLessThan(CANNON_DELAY_MAX + CANNON_LIFE_MAX);
    // No screen, no cannons.
    expect(new ConfettiSim().burst(only, 0, 0, 0, 0, 1)).toBe(false);
  });
});

describe("the streamers (K336)", () => {
  it("takes a share of each cannon's pieces (confettiPlan)", () => {
    const phone = (share: number): number[] => {
      const p = confettiPlan(1, false, RAIN_REF_W, RAIN_REF_H, 0, 0, 1, share);
      return [p.cannon, p.streamers];
    };
    expect(phone(0)).toEqual([150, 0]);
    expect(phone(0.2)).toEqual([120, 30]);
    expect(phone(0.5)).toEqual([75, 75]);
    // At most STREAMER_CAP / FINISH_CANNONS a cannon; the rest stay paper.
    expect(phone(1)).toEqual([50, 100]);
    // Garbage reads as none, too much as all.
    for (const share of [NaN, -1]) expect([share, ...phone(share)]).toEqual([share, 150, 0]);
    expect(phone(7)).toEqual(phone(1));
    // A big screen at the top amounts fills the pool exactly.
    const big = confettiPlan(CONFETTI_AMOUNT_MAX, false, 3840, 2160, 0, 0, CANNON_AMOUNT_MAX, 1);
    expect(big.streamers * FINISH_CANNONS).toBe(STREAMER_CAP);
    // A cannon fires the same count of pieces whatever the share.
    const per = confettiPlan(1, false, 1400, 900, 0, 0, 1).cannon;
    expect(per).toBe(309);
    for (const share of [0, 0.1, 0.33, 0.8]) {
      const p = confettiPlan(1, false, 1400, 900, 0, 0, 1, share);
      expect([share, p.cannon + p.streamers]).toEqual([share, per]);
    }
    // No cannons, no streamers: the cannons at 0, no confetti, reduced motion.
    expect(confettiPlan(1, false, 1400, 900, 0, 0, 0, 1).streamers).toBe(0);
    expect(confettiPlan(0, false, 1400, 900, 0, 0, 1, 1).streamers).toBe(0);
    expect(confettiPlan(1, true, 1400, 900, 0, 0, 1, 1).streamers).toBe(0);
  });

  it("spawns after both cannons' paper, so every other piece is unchanged", () => {
    const [w, h] = [1400, 900];
    const base = { rain: 300, spray: 100, cannon: 80, streamers: 0, foil: 0.3, shine: 1 };
    const a = new ConfettiSim();
    const b = new ConfettiSim();
    a.burst(base, w, h, 3, 4, 1, seeded(31));
    expect(b.burst({ ...base, streamers: 25 }, w, h, 3, 4, 1, seeded(31))).toBe(true);
    const live = (p: ConfettiPool) => Array.from(p.data.subarray(0, p.alive * p.stride));
    expect(live(b.rain)).toEqual(live(a.rain));
    expect(live(b.spray)).toEqual(live(a.spray));
    expect(live(b.cannon)).toEqual(live(a.cannon));
    expect([a.streamers.alive, b.streamers.alive]).toEqual([0, FINISH_CANNONS * 25]);
    b.clear();
    expect(b.active).toBe(false);
    // Streamers alone throw, and hold the sim active until the last falls out.
    const c = new ConfettiSim();
    const only = { rain: 0, spray: 0, cannon: 0, streamers: 30, foil: 0, shine: 1 };
    expect(planThrows(only)).toBe(true);
    expect(c.burst(only, w, h, 0, 0, 1, seeded(32))).toBe(true);
    expect(c.active).toBe(true);
    const t = runOut(c, h);
    expect(c.active).toBe(false);
    expect(t).toBeGreaterThan(3);
    // Every one fell out before its fade could start (no backstop).
    expect(t).toBeLessThan(STREAMER_LIFE_MAX - STREAMER_FADE);
    expect(new ConfettiSim().burst(only, 0, 0, 0, 0, 1)).toBe(false);
  });

  it("queues each streamer gathered at its cannon, timed and aimed as its paper", () => {
    const [w, h] = [411, 753];
    const scale = rainPieceScale(w, h);
    const cannons = finishCannons(w, h, 0, STREAMER_CAP / FINISH_CANNONS);
    const pool = new ConfettiPool(STREAMER_CAP, STREAMER_STRIDE);
    const rand = seeded(41);
    for (const c of cannons) spawnStreamers(pool, c, h, scale, 0.5, rand);
    expect(pool.alive).toBe(STREAMER_CAP);
    const d = pool.data;
    let foil = 0;
    for (let i = 0; i < pool.alive; i++) {
      const o = i * STREAMER_STRIDE;
      const c = d[o + S_PTS] < w / 2 ? cannons[0] : cannons[1];
      // The body starts gathered on the head, at the muzzle.
      for (let j = 1; j <= STREAMER_SEGS; j++) {
        expect(d[o + S_PTS + 2 * j]).toBe(d[o + S_PTS]);
        expect(d[o + S_PTS + 2 * j + 1]).toBe(d[o + S_PTS + 1]);
      }
      expect(Math.abs(d[o + S_PTS] - c.x)).toBeLessThanOrEqual(4 * scale + 1e-3);
      expect(Math.abs(d[o + S_PTS + 1] - c.y)).toBeLessThanOrEqual(4 * scale + 1e-3);
      // Released delay to delay + volley s after the burst.
      const wait = -d[o + S_AGE];
      expect(wait).toBeGreaterThanOrEqual(c.delay - 1e-6);
      expect(wait).toBeLessThanOrEqual(c.delay + c.volley + 1e-6);
      // Aimed within the spread, at the paper's speeds.
      const a = Math.atan2(d[o + S_VY], d[o + S_VX]);
      expect(Math.abs(Math.atan2(Math.sin(a - c.angle), Math.cos(a - c.angle)))).toBeLessThanOrEqual(
        c.spread + 1e-5
      );
      const sp = Math.hypot(d[o + S_VX], d[o + S_VY]) / c.speed;
      expect(sp).toBeGreaterThanOrEqual(CANNON_SPEED_MIN - 1e-5);
      expect(sp).toBeLessThanOrEqual(CANNON_SPEED_MIN + CANNON_SPEED_SPAN + 1e-5);
      expect(d[o + S_TERM]).toBeCloseTo(CANNON_TERM * h, 3);
      expect(d[o + S_LIFE]).toBe(STREAMER_LIFE_MAX);
      const length = d[o + S_SEG] * STREAMER_SEGS;
      expect(length).toBeGreaterThanOrEqual(80 * scale - 1e-3);
      expect(length).toBeLessThanOrEqual(140 * scale + 1e-3);
      expect(d[o + S_WIDTH]).toBeGreaterThanOrEqual(5 * scale - 1e-4);
      expect(d[o + S_WIDTH]).toBeLessThanOrEqual(7.5 * scale + 1e-4);
      expect(CONFETTI_COLORS).toContain(d[o + S_COLOR]);
      foil += d[o + S_MAT];
    }
    // Half of them foil at share 0.5; none at 0.
    expect(foil / pool.alive).toBeGreaterThan(0.35);
    expect(foil / pool.alive).toBeLessThan(0.65);
    const none = new ConfettiPool(STREAMER_CAP, STREAMER_STRIDE);
    for (const c of cannons) spawnStreamers(none, c, h, scale, 0, seeded(42));
    for (let i = 0; i < none.alive; i++) expect(none.data[i * STREAMER_STRIDE + S_MAT]).toBe(0);
  });

  it("flies the head as cannon paper, at any frame rate, a mid-frame release included", () => {
    const h = 900;
    const head = (fps: number, t: number): number[] => {
      const pool = new ConfettiPool(1, STREAMER_STRIDE);
      const o = pool.alloc() * STREAMER_STRIDE;
      const d = pool.data;
      for (let j = 0; j <= STREAMER_SEGS; j++) {
        d[o + S_PTS + 2 * j] = -30;
        d[o + S_PTS + 2 * j + 1] = 720;
      }
      d[o + S_VX] = 500;
      d[o + S_VY] = -900;
      d[o + S_AGE] = -0.0123;
      d[o + S_LIFE] = STREAMER_LIFE_MAX;
      d[o + S_TERM] = CANNON_TERM * h;
      d[o + S_SEG] = 8;
      d[o + S_WIDTH] = 6;
      d[o + S_SWAY] = 0.7;
      d[o + S_SWAY_RATE] = 2.1;
      d[o + S_SWAY_AMP] = 14;
      d[o + S_TWIST_RATE] = 9;
      const n = Math.round(t * fps);
      for (let k = 0; k < n; k++) stepStreamers(pool, 1 / fps, h);
      return [S_PTS, S_PTS + 1, S_VX, S_VY, S_TWIST].map((f) => d[o + f]);
    };
    const paper = (fps: number, t: number): number[] => {
      const pool = new ConfettiPool(1);
      const o = pool.alloc() * F;
      const d = pool.data;
      d[o + X] = -30;
      d[o + Y] = 720;
      d[o + VX] = 500;
      d[o + VY] = -900;
      d[o + AGE] = -0.0123;
      d[o + LIFE] = CANNON_LIFE_MAX;
      d[o + TERM] = CANNON_TERM * h;
      d[o + LEN] = 12;
      d[o + SWAY] = 0.7;
      d[o + SWAY_RATE] = 2.1;
      d[o + SWAY_AMP] = 14;
      d[o + FLIP_RATE] = 9;
      const n = Math.round(t * fps);
      for (let k = 0; k < n; k++) stepCannon(pool, 1 / fps, h);
      return [X, Y, VX, VY, FLIP].map((f) => d[o + f]);
    };
    for (const t of [1 / 6, 0.5, 1.5]) {
      const ref = head(240, t);
      for (const fps of [30, 60, 144]) {
        const got = head(fps, t);
        const pap = paper(fps, t);
        for (let f = 0; f < ref.length; f++) {
          expect([t, fps, f, Math.abs(got[f] - ref[f]) < 0.05]).toEqual([t, fps, f, true]);
          expect([t, fps, f, Math.abs(got[f] - pap[f]) < 0.05]).toEqual([t, fps, f, true]);
        }
      }
    }
    // Before its release a streamer holds still.
    const held = head(100, 0.01);
    expect([held[0], held[1]]).toEqual([-30, 720]);
  });

  it("keeps every segment within its length while the body trails the head", () => {
    const [w, h] = [1400, 900];
    const sim = new ConfettiSim();
    const plan = { rain: 0, spray: 0, cannon: 0, streamers: 40, foil: 0, shine: 1 };
    sim.burst(plan, w, h, 0, 0, 1, seeded(51));
    const pool = sim.streamers;
    let worst = 0;
    for (let k = 0; k < 600 && sim.active; k++) {
      sim.step(DT, h);
      const d = pool.data;
      for (let i = 0; i < pool.alive; i++) {
        const o = i * STREAMER_STRIDE;
        for (let j = 0; j < STREAMER_SEGS; j++) {
          const q = o + S_PTS + 2 * j;
          const len = Math.hypot(d[q + 2] - d[q], d[q + 3] - d[q + 1]);
          worst = Math.max(worst, len / d[o + S_SEG]);
        }
      }
    }
    // Pulled taut, never stretched.
    expect(worst).toBeGreaterThan(0.99);
    expect(worst).toBeLessThan(1 + 1e-3);
  });

  it("arcs every head up over the screen, its top well inside, and out by the bottom", () => {
    for (const [w, h] of [
      [411, 753],
      [753, 411],
      [1400, 900],
    ]) {
      const pool = new ConfettiPool(STREAMER_CAP, STREAMER_STRIDE);
      const rand = seeded(w + 2);
      for (const c of finishCannons(w, h, 0, STREAMER_CAP / FINISH_CANNONS)) {
        spawnStreamers(pool, c, h, rainPieceScale(w, h), 0.3, rand);
      }
      const worst = { top: Infinity, edge: Infinity, age: 0 };
      for (let i = 0; i < pool.alive; i++) {
        // Each streamer flown alone, so its row never moves.
        const one = new ConfettiPool(1, STREAMER_STRIDE);
        one.alloc();
        one.data.set(pool.data.subarray(i * STREAMER_STRIDE, (i + 1) * STREAMER_STRIDE));
        const d = one.data;
        let topX = 0;
        let topY = Infinity;
        let age = 0;
        while (one.alive > 0) {
          stepStreamers(one, DT, h);
          if (one.alive === 0 || d[S_AGE] <= 0) continue;
          age = d[S_AGE];
          if (d[S_PTS + 1] < topY) {
            topY = d[S_PTS + 1];
            topX = d[S_PTS];
          }
        }
        expect(topY).toBeLessThan(CANNON_Y * h);
        worst.top = Math.min(worst.top, topY / h);
        worst.edge = Math.min(worst.edge, topX / w, 1 - topX / w);
        worst.age = Math.max(worst.age, age);
      }
      // Census (`.claude/probes/K336/streamer_census.mjs`, share 0.2, 8 seeds):
      // phone tops 0.24-0.49 h down, at least 0.052 w in from their own side
      // (0.15 on the wider screens); every streamer out by the bottom 3.9-5.8 s
      // after its release.
      expect([w, worst.top > 0.12]).toEqual([w, true]);
      expect([w, worst.edge > 0.03]).toEqual([w, true]);
      expect(worst.age).toBeLessThan(STREAMER_LIFE_MAX - STREAMER_FADE);
    }
  });

  it("bounds every life: none outlives CANNON_DELAY_MAX + STREAMER_LIFE_MAX", () => {
    const pool = new ConfettiPool(STREAMER_CAP, STREAMER_STRIDE);
    const [left, right] = finishCannons(1400, 900, 0, 50);
    // A spec past the bounds is clamped into them.
    const wild: CannonSpec = { ...right, delay: 50, volley: NaN };
    const rand = seeded(61);
    for (const c of [left, wild]) spawnStreamers(pool, c, 900, 1, 0, rand);
    for (let i = 0; i < pool.alive; i++) {
      const wait = -pool.data[i * STREAMER_STRIDE + S_AGE];
      expect(wait >= 0 && wait <= CANNON_DELAY_MAX).toBe(true);
    }
    // A screen too tall to fall out of: only the backstop ends them.
    let t = 0;
    while (pool.alive > 0 && t < 30) {
      stepStreamers(pool, DT, 1e9);
      t += DT;
    }
    expect(pool.alive).toBe(0);
    expect(t).toBeGreaterThan(STREAMER_LIFE_MAX);
    expect(t).toBeLessThanOrEqual(CANNON_DELAY_MAX + STREAMER_LIFE_MAX + DT);
  });

  it("draws each segment as a lit paper piece (streamerSegLook)", () => {
    const pool = new ConfettiPool(1, STREAMER_STRIDE);
    const o = pool.alloc() * STREAMER_STRIDE;
    const d = pool.data;
    const look: SegLook = { x: 0, y: 0, alpha: 0, long: 0, short: 0, rotation: 0, tint: 0 };
    d[o + S_AGE] = -0.1;
    d[o + S_LIFE] = STREAMER_LIFE_MAX;
    d[o + S_WIDTH] = 6;
    d[o + S_COLOR] = 0x4cc9f0;
    // A zigzag body: point j at (100 + 8 j, 200 + 5 (j mod 2)).
    for (let j = 0; j <= STREAMER_SEGS; j++) {
      d[o + S_PTS + 2 * j] = 100 + 8 * j;
      d[o + S_PTS + 2 * j + 1] = 200 + 5 * (j % 2);
    }
    // Before its release: nothing.
    expect(streamerSegLook(d, 0, 3, look, 1).alpha).toBe(0);
    d[o + S_AGE] = 1;
    streamerSegLook(d, 0, 3, look, 1);
    expect(look.alpha).toBe(1);
    // Segment 3 runs from (124, 205) to (132, 200): drawn at its middle,
    // along it, 0.6 widths longer; face-on (twist 0) it shows its width.
    expect([look.x, look.y]).toEqual([128, 202.5]);
    expect(look.long).toBeCloseTo(Math.hypot(8, 5) + 0.6 * 6, 4);
    expect(look.rotation).toBeCloseTo(Math.atan2(-5, 8), 6);
    expect(look.short).toBeCloseTo(6, 6);
    // Edge-on, a sliver.
    d[o + S_TWIST] = Math.PI / 2;
    expect(streamerSegLook(d, 0, 3, look, 1).short).toBeCloseTo(0.15 * 6, 4);
    // A segment still gathered at the muzzle draws nothing.
    d[o + S_PTS + 2 * 6] = d[o + S_PTS + 2 * 5];
    d[o + S_PTS + 2 * 6 + 1] = d[o + S_PTS + 2 * 5 + 1];
    expect(streamerSegLook(d, 0, 5, look, 1).alpha).toBe(0);
    // Half way through its last STREAMER_FADE s, half faded.
    d[o + S_AGE] = STREAMER_LIFE_MAX - STREAMER_FADE / 2;
    expect(streamerSegLook(d, 0, 3, look, 1).alpha).toBeCloseTo(0.5, 5);
    // The tint: the paper's light (shadeNormal) on the normal the twist
    // turns about the segment, (sf sin a, -sf cos a, cf), both faces alike.
    d[o + S_AGE] = 1;
    const rand = seeded(71);
    let exact = 0;
    const n = 600;
    for (let k = 0; k < n; k++) {
      const ang = rand() * Math.PI * 2;
      const foil = rand() < 0.5;
      const shine = rand() * CONFETTI_SHINE_MAX;
      const j = Math.floor(rand() * STREAMER_SEGS);
      d[o + S_TWIST] = rand() * Math.PI * 2;
      d[o + S_TWIST_STEP] = rand() * 0.7;
      d[o + S_MAT] = foil ? 1 : 0;
      d[o + S_COLOR] = CONFETTI_COLORS[k % CONFETTI_COLORS.length];
      const q = o + S_PTS + 2 * j;
      d[q] = 300;
      d[q + 1] = 300;
      d[q + 2] = 300 + 10 * Math.cos(ang);
      d[q + 3] = 300 + 10 * Math.sin(ang);
      const got = streamerSegLook(d, 0, j, look, shine).tint;
      const dx = d[q + 2] - d[q];
      const dy = d[q + 3] - d[q + 1];
      const len = Math.hypot(dx, dy);
      const tw = d[o + S_TWIST] + j * d[o + S_TWIST_STEP];
      const sf = Math.sin(tw);
      const want = shadeNormal(
        d[o + S_COLOR],
        (sf * dy) / len,
        (-sf * dx) / len,
        Math.cos(tw),
        foil,
        shine
      );
      const g = channels(got);
      const e = channels(want);
      for (let c = 0; c < 3; c++) expect(Math.abs(g[c] - e[c])).toBeLessThanOrEqual(1);
      if (got === want) exact++;
    }
    expect(exact / n).toBeGreaterThan(0.95);
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

  it("throws nothing (and stays idle) under reduced motion (K186)", () => {
    const sim = new ConfettiSim();
    const plan = confettiPlan(1, true, 1400, 900, 1, 0.3);
    expect(sim.burst(plan, 1400, 900, 0, 0, 1, seeded(8))).toBe(false);
    expect([sim.active, sim.rain.alive, sim.spray.alive, sim.shine]).toEqual([false, 0, 0, 0]);
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
    spawnSpray(pool, 1, 0, 0, 1, seeded(11));
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
    // Strength 0: no specular on either material. A face-on piece shows its
    // exact color...
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
    spawnSpray(spray, SPRAY_CAP, 0, 0, 1, seeded(26), 0.3);
    expect(share(spray)).toBeCloseTo(0.3, 1);
    const rain = new ConfettiPool(RAIN_CAP);
    spawnRain(rain, RAIN_CAP, 1400, 900, seeded(27), 0.3);
    expect(share(rain)).toBeCloseTo(0.3, 1);
    const all = new ConfettiPool(200);
    spawnSpray(all, 200, 0, 0, 1, seeded(28), 1);
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
