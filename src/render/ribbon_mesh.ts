// A constant-size triangle-strip ribbon extruded from a centerline. The
// sample count is fixed at construction so per-frame updates only rewrite
// the position buffer (no geometry reallocation).

import { Buffer, BufferUsage, Mesh, MeshGeometry, Texture } from "pixi.js";

// Attach a per-vertex aColor (vec3) attribute carrying the SECTION RGB
// (palette mode; see the renderer's section shader). The buffer rides the
// geometry like aPosition/aUV and uploads via the same update() path.
function addColorAttribute(
  geometry: MeshGeometry,
  data: Float32Array
): void {
  geometry.addAttribute("aColor", {
    buffer: new Buffer({
      data,
      label: "attribute-section-rgb",
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
    }),
    format: "float32x3",
    stride: 3 * 4,
    offset: 0,
  });
}

// Per-vertex appearance-FX weight (palette mode; see the section shader):
// 0 = inert, (0, 1] = rainbow-stripe blend over the section color,
// [-1, 0) = transparency (alpha = 1 + fx) - the dust/comet materialize
// fade. Sign-coding keeps the shared shader uniform-free. Every geometry
// drawn with the section shader MUST carry the attribute (fan meshes get
// a constant-zero buffer).
function addFxAttribute(geometry: MeshGeometry, data: Float32Array): void {
  geometry.addAttribute("aFx", {
    buffer: new Buffer({
      data,
      label: "attribute-appear-fx",
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
    }),
    format: "float32",
    stride: 4,
    offset: 0,
  });
}

export class RibbonMesh {
  mesh: Mesh;
  readonly sampleCount: number;

  private vertexData: Float32Array;
  private uvData: Float32Array;
  // Per-vertex section RGB (palette mode only; null in knot mode). Two
  // verts per sample, 3 floats each.
  private colorData: Float32Array | null = null;
  // Last writePaint colors source (reference identity): section colors
  // are static between scene rebuilds, so repeated paint ticks skip the
  // color fill + upload entirely.
  private lastColors: Float32Array | null = null;
  // Per-vertex appearance-FX weight (palette mode only). `fxZero` makes
  // the null-input path a one-compare no-op once the buffer is cleared.
  private fxData: Float32Array | null = null;
  private fxZero = true;
  private readonly closed: boolean;

  constructor(
    sampleCount: number,
    closed: boolean,
    color: number,
    paint = false
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
    this.uvData = uvs;

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
      this.colorData = new Float32Array(sampleCount * 6);
      addColorAttribute(geometry, this.colorData);
      this.fxData = new Float32Array(sampleCount * 2);
      addFxAttribute(geometry, this.fxData);
    }
    this.mesh = new Mesh({ geometry, texture: Texture.WHITE });
    this.mesh.tint = color;
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
      const la = Math.hypot(ax, ay) || 1;
      const lb = Math.hypot(bx, by) || 1;
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
      const sinHalf = Math.sqrt(Math.max((1 - dot) / 2, 0));
      if (sinHalf > 1e-4) {
        const radius = ((la + lb) / 4) * (cosHalf / sinHalf);
        wInner = Math.min(w, Math.max(radius * 0.95, halfWidth * 0.3));
      }
      const cross = ax * by - ay * bx;
      let wLeft = cross > 0 ? wInner : w;
      let wRight = cross > 0 ? w : wInner;
      if (widthMul) {
        const m = widthMul[i];
        wLeft *= m;
        wRight *= m;
      }

