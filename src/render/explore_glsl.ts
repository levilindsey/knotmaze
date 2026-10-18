// K76 THREAD REVEAL, the shader side (stage 2a; design:
// docs/design/K76_reveal_mode.md sections 2.2, 3 and 9; K268 stage 1's
// shaped cut: docs/design/K268.md). No GL state: the vitest parity suites
// import it (through gap_mask.ts it loads pixi, which vitest runs fine).
//
// The model (game/explore_view.ts) hands the renderer VISIBILITY PIECES per
// chain. They ride the KPAINT declaration as VIS items (two texels each,
// like every paint item), referenced from every control slot they can
// touch, and the ribbon fragment shader evaluates them per pixel
// (kExploreAt below; its CPU twin is paint_math.ts kExploreAt). The
// visibility multiplies the fragment's alpha, so everything drawn on the
// thread (section color, paint, pulses, the hover glow, every highlight
// mode) fades with it.
//
// MODE OFF IS MASTER'S PROGRAM. Everything here lives in a SECOND program,
// built from the section shader's fragment text by exact-anchor insertion
// (withExplore), and the renderer swaps the ribbons onto it only while the
// mode is on. VIS is not a PAINT_ITEM: glslConstBlock emits a PI_ constant
// for every PAINT_ITEM entry, which would change the shared program text.
// kPaintAt (GLSL and CPU) branches on the item type and skips a VIS item,
// and VIS items set no chain's paintOn flag (KGEOM G0.w), so the paint
// evaluation stays gated on real paint.
//
// THE WHOLE-CHAIN FLAG: KPAINT texel `chain` .x (texels below the first
// slot table, rowUp(2 n), are otherwise unused in KPAINT) is 1 when the
// chain's pieces cover all of it at full visibility: kExploreAt returns 1
// without scanning the slot. A chain with no piece is not drawn at all
// (the renderer culls its mesh), and with no VIS item kExploreAt returns 0.

import type { ExplorePiece } from "../game/explore_view";
// K268: the gap table's layout (the shaped cut reads its profile texels) and
// its shape types. gap_mask.ts imports pixi, so this module is no longer
// pixi-free; vitest loads pixi fine (explore_gates.test.ts).
import {
  GAP_FLAG_SHAPED,
  GAP_PROF_BASE,
  GAP_PROF_F0,
  GAP_PROF_MAX,
  GAP_PROF_R0,
  GAP_PROT_NEG,
  type GapRamp,
  type GapShape,
} from "./gap_mask";

// The VIS item type (T0.x). PAINT_ITEM uses 1-4.
export const EXPLORE_ITEM_VIS = 5;
// K290 (burn stage 3a): the CHAR item type, a burnt stretch the `char` look
// darkens: T0 = (CHAR, b0, b1, -), T1 unused. Like VIS, not a PAINT_ITEM:
// kPaintAt skips it and it sets no chain's paint flag.
export const EXPLORE_ITEM_CHAR = 6;
// The char look (stage 1's Graphics strokes, now per pixel in the ribbon's
// own fragment, so a crossing gap cuts it like the thread): char over the
// thread, a thin ash core along the centerline (half-width in vUV.y), each
// end ramped over EXPLORE_CHAR_EDGE ctrl centered on the span's end (two
// abutting spans sum to exactly 1 there: no seam).
export const EXPLORE_CHAR_RGB = [0x22 / 255, 0x14 / 255, 0x0e / 255] as const;
export const EXPLORE_CHAR_ALPHA = 0.9;
export const EXPLORE_ASH_RGB = [0x7a / 255, 0x3a / 255, 0x22 / 255] as const;
export const EXPLORE_ASH_ALPHA = 0.75;
export const EXPLORE_ASH_HALF = 0.15;
export const EXPLORE_CHAR_EDGE = 0.08;

// One burnt stretch as a CHAR item, and the unwrapped ctrl range its slot
// references must cover.
export function charItem(s: { b0: number; b1: number }): number[] {
  return [EXPLORE_ITEM_CHAR, s.b0, s.b1, 0, 0, 0, 0, 0];
}
export function charRange(s: { b0: number; b1: number }): [number, number] {
  return [s.b0 - EXPLORE_CHAR_EDGE, s.b1 + EXPLORE_CHAR_EDGE];
}

// K290 stage 3b: the FIRE FRONT item, T0 = (FRONT, c, dir, kind), T1 unused:
// c = the front's unwrapped chain ctrl, dir = +-1 the ctrl direction of the
// UNBURNT side, kind 0 = a burning front (the char band ahead, the ember
// at the front), 1 = the lit fuse (the ember only, before the fire
// spreads). Like CHAR, not a PAINT_ITEM; kCharAt reads it (chains with the
// flag .y). Static: the shaders have no fire clock (uKFx2 runs only during
// the appearance reveal), so the motion is the `burn` FX particles'.
export const EXPLORE_ITEM_FRONT = 7;
// K290 stage 3b: the SMOLDER item, T0 = (SMOLDER, c0, c1, -): a smoldering
// arm's stretch from the head to its first burnt stretch, a thin hot line
// along the centerline (stage 1's red stroke, now under the gaps).
export const EXPLORE_ITEM_SMOLDER = 8;
// The char band ahead of a front (ctrl): a thread blackens before it
// vanishes. Full char at the front, smoothly to none BAND ahead; it ramps
// in over EXPLORE_CHAR_EDGE behind the front, so under the char look it
// meets the burnt span's own ramp without a seam.
export const EXPLORE_FRONT_BAND = 0.7;
// The ember: a glow peaking at the front, AHEAD ctrl into the unburnt side
// and BEHIND ctrl into the burnt one (seen only under char: gone cuts it).
export const EXPLORE_EMBER_AHEAD = 0.25;
export const EXPLORE_EMBER_BEHIND = 0.55;
export const EXPLORE_EMBER_RGB = [0xff / 255, 0x7a / 255, 0x1a / 255] as const;
export const EXPLORE_EMBER_ALPHA = 0.95;
// The ember's hot core: its centerline half-width (vUV.y), color and power.
export const EXPLORE_EMBER_CORE_RGB = [0xff / 255, 0xe0 / 255, 0x8a / 255] as const;
export const EXPLORE_EMBER_CORE_HALF = 0.22;
export const EXPLORE_SMOLDER_RGB = [0xff / 255, 0x3b / 255, 0x1f / 255] as const;
export const EXPLORE_SMOLDER_ALPHA = 0.9;
export const EXPLORE_SMOLDER_HALF = 0.225;

