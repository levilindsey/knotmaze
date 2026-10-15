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
// holds globals [enabled, tint-probe view, -, -]; slot s lives in row s+1,
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
//   texel 3: [capR, nProtNeg, nProtPos, flags (1 perp margin, 2 self,
//            4 SHAPED: K268, the thread reveal's profile below - read only
//            by the explore program, set only while the reveal is on)]
//   texel 4: [selfExcl, polyStartArc, polyStepArc, farK]
//   texel 5: [fadeScaleNeg, fadeScalePos, centerX, centerY]
//   texel 6: [underTanX, underTanY, marginScaleNeg, marginScalePos]
//   texel 7: [protNegA, protNegB, protPosA, protPosB] (protect intervals)
//   texel 8: [margin, fade, sminK, -]
//   texels 9..: chunk chords [ax, ay, bx, by], one per GAP_CHUNK segments;
//               every chunk's points lie within capR of its chord
//   then:       the over centerline polyline, one point per texel
//               [x, y, u] (u: see GAP_MAX_PTS), padded with its last point
//               to a whole chunk (zero-length segments)
//   then:       two PROTECT blocks (negative side, positive side), each a
//               bounding circle [cx, cy, r, -] and GAP_PROT_PTS polyline
//               texels in the same [x, y, u] form
//   last:       K268's SHAPED-CUT PROFILE (GAP_PROF_BASE, 3 texels): the
//               over thread's visibility along the polyline's arc frame
//               (texel 4: polyStart + k polyStep), written by setShape -
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
// polyline); the slot's silhouette still hides. A cyclic triangle (a over
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

export const GAP_HDR = 9; // Header texels per row.
export const GAP_CHUNK = 8; // Polyline segments per culling chunk.
export const GAP_MAX_CHUNKS = 7; // Chunk-chord texels per row.
const GAP_CHUNK_BASE = GAP_HDR; // First chunk-chord texel.
const GAP_PTS_BASE = GAP_HDR + GAP_MAX_CHUNKS; // First polyline texel.
// Every chunk reads GAP_CHUNK whole segments, closing point included, so
// the cap is 7 chunks x 8 segments + 1 = 57 points (padding fills the last
// chunk; never read past it). One texel per point: [x, y, u] with
// u = (next - this) / |next - this|^2, so a segment's nearest parameter is
// one dot product - no division in the search loop.
export const GAP_MAX_PTS = GAP_MAX_CHUNKS * GAP_CHUNK + 1;
// Points per protect polyline (B's local centerline at a neighboring
// crossing where the under thread goes over), two per row.
export const GAP_PROT_PTS = 16;
const GAP_PROT_CHUNKS = Math.ceil((GAP_PROT_PTS - 1) / GAP_CHUNK);
const GAP_PROT_BASE = GAP_PTS_BASE + GAP_MAX_PTS;
// Per block: bounding circle + capsule radius, chunk chords, points.
const GAP_PROT_W = 1 + GAP_PROT_CHUNKS + GAP_PROT_PTS;
// K268: the shaped-cut profile (see the header), after the protect blocks.
export const GAP_PROF_BASE = GAP_PROT_BASE + 2 * GAP_PROT_W;
export const GAP_TEX_W = GAP_PROF_BASE + 3;
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