      const nx = -tangents[s + 1];
      const ny = tangents[s];
      this.vertexData[i * 4] = cx + nx * wLeft;
      this.vertexData[i * 4 + 1] = cy + ny * wLeft;
      this.vertexData[i * 4 + 2] = cx - nx * wRight;
      this.vertexData[i * 4 + 3] = cy - ny * wRight;
    }
    this.mesh.geometry.getBuffer("aPosition").update();
  }

  // PAINT (maze-fabric palette mode): set every sample's paint U (the
  // accent-strip coordinate - gold/pulse band) and section RGB; both
  // verts of a sample share them. `colors` is either one RGB triplet
  // (length 3: constant section color for the chain) or per-sample
  // triplets (length 3 * sampleCount). Color writes are skipped when the
  // SAME array is passed again (section colors are static per rebuild;
  // only the U paint animates).
  writePaint(us: ArrayLike<number>, colors: Float32Array): void {
    for (let i = 0; i < this.sampleCount; i++) {
      const u = us[i];
      this.uvData[i * 4] = u;
      this.uvData[i * 4 + 2] = u;
    }
    this.mesh.geometry.getBuffer("aUV").update();
    const cd = this.colorData;
    if (!cd || colors === this.lastColors) return;
    const constant = colors.length === 3;
    for (let i = 0; i < this.sampleCount; i++) {
      const o = constant ? 0 : i * 3;
      const r = colors[o];
      const g = colors[o + 1];
      const b = colors[o + 2];
      cd[i * 6] = r;
      cd[i * 6 + 1] = g;
      cd[i * 6 + 2] = b;
      cd[i * 6 + 3] = r;
      cd[i * 6 + 4] = g;
      cd[i * 6 + 5] = b;
    }
    this.mesh.geometry.getBuffer("aColor").update();
    this.lastColors = colors;
  }

  // Forget the last writePaint colors source so the next call re-uploads
  // even when handed the SAME array (an in-place recolor mutates shared
  // constant-color triplets, which the reference skip would miss).
  invalidateColors(): void {
    this.lastColors = null;
  }

  // Per-sample appearance-FX weights (both verts share). null = clear;
  // repeated nulls cost one compare. Hot chains re-upload every call -
  // the weights animate (ages tick), so no reference skip applies.
  setFx(fx: ArrayLike<number> | null): void {
    const fd = this.fxData;
    if (!fd) return;
    if (!fx) {
      if (this.fxZero) return;
      fd.fill(0);
      this.mesh.geometry.getBuffer("aFx").update();
      this.fxZero = true;
      return;
    }
    for (let i = 0; i < this.sampleCount; i++) {
      const w = fx[i];
      fd[i * 2] = w;
      fd[i * 2 + 1] = w;
    }
    this.mesh.geometry.getBuffer("aFx").update();
    this.fxZero = false;
  }

  // Copy a wrapped window of another ribbon's computed vertices into this
  // patch mesh, repeating the last pair to fill unused stations. Because the
  // vertices are byte-identical to the source ribbon's, the patch silhouette
  // matches it exactly - no outline mismatch can expose what's beneath. With
  // `copyUVs` (palette mode) the paint coordinates AND section colors ride
  // along too, so the patch recolors pixel-identically with its source
  // thread.
  updateFromRibbonWindow(
    source: RibbonMesh,
    startSample: number,
    sampleSpan: number,
    copyUVs = false
  ): void {
    const n = source.sampleCount;
    const copyColors =
      copyUVs && this.colorData !== null && source.colorData !== null;
    // FX rides along like the colors (the rainbow stripes / materialize
    // fade must recolor the over-fill patch pixel-identically with its
    // host); a zero source into an already-zero patch is a no-op.
    const copyFx =
      copyUVs &&
      this.fxData !== null &&
      source.fxData !== null &&
      !(source.fxZero && this.fxZero);
    for (let i = 0; i < this.sampleCount; i++) {
      const j = Math.min(i, sampleSpan - 1);
      const s = (((startSample + j) % n) + n) % n;
      this.vertexData[i * 4] = source.vertexData[s * 4];
      this.vertexData[i * 4 + 1] = source.vertexData[s * 4 + 1];
      this.vertexData[i * 4 + 2] = source.vertexData[s * 4 + 2];
      this.vertexData[i * 4 + 3] = source.vertexData[s * 4 + 3];
      if (copyUVs) {
        this.uvData[i * 4] = source.uvData[s * 4];
        this.uvData[i * 4 + 1] = source.uvData[s * 4 + 1];
        this.uvData[i * 4 + 2] = source.uvData[s * 4 + 2];
        this.uvData[i * 4 + 3] = source.uvData[s * 4 + 3];
      }
      if (copyColors) {
        for (let k = 0; k < 6; k++) {
          this.colorData![i * 6 + k] = source.colorData![s * 6 + k];
        }
      }
      if (copyFx) {
        this.fxData![i * 2] = source.fxData![s * 2];
        this.fxData![i * 2 + 1] = source.fxData![s * 2 + 1];
      }
    }
    this.mesh.geometry.getBuffer("aPosition").update();
    if (copyUVs) this.mesh.geometry.getBuffer("aUV").update();
    if (copyColors) {
      this.mesh.geometry.getBuffer("aColor").update();
      this.lastColors = null; // Buffer no longer mirrors a writePaint call.
    }
    if (copyFx) {
      this.mesh.geometry.getBuffer("aFx").update();
      this.fxZero = source.fxZero;
    }
  }

  destroy(): void {
    this.mesh.destroy({ children: true });
  }
}

