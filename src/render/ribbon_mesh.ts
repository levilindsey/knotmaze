// A constant-size triangle-strip ribbon extruded from a centerline. The
// sample count is fixed at construction so per-frame updates only rewrite
// the position buffer (no geometry reallocation).

import { Buffer, BufferUsage, Mesh, MeshGeometry, Texture } from "pixi.js";
import { GAP_SLOTS } from "./gap_mask";
import { STRIP_REC_TAG, addFloatAttribute } from "./junction_field";

// Upload a WHOLE attribute buffer. pixi's Buffer.update(size) REMEMBERS
// its size: a bare update() after a partial one re-sends only that prefix
// (GlBufferSystem uploads buffer._updateSize bytes), leaving the GPU tail
// stale. Over-fills mixed both (repaintFromRibbonWindow's prefix uploads,
// then a window copy that GREW the span showed old paint/FX at its end);
// with per-pixel gaps there are no over-fills, but every full upload still
// goes through here so a future partial one cannot strand a tail.
function uploadAll(geometry: MeshGeometry, name: string): void {
  const buffer = geometry.getBuffer(name);
  buffer.update(buffer.data.byteLength);
}


// PER-PIXEL GAP attributes (see gap_mask.ts): aArcPos (vec2, the sample's
// arc position as a unit vector - static), aTan (vec2, the ribbon tangent)
// and aMaskId (vec4, gap slot ids, -1 = none). Every geometry drawn with
// the section shader MUST carry all three (fans: zero arc vectors).
function addGapAttributes(
  geometry: MeshGeometry,
  arcPos: Float32Array,
  tan: Float32Array,
  maskId: Float32Array
): void {
  const add = (
    name: string,
    data: Float32Array,
    size: 2 | 4,
    label: string
  ): void => {
    geometry.addAttribute(name, {
      buffer: new Buffer({
        data,
        label,
        usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
      }),
      format: size === 2 ? "float32x2" : "float32x4",
      stride: size * 4,
      offset: 0,
    });
  };
  add("aArcPos", arcPos, 2, "attribute-gap-arcpos");
  add("aTan", tan, 2, "attribute-gap-tangent");
  add("aMaskId", maskId, 4, "attribute-gap-slots");
}


// ROUND JOINS (K580 s3; the band moved to 90-100 deg in s4). A sample that
// turns past ROUND_DOT_START (a 90 deg turn) stops mitering on its outer
// side: the strip's outer edge
// follows the round-joined ideal (every point within the half-width of
// the centerline) instead. The miter put the outer vertex up to 2h out
// along the sample TANGENT's normal, and at a cusp with unequal legs that
// tangent follows one leg: the vertex landed h past the stroke's edges (a
// thorn, K580's a's J), and the chord from it to the next outer vertex cut
// inside the next leg's edge (a notch, the i's joint in "ai"). A round
// sample instead gets ROUND_ARC_SEGMENTS extra vertices from a pool past
// the strip's 2n: arc points around the sample at the half-width, swept
// from the incoming leg's outer normal to the outgoing leg's, plus B, the
// outgoing leg's own corner. The incoming quad keeps the sample's main
// outer vertex (A, the incoming leg's corner), the outgoing quad's outer
// index is rewired to B, and a fan from the inner vertex covers A..B.
// Both inner and outer vertices sit on the TRUE outer bisector of the two
// normalized legs (a - b), not the tangent's normal. The concave clamp is
// unchanged (the inner vertex keeps master's distance, 0.3h at a cusp).
// CONTINUITY: between 90 and 100 deg (ROUND_DOT_FULL) every round vertex
// blends, by a smoothstep of the turn's cosine, from master's miter vertex
// to its round position, so the extra vertices start collapsed on the
// miter vertex and a turn swept through the threshold moves the outline
// continuously. Below 90 deg nothing changes: every vertex is
// bit-identical to the plain miter. The 1-degree sweep test bounds the
// largest step (ribbon_round.test.ts).
// WHY 90/100 (K580 s4, K675): stage 3's 110/120 left the glyph cusps that
// turn 103-114 deg partly mitered (the a's J2 at xh 2, 113.5 deg, had its
// outer vertex 1.39h out; the i's joint sample at xh 3, 110.8 deg, barely
// blended). Every glyph cusp now turns past 100 deg and is fully round.
// No sample of the glyph-free scenes (knot, maze, reveal, burn, a kinky
// knot) turns past 90 deg (stage 3 and 4's counts), so they stay bit for
// bit on the miter.
export const ROUND_ARC_SEGMENTS = 8;
/** cos(90 deg): a sharper turn starts to round. */
export const ROUND_DOT_START = 0;
/** cos(100 deg): from here the join is fully round. */
export const ROUND_DOT_FULL = -0.17364817766693033;

// The round joins one extrusion found, in sample order: the sample, its
// outer side (0 = left, vertex 2i; 1 = right, vertex 2i + 1) and the
// ROUND_ARC_SEGMENTS pool vertex positions (the arc's interior points,
// then B). Grows by doubling, so steady state allocates nothing.
export class RoundJoins {
  count = 0;
  sample: Int32Array;
  side: Uint8Array;
  pos: Float32Array;

  constructor(capacity = 4) {
    this.sample = new Int32Array(capacity);
    this.side = new Uint8Array(capacity);
    this.pos = new Float32Array(capacity * ROUND_ARC_SEGMENTS * 2);
  }

  // Append a join; returns its first float in `pos`.
  push(sample: number, side: number): number {
    if (this.count === this.sample.length) {
      const cap = this.sample.length * 2;
      const s = new Int32Array(cap);
      s.set(this.sample);
      this.sample = s;
      const d = new Uint8Array(cap);
      d.set(this.side);
      this.side = d;
      const p = new Float32Array(cap * ROUND_ARC_SEGMENTS * 2);
      p.set(this.pos);
      this.pos = p;
    }
    const j = this.count++;
    this.sample[j] = sample;
    this.side[j] = side;
    return j * ROUND_ARC_SEGMENTS * 2;
  }
}

