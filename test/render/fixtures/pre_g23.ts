// FROZEN pre-G2.3 gameplay paint (RibbonRenderer.writeChainPaint without
// the reveal glow, pulseValueAt, and the 256x1 accent strip the section
// shader composed with): the reference the per-pixel paint
// (paint_math kPaintAt / kComposePaint) is checked against. Do not edit.

export interface OldSpan { c0: number; c1: number; p0?: number; p1?: number }
export interface OldCap { ctrl: number; radius: number; p?: number }
export interface OldPulse { cJunction: number; cFar: number; inward: boolean; onPath: boolean; hovered: boolean }
export interface OldClock { clock: number; pulseBorn: number; spacing: number }

const PAL_W = 256;
const U_BASE = 115 / PAL_W;
const U_GOLD = 121 / PAL_W;
const bandU = (onPath: boolean, p: number): number => {
  const q = p < 0 ? 0 : p > 1 ? 1 : p;
  return onPath ? (124.5 + q * 110) / PAL_W : (111.5 - q * 110) / PAL_W;
};
const goldU = (p: number): number =>
  p >= 1 ? U_GOLD : p <= 0 ? U_BASE : U_BASE + (U_GOLD - U_BASE) * p;

export function oldPulseValueAt(d: number, spanArc: number, inward: boolean, hovered: boolean, k: OldClock): number {
  const end = spanArc;
  if (d < 0 || d > end) return 0;
  const endWin = Math.min(1, Math.max(0, (end - d) / 0.45));
  if (hovered) return endWin * (0.5 + 0.3 * Math.sin(k.clock * 5.2));
  const fi = Math.min(1, Math.max(0, (k.clock - k.pulseBorn) / 0.45));
  const fadeIn = fi * fi * (3 - 2 * fi);
  const spacing = Math.max(0.5, k.spacing);
  const clock = inward ? k.clock : k.clock + 0.3;
  const travel = clock * 1.6;
  const raw = inward ? d + travel : d - travel;
  const ph = ((raw % spacing) + spacing) % spacing;
  const dist = Math.min(ph, spacing - ph);
  const dC = Math.max(0, d - (ph <= spacing - ph ? ph : ph - spacing));
  const bump = Math.max(0, 1 - dist / 0.72) * Math.min(1, dC / 0.5);
  const floor = (0.38 + 0.62 * Math.max(0, 1 - d / 0.55)) * Math.max(0, 1 - d / 2.0);
  return Math.min(1, (floor + bump * 0.9) * endWin) * fadeIn;
}

// The per-sample paint U of one chain (writeChainPaint, glow excluded).
export function oldPaintU(
  arcs: number[],
  total: number,
  closed: boolean,
  arcOfCtrl: (c: number) => number,
  spans: OldSpan[],
  caps: OldCap[],
  pulses: OldPulse[],
  k: OldClock
): Float64Array {
  const us = new Float64Array(arcs.length).fill(U_BASE);
  for (const s of spans) {
    const a0 = arcOfCtrl(s.c0);
    const a1 = arcOfCtrl(s.c1);
    const wraps = closed && a1 <= a0 && s.c1 > s.c0;
    const p0 = s.p0 ?? 1;
    const p1 = s.p1 ?? 1;
    const spanLen = Math.max(wraps ? total - a0 + a1 : a1 - a0, 1e-9);
    arcs.forEach((a, i) => {
      const inside = wraps ? a >= a0 || a <= a1 : a >= a0 && a <= a1;
      if (!inside) return;
      if (p0 >= 1 && p1 >= 1) {
        us[i] = U_GOLD;
        return;
      }
      const da = wraps && a < a0 ? total - a0 + a : a - a0;
      const t = Math.min(1, Math.max(0, da / spanLen));
      us[i] = goldU(p0 + (p1 - p0) * t);
    });
  }
  for (const cp of caps) {
    const aC = arcOfCtrl(cp.ctrl);
    const uCap = goldU(cp.p ?? 1);
    arcs.forEach((a, i) => {
      let d = Math.abs(a - aC);
      if (closed) d = Math.min(d, total - d);
      if (d <= cp.radius && uCap > us[i]) us[i] = uCap;
    });
  }
  for (const p of pulses) {
    const aJ = arcOfCtrl(p.cJunction);
    const aF = arcOfCtrl(p.cFar);
    let dirPos: boolean;
    let spanArc: number;
    if (closed) {
      dirPos = p.cFar > p.cJunction;
      spanArc = dirPos ? (((aF - aJ) % total) + total) % total : (((aJ - aF) % total) + total) % total;
    } else {
      dirPos = aF >= aJ;
      spanArc = Math.abs(aF - aJ);
    }
    if (spanArc <= 1e-6) continue;
    arcs.forEach((a, i) => {
      let d: number;
      if (closed) d = dirPos ? (((a - aJ) % total) + total) % total : (((aJ - a) % total) + total) % total;
      else d = dirPos ? a - aJ : aJ - a;
      const v = oldPulseValueAt(d, spanArc, p.inward, p.hovered, k);
      if (v > 0.004) us[i] = bandU(p.onPath, v);
    });
  }
  return us;
}

// The accent strip (buildAccentPixels) for a gold color, 8-bit.
function mixHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
export function oldStrip(gold: number): Uint8Array {
  const px = new Uint8Array(PAL_W * 4);
  const put = (i: number, hex: number, w: number): void => {
    px[i * 4] = (hex >> 16) & 255;
    px[i * 4 + 1] = (hex >> 8) & 255;
    px[i * 4 + 2] = hex & 255;
    px[i * 4 + 3] = Math.round(w * 255);
  };
  for (let i = 0; i < 112; i++) put(i, 0xffffff, 0.94 * (1 - i / 111));
  for (let i = 112; i < 118; i++) put(i, gold, 0);
  for (let i = 118; i < 124; i++) put(i, gold, 1);
  for (let i = 124; i < 236; i++) put(i, mixHex(gold, 0xffffff, (0.94 * (i - 124)) / 111), 1);
  for (let i = 236; i < 256; i++) put(i, mixHex(gold, 0xffffff, 0.94), 1);
  return px;
}

// The section shader's composition: mix(S, strip(U).rgb, strip(U).a) with
// the strip's linear filtering.
export function oldCompose(S: number[], u: number, strip: Uint8Array): number[] {
  const f = Math.max(0, Math.min(PAL_W - 1, u * PAL_W - 0.5));
  const i0 = Math.floor(f);
  const i1 = Math.min(PAL_W - 1, i0 + 1);
  const t = f - i0;
  const acc = [0, 1, 2, 3].map((c) => (strip[i0 * 4 + c] * (1 - t) + strip[i1 * 4 + c] * t) / 255);
  return [0, 1, 2].map((c) => S[c] + (acc[c] - S[c]) * acc[3]);
}
