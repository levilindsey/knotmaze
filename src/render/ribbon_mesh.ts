// A constant-size triangle-strip ribbon extruded from a centerline. The
// sample count is fixed at construction so per-frame updates only rewrite
// the position buffer (no geometry reallocation).

import { Buffer, BufferUsage, Mesh, MeshGeometry, Texture } from "pixi.js";
import { addFloatAttribute } from "./junction_field";

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
  // FILLS WEAR THE JOINT FIELD (over-fill patches, drawn with the GPU
  // field's fill shader): up to four nearby junction records per patch
  // (record texel index + 1, 0 = none), constant across every vertex - the
  // shader blends per PIXEL. null on base ribbons.
  private jointData: Float32Array | null = null;
  private jointKey = new Float32Array(4);
  // Samples the last window copy actually used (the rest repeat its last
  // pair as degenerate quads).
  private usedSpan = 0;

  constructor(
    sampleCount: number,
    closed: boolean,
    color: number,
    paint = false,
    joint = false
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
      if (joint) {
        this.jointData = new Float32Array(sampleCount * 2 * 4);
        addFloatAttribute(geometry, "aJoint", this.jointData, 4);
      }
    }
    this.mesh = new Mesh({ geometry, texture: Texture.WHITE });
    this.mesh.tint = color;
  }

  // Set this patch's nearby junction records (see jointData): `c` holds
  // four entries (record texel index + 1, 0 = none). Uploads only when the
  // set changes.
  setJoints(c: ArrayLike<number>): void {
    const jd = this.jointData;
    if (!jd) return;
    const k = this.jointKey;
    if (k[0] === c[0] && k[1] === c[1] && k[2] === c[2] && k[3] === c[3]) {
      return;
    }
    k[0] = c[0];
    k[1] = c[1];
    k[2] = c[2];
    k[3] = c[3];
    for (let v = 0; v < jd.length; v += 4) {
      jd[v] = k[0];
      jd[v + 1] = k[1];
      jd[v + 2] = k[2];
      jd[v + 3] = k[3];
    }
    this.mesh.geometry.getBuffer("aJoint").update();
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
  // CONTINUOUS ENDS: `startFrac` / `endFrac` trim the first / last pair to
  // a fractional sample position (first pair slides toward the second by
  // startFrac; last pair sits endFrac of the way from its predecessor).
  // The source strip's quad edges are straight between consecutive pairs,
  // so a lerped pair lies exactly on them: the trimmed end quad is a
  // sub-quad of the source quad (still pixel-identical where it overlaps),
  // but the patch end can sit at ANY arc instead of snapping to whole
  // samples - a sample-snapped end rode the resampling grid (which slides
  // along the material as flow breathes the chain's length) and re-snapped
  // a full sample several times per second, the "gap jitter" report.
  // Defaults (0, 1) reproduce the whole-sample copy exactly.
  updateFromRibbonWindow(
    source: RibbonMesh,
    startSample: number,
    sampleSpan: number,
    copyUVs = false,
    startFrac = 0,
    endFrac = 1
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
    if (sampleSpan >= 2) {
      if (startFrac > 0) {
        this.lerpPairFrom(
          source,
          0,
          startSample,
          startFrac,
          copyUVs,
          copyColors,
          copyFx
        );
      }
      if (endFrac < 1) {
        const last = sampleSpan - 1;
        this.lerpPairFrom(
          source,
          last,
          startSample + last - 1,
          endFrac,
          copyUVs,
          copyColors,
          copyFx
        );
        // Unused stations repeat the last pair (degenerate quads); they
        // must repeat the TRIMMED pair or the quad after it re-extends to
        // the untrimmed sample.
        for (let i = last + 1; i < this.sampleCount; i++) {
          this.vertexData.copyWithin(i * 4, last * 4, last * 4 + 4);
          if (copyUVs) this.uvData.copyWithin(i * 4, last * 4, last * 4 + 4);
          if (copyColors) {
            this.colorData!.copyWithin(i * 6, last * 6, last * 6 + 6);
          }
          if (copyFx) {
            this.fxData!.copyWithin(i * 2, last * 2, last * 2 + 2);
          }
        }
      }
    }
    this.usedSpan = Math.max(1, Math.min(sampleSpan, this.sampleCount));
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

  // PAINT-ONLY refresh of the window the last updateFromRibbonWindow copied
  // (same start, span and trims): the paint pass recolors over-fill patches
  // every tick, but their vertices only move in update(). Copies the USED
  // pairs' UV / section color / FX and uploads just that prefix - the
  // stations past the span repeat the last pair's position (zero-area
  // quads rasterize nothing), so their attributes are never read. The full
  // window copy cost the paint pass ~2/3 of its time (every animated chain
  // re-copied all 128 stations of each of its over-fills, positions
  // included, every tick). fxZero keeps meaning "the WHOLE FX buffer is
  // zero": a zero source clears it entirely.
  repaintFromRibbonWindow(
    source: RibbonMesh,
    startSample: number,
    sampleSpan: number,
    startFrac = 0,
    endFrac = 1
  ): void {
    const n = source.sampleCount;
    const span = Math.max(1, Math.min(sampleSpan, this.sampleCount));
    const cd = this.colorData;
    const scd = source.colorData;
    const copyColors = cd !== null && scd !== null;
    const fxClear = this.fxData !== null && source.fxZero && !this.fxZero;
    const copyFx =
      this.fxData !== null && source.fxData !== null && !source.fxZero;
    for (let i = 0; i < span; i++) {
      const s = (((startSample + i) % n) + n) % n;
      this.uvData[i * 4] = source.uvData[s * 4];
      this.uvData[i * 4 + 1] = source.uvData[s * 4 + 1];
      this.uvData[i * 4 + 2] = source.uvData[s * 4 + 2];
      this.uvData[i * 4 + 3] = source.uvData[s * 4 + 3];
      if (copyColors) {
        for (let k = 0; k < 6; k++) cd[i * 6 + k] = scd[s * 6 + k];
      }
      if (copyFx) {
        this.fxData![i * 2] = source.fxData![s * 2];
        this.fxData![i * 2 + 1] = source.fxData![s * 2 + 1];
      }
    }
    if (sampleSpan >= 2) {
      if (startFrac > 0) {
        this.lerpPairFrom(
          source,
          0,
          startSample,
          startFrac,
          true,
          copyColors,
          copyFx,
          false
        );
      }
      if (endFrac < 1) {
        const last = span - 1;
        this.lerpPairFrom(
          source,
          last,
          startSample + last - 1,
          endFrac,
          true,
          copyColors,
          copyFx,
          false
        );
      }
    }
    this.mesh.geometry.getBuffer("aUV").update(span * 4 * 4);
    if (copyColors) {
      this.mesh.geometry.getBuffer("aColor").update(span * 6 * 4);
      this.lastColors = null;
    }
    if (fxClear) {
      this.fxData!.fill(0);
      this.mesh.geometry.getBuffer("aFx").update();
      this.fxZero = true;
    } else if (copyFx) {
      this.mesh.geometry.getBuffer("aFx").update(span * 2 * 4);
      this.fxZero = false;
    }
  }

  // Axis-aligned bounds of the current vertices: [minX, minY, maxX, maxY].
  bounds(out: Float32Array): void {
    const vd = this.vertexData;
    const n = (this.usedSpan > 0 ? this.usedSpan : this.sampleCount) * 4;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < n; i += 2) {
      const x = vd[i];
      const y = vd[i + 1];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    out[0] = x0;
    out[1] = y0;
    out[2] = x1;
    out[3] = y1;
  }

  // Write pair `dst` as the lerp of source pairs (a, a + 1) by t (wrapped
  // indices, as the window copy) - positions (unless `positions` is false:
  // the paint-only refresh), plus UVs / colors / FX weights when those are
  // copied.
  private lerpPairFrom(
    source: RibbonMesh,
    dst: number,
    a: number,
    t: number,
    copyUVs: boolean,
    copyColors: boolean,
    copyFx: boolean,
    positions = true
  ): void {
    const n = source.sampleCount;
    const s0 = ((a % n) + n) % n;
    const s1 = (((a + 1) % n) + n) % n;
    for (let k = 0; positions && k < 4; k++) {
      const p0 = source.vertexData[s0 * 4 + k];
      this.vertexData[dst * 4 + k] =
        p0 + (source.vertexData[s1 * 4 + k] - p0) * t;
    }
    if (copyUVs) {
      for (let k = 0; k < 4; k++) {
        const u0 = source.uvData[s0 * 4 + k];
        this.uvData[dst * 4 + k] = u0 + (source.uvData[s1 * 4 + k] - u0) * t;
      }
    }
    if (copyColors) {
      for (let k = 0; k < 6; k++) {
        const c0 = source.colorData![s0 * 6 + k];
        this.colorData![dst * 6 + k] =
          c0 + (source.colorData![s1 * 6 + k] - c0) * t;
      }
    }
    if (copyFx) {
      for (let k = 0; k < 2; k++) {
        const f0 = source.fxData![s0 * 2 + k];
        this.fxData![dst * 2 + k] = f0 + (source.fxData![s1 * 2 + k] - f0) * t;
      }
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

// A pooled triangle-fan scratch mesh for junction joinery (seal discs,
// fused-tip discs, wedges, free-tip caps): capacity is fixed at
// construction and the whole thing is refilled per rebuild. Unused index
// capacity is zeroed (degenerate triangles), so partial fills need no
// geometry surgery. Vertices carry only a position and the texel index of
// their junction RECORD (aRec): the GPU junction-field shader
// (junction_field.ts) evaluates the field PER PIXEL, so fans no longer
// subdivide into rings or carry colors (Gouraud smeared the nonlinear
// field into straight streaks unless the fan was ring-subdivided).
export class TriFanMesh {
  mesh: Mesh;

  private vertexData: Float32Array;
  private recData: Float32Array;
  private indexData: Uint32Array;
  private vUsed = 0;
  private iUsed = 0;
  // Index span uploaded last commit: the GPU copy past the current fill
  // must be re-zeroed when a fill shrinks (partial uploads, see commit).
  private iPrev = 0;

  constructor(vertexCapacity: number, indexCapacity: number) {
    this.vertexData = new Float32Array(vertexCapacity * 2);
    this.recData = new Float32Array(vertexCapacity);
    this.indexData = new Uint32Array(indexCapacity);
    const geometry = new MeshGeometry({
      positions: this.vertexData,
      // Unused by the field shader (MeshGeometry wants the slot).
      uvs: new Float32Array(vertexCapacity * 2),
      indices: this.indexData,
    });
    addFloatAttribute(geometry, "aRec", this.recData, 1);
    this.mesh = new Mesh({ geometry, texture: Texture.WHITE });
  }

  begin(): void {
    this.vUsed = 0;
    this.iUsed = 0;
    this.indexData.fill(0);
  }

  // Emit one fan around an apex. `rim` is flat [x, y] per vertex, in
  // winding order; triangles are (apex, rim[i], rim[i+1]). Every vertex
  // carries `rec`, the record texel index of the fan's junction field.
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

  // Upload only the used ranges. The index range covers the larger of this
  // and the previous fill, so a shrinking fill re-zeroes its stale GPU tail
  // (begin() zeroed the CPU copy); the first upload sends the whole buffer
  // either way.
  commit(): void {
    const v = this.vUsed;
    this.mesh.geometry.getBuffer("aPosition").update(v * 2 * 4);
    this.mesh.geometry.getBuffer("aRec").update(v * 4);
    const iSpan = Math.max(this.iUsed, this.iPrev);
    this.iPrev = this.iUsed;
    this.mesh.geometry.getIndex().update(iSpan * 4);
  }
}
