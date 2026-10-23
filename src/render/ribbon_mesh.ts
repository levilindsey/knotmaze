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
export function extrudeRibbon(
  out: Float32Array,
  joins: RoundJoins,
  positions: Float32Array,
  tangents: Float32Array,
  n: number,
  closed: boolean,
  halfWidth: number,
  offset = 0,
  widthMul: Float32Array | null = null
): void {
  joins.count = 0;
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
    let lx = cx + nx * wLeft;
    let ly = cy + ny * wLeft;
    let rx = cx - nx * wRight;
    let ry = cy - ny * wRight;

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
  }
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
    widthMul: Float32Array | null = null
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
      widthMul
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
  // seal disc (no border-look drawing at all).
  pushFan(
    apexX: number,
    apexY: number,
    rim: number[],
    rec: number,
    flank?: Float32Array | number[] | null,
    seal?: boolean
  ): void {
    const rimCount = rim.length / 2;
    if (
      rimCount < 2 ||
      this.vUsed + rimCount + 1 > this.recData.length ||
      this.iUsed + (rimCount - 1) * 3 > this.indexData.length
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
    this.recData.fill(rec, apex, apex + rimCount + 1);
    this.lookData[apex] = 0;
    this.lookData.fill(1, apex + 1, apex + rimCount + 1);
    if (seal) {
      this.flankData.fill(3, apex, apex + rimCount + 1);
    } else if (flank) {
      this.flankData[apex] = 0;
      for (let i = 0; i < rimCount; i++) this.flankData[apex + 1 + i] = flank[i] ?? 0;
    } else {
      this.flankData.fill(2, apex, apex + rimCount + 1);
    }
    for (let v = apex; v <= apex + rimCount; v++) {
      this.maskData.set(this.maskIds, v * GAP_SLOTS);
    }
    const ix = this.indexData;
    let n = this.iUsed;
    for (let i = 0; i < rimCount - 1; i++) {
      ix[n++] = apex;
      ix[n++] = apex + 1 + i;
      ix[n++] = apex + 2 + i;
    }
    this.iUsed = n;
    this.vUsed = apex + rimCount + 1;
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