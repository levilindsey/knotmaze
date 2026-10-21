// PER-PIXEL CROSSING GAPS ("casing masks"). Every crossing gap is
// evaluated in the ribbon FRAGMENT SHADER instead of being punched by a CPU
// erase grid and repainted by an over-fill copy:
//
//   an UNDER-thread fragment is hidden where it lies within
//   (over half-width + margin) of the OVER thread's local centerline,
//   restricted to that crossing's arc WINDOW along the under thread.
//
// The over thread itself is never touched, so no over-fill copies exist:
// a hidden under pixel simply reveals the over ribbon (or whatever lies
// behind it), whichever thread the base layer happens to draw first. The
// cut boundary is the offset curve of the over centerline - no lanes, no
// cap rows, no grid corners - which is what retired the erase grid's
// wedge/slit artifacts (its cap rows met acute thread edges as sharp
// triangles that swung with the flow).
//
// DATA: one RGBA32F texture (page-lifetime, NEAREST, read with texelFetch
// only - WebKit has no float-linear filtering and none is needed). Row 0
// holds the globals in fabricUniforms since G3-1 (row 0 unused); slot s lives in row s+1,
// its texels ordered by when a fragment needs them:
//   texel 0: [boundX, boundY, rFull, rSil] - the polyline's bounding circle
//            and its radius grown by the slot's reach of interest (full
//            mask / silhouette only); negative = disabled slot
//   texel 1: [arcScale, centerArc, period (0 = open chain), strength]
//            strength >= 0: plain; < 0: GATED (G2.1) - the gap fades in
//            from its show time tShow = -strength - 1 (reveal-relative wall
//            seconds) over CROSSING_FADE_IN, from the knot uniforms' clock
//            (gapStrength), so a reveal / FX gate needs no CPU fade state
//   texel 2: [winNeg, winPos, hOver, nPts]
//   texel 3: [protVisNeg, nProtNeg, nProtPos, flags (1 perp margin, 2 self,
//            4 SHAPED: K268, the thread reveal's profile below - read only
//            by the explore program, set only while the reveal is on)]
//   texel 4: [selfExcl, overBase, kStart, overArcPer] (the SAMP range)
//   texel 5: [fadeScaleNeg, fadeScalePos, centerX, centerY]
//   texel 6: [underTanX, underTanY, marginScaleNeg, marginScalePos]
//   texel 7: [protNegA, protNegB, protPosA, protPosB] (protect intervals)
//   texel 8: [margin, fade, sminK, farK] (farK in sampled segments)
//   texel 9: [overStride, overCount, overClosed, protVisPos]
//   texels 10..17: chunk bounding circles [cx, cy, radius, firstPoint],
//               GAP_CHUNK sampled segments per chunk (a slot over 64 SAMP
//               points strides at most 3, chord <= 0.3; K399 gate 3)
//   texels 18/20: PROTECT ranges [sampBase, kStart, nPts, stride] per
//               side, read in place from SAMP; texels 19/21 their
//               bounding circles [cx, cy, r, -] (loop-free protect)
//   last:       K268's SHAPED-CUT PROFILE (GAP_PROF_BASE, 3 texels): the
//               over thread's visibility along the over chain's arc frame
//               (texel 4's arc), written by setShape -
//               two ramps [aS, F, dK, tK] (a piece end: solid before
//               aS, then a fade of SIGNED arc length F, piecewise linear
//               in arc through the knot (dK, tK)), then [solved strength,
//               profile flags (GAP_PROF_*), 0, 0]. Only the explore
//               program reads it (texel 3.w bit 4 gates the read)
// JUNCTION CLEARANCE (the scales): per side of the crossing, the CPU caps
// the cosmetic margin (floor 0.5) and the fade (floor 0.45) by the room a
// fused joint leaves on that side - exactly the erase era's lane caps
// ("gaps extending into the intersection"); required coverage (the over
// silhouette) is never reduced. A fragment picks its side by the sign of
// its arc offset; fan fragments, which have no arc, project their offset
// onto the under tangent at the window center (centerX/Y).
// PROTECT (arc intervals along the under thread, empty when A >= B, plus
// one polyline each): where the under thread A is itself the OVER thread
// of a neighboring crossing (A over B), this slot's cosmetic margin and
// fade are waived for A's fragments that lie over B's ribbon - inside the
// interval AND within hOver of B's local centerline (the protect
// polyline); the slot's silhouette still hides. Under the thread reveal
// the waiver scales by B's visibility per side (setProtVis; the explore
// programs only), so a hidden B waives nothing. A cyclic triangle (a over
// b over c over a) squeezed below the casing width otherwise hid every
// thread inside the region it must cover - a dark triangle at each
// crossing. Waiving the margin over the whole interval instead erased the
// casing line between the two threads along shallow crossings' long
// intervals (user URL x8: a purple thread touching a blue one with no dark
// line).
// FAR-BRANCH SMOOTH-MIN: on the concave side of an over bend tighter than
// the casing, the distance field creases along the medial axis (a small V
// in the casing/fade edge - the erase era's iso-arc caps could not crease).
// Fragments near the mask edge also find the nearest point of a polyline
// branch more than farK segments away from the nearest one and blend the
// two distances with a polynomial smooth-min of radius sminK. On a
// straight run every such point is at least sminK farther (farK is sized
// for that on the CPU), so the blend is exactly the plain distance there.
// SELF-CROSSINGS (flags & 2; selfExcl > 0): over and under are the same
// chain, and near the middle of a short kink loop the window's end and the
// polyline's start are adjacent stretches of ONE thread - so a fragment
// ignores every polyline point within selfExcl of its own chain arc
// (polyline point k sits at chain arc polyStart + k * polyStep). A thread
// can never mask itself; it can still dive under its own over pass.
// VERTICES carry up to GAP_SLOTS slot ids (flat vec4, -1 = none), the
// static arc position (cos, sin of the sample's turn - seamless across a
// closed ring's wrap quad; the vertex stage turns it into the fragment's
// arc turn, see GAP_VERT_DECL), and the ribbon tangent. Fan meshes
// (junction joinery) carry ids and no arc. A fan id >= 0 (a free tip's
// cap - the under thread's own material) gets the casing inside the under
// thread's footprint (a straight line through the window center along the
// header tangent; projected window) plus the over silhouette. A fan id
// <= -2 encodes slot (-id - 2) for a JUNCTION fan: the over SILHOUETTE
// only (inset one pixel), so a foreign thread passing over a joint's arm
// shows on top of the web - what its over-fill used to paint - and no
// casing grooves the joint's own surfaces (the junction-clearance rule:
// gaps must not eat into seal discs and webs). Slots whose over pass is
// one of the joint's own arms are not listed at all.
//
// COST (measured, draw-phase GPU at 3200x1800; the search is ALU-bound):
// a fragment only pays for what can change its answer. Texel 0 alone
// rejects a slot whose grown bounding circle misses the fragment. The
// nearest-point search starts at the slot's REACH of interest (casing +
// fade + the smooth-min's dip, or just the silhouette for a junction fan),
// skips every chunk whose CAPSULE (chord + capR) cannot beat the best
// distance so far, and stops once a point lies inside the over silhouette
// (hidden whatever else is found). Segments carry their precomputed
// u = ab / |ab|^2, so a segment test is ~14 ALU ops with no division, and
// the exclusions (self-crossings, the far-branch skip range) live in a
// separate FULL search that ordinary fragments never run. The far-branch
// pass runs only inside the edge band. (Chunk order was measured both
// ways: a center-out order - per fragment or per slot - ran 8-10% SLOWER
// than plain index order on an RX 6800 XT, so the loop stays sequential.)
// The protect cover adds ~0.17 ms at the user URL, ~0.15 of it from the
// code's mere PRESENCE (a never-taken branch costs the same: register
// pressure); its circle and capsule culls keep the execution near 0.03.
//
// MARGIN: perpMargin slots (the default look, and marker discs) hide
// within a constant perpendicular `margin` of the over silhouette - a
// casing. Arc-margin slots use the erase era's P3.21 rule instead:
// `margin` measured ALONG the under thread, i.e. margin * |sin(angle)|
// perpendicular at each fragment (under tangent there vs the over
// tangent at its nearest point - which jumps between branches of a
// curled over pass, so that edge can step). FADE (fadeLength) is an
// alpha ramp beyond the mask edge measured ALONG the under thread in both
// looks (fade * sin perpendicular; floored at 0.2 * fade for the casing,
// where a parallel run has no along-thread exit); at fade 0 the edge gets
// a one-pixel analytic AA ramp (discarded fragments are not antialiased
// by MSAA). Marker discs fade radially (their sin is pinned to 1).

