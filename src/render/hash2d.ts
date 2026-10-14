// K154: THE BACKGROUNDS' INTEGER HASH, our own (it replaced PCG2D, so no
// third-party credit rides on it). Two 32-bit lanes in, two out - the value
// noise lattice (rnd2) and the per-pixel dither (tpdf) in
// background_shaders.ts hash cell and pixel coordinates with it, so the
// patterns hold at any coordinate (no sin() hashes).
//
// SHAPE: one multiply-add per lane, then three rounds of multiply, a CROSS
// xorshift (each lane takes the other's high bits, which couples the lanes)
// and a SELF xorshift (each lane folds its own high bits down). Multiplying
// carries bits up and a right shift carries them down, so every input bit
// reaches every output bit of both lanes. The whole thing is a bijection on
// the 64-bit state (odd multipliers; the cross step is I + nilpotent over
// GF(2)), so distinct cells never collide. The constants are ours: drawn from
// a seeded RNG, multipliers kept to well-spread bit patterns (13-19 set
// bits, top bit set), and picked by the avalanche search in
// .claude/probes/K154_K169/hash_search3.mjs - the best of 3000 candidates,
// then confirmed on 100000 fresh inputs (worst deviation 0.0058 from an even
// flip chance in all 4096 input-bit x output-bit cells; the sampling noise
// alone is 0.0016 a cell). test/render/hash2d.test.ts holds the thresholds.
//
// GLSL ES 3.00 and JS agree bit for bit: integer multiply wraps mod 2^32 in
// both (Math.imul here), and the shifts are logical. HASH2D_GLSL below is
// the shader text, built from the same table the mirror reads.

export interface Hash2dRound {
  // Lane multipliers (odd).
  mul: readonly [number, number];
  // The cross xorshift's shift, then the self xorshift's.
  cross: number;
  self: number;
}

export interface Hash2dTable {
  // The first multiply-add: v * mul0 + add0, per lane.
  mul0: readonly [number, number];
  add0: readonly [number, number];
  rounds: readonly Hash2dRound[];
}

export const HASH2D: Hash2dTable = {
  mul0: [0x98061e17, 0xba83112b],
  add0: [0x85a53829, 0x41d803af],
  rounds: [
    { mul: [0xc068da5d, 0xfab54ac5], cross: 12, self: 16 },
    { mul: [0xbe08065f, 0xe4e8b2d9], cross: 12, self: 14 },
    { mul: [0xc3c8273b, 0xecd89725], cross: 17, self: 14 },
  ],
};

const lit = (n: number): string =>
  "0x" + (n >>> 0).toString(16).toUpperCase().padStart(8, "0") + "u";
const pair = (p: readonly [number, number]): string =>
  `uvec2(${lit(p[0])}, ${lit(p[1])})`;

// The GLSL function `uvec2 hash2d(uvec2 v)` for a table.
export function hash2dGlsl(t: Hash2dTable = HASH2D): string {
  const rounds = t.rounds
    .map(
      (r) =>
        `  v *= ${pair(r.mul)};\n` +
        `  v ^= v.yx >> ${r.cross}u;\n` +
        `  v ^= v >> ${r.self}u;\n`
    )
    .join("");
  return (
    `uvec2 hash2d(uvec2 v) {\n` +
    `  v = v * ${pair(t.mul0)} + ${pair(t.add0)};\n` +
    rounds +
    `  return v;\n}\n`
  );
}

export const HASH2D_GLSL = hash2dGlsl();

// The JS mirror: two uint32 in, two uint32 out (inputs wrap mod 2^32, so a
// negative cell coordinate hashes as the shader's uvec2(ivec2) does).
export function hash2d(
  x: number,
  y: number,
  t: Hash2dTable = HASH2D
): [number, number] {
  let a = (Math.imul(x, t.mul0[0]) + t.add0[0]) >>> 0;
  let b = (Math.imul(y, t.mul0[1]) + t.add0[1]) >>> 0;
  for (const r of t.rounds) {
    a = Math.imul(a, r.mul[0]) >>> 0;
    b = Math.imul(b, r.mul[1]) >>> 0;
    const ta = a;
    const tb = b;
    a = (ta ^ (tb >>> r.cross)) >>> 0;
    b = (tb ^ (ta >>> r.cross)) >>> 0;
    a = (a ^ (a >>> r.self)) >>> 0;
    b = (b ^ (b >>> r.self)) >>> 0;
  }
  return [a, b];
}
