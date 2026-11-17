// K1423 (24G): gf's crossing-gap window. Today's gap shader cuts the under
// thread only inside a window marched along it (crossing_gaps.ts marchUnder:
// the centreline-distance exit, the eye-wall limit, the neighbour caps);
// gf_look's lkGap had no window and kept cutting along eye walls. The bake
// (GfGapTable) marches the same window on CPU per crossing and stores, per
// under sample, the signed arc distance to the nearest window end.
import { describe, expect, it } from "vitest";
import { GfGapTable, gapWindow, lookForm, type GapSamples, type GfGapSource } from "../../src/render/gpu_field/gf_look";
import { gfFs } from "../../src/render/gpu_field/gf_glsl";
import type { KChain, KData } from "../../src/render/paint_math";

describe("K1423 lkGap shader: the cut is windowed by the baked winM", () => {
  it("reads uGw at the label foot and applies inWin + the window-end fs", () => {
    const f = lookForm(gfFs(false, true));
    expect(f).toContain("uniform highp sampler2D uGw; uniform float uGwLive;");
    expect(f).toContain("float lkWinM(int c, vec2 q)");
    expect(f).toContain("float wm = uGwLive > 0.5 ? lkWinM(cU, qU) : 1e3;");
    expect(f).toContain("cut *= clamp(wm / pxw + 0.5, 0.0, 1.0) * fs;");
    expect(f).toContain("float fs = clamp(wm / max(0.5 * uLkF, pxw), 0.0, 1.0);");
  });
});

const H = 0.13, MARGIN = 0.07, FADE = 0.14;

/** Samples along pts resampled every step (open chain, arc = index * step). */
function samples(pts: [number, number][], step = 0.1): GapSamples & { positions: Float32Array; count: number } {
  const raw: [number, number][] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) raw.push([ax + (bx - ax) * (k / n), ay + (by - ay) * (k / n)]);
  }
  raw.push(pts[pts.length - 1]);
  const positions = new Float32Array(raw.length * 2);
  raw.forEach(([x, y], i) => { positions[2 * i] = x; positions[2 * i + 1] = y; });
  return { positions, count: raw.length, closed: false, total: (raw.length - 1) * step, arcPer: step };
}
const straight = (x0: number, y0: number, x1: number, y1: number, step = 0.1) =>
  samples([[x0, y0], [x1, y1]], step);

describe("K1423 gapWindow (marchUnder's perp window on polylines)", () => {
  it("steep crossing: the window ends just past the fade exit", () => {
    const under = straight(0, 0, 20, 0);
    const over = straight(10, -10, 10, 10);
    const [wn, wp] = gapWindow(under, over, 10, 10, H, MARGIN, FADE, 4.5, 4.5);
    // all lanes out at 2h+margin = 0.33; fade exit 0.47 (+pad), eye limit 0.33+0.14 = 0.47
    expect(wn).toBeGreaterThan(0.38);
    expect(wn).toBeLessThan(0.68);
    expect(wp).toBeGreaterThan(0.38);
    expect(wp).toBeLessThan(0.68);
  });
  it("shallow crossing: the eye-wall limit ends it, not the distant fade exit", () => {
    const under = straight(0, 0, 30, 0);
    const s = 0.1, c = Math.sqrt(1 - s * s);
    const over = samples([[10 - 12 * c, -12 * s], [10 + 12 * c, 12 * s]]);
    const [wn, wp] = gapWindow(under, over, 10, 12, H, MARGIN, FADE, 4.5, 4.5);
    // centreline distance reaches 2h+margin at arc 3.3; the fade exit would be
    // 4.7 away, but the eye-wall limit ends the window at 3.3 + 0.14/0.2 = 4.0
    expect(wp).toBeGreaterThan(3.7);
    expect(wp).toBeLessThan(4.4);
    expect(wn).toBeGreaterThan(3.7);
    expect(wn).toBeLessThan(4.4);
  });
  it("parallel ride past the casing: the eye-wall limit still ends the window", () => {
    const under = straight(0, 0, 20, 0);
    const over = straight(0, 0.4, 20, 0.4);
    const [, wp] = gapWindow(under, over, 10, 10, H, MARGIN, FADE, 2.0, 2.0);
    // d = 0.4 is past the all-lanes exit (0.33) at the centre itself, and sin
    // is 0, so the window ends fade/0.2 of arc later, as today's march does
    expect(wp).toBeGreaterThan(0.7);
    expect(wp).toBeLessThan(0.95);
  });
});

describe("K1423 GfGapTable", () => {
  // chain 0 (over): an eye over chain 1 (under, straight along x): crosses at
  // x=10, rides parallel at y=0.3, crosses back at x=13 (twin crossings, so
  // each window is capped at half the eye's length, NB_CLEAR_TWIN).
  const under = straight(0, 0, 20, 0);
  const over = samples([[8, -2], [10, 0], [11, 0.28], [12, 0.3], [13, 0], [15, -2]]);
  const geom = new Float32Array(16);
  geom[0] = over.total; geom[1] = over.arcPer; // chain 0 G0 (texel 0)
  geom[4] = 0; geom[5] = over.total; // chain 0 control arcs (texel 1)
  geom[8] = under.total; geom[9] = under.arcPer; // chain 1 G0 (texel 2)
  geom[12] = 0; geom[13] = under.total; // chain 1 control arcs (texel 3)
  const kd = { stat: new Float32Array(4), geom, reveal: new Float32Array(4), paint: new Float32Array(4) } as unknown as KData;
  const kcv = [
    { ch: 0, nCtrl: 2, closed: false, geom: 0, total: over.total },
    { ch: 1, nCtrl: 2, closed: false, geom: 2, total: under.total },
  ] as unknown as KChain[];
  const arcOf = (S: GapSamples, x: number, y: number) => {
    let best = 1e9, ba = 0;
    for (let a = 0; a <= S.total; a += 0.05) {
      const i = Math.min(S.count - 1, Math.round(a / S.arcPer));
      const d = Math.hypot(S.positions[2 * i] - x, S.positions[2 * i + 1] - y);
      if (d < best) { best = d; ba = a; }
    }
    return ba;
  };
  const src: GfGapSource = {
    kd, kcv,
    chainSamples: [{ positions: over.positions, count: over.count }, { positions: under.positions, count: under.count }],
    crossings: [
      { overChain: 0, overCtrl: arcOf(over, 10, 0) / over.total, underChain: 1, underCtrl: arcOf(under, 10, 0) / under.total },
      { overChain: 0, overCtrl: arcOf(over, 13, 0) / over.total, underChain: 1, underCtrl: arcOf(under, 13, 0) / under.total },
    ],
    fillHalf: H, margin: MARGIN, fade: FADE,
  };
  it("eye walls: the window from each crossing ends near the eye's midpoint (twin cap)", () => {
    const T = new GfGapTable();
    const V = T.values(src);
    const at = (x: number) => V[over.count + Math.round(x / under.arcPer)]; // chain 1 follows chain 0 in the layout
    // at the crossing the sample is deep inside (winM near the window's reach)
    expect(at(10)).toBeGreaterThan(0.5);
    // the eye's middle (x=11.5) sits at both windows' ends: winM near or below
    // zero there, so lkGap cuts nothing along the wall where master gf cut fully
    expect(at(11.5)).toBeLessThan(0.2);
    // just inside the first window's end it is still positive but small
    expect(at(11)).toBeGreaterThan(0);
    expect(at(11)).toBeLessThan(at(10));
  });
});