// The strip's vertex computation, pure (no GPU), so tests can run it:
// writes [lx, ly, rx, ry] per sample into out[0, 4n) and refills `joins`
// with the round samples. See update() for the arguments.
//
// FOLD COLLAPSE (K1228): the concave clamp below caps the inner offset
// at 0.95 R, so where a turn runs tighter than the half-width (R < h)
// the strip thins into the turn and background shows inside the
// half-width (cross ji 51: a 40 deg turn at R 0.85 h left pixels 2-4 px
// inside chain 61's edge bare). Simply removing the cap folds the strip
// (the P3.34 sawtooth: flipped triangles where the inner vertices run
// past the centre of curvature in a changing order). Instead, a run of
// consecutive folding samples (the cap binds, same inner side, no round
// join, no lean; widthMul narrows the legs' offset lines with the strip)
// has its inner vertices collapsed onto ONE point: P, where the inner
// offset lines of the run's entering and leaving legs cross (each at its
// own width from its leg). The
// inner outline then runs along the entering line to P and out along
// the leaving line - the two legs' own edges - the quads inside the run
// become a fan about P (one triangle of each is degenerate), and the
// full half-width is covered. A run is collapsed only when every strip
// triangle it touches keeps the strip's winding (area >= 0, degenerate
// allowed) and P stays within 4h of the run's samples; anything else
// (a turn past ~160 deg in the run, near-parallel legs, a kink eye's
// full loop) keeps the clamped vertices exactly as before. Scratch is
// module-level and grow-only, so steady-state calls allocate nothing;
// extrudeRibbon is never re-entered.
let foldSide = new Int8Array(0); // per sample: +1 inner is left, -1 right, 0 no fold
let foldLegA = new Float32Array(0); // per sample: normalized entering leg
let foldLegB = new Float32Array(0); // per sample: normalized leaving leg
let foldSaved = new Float32Array(0); // per sample: its pre-collapse inner vertex
let foldMark = new Uint8Array(0); // per sample: foldSaved holds its vertex
let foldDepth = new Float32Array(0); // per sample: 1 - innerCap / w when the cap binds
export function extrudeRibbon(
  out: Float32Array,
  joins: RoundJoins,
  positions: Float32Array,
  tangents: Float32Array,
  n: number,
  closed: boolean,
  halfWidth: number,
  offset = 0,
  widthMul: Float32Array | null = null,
  leanK: Float32Array | null = null
): void {
  joins.count = 0;
  if (foldSide.length < n) {
    foldSide = new Int8Array(n);
    foldLegA = new Float32Array(n * 2);
    foldLegB = new Float32Array(n * 2);
    foldSaved = new Float32Array(n * 2);
    foldMark = new Uint8Array(n);
    foldDepth = new Float32Array(n);
  }
  let plain = true; // no lean: the fold collapse's strip (widthMul is handled)
  for (let i = 0; i < n; i++) {
    const s = (offset + i) * 2;
    const sPrev = (offset + ((i - 1 + n) % n)) * 2;
    const sNext = (offset + ((i + 1) % n)) * 2;
    const cx = positions[s];
    const cy = positions[s + 1];

    // Miter: at a sharp join the perpendicular offset must lengthen to
    // halfWidth / cos(half-angle) along the bisector (which the
    // centered-difference tangent already is), or the outline dimples at
    // every kink apex.
    let ax = cx - positions[sPrev];
    let ay = cy - positions[sPrev + 1];
    let bx = positions[sNext] - cx;
    let by = positions[sNext + 1] - cy;
    // An OPEN ribbon's tips have no join: the wrapped "neighbor" above is
    // the far end of the thread, and mitering against that phantom leg
    // flares the tip into a wedge. Duplicate the one real leg so the tip
    // gets a plain perpendicular cap (dot = 1 -> w = halfWidth).
    if (!closed) {
      if (i === 0) {
        ax = bx;
        ay = by;
      } else if (i === n - 1) {
        bx = ax;
        by = ay;
      }
    }
    let la = Math.hypot(ax, ay);
    let lb = Math.hypot(bx, by);
    // ZERO-LENGTH LEGS: a bridge's tucked tip collapses its last samples
    // onto one point, so a leg can have no direction. Normalizing the
    // zero vector left it zero, dot came out 0 - read as a 90-degree turn
    // - and the miter widened those samples to 1.41x: the tip cap flared
    // past the ribbon's sides as thin spurs ("sticky-outy bits" at every
    // tucked bridge tip). Borrow the other leg; both zero = straight.
    if (la < 1e-6 && lb < 1e-6) {
      ax = bx = 1;
      ay = by = 0;
      la = lb = 1;
    } else if (la < 1e-6) {
      ax = bx;
      ay = by;
      la = lb;
    } else if (lb < 1e-6) {
      bx = ax;
      by = ay;
      lb = la;
    }
    ax /= la;
    ay /= la;
    bx /= lb;
    by /= lb;
    const dot = ax * bx + ay * by;
    // cos^2(half-angle) = (1 + cos(angle)) / 2; clamp keeps miter <= 2x
    // (only blends now: past 100 deg the outer side is round).
    const cosHalf = Math.sqrt(Math.max((1 + dot) / 2, 0.25));
    const w = halfWidth / cosHalf;

    // CONCAVE-SIDE CLAMP: where the centerline turns tighter than the
    // offset length, the inner vertices of consecutive samples cross
    // past the local center of curvature and the strip self-overlaps -
    // rendered as a jagged sawtooth seam inside the fill (the
    // "parallel threads merged" user artifact was this, a single
    // over-tight fold). The inner offset may never exceed the local
    // turn radius; the ribbon instead thins into the fold. Floor at
    // 30% width so the strip never fully collapses.
    let wInner = w;
    let innerCap = Infinity;
    const sinHalf = Math.sqrt(Math.max((1 - dot) / 2, 0));
    if (sinHalf > 1e-4) {
      const radius = ((la + lb) / 4) * (cosHalf / sinHalf);
      innerCap = Math.max(radius * 0.95, halfWidth * 0.3);
      wInner = Math.min(w, innerCap);
    }
    const cross = ax * by - ay * bx;
    foldLegA[i * 2] = ax;
    foldLegA[i * 2 + 1] = ay;
    foldLegB[i * 2] = bx;
    foldLegB[i * 2 + 1] = by;
    // A folding sample (K1228): the cap binds, the turn is at most 60
    // deg (a sharper single sample is a cusp on its way to a round
    // join, whose hub keeps the capped vertex, and the 80-120 deg
    // continuity sweep in ribbon_round.test.ts stays bit-exact there),
    // and the inside is a definite side.
    foldSide[i] =
      innerCap < w && dot >= 0.5 && cross !== 0 ? (cross > 0 ? 1 : -1) : 0;
    foldDepth[i] = innerCap < w ? Math.max(0, (w - innerCap) / w) : 0;
    let wLeft = cross > 0 ? wInner : w;
    let wRight = cross > 0 ? w : wInner;
    if (widthMul) {
      const m = widthMul[i];
      if (m > 1) {
        // SWELL (appearance FX): the outer side grows freely, but the
        // concave side still may never pass the local turn radius - a
        // swollen strip would fold back into the sawtooth seam.
        const grown = w * m;
        const grownInner = Math.min(grown, Math.max(innerCap, wInner));
        wLeft = cross > 0 ? grownInner : grown;
        wRight = cross > 0 ? grown : grownInner;
      } else {
        wLeft *= m;
        wRight *= m;
      }
    }

    const nx = -tangents[s + 1];
    const ny = tangents[s];
    // K829 TAPER LEAN: where a tapered glyph root's width changes along
    // the strand, the true outline is the swept discs' envelope, which
    // leans forward of the perpendicular by asin(k) (leanK = -dw/ds per
    // sample, built by the renderer for tapered roots only). Tilting
    // the offset axis draws that envelope; k = 0 is today's square
    // offset, bit-identical. (Round joins below keep their own arc.)
    let ox = nx;
    let oy = ny;
    if (leanK) {
      const k = leanK[i];
      if (k > 0.001 || k < -0.001) plain = false;
      if (k > 0.001 || k < -0.001) {
        const c = Math.sqrt(Math.max(0, 1 - k * k));
        ox = nx * c + tangents[s] * k;
        oy = ny * c + tangents[s + 1] * k;
      }
    }
    let lx = cx + ox * wLeft;
    let ly = cy + oy * wLeft;
    let rx = cx - ox * wRight;
    let ry = cy - oy * wRight;

    if (dot < ROUND_DOT_START) {
      // ROUND JOIN (see ROUND_ARC_SEGMENTS). t: 0 = master's miter, 1 = round.
      const u = (ROUND_DOT_START - dot) / (ROUND_DOT_START - ROUND_DOT_FULL);
      const t = u >= 1 ? 1 : u * u * (3 - 2 * u);
      const outerRight = cross > 0;
      const sg = outerRight ? 1 : -1;
      // The true outer bisector: a - b points out of the turn (|a - b| =
      // 2 sin(turn / 2) >= 1.41 here).
      let mx = ax - bx;
      let my = ay - by;
      const ml = Math.sqrt(mx * mx + my * my);
      mx /= ml;
      my /= ml;
      // Outer normals of the two legs, and the arc's radius.
      const nax = sg * ay;
      const nay = -sg * ax;
      const nbx = sg * by;
      const nby = -sg * bx;
      const rad = widthMul ? halfWidth * widthMul[i] : halfWidth;
      const wIn = outerRight ? wLeft : wRight;
      // Master's outer (pm) and inner (qm) vertices start the blend.
      const pmx = outerRight ? rx : lx;
      const pmy = outerRight ? ry : ly;
      const qmx = outerRight ? lx : rx;
      const qmy = outerRight ? ly : ry;
      const ox = pmx + (cx + nax * rad - pmx) * t;
      const oy = pmy + (cy + nay * rad - pmy) * t;
      const ix = qmx + (cx - mx * wIn - qmx) * t;
      const iy = qmy + (cy - my * wIn - qmy) * t;
      if (outerRight) {
        rx = ox;
        ry = oy;
        lx = ix;
        ly = iy;
      } else {
        lx = ox;
        ly = oy;
        rx = ix;
        ry = iy;
      }
      // The arc from leg a's outer normal to leg b's, through the
      // bisector: the turn angle in ROUND_ARC_SEGMENTS equal steps.
      const step = (sg * Math.acos(dot < -1 ? -1 : dot)) / ROUND_ARC_SEGMENTS;
      const cs = Math.cos(step);
      const sn = Math.sin(step);
      const base = joins.push(i, outerRight ? 1 : 0);
      const P = joins.pos;
      let ex = nax;
      let ey = nay;
      for (let k = 1; k < ROUND_ARC_SEGMENTS; k++) {
        const e2 = ex * cs - ey * sn;
        ey = ex * sn + ey * cs;
        ex = e2;
        P[base + (k - 1) * 2] = pmx + (cx + ex * rad - pmx) * t;
        P[base + (k - 1) * 2 + 1] = pmy + (cy + ey * rad - pmy) * t;
      }
      // B, exactly on leg b's outer edge.
      P[base + (ROUND_ARC_SEGMENTS - 1) * 2] = pmx + (cx + nbx * rad - pmx) * t;
      P[base + (ROUND_ARC_SEGMENTS - 1) * 2 + 1] = pmy + (cy + nby * rad - pmy) * t;
    }

    out[i * 4] = lx;
    out[i * 4 + 1] = ly;
    out[i * 4 + 2] = rx;
    out[i * 4 + 3] = ry;
    // FOLD COLLAPSE (K1228): on the last sample every vertex is written.
    if (i === n - 1 && plain) collapseFolds(out, positions, n, closed, halfWidth, offset, widthMul);
  }
}