// One fire front as a FRONT item, and the unwrapped ctrl range its slot
// references must cover.
export function frontItem(f: { c: number; dir: number; kind: number }): number[] {
  return [EXPLORE_ITEM_FRONT, f.c, f.dir < 0 ? -1 : 1, f.kind, 0, 0, 0, 0];
}
export function frontRange(f: { c: number; dir: number }): [number, number] {
  const ahead = Math.max(EXPLORE_FRONT_BAND, EXPLORE_EMBER_AHEAD) + 0.05;
  const behind = Math.max(EXPLORE_EMBER_BEHIND, EXPLORE_CHAR_EDGE) + 0.05;
  return f.dir < 0 ? [f.c - ahead, f.c + behind] : [f.c - behind, f.c + ahead];
}
export function smolderItem(s: { b0: number; b1: number }): number[] {
  return [EXPLORE_ITEM_SMOLDER, s.b0, s.b1, 0, 0, 0, 0, 0];
}

const glslF = (x: number): string => x.toFixed(5);
const glslV3 = (v: readonly number[]): string => `vec3(${v.map(glslF).join(", ")})`;

// The end-marker looks (uKExplore.y = the index), section 3 of the design.
// fade: the stub fades out. halo: the fade, plus a soft halo sprite at the
// frontier (drawn by fabric_maze_renderer). glow: the end brightens, then
// dissolves. dots: a round cap, then a dotted line that shrinks and fades.
// fray: the thread unravels into thinning fibers. beacon: dots + the halo.
export const EXPLORE_LOOKS = ["fade", "halo", "glow", "dots", "fray", "beacon"] as const;
export type ExploreLook = (typeof EXPLORE_LOOKS)[number];
export const EXPLORE_LOOK_DEFAULT = EXPLORE_LOOKS.indexOf("beacon");
// The looks that draw a halo sprite at each frontier.
export function exploreLookHasHalo(look: number): boolean {
  return look === 1 || look === 5;
}

// The tint the glow look (and the halo sprites) brighten toward.
export const EXPLORE_GLOW_RGB = [0.78, 0.94, 1.0] as const;

// K397 (Levi's call (c), K423): the dots and beacon looks end a frontier
// fade in a cap and ALWAYS TWO dots, sized to fit the fade. In thread
// widths: from a fade of EXPLORE_DOTS_SPAN up, the cap is a half disc of
// radius 0.5 and the dots sit at EXPLORE_DOT_AT of the fade's arc length,
// radii EXPLORE_DOT_R (the 0.3 (1 - 0.4 u) the dotted line had at those
// u); at SPAN that is the old layout's first two dots (0.95 and 1.9).
// Below SPAN the cap's length and the radii scale by fade / SPAN, so the
// second dot's far edge stays at 0.97 of the fade.
export const EXPLORE_DOTS_SPAN = 2.15;
export const EXPLORE_DOT_AT = [0.44, 0.88] as const;
export const EXPLORE_DOT_R = [0.3 * (1 - 0.4 * 0.44), 0.3 * (1 - 0.4 * 0.88)] as const;

// One piece as a VIS item: T0 = (VIS, c0, c1, f0), T1 = (f1, tips, -, -);
// tips: bit 1 = the low end (f0) is a frontier, bit 2 = the high end.
export function visItem(p: ExplorePiece): number[] {
  const tips = (p.tip0 ? 1 : 0) | (p.tip1 ? 2 : 0);
  return [EXPLORE_ITEM_VIS, p.c0, p.c1, p.f0, p.f1, tips, 0, 0];
}

// The unwrapped ctrl range a piece can make visible (its slot references
// must cover it).
export function visRange(p: ExplorePiece): [number, number] {
  return [p.c0 - p.f0, p.c1 + p.f1];
}

// Whether a chain's pieces cover every point of it at full visibility
// (the whole-chain flag). Conservative: merges solid intervals only, with
// half pieceVis's 1e-3 end tolerance. `n` = the chain's ctrl count;
// rings compare modulo n, open chains span [0, n - 1].
export function chainWhole(pieces: readonly ExplorePiece[], n: number, closed: boolean): boolean {
  const iv: [number, number][] = [];
  for (const p of pieces) {
    if (p.c1 < p.c0) continue;
    if (closed) {
      if (p.c1 - p.c0 >= n) return true;
      const sh = n * Math.floor(p.c0 / n);
      const a = p.c0 - sh;
      const b = p.c1 - sh;
      if (b <= n) iv.push([a, b]);
      else {
        iv.push([a, n]);
        iv.push([0, b - n]);
      }
    } else {
      iv.push([p.c0, p.c1]);
    }
  }
  if (iv.length === 0) return false;
  iv.sort((x, y) => x[0] - y[0]);
  const lo = 0;
  const hi = closed ? n : n - 1;
  if (iv[0][0] > lo + 5e-4) return false;
  let reach = iv[0][1];
  for (let i = 1; i < iv.length; i++) {
    if (iv[i][0] > reach + 5e-4) return false;
    if (iv[i][1] > reach) reach = iv[i][1];
  }
  return reach >= hi - 5e-4;
}

// K268 THE SHAPED CUT'S CLASSIFIER (docs/design/K268.md, "Stage 1 design"):
// what the over thread's visibility does across one gap slot's FOOTPRINT,
// the arc range [aLo, aHi] its polyline spans on the over chain, and the
// ramps that reproduce it when one or two piece ends lie inside.
// - hidden: no piece reaches the footprint; solid: one piece's solid part
//   covers it (or the chain is whole); both take 2b's scalar.
// - shaped: one or two ends inside; one piece's two ends combine by MIN,
//   ends of different pieces (or ring copies) by best-of (MAX).
// - fallback: more than two ends (2b's scalar; counted).
// `arc(c)` maps an unwrapped over-chain ctrl into the polyline's frame
// (increasing; rings add the total per lap, open chains extend linearly).
// A ring piece is tried at the copies k - 1, k, k + 1 nearest the over pass,
// each a separate piece. An open chain's terminal never matters (no thread
// lies beyond it). `approx`: a ramp kept one of several interior knots.
export type ExploreCutKind = "hidden" | "solid" | "shaped" | "fallback";
export interface ExploreCut {
  kind: ExploreCutKind;
  shape: GapShape | null;
  approx: boolean;
}
const CUT_SOLID: ExploreCut = { kind: "solid", shape: null, approx: false };
const CUT_HIDDEN: ExploreCut = { kind: "hidden", shape: null, approx: false };
const CUT_FALLBACK: ExploreCut = { kind: "fallback", shape: null, approx: false };
// Arc tolerance: an end within it of the footprint's edge does not matter.
const CUT_ARC_EPS = 1e-4;
// A hard end (or a fade of no arc): a step of this signed length.
const CUT_HARD_F = 1e-6;

