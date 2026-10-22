// K546 stage 3: the loss plan (reduced, amount 0, caps), the pools'
// bounded lifetimes and the drawn looks' bounds.
import { describe, expect, it } from "vitest";
import {
  ASH_CAP,
  ASH_LIFE_MAX,
  ASH_WINDOW,
  BURST_CAP,
  BURST_LIFE_MAX,
  AshPool,
  BurstPool,
  LOSS_AMOUNT_MAX,
  flashAlpha,
  lossPlan,
} from "../../src/render/loss_fx_model";

// A deterministic rng for the pools.
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("lossPlan (K546 stage 3)", () => {
  it("amount 0 throws nothing (ring only), at any motion setting", () => {
    expect(lossPlan(0, false, 1400, 900)).toEqual({ burst: 0, ash: 0, speedMul: 1 });
    expect(lossPlan(0, true, 1400, 900)).toEqual({ burst: 0, ash: 0, speedMul: 1 });
  });

  it("reduced motion drops the fall and keeps a small slow burst", () => {
    const p = lossPlan(1, true, 1400, 900);
    expect(p.ash).toBe(0);
    expect(p.burst).toBeGreaterThan(0);
    expect(p.burst).toBeLessThan(lossPlan(1, false, 1400, 900).burst);
    expect(p.speedMul).toBe(0.5);
  });

  it("scales with the amount and the screen, hard-capped", () => {
    const one = lossPlan(1, false, 411, 753);
    const three = lossPlan(3, false, 411, 753);
    expect(three.burst).toBe(one.burst * 3);
    expect(three.burst).toBeLessThanOrEqual(BURST_CAP);
    const huge = lossPlan(LOSS_AMOUNT_MAX, false, 8000, 8000);
    expect(huge.ash).toBeLessThanOrEqual(ASH_CAP);
    expect(lossPlan(99, false, 1400, 900)).toEqual(lossPlan(3, false, 1400, 900));
  });
});

describe("flashAlpha", () => {
  it("is full for FLASH_S, then fades, then gone", () => {
    expect(flashAlpha(-0.1)).toBe(0);
    expect(flashAlpha(0)).toBe(1);
    expect(flashAlpha(0.06)).toBe(1);
    expect(flashAlpha(0.18)).toBeCloseTo(0.5);
    expect(flashAlpha(0.24)).toBe(0);
  });
});

describe("BurstPool", () => {
  it("every piece dies within its bounded life (smoke lasts longest)", () => {
    const pool = new BurstPool();
    pool.spawn(0, 0, 10, BURST_CAP, 4, lcg(7), 1);
    expect(pool.n).toBe(BURST_CAP);
    let t = 0;
    while (pool.n > 0 && t < 10) {
      pool.step(0.05, 10);
      t += 0.05;
    }
    expect(pool.n).toBe(0);
    expect(t).toBeLessThanOrEqual(BURST_LIFE_MAX + 0.7 + 0.06);
  });

  it("looks stay in bounds while pieces live", () => {
    const pool = new BurstPool();
    pool.spawn(3, 4, 10, 56, 4, lcg(3), 1);
    const look = { x: 0, y: 0, r: 0, alpha: 0, color: 0 };
    for (let s = 0; s < 10; s++) {
      pool.step(0.05, 10);
      for (let i = 0; i < pool.n; i++) {
        pool.look(i, look);
        expect(look.alpha).toBeGreaterThanOrEqual(0);
        expect(look.alpha).toBeLessThanOrEqual(1);
        expect(look.r).toBeGreaterThan(0);
        expect(look.color).toBeGreaterThanOrEqual(0);
        expect(look.color).toBeLessThan(4);
      }
    }
  });

  it("falls under gravity: a spark's y grows after the drag bends it", () => {
    const pool = new BurstPool();
    pool.spawn(0, 0, 10, 40, 4, lcg(11), 1);
    const look = { x: 0, y: 0, r: 0, alpha: 0, color: 0 };
    for (let s = 0; s < 16; s++) pool.step(0.05, 10);
    let below = 0;
    for (let i = 0; i < pool.n; i++) {
      pool.look(i, look);
      if (look.y > 0) below++;
    }
    expect(below).toBeGreaterThan(pool.n / 2);
  });
});

describe("AshPool", () => {
  it("releases taper over the window and every piece dies bounded", () => {
    const pool = new AshPool();
    pool.spawn(411, 753, 240, 4, lcg(5));
    const look = { x: 0, y: 0, r: 0, alpha: 0, color: 0 };
    // Before the window ends, some pieces still wait (alpha 0).
    pool.step(0.05);
    let waiting = 0;
    for (let i = 0; i < pool.n; i++) {
      pool.look(i, look);
      if (look.alpha === 0) waiting++;
    }
    expect(waiting).toBeGreaterThan(0);
    let t = 0;
    while (pool.n > 0 && t < ASH_WINDOW + ASH_LIFE_MAX + 2) {
      pool.step(0.05);
      t += 0.05;
      for (let i = 0; i < pool.n; i++) {
        pool.look(i, look);
        expect(look.alpha).toBeGreaterThanOrEqual(0);
        expect(look.alpha).toBeLessThanOrEqual(0.85);
        expect(look.r).toBeGreaterThan(0);
      }
    }
    expect(pool.n).toBe(0);
  });
});