import { BufferImageSource, ExtensionType, Texture, extensions } from "pixi.js";
import { FABRIC_GLSL, fabricGapBrute, setFabricGap } from "./fabric_sdf";

export const GAP_HDR = 10; // Header texels per row (0-9).
export const GAP_CHUNK = 8; // Sampled segments per culling chunk.
export const GAP_MAX_CHUNKS = 8; // Chunk-circle texels per row.
// Every chunk reads GAP_CHUNK whole segments, closing point included, so
// the cap is 8 chunks x 8 segments + 1 = 65 sampled points.
export const GAP_MAX_PTS = GAP_MAX_CHUNKS * GAP_CHUNK + 1;
// K399 gate 3: a slot whose raw SAMP span exceeds the cap strides by at
// most this (SAMP spacing 0.09, so a chord stays <= 0.27 world); the
// writer never stretches spacing past it and never cuts the reach.
export const GAP_MAX_STRIDE = 3;
const GAP_CHUNK_BASE = GAP_HDR; // First chunk-circle texel (10).
// Protect ranges: per side a range texel then its bounding circle.
export const GAP_PROT_NEG = GAP_CHUNK_BASE + GAP_MAX_CHUNKS; // 18
export const GAP_PROT_POS = GAP_PROT_NEG + 2; // 20
// K268: the shaped-cut profile (see the header), after the protect ranges.
export const GAP_PROF_BASE = GAP_PROT_POS + 2; // 22
export const GAP_TEX_W = GAP_PROF_BASE + 3; // 25
// Texel 3.w's SHAPED bit, and the profile's flags (texel GAP_PROF_BASE+2
// .y): ramp 0 / 1 present, ramp 0 / 1 a FRONTIER (the end look applies),
// and MAX (two pieces, kExploreAt's best-of) instead of MIN (one piece's
// two ends).
export const GAP_FLAG_SHAPED = 4;
export const GAP_PROF_R0 = 1;
export const GAP_PROF_R1 = 2;
export const GAP_PROF_F0 = 4;
export const GAP_PROF_F1 = 8;
export const GAP_PROF_MAX = 16;
export const GAP_SLOTS = 4; // Slot ids per vertex.

// One chain's SAMP range as a slot references it: point j (0-based, of n
// sampled points) is sampAt(base + wrap(kStart + j * stride)), wrap =
// modulo count on a closed chain, clamped to [0, count - 1] on an open
// one; its chain arc is (kStart + j * stride) * arcPer.
export interface GapSampRef {
  base: number;
  kStart: number;
  n: number;
  stride: number;
  count: number;
  closed: boolean;
}

// The SAMP range covering chain arcs [center - neg, center + pos] of a
// chain with `count` samples over `total` arc, rounded OUTWARD to whole
// samples (every sample the reach touches is held), then strided to the
// GAP_MAX_PTS cap (stride at most GAP_MAX_STRIDE; the reach is never
// cut). arcPer = arc per sample (closed: total / count; open: total /
// (count - 1)).
export function gapSampRange(
  total: number,
  count: number,
  closed: boolean,
  center: number,
  neg: number,
  pos: number
): { ref: GapSampRef; arcPer: number } {
  const arcPer = count > 1 ? total / (closed ? count : count - 1) : Math.max(total, 1);
  if (count < 1 || !(total > 0)) {
    return { ref: { base: 0, kStart: 0, n: 0, stride: 1, count: Math.max(count, 1), closed }, arcPer };
  }
  let kLo = Math.floor((center - neg) / arcPer);
  let kHi = Math.ceil((center + pos) / arcPer);
  if (!closed) {
    kLo = Math.max(0, Math.min(count - 1, kLo));
    kHi = Math.max(0, Math.min(count - 1, kHi));
    if (kHi < kLo) kHi = kLo;
  } else if (kHi - kLo + 1 > count) {
    kLo = 0;
    kHi = count - 1;
  }
  const nRaw = kHi - kLo + 1;
  const stride =
    nRaw <= GAP_MAX_PTS ? 1 : Math.min(GAP_MAX_STRIDE, Math.ceil((nRaw - 1) / (GAP_MAX_PTS - 1)));
  // A reach spanning the whole ring (never in practice: reaches are a
  // few world against laps of tens) still caps at GAP_MAX_PTS points.
  const n = Math.min(GAP_MAX_PTS, Math.floor((nRaw - 1) / stride) + 1);
  return { ref: { base: 0, kStart: kLo, n, stride, count, closed }, arcPer };
}

// Chunk bounding circles for a sampled range: GAP_MAX_CHUNKS texels
// [cx, cy, radius, firstPoint], GAP_CHUNK segments per chunk, from the
// sampled points `at(j)` (flat [x, y, ...] or a reader). Unused chunks
// are zero (their firstPoint still names the chunk's first segment).
export function gapChunkBounds(
  at: (j: number) => readonly [number, number],
  nPts: number
): Float32Array {
  const out = new Float32Array(GAP_MAX_CHUNKS * 4);
  for (let c = 0; c < GAP_MAX_CHUNKS; c++) {
    const j0 = c * GAP_CHUNK;
    out[c * 4 + 3] = j0;
    if (nPts < 2 || j0 >= nPts) continue;
    const j1 = Math.min(j0 + GAP_CHUNK, nPts - 1);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let j = j0; j <= j1; j++) {
      const [x, y] = at(j);
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    let r = 0;
    for (let j = j0; j <= j1; j++) {
      const [x, y] = at(j);
      r = Math.max(r, Math.hypot(x - cx, y - cy));
    }
    out[c * 4] = cx;
    out[c * 4 + 1] = cy;
    out[c * 4 + 2] = r + 1e-4;
  }
  return out;
}

// The bounding circle [cx, cy, r] of a sampled range's points.
export function gapRangeCircle(
  at: (j: number) => readonly [number, number],
  nPts: number
): [number, number, number] {
  if (nPts < 1) return [0, 0, 0];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let j = 0; j < nPts; j++) {
    const [x, y] = at(j);
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let r = 0;
  for (let j = 0; j < nPts; j++) {
    const [x, y] = at(j);
    r = Math.max(r, Math.hypot(x - cx, y - cy));
  }
  return [cx, cy, r + 1e-4];
}