// FOLD COLLAPSE (K1228, see the scratch above extrudeRibbon): collapse
// each run of folding samples onto P, the crossing of its two legs'
// inner offset lines, when the strip triangles it touches keep their
// winding.
function collapseFolds(
  out: Float32Array,
  positions: Float32Array,
  n: number,
  closed: boolean,
  halfWidth: number,
  offset: number,
  widthMul: Float32Array | null
): void {
  if (n < 2) return;
  let anyFold = false;
  for (let i = 0; i < n && !anyFold; i++) anyFold = foldSide[i] !== 0;
  if (!anyFold) return;
  const runs: Array<[number, number]> = [];
  for (let i = 0; i < n; ) {
    if (foldSide[i] === 0) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && foldSide[j + 1] === foldSide[i]) j++;
    runs.push([i, j]);
    i = j + 1;
  }
  if (runs.length === 0) return;
  // A closed chain's run may wrap the sample seam: merge the end runs
  // (the merged run's indices run past n - 1 and wrap in the reads).
  if (closed && runs.length > 1) {
    const first = runs[0];
    const last = runs[runs.length - 1];
    if (first[0] === 0 && last[1] === n - 1 && foldSide[0] === foldSide[n - 1]) {
      runs.splice(0, 1);
      runs.splice(runs.length - 1, 1);
      runs.push([last[0], first[1] + n]);
    }
  }
  const at = (k: number): number => ((k % n) + n) % n;
  const ctr = (k: number): number => (offset + at(k)) * 2;
  // A collapsed run stands only if every strip triangle it touches
  // (quads a-1 .. b) keeps the strip's winding (area >= 0, degenerate
  // halves allowed) and every one of its samples keeps its centre
  // covered by one of those triangles - a fan that reaches past a
  // centre leaves the thread's middle bare, which winding cannot see.
  // `skipLast` leaves the quad to the next sample unchecked while that
  // sample is itself a folding sample whose own collapse is still to
  // come (the shared quad passes only with both ends collapsed); the
  // final sweep below rechecks every run with it off.
  const inTri = (
    cx: number, cy: number,
    ax: number, ay: number, bx: number, by: number, qx: number, qy: number
  ): boolean => {
    const d = (by - qy) * (ax - qx) + (qx - bx) * (ay - qy);
    if (Math.abs(d) < 1e-12) return false;
    const u = ((cx - qx) * (by - qy) - (cy - qy) * (bx - qx)) / d;
    const v = ((ax - qx) * (cy - qy) - (ay - qy) * (cx - qx)) / d;
    return u >= -1e-9 && v >= -1e-9 && u + v <= 1 + 1e-9;
  };
  const stripOk = (a: number, b: number, skipLast: boolean): boolean => {
    const qEnd = closed ? b : Math.min(b, n - 2);
    for (let q = a - 1; q <= qEnd; q++) {
      if (!closed && q < 0) continue;
      if (skipLast && q === b) continue;
      const i = at(q) * 4;
      const j = at(q + 1) * 4;
      if (
        (out[i + 2] - out[i]) * (out[j + 1] - out[i + 1]) -
          (out[i + 3] - out[i + 1]) * (out[j] - out[i]) <
          -1e-9 ||
        (out[j + 2] - out[i + 2]) * (out[j + 1] - out[i + 3]) -
          (out[j + 3] - out[i + 3]) * (out[j] - out[i + 2]) <
          -1e-9
      )
        return false;
    }
    for (let k = a; k <= b; k++) {
      const c = ctr(k);
      const cx = positions[c];
      const cy = positions[c + 1];
      let covered = false;
      for (let q = a - 1; q <= qEnd && !covered; q++) {
        if (!closed && q < 0) continue;
        const i = at(q) * 4;
        const j = at(q + 1) * 4;
        covered =
          inTri(cx, cy, out[i], out[i + 1], out[i + 2], out[i + 3], out[j], out[j + 1]) ||
          inTri(cx, cy, out[i + 2], out[i + 3], out[j + 2], out[j + 3], out[j], out[j + 1]);
      }
      if (!covered) return false;
    }
    return true;
  };
  const restore = (a: number, b: number, slot: number): void => {
    for (let k = a; k <= b; k++) {
      const s = at(k);
      const o = s * 4 + slot;
      out[o] = foldSaved[s * 2];
      out[o + 1] = foldSaved[s * 2 + 1];
    }
  };
  const consumed = new Uint8Array(n); // samples an earlier run absorbed
  const touched: Array<[number, number, number]> = [];
  const done: Array<[number, number, number]> = [];
  for (let [a, b] of runs) {
    while (a <= b && consumed[at(a)]) a++;
    if (a > b) continue;
    const side = foldSide[at(a)];
    const slot = side > 0 ? 0 : 2;
    // Blend at the fold's onset (the round joins' continuity rule): a
    // run's vertices slide from their clamped positions to P by a
    // smoothstep of the deepest core sample's fold depth, so a turn
    // tightening through R = h moves the outline continuously instead
    // of popping the day the collapse first stands.
    let depth = 0;
    for (let k = a; k <= b; k++) depth = Math.max(depth, foldDepth[at(k)]);
    const bu = Math.min(1, depth / 0.1);
    const tRun = bu * bu * (3 - 2 * bu);
    const innerProj = (k: number, ox: number, oy: number, ux: number, uy: number): number => {
      const o = at(k) * 4 + slot;
      return (out[o] - ox) * ux + (out[o + 1] - oy) * uy;
    };
    const plainSample = (k: number): boolean => {
      const i = at(k);
      if (foldSide[i] !== 0) return false;
      const d =
        foldLegA[i * 2] * foldLegB[i * 2] + foldLegA[i * 2 + 1] * foldLegB[i * 2 + 1];
      if (d < ROUND_DOT_START) return false; // a round join's hub stays
      const cr =
        foldLegA[i * 2] * foldLegB[i * 2 + 1] - foldLegA[i * 2 + 1] * foldLegB[i * 2];
      return Math.abs(cr) <= 1e-4 || (cr > 0 ? 1 : -1) === side;
    };
    // P and the run's span settle together: absorbing a sample past P
    // (below) extends the run, which moves the leaving leg and so P.
    // Iterate to a fixed point (a few rounds at most).
    let px = Number.NaN;
    let py = Number.NaN;
    for (let iter = 0; iter < 6; iter++) {
      const eax = foldLegA[at(a) * 2];
      const eay = foldLegA[at(a) * 2 + 1];
      const ebx = foldLegB[at(b) * 2];
      const eby = foldLegB[at(b) * 2 + 1];
      const den = eax * eby - eay * ebx; // cross(entering, leaving) = sin(total turn)
      const dotEE = eax * ebx + eay * eby;
      px = Number.NaN;
      if (Math.abs(den) < 0.02 || dotEE < -0.94) break; // near-parallel, or past ~160 deg
      // Inner normals (left of the leg when the inside is the left side).
      const nix = -eay * side;
      const niy = eax * side;
      const nox = -eby * side;
      const noy = ebx * side;
      const ca = ctr(a);
      const cb = ctr(b);
      // The legs' inner offset lines, each at the anchor sample's
      // own width (h * widthMul there: a reveal or pluck envelope
      // narrows the strip, and its legs' edges narrow with it).
      const dA = halfWidth * (widthMul ? widthMul[at(a)] : 1);
      const dB = halfWidth * (widthMul ? widthMul[at(b)] : 1);
      const ax = positions[ca] + nix * dA;
      const ay = positions[ca + 1] + niy * dA;
      const bx = positions[cb] + nox * dB;
      const by = positions[cb + 1] + noy * dB;
      const t = ((bx - ax) * eby - (by - ay) * ebx) / den;
      const qx = ax + eax * t;
      const qy = ay + eay * t;
      if (!Number.isFinite(qx) || !Number.isFinite(qy)) break;
      let near = true;
      for (let k = a; k <= b && near; k++) {
        const c = ctr(k);
        const dx = qx - positions[c];
        const dy = qy - positions[c + 1];
        if (dx * dx + dy * dy > 16 * halfWidth * halfWidth) near = false;
      }
      if (!near) break;
      px = qx;
      py = qy;
      const a0 = a;
      const b0 = b;
      // Absorb plain neighbours whose inner vertex already lies past P
      // along its leg's offset line (the miter point of a sharp corner
      // sits past the next sample's inner vertex when the spacing is
      // under h tan(turn/2) - that reversal is the fold itself). Their
      // inner vertices join the fan at P instead of crossing it.
      const pOut = (px - bx) * ebx + (py - by) * eby;
      while ((closed ? b + 1 < a + n : b < n - 1) && plainSample(b + 1) && innerProj(b + 1, bx, by, ebx, eby) <= pOut + 1e-9) b++;
      const pIn = (px - ax) * eax + (py - ay) * eay;
      while ((closed ? b + 1 < a + n : a > 0) && plainSample(a - 1) && innerProj(a - 1, ax, ay, eax, eay) >= pIn - 1e-9) a--;
      // Absorb a following folding sample whose own miter vertex
      // already lies behind P along the leaving leg (a split run's
      // next piece starts there): it joins this fan, and its own run
      // is consumed.
      for (;;) {
        if (!(closed ? b + 1 < a + n : b < n - 1)) break;
        const k = at(b + 1);
        if (foldSide[k] !== side || consumed[k]) break;
        const d =
          foldLegA[k * 2] * foldLegB[k * 2] + foldLegA[k * 2 + 1] * foldLegB[k * 2 + 1];
        if (d < ROUND_DOT_START) break;
        let tx = foldLegA[k * 2] + foldLegB[k * 2];
        let ty = foldLegA[k * 2 + 1] + foldLegB[k * 2 + 1];
        const tl = Math.hypot(tx, ty);
        if (tl < 1e-9) break;
        tx /= tl;
        ty /= tl;
        const wk = halfWidth / Math.sqrt(Math.max((1 + d) / 2, 0.25));
        const c = ctr(b + 1);
        const mx = positions[c] + -ty * side * wk;
        const my = positions[c + 1] + tx * side * wk;
        if ((mx - bx) * ebx + (my - by) * eby > pOut + 1e-9) break;
        b++;
        consumed[k] = 1;
      }
      if (a === a0 && b === b0) break;
    }
    if (!Number.isFinite(px)) continue;
    for (let k = a; k <= b; k++) {
      const s = at(k);
      const o = s * 4 + slot;
      if (!foldMark[s]) {
        foldMark[s] = 1;
        foldSaved[s * 2] = out[o];
        foldSaved[s * 2 + 1] = out[o + 1];
      }
      out[o] = foldSaved[s * 2] + (px - foldSaved[s * 2]) * tRun;
      out[o + 1] = foldSaved[s * 2 + 1] + (py - foldSaved[s * 2 + 1]) * tRun;
    }
    touched.push([a, b, slot]);
    if (stripOk(a, b, (closed || b < n - 1) && foldSide[at(b + 1)] !== 0)) {
      done.push([a, b, slot]);
    } else {
      restore(a, b, slot);
    }
  }
  // Final sweep: with every run applied, recheck each run in full (the
  // quad a split run shares with the next passes only with both ends
  // collapsed). A run that fails now is restored, and the sweep repeats
  // until what remains stands together.
  let again = true;
  while (again) {
    again = false;
    for (let d = done.length - 1; d >= 0; d--) {
      const [a, b, slot] = done[d];
      if (!stripOk(a, b, false)) {
        restore(a, b, slot);
        done.splice(d, 1);
        again = true;
      }
    }
  }
  for (const [a, b] of touched) for (let k = a; k <= b; k++) foldMark[at(k)] = 0;
}

