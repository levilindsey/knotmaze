// A constant-size triangle-strip ribbon extruded from a centerline. The
// sample count is fixed at construction so per-frame updates only rewrite
// the position buffer (no geometry reallocation).

import { Buffer, BufferUsage, Mesh, MeshGeometry, Texture } from "pixi.js";
import { GAP_SLOTS } from "./gap_mask";
import { addFloatAttribute } from "./junction_field";

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
    for (let i = 0; i < sampleCount; i++) {
      const u = i / (closed ? sampleCount : Math.max(sampleCount - 1, 1));
      uvs[i * 4] = u;
      uvs[i * 4 + 1] = 0;
      uvs[i * 4 + 2] = u;
      uvs[i * 4 + 3] = 1;
    }

    const quadCount = closed ? sampleCount : sampleCount - 1;
    const indices = new Uint32Array(quadCount * 6);
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
      addFloatAttribute(geometry, "aKey", key, 2);
    }
    this.mesh = new Mesh({ geometry, texture: Texture.WHITE });
    this.mesh.tint = color;
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
    uploadAll(this.mesh.geometry, "aMaskId");
  }

  // Rewrite vertex positions from a closed centerline. `positions`/
  // `tangents` are flat [x0,y0,...] arrays; `offset` selects the first
  // sample to read. `widthMul` (REVEAL mask, Stage 22) scales each
  // sample's extrusion width in [0, 1]: unrevealed samples collapse to the
  // centerline (zero-area triangles rasterize nothing). null = all 1, the
  // zero-cost default - the multiply never runs.
  update(
    positions: Float32Array,
    tangents: Float32Array,
    halfWidth: number,
    offset = 0,
    widthMul: Float32Array | null = null
  ): void {
    const n = this.sampleCount;
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
      if (!this.closed) {
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
      // cos^2(half-angle) = (1 + cos(angle)) / 2; clamp keeps miter <= 2x.
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
      this.vertexData[i * 4] = cx + nx * wLeft;
      this.vertexData[i * 4 + 1] = cy + ny * wLeft;
      this.vertexData[i * 4 + 2] = cx - nx * wRight;
      this.vertexData[i * 4 + 3] = cy - ny * wRight;
    }
    uploadAll(this.mesh.geometry, "aPosition");
    // The gap shader's under tangent (arc-length margin): both verts of a
    // sample share the sample tangent.
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
      uploadAll(this.mesh.geometry, "aTan");
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
  pushFan(apexX: number, apexY: number, rim: number[], rec: number): void {
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