// Vertex-shader additions (declarations + main body lines). The sample's
// arc position arrives as a unit vector (seamless across a closed ring's
// wrap quad) and leaves as a TURN in [0, 1) (-1: a fan, no arc) in two
// copies: A wraps at 0/1, B at 0.5 (B = A + 1 below one half). Within any
// triangle at most one of them jumps, and the fragment takes whichever is
// smooth there (gapTurn) - a linear varying instead of a per-fragment
// atan, exact wherever the old decode was.
export const GAP_VERT_DECL = /* glsl */ `
in vec2 aArcPos;
in vec2 aTan;
in vec4 aMaskId;
out highp vec2 vPos;
out highp float vTurnA;
out highp float vTurnB;
out highp vec2 vTan;
flat out highp vec4 vMaskId;
`;
export const GAP_VERT_MAIN = /* glsl */ `
  vPos = aPosition;
  vTan = aTan;
  vMaskId = aMaskId;
  if (dot(aArcPos, aArcPos) < 0.25) {
    vTurnA = -1.0;
    vTurnB = -1.0;
  } else {
    highp float tn = atan(aArcPos.y, aArcPos.x) * 0.15915494309189535;
    if (tn < 0.0) tn += 1.0;
    vTurnA = tn;
    vTurnB = tn < 0.5 ? tn + 1.0 : tn;
  }
`;
// Fragment LIBRARY (no varyings). GAP_FRAG_LIB is the RIBBON form (the
// section shader and the still pluck); GAP_FRAG_LIB_FAN below is the fan
// form (junction-field). uGapData plus
//   gapKeepAt(pxW, p, turn, tanv, ids)
// = the fraction of the fragment at world point p that stays drawn
// (1 = untouched). turn is the fragment's arc turn along its chain
// (gapTurn); in the fan form, turn < 0 marks a FAN fragment: the slot's
// header tangent, the arc offset projected on it, the casing restricted
// to the under footprint (full ids only), the over silhouette. pxW (world
// units per pixel) must come from fwidth() evaluated in UNIFORM control
// flow at the top of main - derivatives inside the slot loop are
// undefined. gapProbe(): the probe view flag (masked material tinted, not
// removed).
export const GAP_FRAG_LIB = /* glsl */ `
uniform highp sampler2D uGapData;
${FABRIC_GLSL}

// The nearest-point search over a slot's SAMP range (G3-1): chunks are
// walked in INDEX order (center-out and best-first measured 8-10% slower:
// neighboring fragments start in different chunks and exit at different
// times, so the SIMD group runs the union), a chunk whose bounding
// circle cannot beat the best distance so far is skipped, and the search
// stops once a point lies inside sure2 (the over silhouette: hidden
// whatever else is found). uFabricGap.z (the brute-force debug uniform)
// disables both prunings on the same code, so brute against pruned must
// read 0 px apart. Segment tests project onto the SAMP segment itself
// (the samples are the over ribbon's own centerline).
void gapSeg(highp vec2 p, highp vec2 a, highp vec2 b, int k,
    inout highp float best, inout int bk) {
  highp vec2 ab = b - a;
  highp vec2 pa = p - a;
  highp float l2 = dot(ab, ab);
  highp float h = l2 > 1e-12 ? clamp(dot(pa, ab) / l2, 0.0, 1.0) : 0.0;
  highp vec2 q = pa - ab * h;
  highp float d2 = dot(q, q);
  if (d2 < best) {
    best = d2;
    bk = k;
  }
}

// FULL: also skips segment indices skipLo..skipHi (the far-branch pass;
// empty when skipLo > skipHi) and, when ex > 0 (self-crossings), a segment
// whose nearest point's chain arc lies within ex of the fragment's arc fa
// (s0/st: the range's arc parameterization in sampled steps; per: the
// ring period, 0 on open chains).
void gapSegFull(highp vec2 p, highp vec2 a, highp vec2 b, int k,
    highp float ex, highp float fa, highp float s0, highp float st,
    highp float per, int skipLo, int skipHi,
    inout highp float best, inout int bk) {
  if (k >= skipLo && k <= skipHi) return;
  highp vec2 ab = b - a;
  highp vec2 pa = p - a;
  highp float l2 = dot(ab, ab);
  highp float h = l2 > 1e-12 ? clamp(dot(pa, ab) / l2, 0.0, 1.0) : 0.0;
  if (ex > 0.0) {
    highp float da = s0 + (float(k) + h) * st - fa;
    if (per > 0.0) da -= per * floor(da / per + 0.5);
    if (abs(da) < ex) return;
  }
  highp vec2 q = pa - ab * h;
  highp float d2 = dot(q, q);
  if (d2 < best) {
    best = d2;
    bk = k;
  }
}

// Sampled point j of a range (t4 = [selfExcl, overBase, kStart, arcPer],
// t9 = [stride, count, closed, -]): rings wrap, open chains clamp (never
// a last-to-first chord).
vec2 gapOverPt(vec4 t4, vec4 t9, int j) {
  int stride = max(int(t9.x + 0.5), 1);
  int count = max(int(t9.y + 0.5), 1);
  int raw = int(t4.z + 0.5) + j * stride;
  int idx = t9.z > 0.5
    ? ((raw % count) + count) % count
    : clamp(raw, 0, count - 1);
  return sampAt(int(t4.y + 0.5) + idx);
}

// Nearest point of the sampled range within sqrt(best) (best is the
// squared reach on entry); the nearest segment (-1: none within reach)
// comes back through bk. Fast form: no exclusions. K573: each segment
// carries the previous one's end point, so a chunk reads its points once
// (its first point, then one sampAt per segment), and the inner loop walks
// the SAMP index with no int % and no float-to-int conversion: the range
// is decoded once (gapOverPt's maths), a ring's start is wrapped once into
// [0, count) and its index wraps with one compare (stride <= count on a
// ring, gapSampRange; gap_mask.test.ts pins it), an open run clamps. A
// processed chunk never starts past the last segment (nCh), so no fetch is
// wasted.
void gapNearestFast(int row, int nCh, highp vec2 p,
    highp float sure2, highp vec4 t4, highp vec4 t9, int nPts,
    inout highp float best, inout int bk) {
  bool brute = uFabricGap.z > 0.5;
  int nSeg = max(nPts - 1, 0);
  int base = int(t4.y + 0.5);
  int stride = max(int(t9.x + 0.5), 1);
  int count = max(int(t9.y + 0.5), 1);
  bool closed = t9.z > 0.5;
  int r0 = int(t4.z + 0.5);
  if (closed) r0 = ((r0 % count) + count) % count;
  for (int c = 0; c < ${GAP_MAX_CHUNKS}; c++) {
    if (c >= nCh) break;
    if (!brute && best < sure2) break;
    int k0 = c * ${GAP_CHUNK};
    if (!brute) {
      highp vec4 cc = texelFetch(uGapData, ivec2(${GAP_CHUNK_BASE} + c, row), 0);
      highp float lb = length(p - cc.xy) - cc.z;
      if (lb > 0.0 && lb * lb >= best) continue;
    }
    int r = r0 + k0 * stride;
    int i = closed ? r % count : clamp(r, 0, count - 1);
    highp vec2 a = sampAt(base + i);
    for (int j = 0; j < ${GAP_CHUNK}; j++) {
      int k = k0 + j;
      if (k >= nSeg) break;
      r += stride;
      if (closed) {
        i += stride;
        if (i >= count) i -= count;
      } else {
        i = clamp(r, 0, count - 1);
      }
      highp vec2 b = sampAt(base + i);
      gapSeg(p, a, b, k, best, bk);
      a = b;
    }
  }
}

void gapNearestFull(int row, int nCh, highp vec2 p,
    highp float ex, highp float fa, highp float s0, highp float st,
    highp float per, int skipLo, int skipHi,
    highp float sure2, highp vec4 t4, highp vec4 t9, int nPts,
    inout highp float best, inout int bk) {
  bool brute = uFabricGap.z > 0.5;
  int nSeg = max(nPts - 1, 0);
  // The decoded range and the index walk of gapNearestFast.
  int base = int(t4.y + 0.5);
  int stride = max(int(t9.x + 0.5), 1);
  int count = max(int(t9.y + 0.5), 1);
  bool closed = t9.z > 0.5;
  int r0 = int(t4.z + 0.5);
  if (closed) r0 = ((r0 % count) + count) % count;
  for (int c = 0; c < ${GAP_MAX_CHUNKS}; c++) {
    if (c >= nCh) break;
    if (!brute && best < sure2) break;
    int k0 = c * ${GAP_CHUNK};
    // A chunk wholly inside the skipped index range adds nothing.
    if (!brute && k0 >= skipLo && min(k0 + ${GAP_CHUNK - 1}, nSeg - 1) <= skipHi) {
      continue;
    }
    if (!brute) {
      highp vec4 cc = texelFetch(uGapData, ivec2(${GAP_CHUNK_BASE} + c, row), 0);
      highp float lb = length(p - cc.xy) - cc.z;
      if (lb > 0.0 && lb * lb >= best) continue;
    }
    // The carried point (gapNearestFast): a skipped segment still reads
    // its end point, the next segment's start.
    int r = r0 + k0 * stride;
    int i = closed ? r % count : clamp(r, 0, count - 1);
    highp vec2 a = sampAt(base + i);
    for (int j = 0; j < ${GAP_CHUNK}; j++) {
      int k = k0 + j;
      if (k >= nSeg) break;
      r += stride;
      if (closed) {
        i += stride;
        if (i >= count) i -= count;
      } else {
        i = clamp(r, 0, count - 1);
      }
      highp vec2 b = sampAt(base + i);
      gapSegFull(p, a, b, k, ex, fa, s0, st, per, skipLo, skipHi, best, bk);
      a = b;
    }
  }
}
bool gapProbe() {
  return uFabricGap.y > 0.5;
}


// A slot's effective strength (texel 1.w; see the header): gated slots
// ramp in from their show time on the knot clock (uKFx.z = fxNow); with the
// FX clock stopped (uKFx.w = 0) every gate has long opened. Needs the knot
// uniforms and CROSSING_FADE_IN (paint_glsl.ts) declared first.
highp float gapStrength(highp float s) {
  if (s >= 0.0) return s;
  if (uKFx.w < 0.5) return 1.0;
  highp float x = clamp((uKFx.z + s + 1.0) / CROSSING_FADE_IN, 0.0, 1.0);
  return x * x * (3.0 - 2.0 * x);
}

// 1 inside the arc interval [a, b] (with a short ramp), 0 outside; an
// empty interval (a >= b) is 0.
highp float gapInterval(highp float o, highp float a, highp float b) {
  if (a >= b) return 0.0;
  return clamp(min(o - a, b - o) / 0.04 + 0.5, 0.0, 1.0);
}

// How much of p lies over the ribbon (half-width h) around a PROTECT
// range in SAMP (G3-1): 1 inside, a one-pixel ramp at its edge, 0 outside
// (and for fewer than 2 sampled points). The range texel at base is
// [sampBase, kStart, nPts, stride] and the next texel its bounding circle
// [cx, cy, r, signedCount] (negative = the chain is closed, |.| = its
// sample count, for the wrap). Loop-free: the circle rejects most
// fragments, then ONE segment loop reads the samples in place - no chunk
// nesting (G1's protect cost was mostly register pressure, so the loop
// stays single).
highp float gapProtCover(int row, int base, highp vec2 p,
    highp float h, highp float pxW) {
  highp vec4 rg = texelFetch(uGapData, ivec2(base, row), 0);
  int n = int(rg.z + 0.5);
  if (n < 2) return 0.0;
  highp vec4 bc = texelFetch(uGapData, ivec2(base + 1, row), 0);
  highp float reach = h + pxW;
  highp float rr = bc.z + reach;
  highp vec2 dc = p - bc.xy;
  if (dot(dc, dc) > rr * rr) return 0.0;
  int pbase = int(rg.x + 0.5);
  int k0 = int(rg.y + 0.5);
  int stride = max(int(rg.w + 0.5), 1);
  int pcount = max(int(abs(bc.w) + 0.5), 1);
  bool pclosed = bc.w < -0.5;
  highp float best = reach * reach;
  // K573: the previous segment's end point is carried (one sampAt each),
  // and the index walks as in gapNearestFast (one wrap, no int %).
  int r = k0;
  int i = pclosed ? ((r % pcount) + pcount) % pcount : clamp(r, 0, pcount - 1);
  highp vec2 a = sampAt(pbase + i);
  for (int j = 0; j < 64; j++) {
    if (j >= n - 1) break;
    r += stride;
    if (pclosed) {
      i += stride;
      if (i >= pcount) i -= pcount;
    } else {
      i = clamp(r, 0, pcount - 1);
    }
    highp vec2 b = sampAt(pbase + i);
    highp vec2 ab = b - a;
    highp vec2 pa = p - a;
    highp float l2 = dot(ab, ab);
    highp float hh = l2 > 1e-12 ? clamp(dot(pa, ab) / l2, 0.0, 1.0) : 0.0;
    highp vec2 q = pa - ab * hh;
    best = min(best, dot(q, q));
    a = b;
  }
  return clamp((h - sqrt(best)) / pxW + 0.5, 0.0, 1.0);
}

highp float gapKeepAt(highp float pxW, highp vec2 p, highp float turn,
    highp vec2 tanv, highp vec4 ids) {
  if (all(lessThan(abs(ids + 1.0), vec4(0.5)))) return 1.0;
  if (uFabricGap.x < 0.5) return 1.0;
  // Every slot of a ribbon fragment windows the fragment's own chain, so
  // one turn serves them all.
  bool fan = false;
  highp float keep = 1.0;
  for (int s = 0; s < ${GAP_SLOTS}; s++) {
    // Fully hidden already: no later slot can change the answer.
    if (keep <= 0.002) break;
    highp float idf = ids[s];
    if (abs(idf + 1.0) < 0.5) continue; // -1 = no slot.
    // ids >= 0: the full mask (ribbons; a fan that IS the under thread's
    // material - a free tip's cap). ids <= -2 encode slot (-id - 2) for a
    // JUNCTION fan: the over silhouette only (see below).
    bool full = idf > -0.5;
    int row = int(full ? idf + 0.5 : -idf - 1.5) + 1;
    // REJECT on texel 0 alone: the bounding circle grown by the reach of
    // interest (a disabled slot's radius is negative).
    highp vec4 t0 = texelFetch(uGapData, ivec2(0, row), 0);
    highp float rr = full ? t0.z + 2.0 * pxW : t0.w + pxW;
    highp vec2 db = p - t0.xy;
    if (rr <= 0.0 || dot(db, db) > rr * rr) continue;
    highp vec4 t1 = texelFetch(uGapData, ivec2(1, row), 0);
    highp vec4 t2 = texelFetch(uGapData, ivec2(2, row), 0);
    highp float hO = t2.z;
    highp float gst = gapStrength(t1.w);
    highp float inWin = 1.0;
    highp float inFoot = 1.0;
    // Arc distance to the nearer window end (fade ramp below).
    highp float winM = 1e6;
    // Signed arc offset along the under thread (fans: projected).
    highp float offA = 0.0;
    highp float fa = 0.0;
    highp vec4 t5 = vec4(0.0);
    highp vec4 t6 = vec4(0.0);
      // Arc offset from the window center along the under chain
      // (wrapped on closed rings), then the window test with a one-pixel
      // AA ramp at its ends.
      fa = turn * t1.x;
      highp float off = fa - t1.y;
      if (t1.z > 0.0) off -= t1.z * floor(off / t1.z + 0.5);
      offA = off;
      highp float m = min(off + t2.x, t2.y - off);
      if (m <= -pxW) continue;
      inWin = clamp(m / pxW + 0.5, 0.0, 1.0);
      winM = m;
    highp vec4 t3 = texelFetch(uGapData, ivec2(3, row), 0);
    int fl = int(t3.w + 0.5);
    bool perp = (fl & 1) != 0;
    int n = int(t2.w + 0.5);
    highp float kLast = float(max(n - 1, 0));
    int nCh = n >= 2 ? (n - 2) / ${GAP_CHUNK} + 1 : 0;
    highp vec4 t4 = texelFetch(uGapData, ivec2(4, row), 0);
    highp vec4 t9 = texelFetch(uGapData, ivec2(9, row), 0);
    highp float ex = 0.0;
    highp float s0 = 0.0;
    highp float st = 0.0;
    highp float per = 0.0;
    if ((fl & 2) != 0 && !fan) {
      ex = t4.x;
      s0 = float(int(t4.z + 0.5)) * t4.w;
      st = float(max(int(t9.x + 0.5), 1)) * t4.w;
      per = t1.z;
    }
    // REACH of interest (texel 0 holds it grown by the bounding radius):
    // beyond it nothing this slot does is visible. Inside SURE the
    // fragment is hidden whatever the margin, protect, fade or smooth-min
    // say (the silhouette always hides; the fan cut is inset one pixel
    // more), so the search may stop there.
    highp float reach = full ? hO + (t0.z - t0.w) + 2.0 * pxW : hO + pxW;
    // Zoom-aware tolerance (G3-1): the sure exit's inset floors at one
    // SAMP stride, so at high zoom (pxW below the sampled chord) the
    // early exit never trusts the coarse samples past a pixel.
    highp float tol = max(pxW, t4.w * float(max(int(t9.x + 0.5), 1)));
    highp float sure = hO - ((full && !fan) ? 1.0 : 1.5) * tol;
    highp float sure2 = sure > 0.0 ? sure * sure : 0.0;
    highp float best = reach * reach;
    int bk = -1;
    if (n <= 1) {
      // The marker disc (n 0: texel 5's center) or a single sampled point.
      highp vec2 cpt = n == 0
        ? texelFetch(uGapData, ivec2(5, row), 0).zw
        : gapOverPt(t4, t9, 0);
      highp vec2 dq = p - cpt;
      best = dot(dq, dq);
      bk = 0;
      if (best >= reach * reach) continue;
    } else if (ex > 0.0) {
      gapNearestFull(row, nCh, p, ex, fa, s0, st, per, 1, 0,
        sure2, t4, t9, n, best, bk);
    } else {
      gapNearestFast(row, nCh, p, sure2, t4, t9, n, best, bk);
    }
    if (bk < 0) continue; // Nothing of this slot within reach.
    if (best < sure2) {
      keep = min(keep, 1.0 - (full ? inWin * inFoot : 1.0) * gst);
      continue;
    }
    // PROTECT: where this thread covers another one at a neighboring
    // crossing it keeps everything but the silhouette (see the header) -
    // inside the arc interval, over that thread's ribbon only. Evaluated
    // here, where few values are live; one inlined cover loop serves both
    // sides (the presence of the code, not its execution, is most of its
    // cost: register pressure).
    highp float pr = 0.0;
    if (!fan) {
      highp vec4 t7 = texelFetch(uGapData, ivec2(7, row), 0);
      highp float pn = gapInterval(offA, t7.x, t7.y);
      highp float pp = gapInterval(offA, t7.z, t7.w);
      for (int sd = 0; sd < 2; sd++) {
        highp float pi = sd == 0 ? pn : pp;
        if (pi <= 0.0) continue;
        pr = max(pr, pi * gapProtCover(row,
          ${GAP_PROT_NEG} + sd * 2, p, hO, pxW));
      }
      t5 = texelFetch(uGapData, ivec2(5, row), 0);
      t6 = texelFetch(uGapData, ivec2(6, row), 0);
    }
    highp vec4 t8 = texelFetch(uGapData, ivec2(8, row), 0);
    // Over tangent at the nearest point: central-difference tangents at
    // the nearest segment's ends, blended by the nearest parameter (a
    // per-segment direction steps at every vertex - visible as kinks in
    // the arc-length margin at tight over bends). Only the arc margin and
    // the fade read it.
    highp vec2 to = vec2(1.0, 0.0);
    bool needTan = full && (!perp || t8.y > 0.0);
    highp vec2 tu = t6.xy;
    if (n >= 2 && needTan) {
      if (!fan) {
        highp float tl = length(tanv);
        if (tl > 1e-3) tu = tanv / tl;
      }
      highp vec2 pm = gapOverPt(t4, t9, bk - 1);
      highp vec2 p0 = gapOverPt(t4, t9, bk);
      highp vec2 p1 = gapOverPt(t4, t9, bk + 1);
      highp vec2 pp = gapOverPt(t4, t9, bk + 2);
      // The nearest parameter on segment bk (zero-length: 0).
      highp vec2 abk = p1 - p0;
      highp float blk = dot(abk, abk);
      highp float bt = blk > 1e-12 ? clamp(dot(p - p0, abk) / blk, 0.0, 1.0) : 0.0;
      highp vec2 ta = p1 - pm;
      highp vec2 tb = pp - p0;
      ta /= max(length(ta), 1e-6);
      tb /= max(length(tb), 1e-6);
      to = mix(ta, tb, bt);
      to /= max(length(to), 1e-6);
    }
    highp float d = sqrt(best);
    // A one-point polyline (marker disc) has no direction: radial, sin 1.
    highp float sinT =
      n >= 2 && needTan ? abs(tu.x * to.y - tu.y * to.x) : 1.0;
    // Junction clearance, PER SIDE of the crossing (solved on the CPU from
    // the room a fused joint leaves, as the erase era capped its lanes):
    // margin and fade shrink only by the shortfall. The side switch at
    // offA = 0 lies inside the over silhouette, where everything hides.
    bool posSide = offA >= 0.0;
    highp float margin =
      (perp ? t8.x : t8.x * sinT) * (posSide ? t6.w : t6.z);
    // The FADE stays an arc length along the under thread in both looks
    // (fadeLength's meaning): perpendicular it is fade * sin - floored in
    // the casing look, where a parallel run has no along-thread exit.
    highp float fadeP =
      t8.y * (perp ? max(sinT, 0.2) : sinT) * (posSide ? t5.y : t5.x);
    margin *= 1.0 - pr;
    fadeP *= 1.0 - pr;
    highp float sk = t8.z;
    if (full && n >= 2 && sk > 0.0) {
      // FAR-BRANCH SMOOTH-MIN, edge band only: the blend can only lower d
      // by up to sminK / 4, so fragments already hidden or far outside are
      // settled without it.
      highp float lo = hO + margin - 0.5 * pxW;
      highp float hi = hO + margin + max(fadeP, pxW) + 0.25 * sk;
      if (d > lo && d < hi) {
        int farK = int(t8.w + 0.5);
        highp float best2 = (d + sk) * (d + sk);
        int bk2 = -1;
        gapNearestFull(row, nCh, p, ex, fa, s0, st, per,
          bk - farK, bk + farK, 0.0, t4, t9, n, best2, bk2);
        if (bk2 >= 0) {
          highp float d2 = sqrt(best2);
          highp float hb = clamp(0.5 + 0.5 * (d2 - d) / sk, 0.0, 1.0);
          d = mix(d2, d, hb) - sk * hb * (1.0 - hb);
        }
      }
    }
    highp float e = d - hO - margin;
    highp float k = clamp((e + 0.5 * pxW) / max(fadeP, pxW), 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    // WINDOW-END FADE RAMP: where a window ends before the fade has run
    // out (twin midpoint split, neighbor clearance, the eye-wall limit),
    // the fade portion - never the casing - dissolves over the last half
    // fade of arc instead of being chopped by the window's straight end.
    highp float fs = clamp(winM / max(0.5 * t8.y, pxW), 0.0, 1.0);
    fs = mix(1.0, fs * fs * (3.0 - 2.0 * fs), clamp(e / pxW, 0.0, 1.0));
    highp float cut = full ? (1.0 - k) * inWin * inFoot * fs : 0.0;
    if (fan) {
      // The over silhouette, INSET one pixel so the AA ramp lands on the
      // over ribbon's opaque interior: a ramp centered on the silhouette
      // stacked on the ribbon's own MSAA edge let the backdrop through
      // (thin dark seams wherever a web met the over thread).
      cut = max(cut, 1.0 - clamp((d - hO + pxW) / pxW + 0.5, 0.0, 1.0));
    }
    keep = min(keep, 1.0 - cut * gst);
  }
  return keep;
}
`;