export class RibbonMesh {
  mesh: Mesh;
  readonly sampleCount: number;

  private vertexData: Float32Array;
  // (The per-vertex section RGB attribute is gone since G2.2: the section
  // shader's vertex stage evaluates the section at the vertex's ctrl.)

  private readonly closed: boolean;
  // PER-PIXEL GAPS (shaded meshes only): per-vertex tangent (rewritten by
  // update()), per-vertex slot ids, and the per-SAMPLE id copy the last
  // setMaskIds() uploaded (the reference for change detection).
  private tanData: Float32Array | null = null;
  private maskData: Float32Array | null = null;
  private maskSample: Float32Array | null = null;
  // ROUND JOINS: the static attributes a pool vertex copies from its
  // sample, the index data (quads, then ROUND_ARC_SEGMENTS fan triangles
  // per pool slot), the pool's size (allocated lazily, doubling: a ribbon
  // that never turns sharply never grows) and the slots' current owners.
  private uvData: Float32Array;
  private arcData: Float32Array | null = null;
  private keyData: Float32Array | null = null;
  private indexData: Uint32Array;
  private readonly quadCount: number;
  private readonly joins = new RoundJoins();
  private slotCap = 0;
  private slotUsed = 0;
  private slotSample = new Int32Array(0);
  private slotSide = new Uint8Array(0);