export function classifyExploreCut(
  pieces: readonly ExplorePiece[],
  whole: boolean,
  n: number,
  closed: boolean,
  overCtrl: number,
  aLo: number,
  aHi: number,
  arc: (c: number) => number,
  k2b: number
): ExploreCut {
  if (whole) return CUT_SOLID;
  const ramps: GapRamp[] = [];
  let copies = 0;
  let approx = false;
  // The ramp of the end at ctrl cS whose fade of length `fade` runs to
  // cS + dir * fade: dir -1 for a piece's LOW end (hidden below), +1 for its
  // high end. The side is passed, never read off a signed fade: a hard low
  // end's fade is -0, which reads as the high side (K268 stage 2: two walked
  // runs meeting at a vertex inside a footprint both cut only below it, so
  // crossing 275's threads fused). The fade is linear in ctrl and the arc
  // map piecewise linear with knots at integer ctrls, so one interior knot
  // makes it exact.
  const ramp = (cS: number, fade: number, dir: -1 | 1, front: boolean): GapRamp => {
    const aS = arc(cS);
    const f = Math.abs(fade);
    if (f <= 1e-4) return { aS, F: dir * CUT_HARD_F, dK: 1, tK: 1, front };
    const fs = dir * f;
    let F = arc(cS + fs) - aS;
    if (Math.abs(F) < CUT_HARD_F) F = dir * CUT_HARD_F;
    let dK = 1;
    let tK = 1;
    let knots = 0;
    const end = cS + fs;
    for (let m = dir > 0 ? Math.floor(cS) + 1 : Math.ceil(cS) - 1; dir > 0 ? m < end - 1e-6 : m > end + 1e-6; m += dir) {
      const tm = Math.abs(m - cS) / f;
      if (tm <= 1e-6) continue;
      knots++;
      if (knots === 1 || Math.abs(tm - 0.5) < Math.abs(tK - 0.5)) {
        tK = tm;
        dK = (arc(m) - aS) / F;
      }
    }
    if (knots > 1) approx = true;
    return { aS, F, dK, tK, front };
  };
  for (const p of pieces) {
    if (p.c1 < p.c0) continue;
    let k0 = 0;
    let k1 = 0;
    if (closed) {
      const k = Math.round((overCtrl - 0.5 * (p.c0 + p.c1)) / n);
      k0 = k - 1;
      k1 = k + 1;
    }
    for (let k = k0; k <= k1; k++) {
      const c0 = p.c0 + k * n;
      const c1 = p.c1 + k * n;
      if (arc(c1 + p.f1) <= aLo || arc(c0 - p.f0) >= aHi) continue;
      const lowIn = arc(c0) > aLo + CUT_ARC_EPS && (closed || c0 > 1e-3);
      const highIn = arc(c1) < aHi - CUT_ARC_EPS && (closed || c1 < n - 1 - 1e-3);
      if (!lowIn && !highIn) return CUT_SOLID;
      copies++;
      if (lowIn) ramps.push(ramp(c0, p.f0, -1, p.tip0));
      if (highIn) ramps.push(ramp(c1, p.f1, 1, p.tip1));
    }
  }
  if (ramps.length === 0) return CUT_HIDDEN;
  if (ramps.length > 2) return CUT_FALLBACK;
  return { kind: "shaped", shape: { k2b, ramps, max: copies > 1 }, approx };
}

// An over chain's arc map in a slot polyline's frame (classifyExploreCut's
// `arc`): a(c) = overArc + U(c) - U(overCtrl), U the unwrapped arc of an
// unwrapped ctrl through the control points' arcs `cal` (cal[0] = 0). Rings
// add `total` per lap; open chains run linearly beyond their two terminals
// (the end segments' slopes: a fade past a terminal maps to no thread).
export function exploreArcMap(
  cal: ArrayLike<number>,
  total: number,
  closed: boolean,
  overCtrl: number,
  overArc: number
): (c: number) => number {
  const n = cal.length;
  const U = (c: number): number => {
    if (n < 2) return 0;
    if (closed) {
      const fi = Math.floor(c);
      const lap = Math.floor(fi / n);
      const i = fi - lap * n;
      const a0 = cal[i];
      const a1 = i + 1 < n ? cal[i + 1] : total;
      return lap * total + a0 + (a1 - a0) * (c - fi);
    }
    if (c <= 0) return cal[0] + (cal[1] - cal[0]) * c;
    if (c >= n - 1) return cal[n - 1] + (cal[n - 1] - cal[n - 2]) * (c - (n - 1));
    const i = Math.floor(c);
    return cal[i] + (cal[i + 1] - cal[i]) * (c - i);
  };
  const base = overArc - U(overCtrl);
  return (c: number): number => base + U(c);
}