// K320 stage 1: the fan-only form of the library (junction-field ships
// this instead of GAP_FRAG_LIB): the fan window arm in place of the ribbon
// one, fan = true, and no protect block, gapProtCover or gapInterval (fans
// never run them: gapKeepAt's protect is !fan, and a fan's search needs no
// interval). Derived from GAP_FRAG_LIB by exactly-once anchor swaps, like
// explore_glsl's withExplore; a drifted anchor throws at module load.
const GAP_WIN_RIBBON = `      // Arc offset from the window center along the under chain
      // (wrapped on closed rings), then the window test with a one-pixel
      // AA ramp at its ends.
      fa = turn * t1.x;
      highp float off = fa - t1.y;
      if (t1.z > 0.0) off -= t1.z * floor(off / t1.z + 0.5);
      offA = off;
      highp float m = min(off + t2.x, t2.y - off);
      if (m <= -pxW) continue;
      inWin = clamp(m / pxW + 0.5, 0.0, 1.0);
      winM = m;
`;
const GAP_WIN_FAN = `      // FAN fragment (full ids): the casing applies only inside the UNDER
      // thread's footprint within the window (a straight line through the
      // window center along the header tangent stands in for the under
      // centerline - fine across a tip cap, too coarse for a curving arm
      // at a joint, which is why junction fans skip the casing). A
      // full-casing cut grooved webs beside the over thread (dark notches,
      // raw tucked tips at the ring URL's big-cusp joints).
      t5 = texelFetch(uGapData, ivec2(5, row), 0);
      t6 = texelFetch(uGapData, ivec2(6, row), 0);
      highp vec2 dc = p - t5.zw;
      offA = dot(dc, t6.xy);
      highp float lat = abs(dot(dc, vec2(-t6.y, t6.x)));
      inFoot = clamp((hO - lat) / pxW + 0.5, 0.0, 1.0);
      highp float mw = min(offA + t2.x, t2.y - offA);
      inWin = clamp(mw / pxW + 0.5, 0.0, 1.0);
      winM = mw;
`;
const GAP_PROT_BLOCK = `    if (!fan) {
      highp vec4 t7 = texelFetch(uGapData, ivec2(7, row), 0);
      highp float pn = gapInterval(offA, t7.x, t7.y);
      highp float pp = gapInterval(offA, t7.z, t7.w);
      for (int sd = 0; sd < 2; sd++) {
        highp float pi = sd == 0 ? pn : pp;
        if (pi <= 0.0) continue;
        pr = max(pr, pi * gapProtCover(row,
          ${GAP_PROT_NEG} + sd * 2, p, hO, pxW));
      }
      t5 = texelFetch(uGapData, ivec2(5, row), 0);
      t6 = texelFetch(uGapData, ivec2(6, row), 0);
    }
`;
function gapFragLibFan(): string {
  let s = GAP_FRAG_LIB;
  const swap = (anchor: string, to: string): void => {
    const i = s.indexOf(anchor);
    if (i < 0 || s.indexOf(anchor, i + 1) >= 0) {
      throw new Error(`fan gap library: anchor not found exactly once: ${anchor.slice(0, 48)}`);
    }
    s = s.slice(0, i) + to + s.slice(i + anchor.length);
  };
  const dropFn = (from: string): void => {
    const a = s.indexOf(from);
    const e = a < 0 ? -1 : s.indexOf("\n}\n", a);
    if (a < 0 || e < 0) throw new Error(`fan gap library: function not found: ${from.slice(0, 48)}`);
    s = s.slice(0, a) + s.slice(e + 3);
  };
  swap("  bool fan = false;", "  bool fan = true;");
  swap(GAP_WIN_RIBBON, GAP_WIN_FAN);
  swap(GAP_PROT_BLOCK, "");
  dropFn("// How much of p lies over the ribbon");
  dropFn("// 1 inside the arc interval");
  return s;
}
export const GAP_FRAG_LIB_FAN = gapFragLibFan();

