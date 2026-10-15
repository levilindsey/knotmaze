// K76 THREAD REVEAL, the shader side (stage 2a; design:
// docs/design/K76_reveal_mode.md sections 2.2, 3 and 9). Pure (no pixi):
// the vitest parity suite imports it.
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

// The VIS item type (T0.x). PAINT_ITEM uses 1-4.
export const EXPLORE_ITEM_VIS = 5;

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

// Declarations: the mode's uniform, the item type and kExploreAt. Needs
// PAINT_DATA_GLSL (kP, KChain) before it. kExploreAt returns the point's
// visibility, and its globals describe the FRONTIER fade the point lies in
// for the end-marker looks: kExTip = progress 0 -> 1 through it (-1 when
// none), kExSolid = the ctrl where it starts and kExX = the point's ctrl,
// both unwrapped toward the piece. Line-for-line twin: paint_math.ts
// kExploreAt (and pieceVis / chainVis in explore_view.ts).
export const EXPLORE_DECL_GLSL = /* glsl */ `
// K76 THREAD REVEAL: (on, look, breath, threadWidth).
uniform vec4 uKExplore;
const int PI_VIS = ${EXPLORE_ITEM_VIS};
highp float kExTip;
highp float kExSolid;
highp float kExX;
highp float kExploreAt(KChain c, highp float ctrl) {
  kExTip = -1.0;
  kExSolid = 0.0;
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
    if (x < c0 - 1e-3) {
      if (T0.w <= 1e-4) continue;
      highp float t = min(1.0, (c0 - x) / T0.w);
      v = 1.0 - t * t * (3.0 - 2.0 * t);
      if ((tips & 1) != 0) { u = t; cs = c0; }
    } else if (x > c1 + 1e-3) {
      if (T1.x <= 1e-4) continue;
      highp float t = min(1.0, (x - c1) / T1.x);
      v = 1.0 - t * t * (3.0 - 2.0 * t);
      if ((tips & 2) != 0) { u = t; cs = c1; }
    }
    if (v > best || (v == best && u < 0.0)) {
      best = v;
      kExTip = u;
      kExSolid = cs;
      kExX = x;
    }
  }
  return best;
}
`;

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
      highp float tw = uKExplore.w;
      if (look == 2) {
        // GLOW: the end brightens, then dissolves (the alpha fade starts
        // later so the highlight reads).
        highp float g = kSmooth(u / 0.3) * (1.0 - kSmooth((u - 0.55) / 0.45));
        rgb = mix(rgb, vec3(${EXPLORE_GLOW_RGB.join(", ")}), 0.85 * g * uKExplore.z);
        ev = 1.0 - kSmooth((u - 0.4) / 0.6);
      } else if (look == 4) {
        // FRAY: the thread unravels into three thinning fibers that fade.
        highp float s = abs(kArcU(kc, kExX) - kArcU(kc, kExSolid));
        highp float lat = (vUV.y - 0.5) * 2.0;
        highp float cov = 0.0;
        for (int i = -1; i <= 1; i++) {
          highp float fi = float(i);
          highp float cf = fi * (0.5 + 0.3 * u) + 0.12 * u * sin(s * 7.0 + fi * 2.1);
          highp float wf = mix(0.34, 0.1, u);
          cov = max(cov, clamp((wf - abs(lat - cf)) / max(4.0 * kSideFw, 1e-4) + 0.5, 0.0, 1.0));
        }
        cov = mix(1.0, cov, kSmooth(u / 0.12));
        ev = cov * (1.0 - kSmooth((u - 0.5) / 0.5));
      } else {
        // DOTS (3) and BEACON (5, plus its halo sprite): the solid thread
        // ends in a round cap and goes on as a dotted line that shrinks
        // and fades.
        highp float s = abs(kArcU(kc, kExX) - kArcU(kc, kExSolid));
        highp float sp = 0.95 * tw;
        highp float lat = (vUV.y - 0.5) * tw;
        highp float dCap = length(vec2(s, lat)) - 0.5 * tw;
        highp float kk = max(1.0, floor(s / sp + 0.5));
        highp float dDot = length(vec2(s - kk * sp, lat)) - 0.3 * tw * (1.0 - 0.4 * u);
        highp float dd = min(dCap, dDot);
        ev = clamp(-dd / pxW + 0.5, 0.0, 1.0) * (1.0 - 0.55 * u * u);
      }
    }
    if (uKBase.z > 5.5) {
      finalColor = vec4(evRaw, kExTip >= 0.0 ? kExTip : 0.0, ev, 1.0);
      return;
    }
    aM *= ev;
    if (aM <= 0.002) discard;
  }
`;

// The anchors withExplore inserts at (each must occur exactly once in the
// section fragment).
const ANCHOR_MAIN = "void main(void) {\n  highp vec2 gfw = fwidth(vPos);";
const ANCHOR_PXARC =
  "highp float pxArc = (ksw.y < 0.5 * ksw.x ? ksw.y : ksw.x) * float(kc.count) * kc.arcPer;\n";
const ANCHOR_KCTRL =
  "highp float kctrl = fxHere || paintHere ? kCtrlNear(kc, kpt.x, kpt.y) : 0.0;";
const ANCHOR_GAP = "  float gk = gapKeep(pxW, gTurn);";

function once(src: string, anchor: string): number {
  const i = src.indexOf(anchor);
  if (i < 0 || src.indexOf(anchor, i + 1) >= 0) {
    throw new Error(`explore variant: anchor not found exactly once: ${anchor.slice(0, 48)}`);
  }
  return i;
}

// The explore variant of a section fragment (the master text with the
// declarations before main, the side coordinate's derivative at the top of
// main - uniform control flow - the exact ctrl for every fragment while
// the mode is on, and the visibility before the gap mask).
export function withExplore(frag: string): string {
  let s = frag;
  let i = once(s, ANCHOR_MAIN);
  s = s.slice(0, i) + EXPLORE_DECL_GLSL + s.slice(i);
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