  constructor(
    sampleCount: number,
    closed: boolean,
    color: number,
    paint = false,
    chain = 0
  ) {
    this.sampleCount = sampleCount;
    this.closed = closed;
    this.vertexData = new Float32Array(sampleCount * 4); // 2 verts per sample.

    const uvs = new Float32Array(sampleCount * 4);
    this.uvData = uvs;
    for (let i = 0; i < sampleCount; i++) {
      const u = i / (closed ? sampleCount : Math.max(sampleCount - 1, 1));
      uvs[i * 4] = u;
      uvs[i * 4 + 1] = 0;
      uvs[i * 4 + 2] = u;
      uvs[i * 4 + 3] = 1;
    }

    const quadCount = closed ? sampleCount : sampleCount - 1;
    this.quadCount = quadCount;
    const indices = new Uint32Array(quadCount * 6);
    this.indexData = indices;
    for (let i = 0; i < quadCount; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = ((i + 1) % sampleCount) * 2;
      const d = ((i + 1) % sampleCount) * 2 + 1;
      indices.set([a, b, c, b, d, c], i * 6);
    }

    const geometry = new MeshGeometry({
      positions: this.vertexData,
      uvs,
      indices,
    });
    if (paint) {
      // Arc position as a point on the unit circle: closed rings go once
      // around (the wrap quad interpolates across angle 0 seamlessly - a
      // linear arc attribute would sweep the whole ring backwards there);
      // open runs span 0.9 of a half turn (no atan2 branch ambiguity at
      // either end). The renderer's gap slots carry the matching arc
      // scale (closed: total, open: total / 0.45).
      const arcPos = new Float32Array(sampleCount * 4);
      for (let i = 0; i < sampleCount; i++) {
        const th = closed
          ? (2 * Math.PI * i) / sampleCount
          : (0.9 * Math.PI * i) / Math.max(sampleCount - 1, 1);
        const c = Math.cos(th);
        const s = Math.sin(th);
        arcPos[i * 4] = c;
        arcPos[i * 4 + 1] = s;
        arcPos[i * 4 + 2] = c;
        arcPos[i * 4 + 3] = s;
      }
      this.arcData = arcPos;
      this.tanData = new Float32Array(sampleCount * 4);
      this.maskData = new Float32Array(sampleCount * 2 * GAP_SLOTS).fill(-1);
      this.maskSample = new Float32Array(sampleCount * GAP_SLOTS).fill(-1);
      addGapAttributes(geometry, arcPos, this.tanData, this.maskData);
      // G2 SHADER PAINT (paint_glsl.ts): aKey = (chain, sample index),
      // static - the vertex stage reads the chain's header and arc table
      // with it, and the sample's arc is EXACTLY k * arcPer (decoding the
      // aArcPos turn through the GPU's atan cost ~1e-3 world on long open
      // chains - measured by the G2.0 census).
      const key = new Float32Array(sampleCount * 4);
      for (let i = 0; i < sampleCount; i++) {
        key[i * 4] = chain;
        key[i * 4 + 1] = i;
        key[i * 4 + 2] = chain;
        key[i * 4 + 3] = i;
      }
      this.keyData = key;
      addFloatAttribute(geometry, "aKey", key, 2);
    }
    this.mesh = new Mesh({ geometry, texture: Texture.WHITE });
    this.mesh.tint = color;
  }

  // The extruded outline update() last wrote: [lx, ly, rx, ry] per sample
  // (vertex 2i = left, 2i + 1 = right). Read-only for callers - K81's
  // route cover strips re-emit these exact quads in the junction pass.
  get vertices(): Float32Array {
    return this.vertexData;
  }

  // K580 s3: sample k as the K81 cover strip re-emits it, appended to
  // `out` as pushStrip's pairs ([lx, ly, rx, ry] each; triangles (a, b, c),
  // (b, d, c) between consecutive pairs). A plain sample is its own pair.
  // A round join's sample (ROUND JOINS above) adds one pair per pool vertex,
  // the outer side swapped to it and the inner vertex kept, when `room`
  // (pairs this sample may use) allows: the strip's triangles are then the
  // fill's fan and its B-rewired outgoing quad, plus degenerate slivers.
  // Without the room the corner's arc goes uncovered, as before K580 s3.
  // Returns the pairs appended.
  coverPairs(k: number, out: number[], room: number): number {
    const V = this.vertexData;
    out.push(V[k * 4], V[k * 4 + 1], V[k * 4 + 2], V[k * 4 + 3]);
    const joins = this.joins;
    if (joins.count === 0 || room < 1 + ROUND_ARC_SEGMENTS) return 1;
    let j = 0;
    while (j < joins.count && joins.sample[j] !== k) j++;
    if (j === joins.count) return 1;
    const side = joins.side[j];
    const ix = V[k * 4 + (1 - side) * 2];
    const iy = V[k * 4 + (1 - side) * 2 + 1];
    const base = 4 * this.sampleCount + j * ROUND_ARC_SEGMENTS * 2;
    for (let p = 0; p < ROUND_ARC_SEGMENTS; p++) {
      const px = V[base + p * 2];
      const py = V[base + p * 2 + 1];
      if (side === 1) out.push(ix, iy, px, py);
      else out.push(px, py, ix, iy);
    }
    return 1 + ROUND_ARC_SEGMENTS;
  }

  // PER-PIXEL GAPS: per-sample slot ids (GAP_SLOTS per sample, -1 = none).
  // Uploads only when they differ from the last call - window membership
  // changes far less often than positions.
  setMaskIds(ids: Float32Array): void {
    const ms = this.maskSample;
    const md = this.maskData;
    if (!ms || !md) return;
    const n = this.sampleCount * GAP_SLOTS;
    let same = true;
    for (let i = 0; i < n; i++) {
      if (ms[i] !== ids[i]) {
        same = false;
        break;
      }
    }
    if (same) return;
    ms.set(ids.subarray(0, n));
    for (let k = 0; k < this.sampleCount; k++) {
      for (let c = 0; c < GAP_SLOTS; c++) {
        const v = ids[k * GAP_SLOTS + c];
        md[k * 2 * GAP_SLOTS + c] = v;
        md[(k * 2 + 1) * GAP_SLOTS + c] = v;
      }
    }
    // A round join's pool vertices take their sample's ids.
    for (let j = 0; j < this.slotUsed; j++) {
      this.copySlotStatic(md, GAP_SLOTS, j);
    }
    uploadAll(this.mesh.geometry, "aMaskId");
  }

  // Rewrite vertex positions from a closed centerline. `positions`/
  // `tangents` are flat [x0,y0,...] arrays; `offset` selects the first
  // sample to read. `widthMul` (REVEAL mask, Stage 22) scales each
  // sample's extrusion width in [0, 1]: unrevealed samples collapse to the
  // centerline (zero-area triangles rasterize nothing). null = all 1, the
  // zero-cost default - the multiply never runs. The vertex math is
  // extrudeRibbon (pure, tested); round joins (ROUND_ARC_SEGMENTS) also
  // fill the pool vertices past 2n and rewire the strip when the set of
  // round samples changes.
  update(
    positions: Float32Array,
    tangents: Float32Array,
    halfWidth: number,
    offset = 0,
    widthMul: Float32Array | null = null,
    leanK: Float32Array | null = null
  ): void {
    const n = this.sampleCount;
    const joins = this.joins;
    extrudeRibbon(
      this.vertexData,
      joins,
      positions,
      tangents,
      n,
      this.closed,
      halfWidth,
      offset,
      widthMul,
      leanK
    );
    if (joins.count > 0 || this.slotUsed > 0) this.syncJoins();
    uploadAll(this.mesh.geometry, "aPosition");
    // The gap shader's under tangent (arc-length margin): both verts of a
    // sample share the sample tangent, and so do its pool vertices.
    const td = this.tanData;
    if (td) {
      for (let i = 0; i < n; i++) {
        const s = (offset + i) * 2;
        const tx = tangents[s];
        const ty = tangents[s + 1];
        td[i * 4] = tx;
        td[i * 4 + 1] = ty;
        td[i * 4 + 2] = tx;
        td[i * 4 + 3] = ty;
      }
      for (let j = 0; j < joins.count; j++) {
        const s = (offset + joins.sample[j]) * 2;
        const tx = tangents[s];
        const ty = tangents[s + 1];
        let f = (2 * n + j * ROUND_ARC_SEGMENTS) * 2;
        for (let k = 0; k < ROUND_ARC_SEGMENTS; k++) {
          td[f++] = tx;
          td[f++] = ty;
        }
      }
      uploadAll(this.mesh.geometry, "aTan");
    }
  }

