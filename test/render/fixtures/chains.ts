// Shared synthetic chain tables for the G2 mirror suites.
import type { FrozenSamples } from "./pre_g2";

// A random chain table: nCtrl control arcs with segment lengths 0.16-0.64
// (the measured rest range), f32-rounded as the texture holds them.
export function randomChain(
  r: () => number,
  nCtrl: number,
  closed: boolean
): FrozenSamples {
  const cal: number[] = [0];
  let a = 0;
  for (let i = 1; i < nCtrl; i++) {
    a += 0.16 + r() * 0.48;
    cal.push(Math.fround(a));
  }
  // Closed rings close the loop with one more segment; open runs END at the
  // last control (cal[n - 1] == total).
  const total = Math.fround(closed ? a + 0.16 + r() * 0.48 : a);
  const count = Math.max(48, Math.round(total / 0.09));
  return { count, totalLength: total, controlArcLengths: cal, closed };
}