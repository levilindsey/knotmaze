// DETERMINISTIC MATH for generation (K108). ECMAScript leaves Math.hypot,
// the trig, exp and log functions and `**` (Math.pow) "implementation-
// approximated": each engine rounds them its own way. Only + - * / and
// Math.sqrt are correctly rounded by the spec (and JS never contracts a*b+c
// into a fused multiply-add), so every engine computes them bit for bit
// alike. Generation decides the maze from distance comparisons and ties, so
// it may use ONLY those exact operations and this module - a design link and
// a daily must build the same maze in every browser.
//
// Measured 2026-10-13: Firefox's Math.hypot (fdlibm e_hypot) differs from
// Chrome's in the last bit on 7074 of the 20301 quarter-unit pairs plan
// coordinates make, and 31 of the first 60 dailies built a different plan in
// Firefox (22 a different walk graph; real Chrome 155 vs Firefox 153: 34 of
// 144 designs' plans). Safari's JavaScriptCore calls the platform's
// std::hypot, a third rounding. Probes: .claude/probes/K108/.

// Math.hypot(x, y) exactly as V8 computes it, from exact operations only:
// V8's MathHypot (Torque, src/builtins/math.tq) scales by the larger
// magnitude, Kahan-sums the squares (the compensation is exactly 0 for two
// terms) and rescales. So every engine now returns Chrome's bits, and no
// maze built in Chrome moved. Those bits are not always the correctly
// rounded ones (on the plan grid Firefox's are, and V8's are an ulp off on
// those 7074 pairs), but the shipped mazes were built with them. Checked bit
// for bit against V8 on 320k inputs, cold and optimized, and against Firefox
// running this same code.
export function hypot2(x: number, y: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (ax === Infinity || ay === Infinity) return Infinity;
  if (ax !== ax || ay !== ay) return NaN;
  const m = ax > ay ? ax : ay;
  if (m === 0) return 0;
  const u = ax / m;
  const v = ay / m;
  return Math.sqrt(u * u + v * v) * m;
}