  // ROUND JOINS, per frame: grow the pool if this frame has more round
  // samples than any before, rewire the strip if the round samples (or
  // their outer sides) changed, then copy the pool positions in.
  private syncJoins(): void {
    const joins = this.joins;
    const count = joins.count;
    if (count > this.slotCap) this.growSlots(count);
    let same = count === this.slotUsed;
    for (let j = 0; same && j < count; j++) {
      if (
        joins.sample[j] !== this.slotSample[j] ||
        joins.side[j] !== this.slotSide[j]
      ) {
        same = false;
      }
    }
    if (!same) this.rewire();
    const P = joins.pos;
    const V = this.vertexData;
    const base = 4 * this.sampleCount;
    for (let f = 0, e = count * ROUND_ARC_SEGMENTS * 2; f < e; f++) {
      V[base + f] = P[f];
    }
  }

  // Make the pool hold `need` slots (doubling, at least 2): every
  // per-vertex array grows to 2n + cap * ROUND_ARC_SEGMENTS vertices and
  // the index array to the quads plus ROUND_ARC_SEGMENTS fan triangles per
  // slot (zeros: degenerate until wired). Contents are kept.
  private growSlots(need: number): void {
    const K = ROUND_ARC_SEGMENTS;
    let cap = Math.max(this.slotCap * 2, 2);
    while (cap < need) cap *= 2;
    const verts = 2 * this.sampleCount + cap * K;
    const g = this.mesh.geometry;
    const grow = (old: Float32Array, per: number, fill = 0): Float32Array => {
      const a = new Float32Array(verts * per);
      a.set(old);
      if (fill !== 0) a.fill(fill, old.length);
      return a;
    };
    this.vertexData = grow(this.vertexData, 2);
    g.getBuffer("aPosition").data = this.vertexData;
    this.uvData = grow(this.uvData, 2);
    g.getBuffer("aUV").data = this.uvData;
    if (this.arcData) {
      this.arcData = grow(this.arcData, 2);
      g.getBuffer("aArcPos").data = this.arcData;
    }
    if (this.tanData) {
      this.tanData = grow(this.tanData, 2);
      g.getBuffer("aTan").data = this.tanData;
    }
    if (this.maskData) {
      this.maskData = grow(this.maskData, GAP_SLOTS, -1);
      g.getBuffer("aMaskId").data = this.maskData;
    }
    if (this.keyData) {
      this.keyData = grow(this.keyData, 2);
      g.getBuffer("aKey").data = this.keyData;
    }
    const idx = new Uint32Array(this.quadCount * 6 + cap * K * 3);
    idx.set(this.indexData);
    this.indexData = idx;
    g.indexBuffer.data = idx;
    const ss = new Int32Array(cap);
    ss.set(this.slotSample);
    this.slotSample = ss;
    const sd = new Uint8Array(cap);
    sd.set(this.slotSide);
    this.slotSide = sd;
    this.slotCap = cap;
  }

  // Wire this frame's round joins into the strip. Slot j's pool vertices
  // are v0 = 2n + j * K .. v0 + K - 1 (the arc's interior points, then B).
  // Sample i's outgoing quad (quad i) takes B in place of the main outer
  // vertex; the incoming quad keeps the main vertex (A); K triangles fan
  // from the inner (hub) vertex over A, the arc and B.
  private rewire(): void {
    const K = ROUND_ARC_SEGMENTS;
    const n = this.sampleCount;
    const I = this.indexData;
    const fan0 = this.quadCount * 6;
    for (let j = 0; j < this.slotUsed; j++) {
      const i = this.slotSample[j];
      if (i < this.quadCount) {
        if (this.slotSide[j] === 1) {
          I[i * 6 + 1] = 2 * i + 1;
          I[i * 6 + 3] = 2 * i + 1;
        } else {
          I[i * 6] = 2 * i;
        }
      }
      I.fill(0, fan0 + j * K * 3, fan0 + (j + 1) * K * 3);
    }
    const joins = this.joins;
    for (let j = 0; j < joins.count; j++) {
      const i = joins.sample[j];
      const side = joins.side[j];
      const v0 = 2 * n + j * K;
      const outer = 2 * i + side;
      const hub = 2 * i + 1 - side;
      if (i < this.quadCount) {
        if (side === 1) {
          I[i * 6 + 1] = v0 + K - 1;
          I[i * 6 + 3] = v0 + K - 1;
        } else {
          I[i * 6] = v0 + K - 1;
        }
      }
      let f = fan0 + j * K * 3;
      let prev = outer;
      for (let k = 0; k < K; k++) {
        I[f++] = hub;
        I[f++] = prev;
        I[f++] = v0 + k;
        prev = v0 + k;
      }
      this.slotSample[j] = i;
      this.slotSide[j] = side;
    }
    this.slotUsed = joins.count;
    // The pool vertices' static attributes: their sample's, on the outer
    // edge (aUV.y is the across-width coordinate, so the casing and the
    // highlight run on around the arc).
    for (let j = 0; j < this.slotUsed; j++) {
      this.copySlotStatic(this.uvData, 2, j);
      if (this.arcData) this.copySlotStatic(this.arcData, 2, j);
      if (this.keyData) this.copySlotStatic(this.keyData, 2, j);
      if (this.maskData) this.copySlotStatic(this.maskData, GAP_SLOTS, j);
    }
    const g = this.mesh.geometry;
    g.indexBuffer.update(this.indexData.byteLength);
    uploadAll(g, "aUV");
    if (this.arcData) uploadAll(g, "aArcPos");
    if (this.keyData) uploadAll(g, "aKey");
    if (this.maskData) uploadAll(g, "aMaskId");
  }

  // Copy slot j's sample's outer-vertex values (`per` floats a vertex)
  // to its ROUND_ARC_SEGMENTS pool vertices.
  private copySlotStatic(a: Float32Array, per: number, j: number): void {
    const K = ROUND_ARC_SEGMENTS;
    const src = (2 * this.slotSample[j] + this.slotSide[j]) * per;
    let dst = (2 * this.sampleCount + j * K) * per;
    for (let k = 0; k < K; k++) {
      for (let c = 0; c < per; c++) a[dst++] = a[src + c];
    }
  }

  destroy(): void {
    this.mesh.destroy({ children: true });
  }
}

// A pooled triangle-fan scratch mesh for junction joinery (seal discs,
// fused-tip discs, wedges, free-tip caps): capacity is fixed at
// construction and the whole thing is refilled per rebuild. Unused index
// capacity is zeroed (degenerate triangles), so partial fills need no
// geometry surgery. Vertices carry only a position and the texel index of
// their junction RECORD (aRec): the GPU junction-field shader
// (junction_field.ts) evaluates the field PER PIXEL, so fans no longer
// subdivide into rings or carry colors (Gouraud smeared the nonlinear
// field into straight streaks unless the fan was ring-subdivided).
// PER-PIXEL GAPS (gap_mask.ts): every vertex also carries the gap slots
// of the joint being emitted (aMaskId, from maskIds at push time) - the
// field shader masks fan pixels by those crossings' casings, so a web
// beside a diving arm dives with it.

/** K1218: true when the band's inner point q lies on the other side of
 *  the rim segment a -> b's line from the apex (the band's inner side).
 *  A degenerate segment (a rim end, a == b), or one whose line passes
 *  within `reach` of the apex, has no reliable side and reads false. */
