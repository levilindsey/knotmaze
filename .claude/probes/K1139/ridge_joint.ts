// K1139 S4b items 3 and 4: the step at a two-ended arm's joint when its
// ridge sits near (item 3: 0 < xR < PULSE_RIDGE_FADE) or before (item 4:
// dB + W < dA, xR < 0) that joint. Synthetic, on the CPU twins
// (paint_math.ts): no stand of the four shows either case (table_cyc's
// TWO lines read the joint ridge factor 1.000 at every end, no RARE).
// At the joint the parent (a tree arm, one-ended, cont at the joint)
// reads kPulseCrest(dA) with bumpScale 1; the child reads kPulseV2 at d =
// 0; the S4b band reads kPulseBandV at tau = 0- and 0+ (it follows both
// ribbons, so its step is theirs). The metric is the field step |parent
// - child| at the joint, max over 400 clocks (two pulse periods) and both
// directions; S4's e210 defect (the band's reach against the ribbon) read
// 0.9859 in the same units (table_s4.txt).
//   node scripts/run_node.mjs .claude/probes/K1139/ridge_joint.ts
import { kPulseBandV, kPulseCrest, kPulseV2, type KUniforms } from "../../../src/render/paint_math";

function uniforms(clock: number, spacing: number): KUniforms {
  const K = new Float32Array(64 * 4);
  K.set([0, 0, 1, 1]);
  const s = Math.max(0.5, spacing);
  const mod = (x: number): number => x - s * Math.floor(x / s);
  return {
    uKBase: new Float32Array([0, 0, 0, 1]),
    uKFx: new Float32Array(4),
    uKFx2: new Float32Array(4),
    uKShape: new Float32Array([1, 0, 1, 0]),
    uKInk: new Float32Array([1, 0, 0, 0]),
    uKKnots: K,
    uKGamut: new Float32Array([0, 280, 0.45, 0.64]),
    uKSect: new Float32Array([0, 0, 1e6, 0.75]),
    uKPaint: new Float32Array([1, 0, 0, 0.5]),
    uKPulse: new Float32Array([mod(clock * 1.6), mod((clock + 0.3) * 1.6), s, 1]),
    uKReach: new Float32Array([1e6, 1, 0, 0]),
    uKGold: new Float32Array([1, 0.8, 0.3, 1]),
  } as KUniforms;
}

const SPACING = 2.5;
const dA = 5.0; // large enough that dB >= 0 on every row
const W = 2.5;
function stepAt(dB: number): { ribbon: number; band: number; clock: number; par: number; kid: number } {
  const gR = (dA + dB + W) / 2;
  let best = { ribbon: 0, band: 0, clock: 0, par: 0, kid: 0 };
  for (let i = 0; i < 400; i++) {
    const clock = 100 + (i * 2 * (SPACING / 1.6)) / 400;
    const U = uniforms(clock, SPACING);
    for (const [inwA, inwB] of [[false, false], [true, false], [false, true], [true, true]] as Array<[boolean, boolean]>) {
      const par = kPulseCrest(U, dA, inwA, false, 1, 1);
      const kid = kPulseV2(U, 0, W, dA, dB, inwA, inwB, false);
      const bandL = kPulseBandV(U, dA, -1e-9, inwA, false, gR, inwB);
      const bandR = kPulseBandV(U, dA, 1e-9, inwA, false, gR, inwB);
      const r = Math.abs(par - kid), b = Math.abs(bandL - bandR);
      if (r > best.ribbon) best = { ribbon: r, band: b, clock, par, kid };
    }
  }
  return best;
}

console.log(`dA ${dA}, W ${W}, spacing ${SPACING}; xR = gR - dA = (dB + W - dA) / 2; joint factor min(1, |xR| / 0.5)`);
console.log("case        xR      dB     joint factor  step parent-child (max)  band 0-/0+   at clock  parent  child");
const rows: Array<[string, number]> = [
  ["control", 0.75], ["control", 0.5], ["item 3", 0.4], ["item 3", 0.3], ["item 3", 0.2], ["item 3", 0.1], ["item 3", 0.03],
  ["ridge @ J", 0], ["item 4", -0.03], ["item 4", -0.1], ["item 4", -0.25], ["item 4", -0.5], ["item 4", -1.0],
];
for (const [name, xR] of rows) {
  const dB = dA + 2 * xR - W;
  const s = stepAt(dB);
  const fac = Math.min(1, Math.abs(xR) / 0.5);
  console.log(
    `${name.padEnd(10)} ${xR.toFixed(2).padStart(6)} ${dB.toFixed(2).padStart(6)}   ${fac.toFixed(3).padStart(8)}      ${s.ribbon.toFixed(4).padStart(12)}           ${s.band.toFixed(4)}    ${s.clock.toFixed(3)}  ${s.par.toFixed(3)}  ${s.kid.toFixed(3)}`
  );
}
