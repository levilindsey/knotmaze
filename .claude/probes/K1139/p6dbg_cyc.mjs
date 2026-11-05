// K1139 S4: where table_cyc's P6b counts more crest maxima than centres
// (the two-ended arms of cyc, loop, preloop; bump only, CPU mirror).
//   node p6dbg_cyc.mjs
import { uniforms } from "./kymo.mjs";

const C = { CREST_WIDTH: 0.72, CREST_RAMP: 0.5, PULSE_RIDGE_FADE: 0.5 };
const smooth01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
const reachWin = (U, d) => 1 - smooth01((d - (U.reach - Math.max(U.f, 1e-4))) / Math.max(U.f, 1e-4));
function crest(U, dG, inward, bumpScale) {
  const s = U.s;
  const raw = inward ? dG + U.travelIn : dG - U.travelOut;
  const ph = raw - s * Math.floor(raw / s);
  const dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  return Math.max(0, 1 - dist / C.CREST_WIDTH) * Math.min(1, dC / C.CREST_RAMP) * bumpScale * reachWin(U, dG);
}
function v2(U, d, W, dA, dB, inwA, inwB) {
  const gA = dA + d, gB = dB + W - d;
  const rK = Math.min(1, (Math.abs(gA - gB) * 0.5) / C.PULSE_RIDGE_FADE);
  return gA <= gB ? crest(U, gA, inwA, rK) : crest(U, gB, inwB, rK);
}
for (const [name, W, dA, dB, reach, idx] of [["preloop", 7.671, 4.253, 4.253, 8, [0, 1, 2]], ["loop", 7.671, 0, 0, 8, [3, 4, 5]], ["cyc", 2.746, 0, 1.386, 3, [5, 6, 7]]]) {
  const period = 2.5 / 1.6;
  for (const i of idx) {
    const U = uniforms(100 + (i / 8) * period, 2.5, reach);
    const f = (d) => v2(U, d, W, dA, dB, false, false);
    const mx = [];
    for (let d = 0.005; d < W - 0.005; d += 0.005) {
      const a = f(d - 0.005), b = f(d), c = f(d + 0.005);
      if (b > 0.02 && b >= a && b > c) mx.push(`${d.toFixed(3)}:${b.toFixed(3)}`);
    }
    const dR = (dB + W - dA) / 2;
    console.log(`${name} i${i} f ${U.f.toFixed(3)} travelOut ${U.travelOut.toFixed(3)} ridge d ${dR.toFixed(3)}: maxima ${mx.join(" ")}`);
  }
}
// P4's narrow preloop crests (0.623): the one-ended crest alone (no ridge)
// at the same clock and dG, against the two-ended field at that crest.
const fwhm = (f, x0) => {
  const h = f(x0) / 2;
  let a = x0, b = x0;
  while (f(a) > h && a > x0 - 2) a -= 0.0005;
  while (f(b) > h && b < x0 + 2) b += 0.0005;
  return b - a;
};
for (let i = 0; i < 8; i++) {
  const U = uniforms(100 + (i / 8) * (2.5 / 1.6), 2.5, 8);
  for (let c = U.travelOut; c < 8.088; c += 2.5) {
    if (c < 4.253 + 0.75 || c > 8.088 - 0.75) continue;
    const one = fwhm((g) => crest(U, g, false, 1), c);
    const two = fwhm((d) => v2(U, d, 7.671, 4.253, 4.253, false, false), c - 4.253);
    console.log(`preloop P4 i${i}: crest at dG ${c.toFixed(3)} (${(8.088 - c).toFixed(3)} from the ridge): one-ended FWHM ${one.toFixed(3)}, two-ended ${two.toFixed(3)}`);
  }
}