// Declarations: the mode's uniform, the item type and kExploreAt. Needs
// PAINT_DATA_GLSL (kP, KChain) before it. kExploreAt returns the point's
// visibility, and its globals describe the FRONTIER fade the point lies in
// for the end-marker looks: kExTip = progress 0 -> 1 through it (-1 when
// none), kExSolid = the ctrl where it starts, kExEnd = the ctrl where it
// ends (K397: the dots fit the fade) and kExX = the point's ctrl, all
// unwrapped toward the piece. Line-for-line twin: paint_math.ts
// kExploreAt (and pieceVis / chainVis in explore_view.ts). The arm strips'
// variant (K268 stage 2, arm_strip.ts withExploreStrip) needs only this
// part; the section variant takes EXPLORE_DECL_GLSL, which starts with it.
export const EXPLORE_VIS_GLSL = /* glsl */ `
// K76 THREAD REVEAL: (on, look, breath, threadWidth); on is 2 under High
// contrast (stage 2d), so every test of it is > 0.5.
uniform vec4 uKExplore;
const int PI_VIS = ${EXPLORE_ITEM_VIS};
highp float kExTip;
highp float kExSolid;
highp float kExEnd;
highp float kExX;
highp float kExploreAt(KChain c, highp float ctrl) {
  kExTip = -1.0;
  kExSolid = 0.0;
  kExEnd = 0.0;
  kExX = ctrl;
  if (kP(c.ch).x > 0.5) return 1.0;
  int n = c.nCtrl;
  highp float nf = float(n);
  int sl = clamp(int(floor(ctrl)), 0, n - 1);
  highp vec4 I = kP(c.idx + sl);
  int first = int(I.x + 0.5);
  int cnt = int(I.y + 0.5);
  int refBase = int(uKPaint.y + 0.5);
  int itemBase = int(uKPaint.z + 0.5);
  highp float best = 0.0;
  for (int k = 0; k < 32; k++) {
    if (k >= cnt) break;
    int r = first + k;
    highp vec4 rt = kP(refBase + (r >> 2));
    int j = r & 3;
    int item = int((j == 0 ? rt.x : j == 1 ? rt.y : j == 2 ? rt.z : rt.w) + 0.5);
    highp vec4 T0 = kP(itemBase + 2 * item);
    if (int(T0.x + 0.5) != PI_VIS) continue;
    highp vec4 T1 = kP(itemBase + 2 * item + 1);
    highp float c0 = T0.y;
    highp float c1 = T0.z;
    int tips = int(T1.y + 0.5);
    highp float x = ctrl;
    if (c.closed) x += nf * floor((0.5 * (c0 + c1) - x) / nf + 0.5);
    highp float v = 1.0;
    highp float u = -1.0;
    highp float cs = 0.0;
    highp float ce = 0.0;
    if (x < c0 - 1e-3) {
      if (T0.w <= 1e-4) continue;
      highp float t = min(1.0, (c0 - x) / T0.w);
      v = 1.0 - t * t * (3.0 - 2.0 * t);
      if ((tips & 1) != 0) { u = t; cs = c0; ce = c0 - T0.w; }
    } else if (x > c1 + 1e-3) {
      if (T1.x <= 1e-4) continue;
      highp float t = min(1.0, (x - c1) / T1.x);
      v = 1.0 - t * t * (3.0 - 2.0 * t);
      if ((tips & 2) != 0) { u = t; cs = c1; ce = c1 + T1.x; }
    }
    if (v > best || (v == best && u < 0.0)) {
      best = v;
      kExTip = u;
      kExSolid = cs;
      kExEnd = ce;
      kExX = x;
    }
  }
  return best;
}
// K290 (burn stage 3a): how charred a chain point is, 0..1: the CHAR items
// (burnt stretches, unwrapped ctrls) its slot references, each a linear
// ramp of EXPLORE_CHAR_EDGE ctrl centered on either end, summed (abutting
// spans make exactly 1 at their shared end). Only chains whose KPAINT flag
// .y is set scan. No CPU twin (K152 item 3).
const int PI_CHAR = ${EXPLORE_ITEM_CHAR};
// K290 stage 3b: the same scan reads the FRONT items (the char band ahead of
// a front joins the sum; the ember's glow, the max over fronts, goes to
// kFireEmber) and the SMOLDER items (kFireSmolder, 1 on a smoldering arm's
// stretch, ramped at its ends like char).
const int PI_FRONT = ${EXPLORE_ITEM_FRONT};
const int PI_SMOLDER = ${EXPLORE_ITEM_SMOLDER};
highp float kFireEmber;
highp float kFireSmolder;
highp float kCharAt(KChain c, highp float ctrl) {
  kFireEmber = 0.0;
  kFireSmolder = 0.0;
  if (kP(c.ch).y < 0.5) return 0.0;
  int n = c.nCtrl;
  highp float nf = float(n);
  int sl = clamp(int(floor(ctrl)), 0, n - 1);
  highp vec4 I = kP(c.idx + sl);
  int first = int(I.x + 0.5);
  int cnt = int(I.y + 0.5);
  int refBase = int(uKPaint.y + 0.5);
  int itemBase = int(uKPaint.z + 0.5);
  highp float sum = 0.0;
  for (int k = 0; k < 32; k++) {
    if (k >= cnt) break;
    int r = first + k;
    highp vec4 rt = kP(refBase + (r >> 2));
    int j = r & 3;
    int item = int((j == 0 ? rt.x : j == 1 ? rt.y : j == 2 ? rt.z : rt.w) + 0.5);
    highp vec4 T0 = kP(itemBase + 2 * item);
    int ty = int(T0.x + 0.5);
    if (ty == PI_FRONT) {
      highp float x = ctrl;
      if (c.closed) x += nf * floor((T0.y - x) / nf + 0.5);
      // s > 0 on the unburnt side.
      highp float s = (x - T0.y) * T0.z;
      if (T0.w < 0.5) {
        sum += (1.0 - smoothstep(0.0, ${glslF(EXPLORE_FRONT_BAND)}, s)) *
          clamp(s * ${glslF(1 / EXPLORE_CHAR_EDGE)} + 0.5, 0.0, 1.0);
      }
      highp float e = s >= 0.0
        ? 1.0 - smoothstep(0.0, ${glslF(EXPLORE_EMBER_AHEAD)}, s)
        : 1.0 - smoothstep(0.0, ${glslF(EXPLORE_EMBER_BEHIND)}, -s);
      kFireEmber = max(kFireEmber, e);
      continue;
    }
    if (ty != PI_CHAR && ty != PI_SMOLDER) continue;
    highp float c0 = T0.y;
    highp float c1 = T0.z;
    highp float x = ctrl;
    if (c.closed) x += nf * floor((0.5 * (c0 + c1) - x) / nf + 0.5);
    highp float cr = clamp((x - c0) * ${glslF(1 / EXPLORE_CHAR_EDGE)} + 0.5, 0.0, 1.0) *
      clamp((c1 - x) * ${glslF(1 / EXPLORE_CHAR_EDGE)} + 0.5, 0.0, 1.0);
    if (ty == PI_CHAR) sum += cr;
    else kFireSmolder = max(kFireSmolder, cr);
  }
  return min(sum, 1.0);
}
// K290 stage 3b: the ember over a composed (charred) thread color; core =
// the centerline's coverage (0 in the arm strips, which have no across).
vec3 kEmberLook(vec3 rgb, highp float e, highp float core) {
  rgb = mix(rgb, ${glslV3(EXPLORE_EMBER_RGB)}, ${glslF(EXPLORE_EMBER_ALPHA)} * e);
  return mix(rgb, ${glslV3(EXPLORE_EMBER_CORE_RGB)}, e * e * e * core);
}
// K290: the char look over a composed thread color; ash = the centerline
// core's coverage (0 off the ribbon, as in the arm strips).
vec3 kCharLook(vec3 rgb, highp float ch, highp float ash) {
  rgb = mix(rgb, ${glslV3(EXPLORE_CHAR_RGB)}, ${glslF(EXPLORE_CHAR_ALPHA)} * ch);
  return mix(rgb, ${glslV3(EXPLORE_ASH_RGB)}, ${glslF(EXPLORE_ASH_ALPHA)} * ash * ch);
}
`;