// The chunk loop of a nearest-point search: chunks whose CAPSULE (chord +
// the slot's capR) cannot beat the best distance so far are skipped, and
// inside sqrt(sure2) the answer is settled. `seg` names the segment test
// (gapSegFast / gapSegFull) and `args` its trailing arguments.
function nearestLoop(seg: string, args: string, skip: boolean): string {
  return /* glsl */ `
  for (int c = 0; c < ${GAP_MAX_CHUNKS}; c++) {
    if (c >= nCh) break;
    if (best < sure2) break;
    int k0 = c * ${GAP_CHUNK};
    ${
      skip
        ? `// A chunk wholly inside the skipped index range adds nothing
    // (padding segments count as the last real one - see gapSegFull).
    if (k0 >= skipLo && min(k0 + ${GAP_CHUNK - 1}, int(kLast) - 1) <= skipHi) {
      continue;
    }`
        : ""
    }
    highp vec4 cc = texelFetch(uGapData, ivec2(${GAP_CHUNK_BASE} + c, row), 0);
    highp vec2 ab = cc.zw - cc.xy;
    highp float l2 = dot(ab, ab);
    highp float t = l2 > 1e-12 ? clamp(dot(p - cc.xy, ab) / l2, 0.0, 1.0) : 0.0;
    highp vec2 q = cc.xy + ab * t - p;
    highp float lb = max(sqrt(dot(q, q)) - capR, 0.0);
    if (lb * lb >= best) continue;
    int tx = ${GAP_PTS_BASE} + k0;
    highp vec4 ta = texelFetch(uGapData, ivec2(tx, row), 0);
    for (int j = 0; j < ${GAP_CHUNK}; j++) {
      highp vec4 tb = texelFetch(uGapData, ivec2(tx + j + 1, row), 0);
      ${seg}(p, ta, tb.xy, k0 + j${args}, best, bk);
      ta = tb;
    }
  }`;
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
// Fragment LIBRARY (no varyings - shared by the ribbon section shader and
// the junction-field fan shader): uGapData plus
//   gapKeepAt(pxW, p, turn, tanv, ids)
// = the fraction of the fragment at world point p that stays drawn
// (1 = untouched). turn is the fragment's arc turn along its chain
// (gapTurn); turn < 0 marks a FAN fragment: the slot's
// header tangent, the arc offset projected on it, the casing restricted
// to the under footprint (full ids only), the over silhouette. pxW (world
// units per pixel) must come from fwidth() evaluated in UNIFORM control
// flow at the top of main - derivatives inside the slot loop are
// undefined. gapProbe(): the probe view flag (masked material tinted, not
// removed).
export const GAP_FRAG_LIB = /* glsl */ `
uniform highp sampler2D uGapData;

// One polyline segment of a nearest-point search: ta = [point k, u] with
// u = (b - a) / |b - a|^2 (zero for a zero-length segment), b = point k+1.
// FAST: the plain distance.
void gapSegFast(highp vec2 p, highp vec4 ta, highp vec2 b, int k,
    inout highp float best, inout int bk) {
  highp vec2 pa = p - ta.xy;
  highp float h = clamp(dot(pa, ta.zw), 0.0, 1.0);
  highp vec2 q = pa - (b - ta.xy) * h;
  highp float d2 = dot(q, q);
  if (d2 < best) {
    best = d2;
    bk = k;
  }
}

// FULL: also skips segment indices skipLo..skipHi (the far-branch pass;
// empty when skipLo > skipHi) and, when ex > 0 (self-crossings), a segment
// whose nearest point's chain arc lies within ex of the fragment's arc fa
// (s0/st: the polyline's arc parameterization, kLast: the last real point
// - padding repeats it; per: the ring period, 0 on open chains).
void gapSegFull(highp vec2 p, highp vec4 ta, highp vec2 b, int k,
    highp float ex, highp float fa, highp float s0, highp float st,
    highp float kLast, highp float per, int skipLo, int skipHi,
    inout highp float best, inout int bk) {
  // Padding segments (k >= kLast: zero-length copies of the last point)
  // stand for the LAST REAL segment: by raw index they fell outside a skip
  // range that holds that segment, and the far-branch pass found the
  // polyline's own end point as a "second branch" - a smooth-min dip near
  // polyline ends on straight runs (caught by the same-state smin census).
  int ks = min(k, int(kLast) - 1);
  if (ks >= skipLo && ks <= skipHi) return;
  highp vec2 pa = p - ta.xy;
  highp float h = clamp(dot(pa, ta.zw), 0.0, 1.0);
  if (ex > 0.0) {
    highp float da = s0 + min(float(k) + h, kLast) * st - fa;
    if (per > 0.0) da -= per * floor(da / per + 0.5);
    if (abs(da) < ex) return;
  }
  highp vec2 q = pa - (b - ta.xy) * h;
  highp float d2 = dot(q, q);
  if (d2 < best) {
    best = d2;
    bk = k;
  }
}

highp vec4 gapPt(int row, int k) {
  return texelFetch(uGapData, ivec2(${GAP_PTS_BASE} + k, row), 0);
}

// Nearest point of the polyline within sqrt(best) (best is the squared
// reach on entry); the nearest segment (-1: none within reach) comes back
// through bk. Fast form: no exclusions.
void gapNearestFast(int row, int nCh, highp float capR, highp vec2 p,
    highp float sure2, inout highp float best, inout int bk) {
${nearestLoop("gapSegFast", "", false)}
}

void gapNearestFull(int row, int nCh, highp float capR, highp vec2 p,
    highp float ex, highp float fa, highp float s0, highp float st,
    highp float kLast, highp float per, int skipLo, int skipHi,
    highp float sure2, inout highp float best, inout int bk) {
${nearestLoop(
  "gapSegFull",
  ", ex, fa, s0, st, kLast, per, skipLo, skipHi",
  true
)}
}
bool gapProbe() {
  return texelFetch(uGapData, ivec2(0, 0), 0).y > 0.5;
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
// polyline of n points in the block at texel base: 1 inside, a one-pixel
// ramp at its edge, 0 outside (and for n < 2). A block is [cx, cy, r,
// capR] (bounding circle, chunk capsule radius), GAP_PROT_CHUNKS chunk
// chords, then the points. Only distances below h + pxW matter, so the
// circle and the chunk capsules reject most fragments before any segment
// test (an unculled 16-point loop cost 0.2 ms/frame at the user URL).
highp float gapProtCover(int row, int base, int n, highp vec2 p,
    highp float h, highp float pxW) {
  if (n < 2) return 0.0;
  highp vec4 bc = texelFetch(uGapData, ivec2(base, row), 0);
  highp float reach = h + pxW;
  highp float rr = bc.z + reach;
  highp vec2 dc = p - bc.xy;
  if (dot(dc, dc) > rr * rr) return 0.0;
  highp float best = reach * reach;
  for (int c = 0; c < ${GAP_PROT_CHUNKS}; c++) {
    int k0 = c * ${GAP_CHUNK};
    if (k0 >= n - 1) break;
    highp vec4 cc = texelFetch(uGapData, ivec2(base + 1 + c, row), 0);
    highp vec2 ab = cc.zw - cc.xy;
    highp float l2 = dot(ab, ab);
    highp float t = l2 > 1e-12 ? clamp(dot(p - cc.xy, ab) / l2, 0.0, 1.0) : 0.0;
    highp vec2 q = cc.xy + ab * t - p;
    highp float lb = max(sqrt(dot(q, q)) - bc.w, 0.0);
    if (lb * lb >= best) continue;
    int tx = base + 1 + ${GAP_PROT_CHUNKS} + k0;
    highp vec4 ta = texelFetch(uGapData, ivec2(tx, row), 0);
    for (int j = 1; j <= ${GAP_CHUNK}; j++) {
      if (k0 + j >= n) break;
      highp vec4 tb = texelFetch(uGapData, ivec2(tx + j, row), 0);
      highp vec2 pa = p - ta.xy;
      highp float h2 = clamp(dot(pa, ta.zw), 0.0, 1.0);
      highp vec2 qq = pa - (tb.xy - ta.xy) * h2;
      best = min(best, dot(qq, qq));
      ta = tb;
    }
  }
  return clamp((h - sqrt(best)) / pxW + 0.5, 0.0, 1.0);
}

highp float gapKeepAt(highp float pxW, highp vec2 p, highp float turn,
    highp vec2 tanv, highp vec4 ids) {
  if (all(lessThan(abs(ids + 1.0), vec4(0.5)))) return 1.0;
  highp vec4 glob = texelFetch(uGapData, ivec2(0, 0), 0);
  if (glob.x < 0.5) return 1.0;
  // Every slot of a ribbon fragment windows the fragment's own chain, so
  // one turn serves them all.
  bool fan = turn < -0.5;
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
    if (fan) {
      // FAN fragment (full ids): the casing applies only inside the UNDER
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
    } else {
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
    }
    highp vec4 t3 = texelFetch(uGapData, ivec2(3, row), 0);
    int fl = int(t3.w + 0.5);
    bool perp = (fl & 1) != 0;
    int n = int(t2.w + 0.5);
    highp float kLast = float(max(n - 1, 0));
    int nCh = (max(n - 1, 1) + ${GAP_CHUNK - 1}) / ${GAP_CHUNK};
    highp float capR = t3.x;
    highp float ex = 0.0;
    highp float s0 = 0.0;
    highp float st = 0.0;
    highp float per = 0.0;
    highp vec4 t4 = vec4(0.0);
    bool haveT4 = false;
    if ((fl & 2) != 0 && !fan) {
      t4 = texelFetch(uGapData, ivec2(4, row), 0);
      haveT4 = true;
      ex = t4.x;
      s0 = t4.y;
      st = t4.z;
      per = t1.z;
    }
    // REACH of interest (texel 0 holds it grown by the bounding radius):
    // beyond it nothing this slot does is visible. Inside SURE the
    // fragment is hidden whatever the margin, protect, fade or smooth-min
    // say (the silhouette always hides; the fan cut is inset one pixel
    // more), so the search may stop there.
    highp float reach = full ? hO + (t0.z - t0.w) + 2.0 * pxW : hO + pxW;
    highp float sure = hO - ((full && !fan) ? 1.0 : 1.5) * pxW;
    highp float sure2 = sure > 0.0 ? sure * sure : 0.0;
    highp float best = reach * reach;
    int bk = -1;
    if (haveT4) {
      gapNearestFull(row, nCh, capR, p, ex, fa, s0, st, kLast, per, 1, 0,
        sure2, best, bk);
    } else {
      gapNearestFast(row, nCh, capR, p, sure2, best, bk);
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
          ${GAP_PROT_BASE} + sd * ${GAP_PROT_W},
          int((sd == 0 ? t3.y : t3.z) + 0.5), p, hO, pxW));
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
      int k1 = min(bk + 1, n - 1);
      highp vec2 pm = gapPt(row, max(bk - 1, 0)).xy;
      highp vec4 p0u = gapPt(row, min(bk, n - 1));
      highp vec2 p0 = p0u.xy;
      highp vec2 p1 = gapPt(row, k1).xy;
      highp vec2 pp = gapPt(row, min(k1 + 1, n - 1)).xy;
      // The nearest parameter on segment bk (zero-length: 0).
      highp float bt = clamp(dot(p - p0, p0u.zw), 0.0, 1.0);
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
        if (!haveT4) t4 = texelFetch(uGapData, ivec2(4, row), 0);
        int farK = int(t4.w + 0.5);
        highp float best2 = (d + sk) * (d + sk);
        int bk2 = -1;
        gapNearestFull(row, nCh, capR, p, ex, fa, s0, st, kLast, per,
          bk - farK, bk + farK, 0.0, best2, bk2);
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
  // Self-crossings only (0 = off): same-chain arc exclusion, and the
  // polyline's chain-arc parameterization.
  selfExcl: number;
  polyStart: number;
  polyStep: number;
  // Junction clearance scales per side (1 = no joint in the way) and the
  // window center's world position.
  marginScaleNeg: number;
  marginScalePos: number;
  fadeScaleNeg: number;
  fadeScalePos: number;
  centerX: number;
  centerY: number;
  // Far-branch smooth-min radius (0 = off) and the segment-index
  // separation of a "far" branch.
  sminK: number;
  farK: number;
  // Protect intervals (arc offsets along the under thread; A >= B = none)
  // and their polylines: protPts holds GAP_PROT_PTS [x, y] points per side
  // (negative side first), protNegN / protPosN of them used (< 2 = none).
  protNegA: number;
  protNegB: number;
  protPosA: number;
  protPosB: number;
  protPts: Float32Array | null;
  protNegN: number;
  protPosN: number;
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

  constructor(slots: number) {
    this.slots = slots;
    const hit = gapTextureFor(slots + 1);
    this.tex = hit.tex;
    this.data = hit.data;
    this.source = hit.source;
    this.solved = new Float32Array(slots * 3);
    this.visK = new Float64Array(slots).fill(1);
    // A reused texture may hold another scene's slots: clear them.
    this.data.fill(0);
    for (let s = 0; s < slots; s++) this.clearSlot(s);
    this.source.markAll();
  }

  setEnabled(on: boolean, debugTint = false): void {
    this.data[0] = on ? 1 : 0;
    this.data[1] = debugTint ? 1 : 0;
    this.source.mark(0);
  }

  // Write one slot; pts is a flat [x, y, ...] polyline of nPts points. The
  // bounding circle, its reach-grown radii, the chunk chords and the
  // capsule radius are derived here.
  writeSlot(
    slot: number,
    p: GapSlotParams,
    pts: Float32Array,
    nPts: number
  ): void {
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    const n = Math.max(1, Math.min(GAP_MAX_PTS, nPts));
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
    // Texel 3: [capR (below), nProtNeg, nProtPos, flags].
    const pts2 = p.protPts;
    const nNeg = pts2 ? Math.min(GAP_PROT_PTS, p.protNegN) : 0;
    const nPos = pts2 ? Math.min(GAP_PROT_PTS, p.protPosN) : 0;
    d[o + 13] = nNeg >= 2 ? nNeg : 0;
    d[o + 14] = nPos >= 2 ? nPos : 0;
    d[o + 15] = (p.perp ? 1 : 0) + (p.selfExcl > 0 ? 2 : 0);
    // Protect blocks: the polyline's bounding circle, then its points as
    // [x, y, u] like the main polyline.
    if (pts2) {
      for (let side = 0; side < 2; side++) {
        const m = side === 0 ? nNeg : nPos;
        if (m < 2) continue;
        const src = side * GAP_PROT_PTS * 2;
        const blk = o + (GAP_PROT_BASE + side * GAP_PROT_W) * 4;
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (let k = 0; k < m; k++) {
          x0 = Math.min(x0, pts2[src + k * 2]);
          y0 = Math.min(y0, pts2[src + k * 2 + 1]);
          x1 = Math.max(x1, pts2[src + k * 2]);
          y1 = Math.max(y1, pts2[src + k * 2 + 1]);
        }
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        let r = 0;
        for (let k = 0; k < m; k++) {
          r = Math.max(
            r,
            Math.hypot(pts2[src + k * 2] - cx, pts2[src + k * 2 + 1] - cy)
          );
        }
        // Chunk chords (points k0 -> k0 + GAP_CHUNK) and the capsule
        // radius holding every chunk's points around its chord.
        let capR = 0;
        for (let c = 0; c < GAP_PROT_CHUNKS; c++) {
          const k0 = c * GAP_CHUNK;
          const co = blk + (1 + c) * 4;
          if (k0 >= m - 1) {
            d[co] = d[co + 1] = d[co + 2] = d[co + 3] = 0;
            continue;
          }
          const k1 = Math.min(k0 + GAP_CHUNK, m - 1);
          const ax = pts2[src + k0 * 2];
          const ay = pts2[src + k0 * 2 + 1];
          const abx = pts2[src + k1 * 2] - ax;
          const aby = pts2[src + k1 * 2 + 1] - ay;
          const l2 = abx * abx + aby * aby;
          for (let k = k0; k <= k1; k++) {
            const x = pts2[src + k * 2];
            const y = pts2[src + k * 2 + 1];
            const t =
              l2 > 1e-12
                ? Math.min(1, Math.max(0, ((x - ax) * abx + (y - ay) * aby) / l2))
                : 0;
            capR = Math.max(capR, Math.hypot(ax + abx * t - x, ay + aby * t - y));
          }
          d[co] = ax;
          d[co + 1] = ay;
          d[co + 2] = ax + abx;
          d[co + 3] = ay + aby;
        }
        d[blk] = cx;
        d[blk + 1] = cy;
        d[blk + 2] = r + 1e-4;
        d[blk + 3] = capR + 1e-4;
        const dst = blk + (1 + GAP_PROT_CHUNKS) * 4;
        for (let k = 0; k < m; k++) {
          const x = pts2[src + k * 2];
          const y = pts2[src + k * 2 + 1];
          let ux = 0;
          let uy = 0;
          if (k < m - 1) {
            const sx = pts2[src + k * 2 + 2] - x;
            const sy = pts2[src + k * 2 + 3] - y;
            const l2 = sx * sx + sy * sy;
            if (l2 > 1e-12) {
              ux = sx / l2;
              uy = sy / l2;
            }
          }
          d[dst + k * 4] = x;
          d[dst + k * 4 + 1] = y;
          d[dst + k * 4 + 2] = ux;
          d[dst + k * 4 + 3] = uy;
        }
      }
    }
    // Texel 4.
    d[o + 16] = p.selfExcl;
    d[o + 17] = p.polyStart;
    d[o + 18] = p.polyStep;
    d[o + 19] = p.farK;
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
    d[o + 35] = 0;
    // Polyline, one texel per point [x, y, u] (u = the segment to the next
    // point over its squared length; zero past the last point), padded
    // with its last point to a whole chunk so every chunk reads GAP_CHUNK
    // uniform segments.
    const nCh = Math.max(1, Math.ceil(Math.max(n - 1, 1) / GAP_CHUNK));
    const padTo = Math.min(GAP_MAX_PTS, nCh * GAP_CHUNK + 1);
    const base = o + GAP_PTS_BASE * 4;
    const lx = pts[(n - 1) * 2];
    const ly = pts[(n - 1) * 2 + 1];
    for (let k = 0; k < padTo; k++) {
      const x = k < n ? pts[k * 2] : lx;
      const y = k < n ? pts[k * 2 + 1] : ly;
      let ux = 0;
      let uy = 0;
      if (k < n - 1) {
        const sx = pts[k * 2 + 2] - x;
        const sy = pts[k * 2 + 3] - y;
        const l2 = sx * sx + sy * sy;
        if (l2 > 1e-12) {
          ux = sx / l2;
          uy = sy / l2;
        }
      }
      const b = base + k * 4;
      d[b] = x;
      d[b + 1] = y;
      d[b + 2] = ux;
      d[b + 3] = uy;
    }
    // Chunk chords (points k0 -> k0 + GAP_CHUNK) and the capsule radius
    // that holds every chunk's points around its chord, plus the overall
    // bounding box.
    let bx0 = Infinity;
    let by0 = Infinity;
    let bx1 = -Infinity;
    let by1 = -Infinity;
    let capR = 0;
    for (let c = 0; c < nCh; c++) {
      const k0 = c * GAP_CHUNK;
      const k1 = Math.min(k0 + GAP_CHUNK, n - 1);
      const ax = pts[k0 * 2];
      const ay = pts[k0 * 2 + 1];
      const bx = pts[k1 * 2];
      const by = pts[k1 * 2 + 1];
      const abx = bx - ax;
      const aby = by - ay;
      const l2 = abx * abx + aby * aby;
      for (let k = k0; k <= k1; k++) {
        const x = pts[k * 2];
        const y = pts[k * 2 + 1];
        if (x < bx0) bx0 = x;
        if (y < by0) by0 = y;
        if (x > bx1) bx1 = x;
        if (y > by1) by1 = y;
        const t =
          l2 > 1e-12
            ? Math.min(1, Math.max(0, ((x - ax) * abx + (y - ay) * aby) / l2))
            : 0;
        capR = Math.max(capR, Math.hypot(ax + abx * t - x, ay + aby * t - y));
      }
      const co = o + (GAP_CHUNK_BASE + c) * 4;
      d[co] = ax;
      d[co + 1] = ay;
      d[co + 2] = bx;
      d[co + 3] = by;
    }
    d[o + 12] = capR + 1e-4;
    const bcx = (bx0 + bx1) / 2;
    const bcy = (by0 + by1) / 2;
    let br = 0;
    for (let k = 0; k < n; k++) {
      br = Math.max(br, Math.hypot(pts[k * 2] - bcx, pts[k * 2 + 1] - bcy));
    }
    br += 1e-4;
    // Texel 0: the bounding circle, grown by the reach of interest (the
    // smooth-min can lower a distance by up to sminK / 4).
    const on = p.strength !== 0 && nPts >= 1;
    d[o] = bcx;
    d[o + 1] = bcy;
    d[o + 2] = on ? br + p.hOver + p.margin + p.fade + 0.25 * p.sminK : -1;
    d[o + 3] = on ? br + p.hOver : -1;
    this.noteSolved(slot, o);
  }

  // Disable a slot (negative reject radii, strength 0, no points): ids
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

  // The over chain's arc range the slot's polyline spans (its frame):
  // [polyStart, polyStart + (n - 1) polyStep, n].
  polyRange(slot: number): [number, number, number] {
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    const n = d[o + 11];
    return [d[o + 17], d[o + 17] + Math.max(0, n - 1) * d[o + 18], n];
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

  // Read back a slot's header + polyline (diagnostics / probes).
  readSlot(slot: number): {
    n: number;
    header: number[];
    pts: number[];
  } {
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    const n = d[o + 11];
    const pts: number[] = [];
    for (let k = 0; k < n; k++) {
      const t = o + (GAP_PTS_BASE + k) * 4;
      pts.push(d[t], d[t + 1]);
    }
    return {
      n,
      header: Array.from(d.subarray(o, o + GAP_HDR * 4)),
      pts,
    };
  }

  // A slot's two protect polylines as flat [x, y, ...] (diagnostics).
  readProt(slot: number): number[][] {
    const d = this.data;
    const o = (slot + 1) * GAP_TEX_W * 4;
    const out: number[][] = [];
    for (let side = 0; side < 2; side++) {
      const n = d[o + 13 + side];
      const pts: number[] = [];
      const b = o + (GAP_PROT_BASE + side * GAP_PROT_W + 1 + GAP_PROT_CHUNKS) * 4;
      for (let k = 0; k < n; k++) pts.push(d[b + k * 4], d[b + k * 4 + 1]);
      out.push(pts);
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
      polyStart: d[o + 17],
      polyStep: d[o + 18],
      farK: d[o + 19],
      sminK: d[o + 34],
      scales: [d[o + 26], d[o + 27], d[o + 20], d[o + 21]],
      center: [d[o + 22], d[o + 23]],
      tan: [d[o + 24], d[o + 25]],
      prot: [d[o + 28], d[o + 29], d[o + 30], d[o + 31]],
      protN: [d[o + 13], d[o + 14]],
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
