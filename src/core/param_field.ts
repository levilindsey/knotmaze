import type { ParamField, ParamFieldConfig } from "./types";
import { createNoise2D } from "simplex-noise";
import { SeededRNG } from "../util/random";

export class ConstantField implements ParamField {
  config: ParamFieldConfig;

  constructor(value: number) {
    this.config = { type: "constant", value };
  }

  evaluate(_latticePos: [number, number]): number {
    return this.config.value ?? 0;
  }
}

export class SimplexField implements ParamField {
  config: ParamFieldConfig;
  private noise2D: (x: number, y: number) => number;
  private scale: number;
  private octaves: number;

  constructor(
    scale: number = 1.0,
    octaves: number = 2,
    seed: number = 0
  ) {
    this.scale = scale;
    this.octaves = octaves;

    // Seeded random generator for simplex initialization: mulberry32, whose
    // integer ops give the same table in every engine (the old Math.sin hash
    // did not; K108).
    const rng = new SeededRNG(seed);
    this.noise2D = createNoise2D(() => rng.next());
    this.config = {
      type: "simplex",
      simplexScale: scale,
      simplexOctaves: octaves,
    };
  }

  evaluate(latticePos: [number, number]): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < this.octaves; i++) {
      const [x, y] = latticePos;
      value +=
        this.noise2D((x * frequency) / this.scale, (y * frequency) / this.scale) *
        amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    // Normalize to [0, 1].
    return (value / maxValue + 1) / 2;
  }
}

export function createParamField(
  config: ParamFieldConfig,
  seed: number = 0
): ParamField {
  if (config.type === "constant") {
    return new ConstantField(config.value ?? 0);
  } else if (config.type === "simplex") {
    return new SimplexField(
      config.simplexScale ?? 1,
      config.simplexOctaves ?? 2,
      seed
    );
  }
  return new ConstantField(0);
}