// The end looks and the shaped cut's coverage (K268), which need kSmooth,
// uKExplore and the gap library's uGapData. The section variant declares
// them after the visibility (EXPLORE_DECL_GLSL); the fans and the still
// pluck, which have no visibility of their own, through exploreGapEdits.
export const EXPLORE_LOOK_GLSL = /* glsl */ `// The end look's coverage at a point of a FRONTIER fade: u = progress 0 -> 1
// through it (< 0: not in a frontier fade), s = world arc from the solid end,
// lf = the fade's world arc length (K397), lat = vUV.y - 0.5 (0 on the
// centerline), sideFw = vUV.y per pixel. Returns
// v itself for the fade and halo looks and outside a frontier. The glow
// look's tint is the caller's (it colors the thread; it is not coverage).
// Shared by the thread (main) and the shaped cut (K268). CPU twin:
// paint_math.ts kExploreLookCpu. K76 stage 2d (question 9): under High
// contrast (uKExplore.x 2) the dots draw at full strength, and kExDot says
// whether the point's nearest shape is a dot (1) or the cap (0; 0 in every
// other look), which main paints pure white.
highp float kExDot;
// K397 THE DOTS' SHAPE (Levi's call (c)): the signed world distance from a
// point of a frontier fade (s along from the solid end, la across, lf the
// fade's length) to the nearest of the cap (half an ellipse, 0.5 tw across
// and 0.5 tw g along) and two dots at EXPLORE_DOT_AT of the fade, radii
// EXPLORE_DOT_R tw g; g = min(1, lf / (EXPLORE_DOTS_SPAN tw)) fits them in.
// Sets kExDot. Used by the thread's look and the dots' cut. CPU twin:
// paint_math.ts kExDotsSdCpu.
highp float kExDotsSd(highp float s, highp float la, highp float lf) {
  highp float tw = uKExplore.w;
  highp float g = clamp(lf / (${glslF(EXPLORE_DOTS_SPAN)} * tw), 1e-3, 1.0);
  highp float ca = 0.5 * tw * g;
  highp float cb = 0.5 * tw;
  highp float k0 = length(vec2(s / ca, la / cb));
  highp float k1 = length(vec2(s / (ca * ca), la / (cb * cb)));
  highp float dCap = k1 > 1e-6 ? k0 * (k0 - 1.0) / k1 : -ca;
  highp float dDot = min(
    length(vec2(s - ${glslF(EXPLORE_DOT_AT[0])} * lf, la)) - ${glslF(EXPLORE_DOT_R[0])} * tw * g,
    length(vec2(s - ${glslF(EXPLORE_DOT_AT[1])} * lf, la)) - ${glslF(EXPLORE_DOT_R[1])} * tw * g);
  kExDot = dDot < dCap ? 1.0 : 0.0;
  return min(dCap, dDot);
}
highp float kExploreLook(int look, highp float v, highp float u, highp float s,
    highp float lf, highp float lat, highp float sideFw, highp float pxW) {
  kExDot = 0.0;
  if (u < 0.0 || look < 2) return v;
  highp float tw = uKExplore.w;
  if (look == 2) {
    // GLOW: the alpha fade starts later so the highlight reads.
    return 1.0 - kSmooth((u - 0.4) / 0.6);
  }
  if (look == 4) {
    // FRAY: the thread unravels into three thinning fibers that fade.
    highp float fl = lat * 2.0;
    highp float cov = 0.0;
    for (int i = -1; i <= 1; i++) {
      highp float fi = float(i);
      highp float cf = fi * (0.5 + 0.3 * u) + 0.12 * u * sin(s * 7.0 + fi * 2.1);
      highp float wf = mix(0.34, 0.1, u);
      cov = max(cov, clamp((wf - abs(fl - cf)) / max(4.0 * sideFw, 1e-4) + 0.5, 0.0, 1.0));
    }
    cov = mix(1.0, cov, kSmooth(u / 0.12));
    return cov * (1.0 - kSmooth((u - 0.5) / 0.5));
  }
  // DOTS (3) and BEACON (5, plus its halo sprite): the solid thread ends in
  // a cap, then two dots that fade (K397: always two, sized to the fade).
  highp float dd = kExDotsSd(s, lat * tw, lf);
  return clamp(-dd / pxW + 0.5, 0.0, 1.0) * (uKExplore.x > 1.5 ? 1.0 : 1.0 - 0.55 * u * u);
}
// K268 THE SHAPED CUT: the over thread's coverage at its chain arc A (the
// slot polyline's frame), from the slot's profile texels (gap_mask.ts
// GAP_PROF_BASE): up to two ramps R = [aS, F, dK, tK] (the solid end's arc,
// the fade's signed arc length, one interior knot of the ctrl-linear fade),
// combined by MIN (one piece's two ends) or best-of (two pieces: kExploreAt's
// rule, ties preferring the solid one), with the end look at a frontier on
// the centerline (lat 0). CPU twin: paint_math.ts exploreCutCoverCpu.
// K397 THE DOTS' CUT: in the dots and beacon looks a frontier fade cuts by
// the dots' own shape, at the fragment's own distance lat from the over
// centerline. The cover is then only the look's strength, kExCutOn is set
// and kExCutSd holds kExDotsSd there, and gapKeepAt measures its casing
// from that shape (EXPLORE_GAP_SHAPE_GLSL): a disc of radius r + casing
// around each dot and the cap's half ellipse plus casing, also past the
// fade's end (t 1), where the second dot's casing reaches.
bool kExCutOn;
highp float kExCutSd;
// K268 FAR-BRANCH (stage 2 item 2, last part): a shaped slot's per-branch
// state for the vis-weighted far-branch blend (below, at gapKeepAt's
// smooth-min). exCoverNear / exStrength are the near branch's coverage and
// the slot's clock strength (gst = exStrength * exCoverNear, set by
// EXPLORE_GAP_CUT); exBlendCut / exFarOn carry the blended weighted cut
// the keep line then applies instead of the near branch's own.
highp float exCoverNear;
highp float exStrength;
highp float exBlendCut;
bool exFarOn;
// The geometric cut (casing + fade + window-end ramp, times inWinInFoot;
// a fan adds its silhouette) at centerline distance dv, with gapKeepAt's
// own margin / fadeP / winM / fade at the near point. Monotone
// non-increasing in dv. Used only by the far-branch blend.
highp float exCutAtDist(highp float dv, highp float hOv, highp float marg,
    highp float fadePv, highp float pxWv, highp float winMv,
    highp float fadeRaw, highp float inWF, bool isFan) {
  highp float e = dv - hOv - marg;
  highp float k = clamp((e + 0.5 * pxWv) / max(fadePv, pxWv), 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  highp float fs = clamp(winMv / max(0.5 * fadeRaw, pxWv), 0.0, 1.0);
  fs = mix(1.0, fs * fs * (3.0 - 2.0 * fs), clamp(e / pxWv, 0.0, 1.0));
  highp float c = (1.0 - k) * inWF * fs;
  if (isFan) c = max(c, 1.0 - clamp((dv - hOv + pxWv) / pxWv + 0.5, 0.0, 1.0));
  return c;
}
highp float exploreCutCover(int row, int fl, highp float A, highp float lat, highp float pxW) {
  kExCutOn = false;
  int look = int(uKExplore.y + 0.5);
  bool dots = look == 3 || look == 5;
  bool mx = (fl & ${GAP_PROF_MAX}) != 0;
  highp float best = mx ? -1.0 : 2.0;
  highp float bu = -1.0;
  highp float bs = 0.0;
  highp float bf = 0.0;
  for (int r = 0; r < 2; r++) {
    if ((fl & (${GAP_PROF_R0} << r)) == 0) continue;
    highp vec4 R = texelFetch(uGapData, ivec2(${GAP_PROF_BASE} + r, row), 0);
    highp float d = (A - R.x) / R.y;
    highp float v = 1.0;
    highp float u = -1.0;
    if (d > 0.0) {
      highp float t = d < R.z
        ? d * (R.w / R.z)
        : R.w + (d - R.z) * ((1.0 - R.w) / max(1.0 - R.z, 1e-6));
      t = min(t, 1.0);
      v = 1.0 - t * t * (3.0 - 2.0 * t);
      if ((t < 1.0 || dots) && (fl & (${GAP_PROF_F0} << r)) != 0) u = t;
    }
    if (mx ? (v > best || (v == best && u < 0.0)) : v < best) {
      best = v;
      bu = u;
      bs = abs(A - R.x);
      bf = abs(R.y);
    }
  }
  if (best > 1.0) return 1.0;
  if (best < 0.0) return 0.0;
  if (dots && bu >= 0.0) {
    kExCutOn = true;
    kExCutSd = kExDotsSd(bs, lat, bf);
    return uKExplore.x > 1.5 ? 1.0 : 1.0 - 0.55 * bu * bu;
  }
  return kExploreLook(look, best, bu, bs, bf, 0.0,
    pxW / max(uKExplore.w, 1e-6), pxW);
}
`;