// Ribbon fragment additions: the varyings GAP_VERT_* feed, the library,
// and gapKeep(pxW) for the section shader.
export const GAP_FRAG = /* glsl */ `
in highp vec2 vPos;
in highp float vTurnA;
in highp float vTurnB;
in highp vec2 vTan;
flat in highp vec4 vMaskId;
${GAP_FRAG_LIB}
// The fragment's arc turn - call in UNIFORM control flow (derivatives):
// the copy that does not jump across this triangle.
highp float gapTurn() {
  highp float fa = fwidth(vTurnA);
  highp float fb = fwidth(vTurnB);
  return fb < 0.5 * fa ? vTurnB : vTurnA;
}
highp float gapKeep(highp float pxW, highp float turn) {
  return gapKeepAt(pxW, vPos, turn, vTan, vMaskId);
}
`;

// K268: THE ROW-PARTIAL GAP UPLOAD. The slot table's source keeps a dirty
// flag per row (every GapMaskTable write marks its row), and its uploads go
// through GAP_ROWS_UPLOADER: the first upload (or a resize) allocates with
// texImage2D, afterwards each contiguous run of dirty rows goes up with one
// texSubImage2D and a clean table sends nothing. Before K268 every upload()
// re-sent the whole texture (GAP_TEX_W x capacity texels), so a reveal
// growth frame that moved one slot's factor paid for all of them.
const GAP_ROWS_UPLOAD_ID = "knot-gap-rows";