// A stations x lanes grid mesh for crossing erase patches: stations run
// along the under thread, lanes run across its width. Both boundary rows
// (the cut caps) and boundary columns (the ribbon sides) are polylines, so
// caps can curve to follow the over thread's offset curve.
export class PatchGridMesh {
  mesh: Mesh;
  readonly stations: number;
  readonly lanes: number;

  private vertexData: Float32Array;
  private uvData: Float32Array;
  private uvDirty = false;

  constructor(stations: number, lanes: number, color: number) {
    this.stations = stations;
    this.lanes = lanes;
    this.vertexData = new Float32Array(stations * lanes * 2);

    const uvs = new Float32Array(stations * lanes * 2);
    for (let k = 0; k < stations; k++) {
      for (let l = 0; l < lanes; l++) {
        uvs[(k * lanes + l) * 2] = k / (stations - 1);
        uvs[(k * lanes + l) * 2 + 1] = l / (lanes - 1);
      }
    }
    this.uvData = uvs;

    const indices = new Uint32Array((stations - 1) * (lanes - 1) * 6);
    let i = 0;
    for (let k = 0; k < stations - 1; k++) {
      for (let l = 0; l < lanes - 1; l++) {
        const a = k * lanes + l;
        const b = a + 1;
        const c = a + lanes;
        const d = c + 1;
        indices.set([a, b, c, b, d, c], i);
        i += 6;
      }
    }

    const geometry = new MeshGeometry({
      positions: this.vertexData,
      uvs,
      indices,
    });
    this.mesh = new Mesh({ geometry, texture: Texture.WHITE });
    this.mesh.tint = color;
  }

  setVertex(station: number, lane: number, x: number, y: number): void {
    const i = (station * this.lanes + lane) * 2;
    this.vertexData[i] = x;
    this.vertexData[i + 1] = y;
  }

  // FADE (under-gap fade-out): set a vertex's texture U - its coordinate
  // along the fade ramp (0 = full-strength erase, 1 = fully faded out).
  // V stays as constructed.
  setVertexU(station: number, lane: number, u: number): void {
    this.uvData[(station * this.lanes + lane) * 2] = u;
    this.uvDirty = true;
  }

  commit(): void {
    this.mesh.geometry.getBuffer("aPosition").update();
    if (this.uvDirty) {
      this.mesh.geometry.getBuffer("aUV").update();
      this.uvDirty = false;
    }
  }

  destroy(): void {
    this.mesh.destroy({ children: true });
  }
}

// A pooled triangle-fan scratch mesh (junction fillet wedges): capacity is
// fixed at construction and the whole thing is refilled each paint tick.
// Unused index capacity is zeroed (degenerate triangles), so partial fills
// need no geometry surgery. Carries the section shader's full vertex
// layout - paint U (accent strip) + per-vertex section RGB - so wedges
// blend EXACTLY like the ribbons they join: a flat-colored wedge over a
// ramping section color drew a visible step at its boundary.
export class TriFanMesh {
  mesh: Mesh;