// The section variant's declarations: the visibility above, then the end
// looks and the shaped cut's coverage.
export const EXPLORE_DECL_GLSL = EXPLORE_VIS_GLSL + EXPLORE_LOOK_GLSL;

// K268: the shaped cut inside gapKeepAt (explore program only). A ribbon
// slot with the SHAPED bit searches without the early stop inside the
// silhouette (the projection must be the true nearest point)...
export const EXPLORE_GAP_SURE_GLSL = /* glsl */ `    bool exShaped = full && !fan && (fl & ${GAP_FLAG_SHAPED}) != 0 && uKExplore.x > 0.5;
    exFarOn = false;
    if (exShaped) sure2 = 0.0;
`;
// ...and cuts by the over thread's coverage at the nearest point's chain
// arc (texel 4's polyline parameterization, as self-exclusion uses it), at
// the fragment's own distance from the over centerline (K397: the dots'
// cut is shaped across the thread too; best is the true nearest squared
// distance, since sure2 is 0).
export const EXPLORE_GAP_CUT_GLSL = /* glsl */ `    if (exShaped) {
      highp vec4 exT4 = texelFetch(uGapData, ivec2(4, row), 0);
      highp vec4 exT9 = texelFetch(uGapData, ivec2(9, row), 0);
      highp vec2 exP0 = gapOverPt(exT4, exT9, bk);
      highp vec2 exP1 = gapOverPt(exT4, exT9, bk + 1);
      highp vec2 exAb = exP1 - exP0;
      highp float exBl = dot(exAb, exAb);
      highp float exBt = exBl > 1e-12 ? clamp(dot(p - exP0, exAb) / exBl, 0.0, 1.0) : 0.0;
      highp float exA = (exT4.z + (float(bk) + exBt) * exT9.x) * exT4.w;
      highp vec4 exP2 = texelFetch(uGapData, ivec2(${GAP_PROF_BASE + 2}, row), 0);
      exCoverNear = exploreCutCover(row, int(exP2.y + 0.5), exA, sqrt(best), pxW);
      exStrength = gapStrength(exP2.x);
      gst = exStrength * exCoverNear;
      if (gst <= 0.0) continue;
    }
`;

// K268 stage 2: the same cut in a fan (the junction field and free-tip caps,
// turn < -0.5). The search also runs without the early stop, and the fan
// re-applies master's inside-silhouette branch once the shaped strength is
// known: with sure2 0 the search finds the true nearest point, so best <
// exSure2 is master's condition exactly. (A ribbon has no such branch to
// keep: its shaped cut replaces it, as stage 1 built.) K397: not where the
// dots' shape cuts (kExCutOn): there the silhouette is the dots' shape,
// which the fan's own silhouette cut reads through d.
export const EXPLORE_FAN_SURE_GLSL = /* glsl */ `    bool exShaped = (fl & ${GAP_FLAG_SHAPED}) != 0 && uKExplore.x > 0.5;
    exFarOn = false;
    highp float exSure2 = sure2;
    if (exShaped) sure2 = 0.0;
`;
export const EXPLORE_FAN_CUT_GLSL = EXPLORE_GAP_CUT_GLSL.replace(
  "      if (gst <= 0.0) continue;\n",
  "      if (gst <= 0.0) continue;\n" +
    "      if (best < exSure2 && !kExCutOn) {\n" +
    "        keep = min(keep, 1.0 - (full ? inWin * inFoot : 1.0) * gst);\n" +
    "        continue;\n" +
    "      }\n",
);

// The variant's main, before the gap mask: the visibility multiplies the
// alpha; in a FRONTIER fade the look reshapes it. Debug view 6 (probes,
// uKBase.z): (raw visibility, frontier progress, shaped visibility).
export const EXPLORE_MAIN_GLSL = /* glsl */ `
  if (exHere) {
    highp float evRaw = kExploreAt(kc, kctrl);
    highp float ev = evRaw;
    int look = int(uKExplore.y + 0.5);
    if (kExTip >= 0.0 && look >= 2) {
      highp float u = kExTip;
      if (look == 2) {
        // GLOW: the end brightens, then dissolves (kExploreLook).
        highp float g = kSmooth(u / 0.3) * (1.0 - kSmooth((u - 0.55) / 0.45));
        rgb = mix(rgb, vec3(${EXPLORE_GLOW_RGB.join(", ")}), 0.85 * g * uKExplore.z);
      }
      highp float exS = 0.0;
      highp float exLf = 0.0;
      if (look != 2) {
        highp float exA0 = kArcU(kc, kExSolid);
        exS = abs(kArcU(kc, kExX) - exA0);
        exLf = abs(kArcU(kc, kExEnd) - exA0);
      }
      ev = kExploreLook(look, evRaw, u, exS, exLf, vUV.y - 0.5, kSideFw, pxW);
      // K76 stage 2d: High contrast paints the dots pure white (the cap keeps
      // the thread's color; char still darkens a burnt dot, below).
      if (uKExplore.x > 1.5) rgb = mix(rgb, vec3(1.0), kExDot);
    }
    if (uKBase.z > 5.5) {
      finalColor = vec4(evRaw, kExTip >= 0.0 ? kExTip : 0.0, ev, 1.0);
      return;
    }
    // K290: burnt thread under the char look.
    highp float exCh = kCharAt(kc, kctrl);
    if (exCh > 0.0) {
      highp float exAsh = clamp((${glslF(EXPLORE_ASH_HALF)} - abs(vUV.y - 0.5)) / max(kSideFw, 1e-4) + 0.5, 0.0, 1.0);
      rgb = kCharLook(rgb, exCh, exAsh);
    }
    // K290 stage 3b: the fire front's ember and a smoldering arm's hot line
    // (kCharAt set both), under the gaps like the char.
    if (kFireEmber > 0.0) {
      highp float exCore = clamp((${glslF(EXPLORE_EMBER_CORE_HALF)} - abs(vUV.y - 0.5)) / max(kSideFw, 1e-4) + 0.5, 0.0, 1.0);
      rgb = kEmberLook(rgb, kFireEmber, exCore);
    }
    if (kFireSmolder > 0.0) {
      highp float exLine = clamp((${glslF(EXPLORE_SMOLDER_HALF)} - abs(vUV.y - 0.5)) / max(kSideFw, 1e-4) + 0.5, 0.0, 1.0);
      rgb = mix(rgb, ${glslV3(EXPLORE_SMOLDER_RGB)}, ${glslF(EXPLORE_SMOLDER_ALPHA)} * kFireSmolder * exLine);
    }
    aM *= ev;
    if (aM <= 0.002) discard;
  }
`;