class GapRowSource extends BufferImageSource {
  readonly dirty: Uint8Array;
  any = false;
  constructor(data: Float32Array, width: number, rows: number) {
    super({
      resource: data,
      width,
      height: rows,
      format: "rgba32float",
      // Raw data, never premultiplied (pixi only premultiplies on upload
      // for 'premultiply-alpha-on-upload').
      alphaMode: "no-premultiply-alpha",
      scaleMode: "nearest",
      autoGenerateMipmaps: false,
    });
    this.dirty = new Uint8Array(rows);
    this.uploadMethodId = GAP_ROWS_UPLOAD_ID;
  }
  mark(row: number): void {
    this.dirty[row] = 1;
    this.any = true;
  }
  markAll(): void {
    this.dirty.fill(1);
    this.any = true;
  }
}

interface GapGlTexture {
  target: number;
  width: number;
  height: number;
  internalFormat: number;
  format: number;
  type: number;
}

// Bytes and upload calls the gap table has sent (probes: K268's
// before / after on a growth move).
export const GAP_UPLOAD_STATS = { bytes: 0, calls: 0 };

// Exported for the tests (a fake GL context drives it there).
export const GAP_ROWS_UPLOADER = {
  id: GAP_ROWS_UPLOAD_ID,
  upload(source: GapRowSource, glTexture: GapGlTexture, gl: WebGL2RenderingContext): void {
    const w = source.pixelWidth;
    const h = source.pixelHeight;
    const data = source.resource as Float32Array;
    if (glTexture.width !== w || glTexture.height !== h) {
      gl.texImage2D(
        glTexture.target,
        0,
        glTexture.internalFormat,
        w,
        h,
        0,
        glTexture.format,
        glTexture.type,
        data
      );
      glTexture.width = w;
      glTexture.height = h;
      GAP_UPLOAD_STATS.bytes += w * h * 16;
      GAP_UPLOAD_STATS.calls++;
    } else if (source.any) {
      const dr = source.dirty;
      const rows = Math.min(h, dr.length);
      let r = 0;
      while (r < rows) {
        if (!dr[r]) {
          r++;
          continue;
        }
        const lo = r;
        while (r < rows && dr[r]) r++;
        gl.texSubImage2D(
          glTexture.target,
          0,
          0,
          lo,
          w,
          r - lo,
          glTexture.format,
          glTexture.type,
          data.subarray(lo * w * 4, r * w * 4)
        );
        GAP_UPLOAD_STATS.bytes += (r - lo) * w * 16;
        GAP_UPLOAD_STATS.calls++;
      }
    }
    source.dirty.fill(0);
    source.any = false;
  },
};
// Registered at module load, before the app creates its renderer (whose
// GlTextureSystem merges the uploader map at construction) - as
// float_rows.ts does. ribbon_renderer imports this module statically.
extensions.add({
  type: ExtensionType.TextureUploaderWebGL,
  name: GAP_ROWS_UPLOADER.id,
  ref: GAP_ROWS_UPLOADER,
});

// One page-lifetime data texture per row capacity: pixi's retained render
// state can reference a TextureSource the frame after a rebuild, so these
// are never destroyed (the PALETTE_CACHE lore); scene rebuilds reuse them.
const GAP_TEX_CACHE = new Map<
  number,
  { tex: Texture; data: Float32Array; source: GapRowSource }
>();

function gapTextureFor(rows: number): {
  tex: Texture;
  data: Float32Array;
  source: GapRowSource;
} {
  let cap = 8;
  while (cap < rows) cap *= 2;
  let hit = GAP_TEX_CACHE.get(cap);
  if (!hit) {
    const data = new Float32Array(GAP_TEX_W * cap * 4);
    const source = new GapRowSource(data, GAP_TEX_W, cap);
    const tex = new Texture({ source });
    hit = { tex, data, source };
    GAP_TEX_CACHE.set(cap, hit);
  }
  return hit;
}

// The shared texture the section shader binds before any scene exists.
export function defaultGapTexture(): Texture {
  return gapTextureFor(1).tex;
}

export interface GapSlotParams {
  hOver: number;
  margin: number;
  fade: number;
  strength: number;
  perp: boolean;
  arcScale: number; // Under chain's arc per decoded turn.
  centerArc: number;
  winNeg: number;
  winPos: number;
  closed: boolean;
  totalU: number;
  tanX: number;
  tanY: number;
  // Self-crossings only (0 = off): same-chain arc exclusion.
  selfExcl: number;
  // Junction clearance scales per side (1 = no joint in the way) and the
  // window center's world position.
  marginScaleNeg: number;
  marginScalePos: number;
  fadeScaleNeg: number;
  fadeScalePos: number;
  centerX: number;
  centerY: number;
  // Far-branch smooth-min radius (0 = off) and the segment-index
  // separation of a "far" branch, in sampled segments.
  sminK: number;
  farK: number;
  // Protect intervals (arc offsets along the under thread; A >= B = none).
  protNegA: number;
  protNegB: number;
  protPosA: number;
  protPosB: number;
  // G3-1: the over chain's SAMP range and its chunk bounding circles
  // (gapChunkBounds; GAP_MAX_CHUNKS * 4 floats). n = 0 is the marker
  // disc: the "polyline" is (centerX, centerY).
  over: GapSampRef;
  overArcPer: number;
  overChunks: Float32Array;
  // G3-1: the protect ranges in SAMP (null = none), each with its
  // bounding circle [cx, cy, r] (gapRangeCircle).
  protNeg: GapSampRef | null;
  protPos: GapSampRef | null;
  protNegCircle: readonly [number, number, number] | null;
  protPosCircle: readonly [number, number, number] | null;
}

// K268, one end of a visibility piece as a shaped cut's ramp: aS = the
// over chain's arc where the solid part ends (the slot polyline's frame),
// F = the fade's SIGNED arc length (its sign says which side is hidden; a
// hard end is +-1e-6), (dK, tK) = one interior knot of the ctrl-linear fade
// in arc (the knot's share of the fade's arc and of the fade; none = (1, 1)),
// front = the end is a frontier (the end look applies).
export interface GapRamp {
  aS: number;
  F: number;
  dK: number;
  tK: number;
  front: boolean;
}