function offApexSide(
  rim: ArrayLike<number>, a: number, b: number,
  apexX: number, apexY: number, qx: number, qy: number, reach: number,
): boolean {
  const ax = rim[a * 2];
  const ay = rim[a * 2 + 1];
  const dx = rim[b * 2] - ax;
  const dy = rim[b * 2 + 1] - ay;
  const dl = Math.sqrt(dx * dx + dy * dy);
  if (dl < 1e-9) return false;
  const sApex = (dx * (apexY - ay) - dy * (apexX - ax)) / dl;
  if (Math.abs(sApex) <= reach) return false;
  const sQ = (dx * (qy - ay) - dy * (qx - ax)) / dl;
  return sApex * sQ < 0;
}

export class TriFanMesh {
  mesh: Mesh;

  private vertexData: Float32Array;
  private recData: Float32Array;
  private lookData: Float32Array;
  // K815: a fan rim vertex's flank side (+1 one flank, -1 the other, 0
  // on the arc between; 2 = no flanks - discs and caps draw their rim
  // only; 3 = a junction seal disc, which draws nothing in the border
  // look: the wedges around it carry the outline).
  private flankData: Float32Array;
  private indexData: Uint32Array;
  private vUsed = 0;
  private iUsed = 0;
  // High-water mark of every fill's index span: the GPU copy may hold
  // nonzero indices anywhere below it, so every commit re-sends it all
  // (see commit).
  private iHigh = 0;
  // The gap slots stamped onto every vertex pushed from now on - the
  // caller points it at the crossings diving under the joint it emits.
  readonly maskIds = new Float32Array(GAP_SLOTS).fill(-1);
  private maskData: Float32Array;

  constructor(vertexCapacity: number, indexCapacity: number) {
    this.vertexData = new Float32Array(vertexCapacity * 2);
    this.recData = new Float32Array(vertexCapacity);
    this.lookData = new Float32Array(vertexCapacity);
    this.flankData = new Float32Array(vertexCapacity).fill(2);
    this.indexData = new Uint32Array(indexCapacity);
    this.maskData = new Float32Array(vertexCapacity * GAP_SLOTS).fill(-1);
    const geometry = new MeshGeometry({
      positions: this.vertexData,
      uvs: new Float32Array(2),
      indices: this.indexData,
    });
    // The field shader has no aUV, and pixi warns about every geometry
    // attribute its shader lacks - drop MeshGeometry's default slot.
    const uvBuffer = geometry.attributes.aUV.buffer;
    delete geometry.attributes.aUV;
    geometry.buffers.splice(geometry.buffers.indexOf(uvBuffer), 1);
    addFloatAttribute(geometry, "aRec", this.recData, 1);
    addFloatAttribute(geometry, "aLook", this.lookData, 1);
    addFloatAttribute(geometry, "aFlank", this.flankData, 1);
    addFloatAttribute(geometry, "aMaskId", this.maskData, 4);
    this.mesh = new Mesh({ geometry, texture: Texture.WHITE });
  }

  begin(): void {
    this.vUsed = 0;
    this.iUsed = 0;
    this.indexData.fill(0);
  }

  // Emit one fan around an apex. `rim` is flat [x, y] per vertex, in
  // winding order; triangles are (apex, rim[i], rim[i+1]). Every vertex
  // carries `rec`, the record texel index of the fan's junction field,
  // and the current maskIds.
  // `flank` (K815): the rim's flank coordinate per rim vertex (+1 on
  // one flank, -1 on the other, 0 on the arc; the wedge's perimeter),
  // or null for rim-only fans (discs, caps). `seal` marks a junction
  // seal disc (no border-look drawing at all). `flankFill` (K833)
  // replaces the rim-only 2 for junction-area discs and covers: 4 is
  // suppressed in the border look like a seal (nothing may draw inside
  // a junction there), while free-end caps keep 2.
  pushFan(
    apexX: number,
    apexY: number,
    rim: number[],
    rec: number,
    flank?: Float32Array | number[] | null,
    seal?: boolean,
    flankFill?: number,
    bandIn = 0,
    bandOut = 0
  ): void {
    const rimCount = rim.length / 2;
    const banded = bandIn > 0 && rimCount > 2;
    // K854: an outer rim ring (bandOut past the rim) lets the border
    // band straddle the rim line like the ribbons' own band straddles
    // their edge; the junction shader draws it only in the border
    // look (vLook 2 marks it) and discards it elsewhere.
    const outer = banded && bandOut > 0;
    const vCount = 1 + (banded ? (outer ? 3 : 2) * rimCount : rimCount);
    const iCount = (rimCount - 1) * (banded ? (outer ? 15 : 9) : 3);
    if (
      rimCount < 2 ||
      this.vUsed + vCount > this.recData.length ||
      this.iUsed + iCount > this.indexData.length
    ) {
      return; // Capacity is sized for the worst case; never grows.
    }
    const apex = this.vUsed;
    const vd = this.vertexData;
    vd[apex * 2] = apexX;
    vd[apex * 2 + 1] = apexY;
    for (let i = 0; i < rimCount; i++) {
      vd[(apex + 1 + i) * 2] = rim[i * 2];
      vd[(apex + 1 + i) * 2 + 1] = rim[i * 2 + 1];
    }
    if (banded) {
      // K849: an inner rim ring inset by bandIn (the border look's
      // stroke width): the outer ring carries look 1, the inner ring
      // and apex look 0, so the fan's border band is a metric strip
      // inside the rim by construction, not a fraction of the
      // apex-to-rim coordinate (which ran ~4x too wide on wedge
      // spokes and stroked the wedge interior).
      // K854: inset PERPENDICULAR to the rim (toward the apex side),
      // not toward the apex point: at the rim's tips the apex
      // direction runs along the rim, so the old inset collapsed
      // the band to a point there and the stroke stopped short of
      // the thread border it had to meet.
      for (let i = 0; i < rimCount; i++) {
        const px = rim[i * 2];
        const py = rim[i * 2 + 1];
        const i0 = Math.max(i - 1, 0);
        const i1 = Math.min(i + 1, rimCount - 1);
        let tx = rim[i1 * 2] - rim[i0 * 2];
        let ty = rim[i1 * 2 + 1] - rim[i0 * 2 + 1];
        const tl = Math.hypot(tx, ty);
        if (tl > 1e-9) { tx /= tl; ty /= tl; } else { tx = 1; ty = 0; }
        // Perpendicular, signed toward the apex.
        let nx = -ty;
        let ny = tx;
        if (nx * (apexX - px) + ny * (apexY - py) < 0) { nx = -nx; ny = -ny; }
        let qx = px + nx * bandIn;
        let qy = py + ny * bandIn;
        // K1218: where the rim folds back sharply (a wedge flank's tip
        // meeting its fillet curve), the central-difference tangent
        // turns across both legs, and the perpendicular inset can land
        // OUTSIDE the rim: the inner-rim band triangles then painted
        // the fan's body past its outline (loop ji 122's shelf at the
        // flank tip). An inset that leaves the apex side of either
        // adjacent rim segment takes the inset toward the apex point
        // instead, which lies on the apex side of both by construction.
        // A segment whose line passes within bandIn of the apex has no
        // reliable side and is not tested (K854's rim ends, where the
        // apex direction runs along the flank).
        if (
          offApexSide(rim, i0, i, apexX, apexY, qx, qy, bandIn) ||
          offApexSide(rim, i, i1, apexX, apexY, qx, qy, bandIn)
        ) {
          const ax = apexX - px;
          const ay = apexY - py;
          const al = Math.sqrt(ax * ax + ay * ay);
          const k = al > bandIn ? bandIn / al : 1;
          qx = px + ax * k;
          qy = py + ay * k;
        }
        vd[(apex + 1 + rimCount + i) * 2] = qx;
        vd[(apex + 1 + rimCount + i) * 2 + 1] = qy;
        if (outer) {
          vd[(apex + 1 + 2 * rimCount + i) * 2] = px - nx * bandOut;
          vd[(apex + 1 + 2 * rimCount + i) * 2 + 1] = py - ny * bandOut;
        }
      }
    }
    this.recData.fill(rec, apex, apex + vCount);
    this.lookData[apex] = 0;
    this.lookData.fill(1, apex + 1, apex + 1 + rimCount);
    if (banded) this.lookData.fill(0, apex + 1 + rimCount, apex + 1 + 2 * rimCount);
    if (outer) this.lookData.fill(2, apex + 1 + 2 * rimCount, apex + vCount);
    if (seal) {
      this.flankData.fill(3, apex, apex + vCount);
    } else if (flankFill !== undefined) {
      this.flankData.fill(flankFill, apex, apex + vCount);
    } else if (flank) {
      this.flankData[apex] = 0;
      for (let i = 0; i < rimCount; i++) this.flankData[apex + 1 + i] = flank[i] ?? 0;
      if (banded) {
        for (let i = 0; i < rimCount; i++) this.flankData[apex + 1 + rimCount + i] = flank[i] ?? 0;
      }
      if (outer) {
        for (let i = 0; i < rimCount; i++) this.flankData[apex + 1 + 2 * rimCount + i] = flank[i] ?? 0;
      }
    } else {
      this.flankData.fill(2, apex, apex + vCount);
    }
    for (let v = apex; v < apex + vCount; v++) {
      this.maskData.set(this.maskIds, v * GAP_SLOTS);
    }
    const ix = this.indexData;
    let n = this.iUsed;
    if (banded) {
      const inner = apex + 1 + rimCount;
      const outerB = apex + 1 + 2 * rimCount;
      for (let i = 0; i < rimCount - 1; i++) {
        ix[n++] = apex;
        ix[n++] = inner + i;
        ix[n++] = inner + i + 1;
        ix[n++] = inner + i;
        ix[n++] = apex + 1 + i;
        ix[n++] = apex + 2 + i;
        ix[n++] = inner + i;
        ix[n++] = apex + 2 + i;
        ix[n++] = inner + i + 1;
        if (outer) {
          ix[n++] = apex + 1 + i;
          ix[n++] = outerB + i;
          ix[n++] = outerB + i + 1;
          ix[n++] = apex + 1 + i;
          ix[n++] = outerB + i + 1;
          ix[n++] = apex + 2 + i;
        }
      }
    } else {
      for (let i = 0; i < rimCount - 1; i++) {
        ix[n++] = apex;
        ix[n++] = apex + 1 + i;
        ix[n++] = apex + 2 + i;
      }
    }
    this.iUsed = n;
    this.vUsed = apex + vCount;
  }