// K397: in the dots and beacon looks a shaped slot's casing is measured from
// the dots' shape (exploreCutCover set kExCutOn and kExCutSd), not from the
// over centerline: d - hO is the shape's signed distance, so the casing
// (margin) and its fade ring each dot and the cap. hO is the over
// half-width, the cap's half-width, so the cap meets the solid side's
// casing at the solid end. Inserted before the casing's distance, after the
// far-branch smooth-min, in every program that takes the shaped cut.
export const EXPLORE_GAP_SHAPE_GLSL = "    if (exShaped && kExCutOn) d = hO + kExCutSd;\n";

// K268 FAR-BRANCH (stage 2 item 2, last part): master's smooth-min blends
// the two branches' DISTANCES (d = smin(d, d2)), then the shaped cut
// multiplies by the NEAR branch's coverage alone - so it dips toward a
// hidden far branch (a ghost) and loses a shown far branch behind a
// hidden near one. The explore programs instead blend the VIS-WEIGHTED
// CUTS: each branch's geometric cut times its own coverage at its own
// projection, combined by farBlendCut (the smooth-min's rounding dip
// survives only in proportion to the visibility both branches share, so
// equal coverages reproduce master's blended cut exactly and a hidden
// branch contributes nothing). The dots' shape (kExCutOn) already
// replaces d past this point, so it keeps master's path. Only the
// explore programs carry this (master's gap text and cost untouched).
export const EXPLORE_FAR_ANCHOR_GLSL = `        if (bk2 >= 0) {
          highp float d2 = sqrt(best2);
          highp float hb = clamp(0.5 + 0.5 * (d2 - d) / sk, 0.0, 1.0);
          d = mix(d2, d, hb) - sk * hb * (1.0 - hb);
        }
`;
export const EXPLORE_FAR_GLSL = `        if (bk2 >= 0) {
          highp float d2 = sqrt(best2);
          highp float hb = clamp(0.5 + 0.5 * (d2 - d) / sk, 0.0, 1.0);
          highp float dS = mix(d2, d, hb) - sk * hb * (1.0 - hb);
          if (exShaped && !kExCutOn) {
            highp vec2 exF0 = gapOverPt(t4, t9, bk2);
            highp vec2 exF1 = gapOverPt(t4, t9, bk2 + 1);
            highp vec2 exFab = exF1 - exF0;
            highp float exFbl = dot(exFab, exFab);
            highp float exFbt = exFbl > 1e-12 ? clamp(dot(p - exF0, exFab) / exFbl, 0.0, 1.0) : 0.0;
            highp float exA2 = (t4.z + (float(bk2) + exFbt) * t9.x) * t4.w;
            bool exSaveOn = kExCutOn;
            highp float exSaveSd = kExCutSd;
            highp float exCoverFar = exploreCutCover(row, fl, exA2, d2, pxW);
            kExCutOn = exSaveOn;
            kExCutSd = exSaveSd;
            highp float exGN = exCutAtDist(d, hO, margin, fadeP, pxW, winM, t8.y, inWin * inFoot, fan);
            highp float exGF = exCutAtDist(d2, hO, margin, fadeP, pxW, winM, t8.y, inWin * inFoot, fan);
            highp float exGS = exCutAtDist(dS, hO, margin, fadeP, pxW, winM, t8.y, inWin * inFoot, fan);
            exBlendCut = max(exCoverNear * exGN, exCoverFar * exGF)
              + min(exCoverNear, exCoverFar) * (exGS - max(exGN, exGF));
            exFarOn = true;
          } else {
            d = dS;
          }
        }
`;
// The keep line then applies the blended weighted cut (exBlendCut already
// carries each branch's coverage, so the strength is the clock's alone).
export const EXPLORE_KEEP_ANCHOR_GLSL = "    keep = min(keep, 1.0 - cut * gst);\n";
export const EXPLORE_KEEP_GLSL =
  "    if (exFarOn) { cut = exBlendCut; gst = exStrength; }\n" + EXPLORE_KEEP_ANCHOR_GLSL;

// K268 PROTECT (stage 2 item 2, the protect part): under the thread reveal
// a slot's protect waiver (gap_mask.ts PROTECT: A keeps its margin where
// it covers B) scales by B's visibility per side, which the CPU writes
// into spare gap texels (texel 3.x = neg, texel 9.w = pos; GapMaskTable
// setProtVis, solved at 1). Where B is hidden the waiver is gone and the
// casing stands with nothing beyond it; where B shows it stands as
// before. Only the explore programs carry the scaling (master's gap
// text and cost are untouched); fans never run it (protect is !fan).
export const EXPLORE_PROT_ANCHOR_GLSL = `        pr = max(pr, pi * gapProtCover(row,\n          ${GAP_PROT_NEG} + sd * 2, p, hO, pxW));\n`;
export const EXPLORE_PROT_GLSL = `        pr = max(pr, pi * gapProtCover(row,\n          ${GAP_PROT_NEG} + sd * 2, p, hO, pxW) * (sd == 0 ? t3.x : t9.w));\n`;

// The anchors withExplore inserts at (each must occur exactly once in the
// section fragment). The declarations go before gapKeepAt (K268: the shaped
// cut calls them), where the paint library and kSmooth are declared.
const ANCHOR_DECL =
  "highp float gapKeepAt(highp float pxW, highp vec2 p, highp float turn,";