// A shaped slot: k2b = 2b's scalar factor (texel 1.w, which the explore
// programs replace by the profile on a shaped slot), up to two ramps,
// combined by MAX (two pieces) or MIN (one piece's two ends).
export interface GapShape {
  k2b: number;
  ramps: readonly GapRamp[];
  max: boolean;
}

export class GapMaskTable {
  readonly slots: number;
  readonly tex: Texture;
  private data: Float32Array;
  private readonly source: GapRowSource;
  // K76 2b, THE THREAD REVEAL'S GAP GATE: per slot, the strength and the
  // two reject radii as writeSlot / clearSlot solved them, and the
  // visibility factor setVis applied over them (1 = as solved; NaN after
  // setShape, so the next setVis always writes).
  private readonly solved: Float32Array;
  private readonly visK: Float64Array;
  // K268 PROTECT: per slot side, the covered thread B's visibility factor
  // the explore programs scale the waiver by (1 = as solved; see
  // setProtVis). Master's programs never read the texels it lives in.
  private readonly protVis: Float64Array;

  constructor(slots: number) {
    this.slots = slots;
    const hit = gapTextureFor(slots + 1);
    this.tex = hit.tex;
    this.data = hit.data;
    this.source = hit.source;
    this.solved = new Float32Array(slots * 3);
    this.visK = new Float64Array(slots).fill(1);
    this.protVis = new Float64Array(slots * 2).fill(1);
    // A reused texture may hold another scene's slots: clear them.
    this.data.fill(0);
    for (let s = 0; s < slots; s++) this.clearSlot(s);
    this.source.markAll();
  }

  setEnabled(on: boolean, debugTint = false): void {
    // G3-1: the globals live in fabricUniforms now; row 0 keeps a copy
    // for probes that read the texture back.
    setFabricGap(on, debugTint, fabricGapBrute());
    this.data[0] = on ? 1 : 0;
    this.data[1] = debugTint ? 1 : 0;
    this.source.mark(0);
  }

