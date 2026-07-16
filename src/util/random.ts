// Mulberry32 PRNG for deterministic generation.
export class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  nextBool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  nextChoice<T>(arr: T[]): T {
    return arr[this.nextInt(arr.length)];
  }
}

// Global RNG instance, reset on each generation.
let globalRng: SeededRNG;

export function initRNG(seed: number): void {
  globalRng = new SeededRNG(seed);
}

export function rng(): SeededRNG {
  return globalRng;
}