  // Emit one quad strip (K81 route cover strips): `pts` is flat
  // [lx, ly, rx, ry] per sample, the ribbon layout, and the quads are the
  // ribbon's own triangles (a, b, c), (b, d, c). Every vertex carries
  // `rec` + STRIP_REC_TAG (the field shader tells strips from fans by it)
  // and the current maskIds, like a fan.
  pushStrip(pts: number[], rec: number): void {
    const samples = pts.length / 4;
    const verts = samples * 2;
    if (
      samples < 2 ||
      this.vUsed + verts > this.recData.length ||
      this.iUsed + (samples - 1) * 6 > this.indexData.length
    ) {
      return; // Capacity is sized for the worst case; never grows.
    }
    const v0 = this.vUsed;
    this.vertexData.set(pts, v0 * 2);
    this.recData.fill(rec + STRIP_REC_TAG, v0, v0 + verts);
    for (let v = v0; v < v0 + verts; v += 2) {
      this.lookData[v] = 0;
      this.lookData[v + 1] = 1;
    }
    for (let v = v0; v < v0 + verts; v++) {
      this.maskData.set(this.maskIds, v * GAP_SLOTS);
    }
    const ix = this.indexData;
    let n = this.iUsed;
    for (let i = 0; i < samples - 1; i++) {
      const a = v0 + i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      ix[n++] = a;
      ix[n++] = b;
      ix[n++] = c;
      ix[n++] = b;
      ix[n++] = d;
      ix[n++] = c;
    }
    this.iUsed = n;
    this.vUsed = v0 + verts;
  }

  // Upload only the used vertex ranges (indices never reference past
  // vUsed), but the index range up to the HIGH-WATER MARK of every fill,
  // so a shrunk fill's stale GPU tail is always re-zeroed (begin() zeroed
  // the CPU copy). Not "the previous fill": pixi uploads a buffer once per
  // DRAW at its LAST update() size, so with two commits before one draw
  // (forced probe rebuilds, or a manual rebuild racing the tick's) the
  // shrinking commit's wider span was overwritten by the second's, and
  // with the previous span already advanced nothing re-zeroed it later -
  // stale triangles over the new layout drew flat grey/white fans and
  // thin bars across joints. The first upload sends the whole buffer
  // either way.
  commit(): void {
    const v = this.vUsed;
    this.mesh.geometry.getBuffer("aPosition").update(v * 2 * 4);
    this.mesh.geometry.getBuffer("aRec").update(v * 4);
    this.mesh.geometry.getBuffer("aLook").update(v * 4);
    this.mesh.geometry.getBuffer("aFlank").update(v * 4);
    this.mesh.geometry.getBuffer("aMaskId").update(v * GAP_SLOTS * 4);
    if (this.iUsed > this.iHigh) this.iHigh = this.iUsed;
    this.mesh.geometry.getIndex().update(this.iHigh * 4);
  }
}

// PROBE TRIANGLES (G2 censuses, diagnostics only): a mesh of independent
// triangles drawn with the ribbon SECTION shader, every attribute exposed as
// a plain Float32Array so a probe can place each triangle around one device
// pixel center and give all three vertices the SAME chain, arc turn and
// side - the production shader then evaluates exactly that material point
// (no interpolation), and the pixel is compared against the CPU mirror
// (paint_math.ts). Hidden until a probe fills it; commit() uploads all.
export class ProbeTriMesh {
  mesh: Mesh;
  readonly capacity: number;
  readonly pos: Float32Array; // 3 verts x [x, y] per triangle.
  readonly uv: Float32Array; // [paint U, side]
  // [r, g, b] - no longer an attribute (G2.2: the vertex stage evaluates
  // the section at the key's ctrl); kept so older probes still run.
  readonly color: Float32Array;
  readonly key: Float32Array; // [chain, fractional sample index]
  readonly arcPos: Float32Array; // [cos, sin] of the arc turn.
  readonly tan: Float32Array;
  readonly maskId: Float32Array;

  constructor(capacity: number) {
    this.capacity = capacity;
    const v = capacity * 3;
    this.pos = new Float32Array(v * 2);
    this.uv = new Float32Array(v * 2);
    this.color = new Float32Array(v * 3);
    this.key = new Float32Array(v * 2);
    this.arcPos = new Float32Array(v * 2);
    this.tan = new Float32Array(v * 2);
    this.maskId = new Float32Array(v * GAP_SLOTS).fill(-1);
    const indices = new Uint32Array(v);
    for (let i = 0; i < v; i++) indices[i] = i;
    const geometry = new MeshGeometry({
      positions: this.pos,
      uvs: this.uv,
      indices,
    });
    addGapAttributes(geometry, this.arcPos, this.tan, this.maskId);
    addFloatAttribute(geometry, "aKey", this.key, 2);
    this.mesh = new Mesh({ geometry, texture: Texture.WHITE });
    this.mesh.renderable = false;
  }

  // Upload every attribute (call after filling the arrays).
  commit(): void {
    const g = this.mesh.geometry;
    for (const name of [
      "aPosition",
      "aUV",
      "aKey",
      "aArcPos",
      "aTan",
      "aMaskId",
    ]) {
      uploadAll(g, name);
    }
  }
}