  // Write one slot from its SAMP range (G3-1): the row references the
  // over chain's samples; the bounding circle is derived here from the
  // chunk circles (or the disc center).
  writeSlot(slot: number, p: GapSlotParams): void {
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    d.fill(0, o, o + GAP_TEX_W * 4);
    const n = Math.max(0, Math.min(GAP_MAX_PTS, p.over.n));
    // Texel 1.
    d[o + 4] = p.arcScale;
    d[o + 5] = p.centerArc;
    d[o + 6] = p.closed ? p.totalU : 0;
    d[o + 7] = p.strength;
    // Texel 2.
    d[o + 8] = p.winNeg;
    d[o + 9] = p.winPos;
    d[o + 10] = p.hOver;
    d[o + 11] = n;
    // Texel 3: [protVisNeg, nProtNeg, nProtPos, flags].
    const nNeg = p.protNeg && p.protNeg.n >= 2 ? p.protNeg.n : 0;
    const nPos = p.protPos && p.protPos.n >= 2 ? p.protPos.n : 0;
    d[o + 12] = 1; // protVisNeg: full waiver until the reveal scales it.
    d[o + 13] = nNeg;
    d[o + 14] = nPos;
    d[o + 15] = (p.perp ? 1 : 0) + (p.selfExcl > 0 ? 2 : 0);
    // Texel 4: the SAMP range; texel 9 its stride / count / closed.
    d[o + 16] = p.selfExcl;
    d[o + 17] = p.over.base;
    d[o + 18] = p.over.kStart;
    d[o + 19] = p.overArcPer;
    // Texel 5.
    d[o + 20] = p.fadeScaleNeg;
    d[o + 21] = p.fadeScalePos;
    d[o + 22] = p.centerX;
    d[o + 23] = p.centerY;
    // Texel 6.
    d[o + 24] = p.tanX;
    d[o + 25] = p.tanY;
    d[o + 26] = p.marginScaleNeg;
    d[o + 27] = p.marginScalePos;
    // Texel 7.
    d[o + 28] = p.protNegA;
    d[o + 29] = p.protNegB;
    d[o + 30] = p.protPosA;
    d[o + 31] = p.protPosB;
    // Texel 8.
    d[o + 32] = p.margin;
    d[o + 33] = p.fade;
    d[o + 34] = p.sminK;
    d[o + 35] = p.farK;
    d[o + 36] = p.over.stride;
    d[o + 37] = p.over.count;
    d[o + 38] = p.over.closed ? 1 : 0;
    d[o + 39] = 1; // protVisPos.
    // Chunk bounding circles.
    d.set(p.overChunks.subarray(0, GAP_MAX_CHUNKS * 4), o + GAP_CHUNK_BASE * 4);
    // Protect ranges + circles (signed count in the circle's .w).
    const prot = (
      ref: GapSampRef | null,
      circ: readonly [number, number, number] | null,
      base: number
    ): void => {
      const b = o + base * 4;
      if (!ref || !circ || ref.n < 2) return;
      d[b] = ref.base;
      d[b + 1] = ref.kStart;
      d[b + 2] = ref.n;
      d[b + 3] = ref.stride;
      d[b + 4] = circ[0];
      d[b + 5] = circ[1];
      d[b + 6] = circ[2];
      d[b + 7] = ref.closed ? -ref.count : ref.count;
    };
    prot(p.protNeg, p.protNegCircle, GAP_PROT_NEG);
    prot(p.protPos, p.protPosCircle, GAP_PROT_POS);
    // Texel 0: the bounding circle, grown by the reach of interest (the
    // smooth-min can lower a distance by up to sminK / 4).
    let bcx = p.centerX;
    let bcy = p.centerY;
    let br = 0;
    if (n >= 1) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let c = 0; c < GAP_MAX_CHUNKS; c++) {
        const co = o + (GAP_CHUNK_BASE + c) * 4;
        const r = d[co + 2];
        if (r <= 0 && n >= 2) continue;
        x0 = Math.min(x0, d[co] - r);
        y0 = Math.min(y0, d[co + 1] - r);
        x1 = Math.max(x1, d[co] + r);
        y1 = Math.max(y1, d[co + 1] + r);
      }
      if (x0 <= x1) {
        bcx = (x0 + x1) / 2;
        bcy = (y0 + y1) / 2;
        br = 0;
        for (let c = 0; c < GAP_MAX_CHUNKS; c++) {
          const co = o + (GAP_CHUNK_BASE + c) * 4;
          if (d[co + 2] <= 0 && n >= 2) continue;
          br = Math.max(br, Math.hypot(d[co] - bcx, d[co + 1] - bcy) + d[co + 2]);
        }
      }
    }
    const on = p.strength !== 0;
    d[o] = bcx;
    d[o + 1] = bcy;
    d[o + 2] = on ? br + p.hOver + p.margin + p.fade + 0.25 * p.sminK : -1;
    d[o + 3] = on ? br + p.hOver : -1;
    this.noteSolved(slot, o);
  }


  // still pointing at it from stale vertex data become no-ops.
  clearSlot(slot: number): void {
    const o = (slot + 1) * GAP_TEX_W * 4;
    this.data[o + 2] = -1;
    this.data[o + 3] = -1;
    this.data[o + 7] = 0;
    this.data[o + 11] = 0;
    // Not shaped (K268): writeSlot rewrites texel 3.w whole.
    this.data[o + 15] = this.data[o + 15] & ~GAP_FLAG_SHAPED;
    this.noteSolved(slot, o);
  }

  // A slot was just solved (written or cleared): remember its strength and
  // reject radii, unscaled, and mark its row for upload.
  private noteSolved(slot: number, o: number): void {
    const s3 = slot * 3;
    this.solved[s3] = this.data[o + 7];
    this.solved[s3 + 1] = this.data[o + 2];
    this.solved[s3 + 2] = this.data[o + 3];
    this.visK[slot] = 1;
    this.protVis[slot * 2] = 1;
    this.protVis[slot * 2 + 1] = 1;
    this.source.mark(slot + 1);
  }

  // K76 2b: scale a slot's solved strength by a visibility factor k in
  // [0, 1] (a crossing's gap is as strong as its over thread is visible).
  // k = 1 restores the slot exactly as solved. k <= 0 disables it through
  // texel 0's reject radii, the first test gapKeepAt makes for ribbons and
  // fans alike, so the shader needs no change. A GATED slot (an intro gate
  // still pending, strength < 0) keeps its encoding for any k > 0
  // (K76_reveal_mode.md section 2.3). Returns whether the table changed.
  setVis(slot: number, k: number): boolean {
    if (k === this.visK[slot]) return false;
    this.visK[slot] = k;
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    const s3 = slot * 3;
    const s = this.solved[s3];
    d[o + 7] = s < 0 ? s : s * Math.max(0, k);
    d[o + 2] = k > 0 ? this.solved[s3 + 1] : -1;
    d[o + 3] = k > 0 ? this.solved[s3 + 2] : -1;
    this.source.mark(slot + 1);
    return true;
  }

  // The visibility factor setVis last applied to a slot (1 = as solved;
  // NaN once setShape has written it).
  visOf(slot: number): number {
    return this.visK[slot];
  }

  // K268 PROTECT (stage 2 item 2, the protect part): scale a slot's
  // protect waiver by the covered thread B's visibility per side (neg /
  // pos along the under thread A; gap_mask.ts PROTECT). The factors live
  // in spare texels master's programs never read (texel 3.x = neg, texel
  // 9.w = pos; writeSlot solves them at 1), and only the explore programs
  // multiply by them (explore_glsl.ts EXPLORE_PROT_GLSL), so the mode off
  // keeps master's waiver exactly. applyExploreGaps is the writer (it
  // knows B's chain and pass from the solve). Returns whether the table
  // changed.
  setProtVis(slot: number, neg: number, pos: number): boolean {
    const n = neg <= 0 ? 0 : neg >= 1 ? 1 : neg;
    const q = pos <= 0 ? 0 : pos >= 1 ? 1 : pos;
    const i = slot * 2;
    if (this.protVis[i] === n && this.protVis[i + 1] === q) return false;
    this.protVis[i] = n;
    this.protVis[i + 1] = q;
    const o = (slot + 1) * GAP_TEX_W * 4;
    this.data[o + 12] = n;
    this.data[o + 39] = q;
    this.source.mark(slot + 1);
    return true;
  }

  // The protect factors setProtVis last applied to a slot ([neg, pos];
  // 1, 1 as solved).
  protVisOf(slot: number): [number, number] {
    return [this.protVis[slot * 2], this.protVis[slot * 2 + 1]];
  }

  // K268 THE SHAPED CUT: give a slot a visibility profile (the explore
  // programs - ribbons, fans and caps, still plucks - cut by the over
  // thread's visibility at each fragment's projection), or take it away
  // (null). A shaped slot keeps its solved reject radii (never rejected);
  // texel 1.w gets 2b's scalar k2b (0 when the over pass is hidden), which
  // the explore programs fetch but replace on a shaped slot, so only a
  // master program would read it; the profile texels keep the solved
  // strength.
  // Writes only what differs. Returns whether the table changed. null on
  // an unshaped slot is a no-op; after it, setVis restores the 2b encoding.
  setShape(slot: number, shape: GapShape | null): boolean {
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    const pb = o + GAP_PROF_BASE * 4;
    const fl = d[o + 15];
    if (shape === null) {
      if ((fl & GAP_FLAG_SHAPED) === 0) return false;
      d[o + 15] = fl & ~GAP_FLAG_SHAPED;
      d.fill(0, pb, pb + 12);
      this.visK[slot] = NaN;
      this.source.mark(slot + 1);
      return true;
    }
    const s3 = slot * 3;
    const s = this.solved[s3];
    const k = shape.k2b;
    let changed = false;
    const put = (i: number, v: number): void => {
      if (d[i] !== Math.fround(v)) {
        d[i] = v;
        changed = true;
      }
    };
    put(o + 7, k > 0 ? (s < 0 ? s : s * k) : 0);
    put(o + 2, this.solved[s3 + 1]);
    put(o + 3, this.solved[s3 + 2]);
    put(o + 15, fl | GAP_FLAG_SHAPED);
    let flags = shape.max ? GAP_PROF_MAX : 0;
    for (let r = 0; r < 2; r++) {
      const R = shape.ramps[r];
      const t = pb + r * 4;
      if (R) {
        flags |= (r === 0 ? GAP_PROF_R0 : GAP_PROF_R1) | (R.front ? (r === 0 ? GAP_PROF_F0 : GAP_PROF_F1) : 0);
        put(t, R.aS);
        put(t + 1, R.F);
        put(t + 2, R.dK);
        put(t + 3, R.tK);
      } else {
        put(t, 0);
        put(t + 1, 0);
        put(t + 2, 0);
        put(t + 3, 0);
      }
    }
    put(pb + 8, s);
    put(pb + 9, flags);
    put(pb + 10, 0);
    put(pb + 11, 0);
    this.visK[slot] = NaN;
    if (changed) this.source.mark(slot + 1);
    return changed;
  }

  // Whether a slot is shaped (texel 3.w's bit).
  isShaped(slot: number): boolean {
    return (this.data[(slot + 1) * GAP_TEX_W * 4 + 15] & GAP_FLAG_SHAPED) !== 0;
  }

  // The over chain's arc range the slot's sampled range spans (its
  // frame): [kStart * arcPer, (kStart + (n - 1) * stride) * arcPer, n].
  polyRange(slot: number): [number, number, number] {
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    const n = d[o + 11];
    const start = d[o + 18] * d[o + 19];
    return [start, start + Math.max(0, n - 1) * d[o + 36] * d[o + 19], n];
  }

  // A slot's raw row (GAP_TEX_W texels; tests, probes).
  readRow(slot: number): Float32Array {
    const o = (slot + 1) * GAP_TEX_W * 4;
    return this.data.slice(o, o + GAP_TEX_W * 4);
  }

  // A slot's profile texels (12 floats: P0, P1, P2), or null when it is
  // not shaped (probes, tests).
  readShape(slot: number): number[] | null {
    if (!this.isShaped(slot)) return null;
    const pb = (slot + 1) * GAP_TEX_W * 4 + GAP_PROF_BASE * 4;
    return Array.from(this.data.subarray(pb, pb + 12));
  }

  // Whether any row waits for upload (tests).
  get uploadPending(): boolean {
    return this.source.any;
  }

  // Read back a slot's header (diagnostics / probes). Since G3-1 the
  // points live in SAMP, so `pts` is empty; `range` is the SAMP range.
  readSlot(slot: number): {
    n: number;
    header: number[];
    pts: number[];
    range: GapSampRef & { arcPer: number };
  } {
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    return {
      n: d[o + 11],
      header: Array.from(d.subarray(o, o + GAP_HDR * 4)),
      pts: [],
      range: {
        base: d[o + 17],
        kStart: d[o + 18],
        n: d[o + 11],
        stride: d[o + 36],
        count: d[o + 37],
        closed: d[o + 38] > 0.5,
        arcPer: d[o + 19],
      },
    };
  }

  // A slot's two protect ranges as [sampBase, kStart, nPts, stride]
  // (diagnostics; the points themselves live in SAMP).
  readProt(slot: number): number[][] {
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    const out: number[][] = [];
    for (let side = 0; side < 2; side++) {
      const b = o + (GAP_PROT_NEG + side * 2) * 4;
      out.push([d[b], d[b + 1], d[b + 2], d[b + 3]]);
    }
    return out;
  }

  // A slot's header by name (diagnostics / probes - independent of the
  // texel layout).
  describeSlot(slot: number): Record<string, number | number[]> {
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    return {
      n: d[o + 11],
      strength: d[o + 7],
      hOver: d[o + 10],
      margin: d[o + 32],
      fade: d[o + 33],
      perp: d[o + 15] % 2,
      arcScale: d[o + 4],
      centerArc: d[o + 5],
      period: d[o + 6],
      winNeg: d[o + 8],
      winPos: d[o + 9],
      selfExcl: d[o + 16],
      polyStart: d[o + 18] * d[o + 19],
      polyStep: d[o + 36] * d[o + 19],
      farK: d[o + 35],
      sminK: d[o + 34],
      overBase: d[o + 17],
      overKStart: d[o + 18],
      overStride: d[o + 36],
      overCount: d[o + 37],
      scales: [d[o + 26], d[o + 27], d[o + 20], d[o + 21]],
      center: [d[o + 22], d[o + 23]],
      tan: [d[o + 24], d[o + 25]],
      prot: [d[o + 28], d[o + 29], d[o + 30], d[o + 31]],
      protN: [d[o + 13], d[o + 14]],
      protVis: [d[o + 12], d[o + 39]],
      bound: [d[o], d[o + 1], d[o + 2], d[o + 3]],
    };
  }

  // Send the rows written since the last upload (nothing when clean). Before
  // the source's first bind there is no GL texture: the first bind uploads
  // everything.
  upload(): void {
    if (this.source.any) this.source.update();
  }
}