const ANCHOR_SURE = "    highp float sure2 = sure > 0.0 ? sure * sure : 0.0;\n";
const ANCHOR_BK = "    if (bk < 0) continue; // Nothing of this slot within reach.\n";
const ANCHOR_MAIN = "void main(void) {\n  highp vec2 gfw = fwidth(vPos);";
const ANCHOR_PXARC =
  "highp float pxArc = (ksw.y < 0.5 * ksw.x ? ksw.y : ksw.x) * float(kc.count) * kc.arcPer;\n";
const ANCHOR_KCTRL =
  "highp float kctrl = fxHere || paintHere ? kCtrlNear(kc, kpt.x, kpt.y) : 0.0;";
const ANCHOR_GAP = "  float gk = gapKeep(pxW, gTurn);";
const ANCHOR_CASING = "    highp float e = d - hO - margin;\n";

// The far-branch blend's formula (EXPLORE_FAR_GLSL above), as a pure
// function the unit tests hold: the stronger branch's vis-weighted cut,
// plus the smooth-min's rounding dip (geomSmin past the nearer branch's
// geometric cut) scaled by the visibility both branches share. Equal
// coverages give coverage * geomSmin exactly (master's blended cut,
// weighted); a hidden branch (coverage 0) contributes nothing and adds
// no dip; the result never exceeds the shown branches' weighted cuts
// plus that shared dip, and never falls below the stronger of them.
export function farBlendCut(
  coverNear: number,
  geomNear: number,
  coverFar: number,
  geomFar: number,
  geomSmin: number
): number {
  const near = coverNear * geomNear;
  const far = coverFar * geomFar;
  return Math.max(near, far) + Math.min(coverNear, coverFar) * (geomSmin - Math.max(geomNear, geomFar));
}

// The shaped cut's edits to gapKeepAt in a program other than the section
// variant (K268 stage 2): the end looks before it, after `decl` (whatever the
// program lacks of uKExplore and kSmooth), the search without the early stop
// and the cut. A fan (the junction field) takes the fan texts; the still
// pluck draws a ribbon (turn >= 0, full), so it takes the ribbons' texts.
// Each [anchor, replacement] occurs exactly once in a fragment holding the
// gap library's text.
export function exploreGapEdits(fan: boolean, decl: string): [string, string][] {
  return [
    [ANCHOR_DECL, decl + EXPLORE_LOOK_GLSL + ANCHOR_DECL],
    [ANCHOR_SURE, ANCHOR_SURE + (fan ? EXPLORE_FAN_SURE_GLSL : EXPLORE_GAP_SURE_GLSL)],
    [ANCHOR_BK, ANCHOR_BK + (fan ? EXPLORE_FAN_CUT_GLSL : EXPLORE_GAP_CUT_GLSL)],
    // K320 stage 1: a fan's library carries no protect block (fans never
    // run it), so the fan edits have no protect anchor to scale.
    ...(fan ? [] : [[EXPLORE_PROT_ANCHOR_GLSL, EXPLORE_PROT_GLSL] as [string, string]]),
    [EXPLORE_FAR_ANCHOR_GLSL, EXPLORE_FAR_GLSL],
    [EXPLORE_KEEP_ANCHOR_GLSL, EXPLORE_KEEP_GLSL],
    [ANCHOR_CASING, EXPLORE_GAP_SHAPE_GLSL + ANCHOR_CASING],
  ];
}

// A fragment with [anchor, replacement] edits applied in order, each anchor
// occurring exactly once (`what` names the variant in the error).
export function applyEdits(
  frag: string,
  edits: ReadonlyArray<readonly [string, string]>,
  what: string,
): string {
  let s = frag;
  for (const [anchor, to] of edits) {
    const i = s.indexOf(anchor);
    if (i < 0 || s.indexOf(anchor, i + 1) >= 0) {
      throw new Error(`${what}: anchor not found exactly once: ${anchor.slice(0, 48)}`);
    }
    s = s.slice(0, i) + to + s.slice(i + anchor.length);
  }
  return s;
}

function once(src: string, anchor: string): number {
  const i = src.indexOf(anchor);
  if (i < 0 || src.indexOf(anchor, i + 1) >= 0) {
    throw new Error(`explore variant: anchor not found exactly once: ${anchor.slice(0, 48)}`);
  }
  return i;
}

// The explore variant of a section fragment (the master text with the
// declarations before gapKeepAt, the shaped cut in gapKeepAt's slot loop
// (K268), the side coordinate's derivative at the top of main - uniform
// control flow - the exact ctrl for every fragment while the mode is on,
// and the visibility before the gap mask). The fragment must hold the gap
// library's text (GAP_FRAG interpolated).
export function withExplore(frag: string): string {
  let s = frag;
  once(s, ANCHOR_MAIN);
  let i = once(s, ANCHOR_DECL);
  s = s.slice(0, i) + EXPLORE_DECL_GLSL + s.slice(i);
  i = once(s, ANCHOR_SURE) + ANCHOR_SURE.length;
  s = s.slice(0, i) + EXPLORE_GAP_SURE_GLSL + s.slice(i);
  i = once(s, ANCHOR_BK) + ANCHOR_BK.length;
  s = s.slice(0, i) + EXPLORE_GAP_CUT_GLSL + s.slice(i);
  i = once(s, EXPLORE_PROT_ANCHOR_GLSL);
  s = s.slice(0, i) + EXPLORE_PROT_GLSL + s.slice(i + EXPLORE_PROT_ANCHOR_GLSL.length);
  i = once(s, EXPLORE_FAR_ANCHOR_GLSL);
  s = s.slice(0, i) + EXPLORE_FAR_GLSL + s.slice(i + EXPLORE_FAR_ANCHOR_GLSL.length);
  i = once(s, EXPLORE_KEEP_ANCHOR_GLSL);
  s = s.slice(0, i) + EXPLORE_KEEP_GLSL + s.slice(i + EXPLORE_KEEP_ANCHOR_GLSL.length);
  i = once(s, ANCHOR_CASING);
  s = s.slice(0, i) + EXPLORE_GAP_SHAPE_GLSL + s.slice(i);
  i = once(s, ANCHOR_PXARC) + ANCHOR_PXARC.length;
  s = s.slice(0, i) + "  highp float kSideFw = fwidth(vUV.y);\n" + s.slice(i);
  i = once(s, ANCHOR_KCTRL);
  s =
    s.slice(0, i) +
    "bool exHere = uKExplore.x > 0.5;\n  " +
    "highp float kctrl = fxHere || paintHere || exHere ? kCtrlNear(kc, kpt.x, kpt.y) : 0.0;" +
    s.slice(i + ANCHOR_KCTRL.length);
  i = once(s, ANCHOR_GAP);
  s = s.slice(0, i) + EXPLORE_MAIN_GLSL + s.slice(i);
  return s;
}