  private vertexData: Float32Array;
  private uvData: Float32Array;
  private colorData: Float32Array;
  private indexData: Uint32Array;
  // Per-vertex appearance-FX weight, constant per fan (fans only ever
  // carry the materialize TRANSPARENCY - stripes need the ribbon's V
  // axis). Uploads only while some fan is non-inert, plus one frame to
  // clear.
  private fxData: Float32Array;
  private fxAny = false;
  private fxWas = false;
  private vUsed = 0;
  private iUsed = 0;

  constructor(texture: Texture, vertexCapacity: number, indexCapacity: number) {
    this.vertexData = new Float32Array(vertexCapacity * 2);
    this.uvData = new Float32Array(vertexCapacity * 2);
    this.colorData = new Float32Array(vertexCapacity * 3);
    this.fxData = new Float32Array(vertexCapacity);
    this.indexData = new Uint32Array(indexCapacity);
    const geometry = new MeshGeometry({
      positions: this.vertexData,
      uvs: this.uvData,
      indices: this.indexData,
    });
    addColorAttribute(geometry, this.colorData);
    addFxAttribute(geometry, this.fxData);
    this.mesh = new Mesh({ geometry, texture });
  }

  begin(): void {
    this.vUsed = 0;
    this.iUsed = 0;
    this.fxAny = false;
    this.indexData.fill(0);
  }

  // Emit one fan around an apex. `rim` is flat [x, y, u, r, g, b] per
  // vertex, in winding order; triangles are (apex, rim[i], rim[i+1]).
  // `fx` (whole fan): 0 = inert, [-1, 0) = materialize transparency.
  pushFan(
    apexX: number,
    apexY: number,
    apexU: number,
    apexR: number,
    apexG: number,
    apexB: number,
    rim: number[],
    fx = 0
  ): void {
    const rimCount = rim.length / 6;
    if (
      this.vUsed + rimCount + 1 > this.vertexData.length / 2 ||
      this.iUsed + Math.max(0, rimCount - 1) * 3 > this.indexData.length
    ) {
      return; // Capacity is sized for the worst case; never grows.
    }
    const apex = this.vUsed++;
    this.vertexData[apex * 2] = apexX;
    this.vertexData[apex * 2 + 1] = apexY;
    this.uvData[apex * 2] = apexU;
    this.uvData[apex * 2 + 1] = 0;
    this.colorData[apex * 3] = apexR;
    this.colorData[apex * 3 + 1] = apexG;
    this.colorData[apex * 3 + 2] = apexB;
    this.fxData.fill(fx, apex, apex + rimCount + 1);
    if (fx !== 0) this.fxAny = true;
    for (let i = 0; i < rimCount; i++) {
      const k = this.vUsed + i;
      this.vertexData[k * 2] = rim[i * 6];
      this.vertexData[k * 2 + 1] = rim[i * 6 + 1];
      this.uvData[k * 2] = rim[i * 6 + 2];
      this.uvData[k * 2 + 1] = 0;
      this.colorData[k * 3] = rim[i * 6 + 3];
      this.colorData[k * 3 + 1] = rim[i * 6 + 4];
      this.colorData[k * 3 + 2] = rim[i * 6 + 5];
    }
    for (let i = 0; i < rimCount - 1; i++) {
      this.indexData[this.iUsed++] = apex;
      this.indexData[this.iUsed++] = this.vUsed + i;
      this.indexData[this.iUsed++] = this.vUsed + i + 1;
    }
    this.vUsed += rimCount;
  }

  commit(): void {
    this.mesh.geometry.getBuffer("aPosition").update();
    this.mesh.geometry.getBuffer("aUV").update();
    this.mesh.geometry.getBuffer("aColor").update();
    if (this.fxAny || this.fxWas) {
      this.mesh.geometry.getBuffer("aFx").update();
    }
    this.fxWas = this.fxAny;
    this.mesh.geometry.getIndex().update();
  }
}
