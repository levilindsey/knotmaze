// K829: the tapered root's envelope lean (extrudeRibbon's leanK).
// A straight strand along +x with a width shrinking linearly: the
// swept discs' envelope leans forward of the perpendicular; with
// k = -dw/ds the offset axis tilts by asin(k) and the outline lands
// on that envelope. k = 0 (or no lean array) is bit-identical.
import { describe, expect, it } from "vitest";
import { RoundJoins, extrudeRibbon } from "../../src/render/ribbon_mesh";

const N = 41;
const H = 0.26; // half-width at sample 0, shrinking to H/2 at the end

function straight(): { pos: Float32Array; tan: Float32Array; mul: Float32Array } {
  const pos = new Float32Array(N * 2);
  const tan = new Float32Array(N * 2);
  const mul = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 2] = i * 0.1;
    pos[i * 2 + 1] = 0;
    tan[i * 2] = 1;
    tan[i * 2 + 1] = 0;
    mul[i] = 1 - 0.5 * (i / (N - 1)); // width 2H -> H over 4 world units
  }
  return { pos, tan, mul };
}

describe("K829 taper lean", () => {
  it("no lean array and zero lean are bit-identical", () => {
    const { pos, tan, mul } = straight();
    const a = new Float32Array(N * 4);
    const b = new Float32Array(N * 4);
    extrudeRibbon(a, new RoundJoins(), pos, tan, N, false, H, 0, mul);
    extrudeRibbon(b, new RoundJoins(), pos, tan, N, false, H, 0, mul, new Float32Array(N));
    for (let k = 0; k < a.length; k++) expect(Object.is(a[k], b[k])).toBe(true);
  });

  it("the leaned outline lies on the disc envelope", () => {
    const { pos, tan, mul } = straight();
    // r(s) = H * mul falls H/2 over 4 world units: k = -dr/ds.
    const k = (H * 0.5) / 4;
    const lean = new Float32Array(N).fill(k);
    const got = new Float32Array(N * 4);
    extrudeRibbon(got, new RoundJoins(), pos, tan, N, false, H, 0, mul, lean);
    const c = Math.sqrt(1 - k * k);
    for (let i = 2; i < N - 2; i++) {
      const w = H * mul[i];
      // Left vertex = center + w * (n*c + t*k), n = (0,1), t = (1,0).
      expect(got[i * 4]).toBeCloseTo(i * 0.1 + w * k, 6);
      expect(got[i * 4 + 1]).toBeCloseTo(w * c, 6);
      const lx = got[i * 4];
      const ly = got[i * 4 + 1];
      expect(lx).toBeGreaterThan(i * 0.1); // leaned forward (narrowing)
      expect(ly).toBeLessThan(w); // perpendicular share shrinks by c
    }
  });

  it("a widening root leans backward (negative k)", () => {
    const { pos, tan, mul } = straight();
    const lean = new Float32Array(N).fill(-0.3);
    const got = new Float32Array(N * 4);
    extrudeRibbon(got, new RoundJoins(), pos, tan, N, false, H, 0, mul, lean);
    const i = 10;
    expect(got[i * 4]).toBeLessThan(i * 0.1);
    expect(got[i * 4 + 1]).toBeCloseTo(H * mul[i] * Math.sqrt(1 - 0.09), 6);
  });
});
