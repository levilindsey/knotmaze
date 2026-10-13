// ROW-DIRTY FLOAT DATA TEXTURES (shared by the GPU junction field and the
// G2 shader paint model). A FloatRows is a CPU mirror (RGBA float per
// texel, linear texel index, rows of `width` texels) plus the GPU source it
// uploads to: write into `data`, mark the touched texel range, flush() once
// per frame - only the dirty ROWS upload (texSubImage2D through the
// "knot-float-rows" uploader below).
//
// Float data is read with texelFetch + manual interpolation only (NEAREST
// sampling): float LINEAR filtering needs OES_texture_float_linear, which
// WebKit/mobile do not guarantee - a float texture whose sampler asks for
// LINEAR without it is INCOMPLETE and samples as black, even via texelFetch.
// Samplers must be declared highp (fragment samplers default to lowp, which
// some mobile GPUs honor for float textures).
//
// Every FloatRows lives for the PAGE lifetime: grown in place when a bigger
// scene needs more rows, never destroyed - pixi's retained render state can
// reference a source the frame after a rebuild (the PALETTE_CACHE lore).
// Writers must re-read `.data` after ensure() (growing swaps the mirror).

import { BufferImageSource, ExtensionType, extensions } from "pixi.js";

// Row width shift: linear index -> (i & (W - 1), i >> ROW_SHIFT) in GLSL.
export const ROW_SHIFT = 10;
export const ROW_W = 1 << ROW_SHIFT;

// A BufferImageSource whose uploads go through ROWS_UPLOADER: a resize (or
// the first upload) allocates with texImage2D; afterwards only the rows
// marked dirty since the last upload are sent (texSubImage2D).
class RowSource extends BufferImageSource {
  dirtyLo = 0;
  dirtyHi = 0;
  constructor(data: Float32Array, width: number, rows: number) {
    super({
      resource: data,
      width,
      height: rows,
      format: "rgba32float",
      // The payload is DATA: never premultiply (pixi sets
      // UNPACK_PREMULTIPLY_ALPHA_WEBGL from this before every upload).
      alphaMode: "premultiplied-alpha",
      scaleMode: "nearest",
      addressMode: "clamp-to-edge",
      autoGenerateMipmaps: false,
    });
    this.uploadMethodId = "knot-float-rows";
  }
}

interface GlTextureLike {
  target: number;
  width: number;
  height: number;
  internalFormat: number;
  format: number;
  type: number;
}

// Bytes this page has sent through the row uploader (probes: upload
// accounting per frame).
export const ROW_UPLOAD_STATS = { bytes: 0, calls: 0 };

const ROWS_UPLOADER = {
  id: "knot-float-rows",
  upload(
    source: RowSource,
    glTexture: GlTextureLike,
    gl: WebGL2RenderingContext
  ): void {
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
      ROW_UPLOAD_STATS.bytes += w * h * 16;
      ROW_UPLOAD_STATS.calls++;
    } else if (source.dirtyHi > source.dirtyLo) {
      const lo = Math.max(0, source.dirtyLo);
      const hi = Math.min(h, source.dirtyHi);
      if (hi > lo) {
        gl.texSubImage2D(
          glTexture.target,
          0,
          0,
          lo,
          w,
          hi - lo,
          glTexture.format,
          glTexture.type,
          data.subarray(lo * w * 4, hi * w * 4)
        );
        ROW_UPLOAD_STATS.bytes += (hi - lo) * w * 16;
        ROW_UPLOAD_STATS.calls++;
      }
    }
    source.dirtyLo = 0;
    source.dirtyHi = 0;
  },
};
// Registered at module load - before the app creates its renderer, whose
// GlTextureSystem merges the uploader map at construction. Every module
// that creates FloatRows imports this one, so the registration always runs
// before main.ts calls app.init.
extensions.add({
  type: ExtensionType.TextureUploaderWebGL,
  name: ROWS_UPLOADER.id,
  ref: ROWS_UPLOADER,
});

// CPU mirror + GPU source of one data texture.
export class FloatRows {
  readonly width: number;
  data: Float32Array;
  rows: number;
  readonly source: RowSource;
  // Content revision: bumped by every markDirty().
  rev = 0;

  constructor(width: number, rows: number) {
    this.width = width;
    this.rows = rows;
    this.data = new Float32Array(width * rows * 4);
    this.source = new RowSource(this.data, width, rows);
  }

  // Capacity for at least `texels` texels. Growing swaps the mirror for a
  // larger one (contents kept) and resizes the SAME source - pixi
  // re-allocates the same GL texture; nothing is destroyed.
  ensure(texels: number): void {
    const need = Math.max(1, Math.ceil(texels / this.width));
    if (need <= this.rows) return;
    const rows = Math.max(need, Math.ceil(this.rows * 1.5));
    const next = new Float32Array(this.width * rows * 4);
    next.set(this.data);
    this.data = next;
    this.rows = rows;
    this.source.resource = next;
    this.source.resize(this.width, rows);
  }

  // Mark texels [t0, t1) for upload. Every mark bumps `rev` (consumers
  // that cache derived output - the arm strips - compare it).
  markDirty(t0: number, t1: number): void {
    if (t1 <= t0) return;
    this.rev++;
    const r0 = Math.floor(t0 / this.width);
    const r1 = Math.min(this.rows, Math.ceil(t1 / this.width));
    const s = this.source;
    if (s.dirtyHi <= s.dirtyLo) {
      s.dirtyLo = r0;
      s.dirtyHi = r1;
    } else {
      if (r0 < s.dirtyLo) s.dirtyLo = r0;
      if (r1 > s.dirtyHi) s.dirtyHi = r1;
    }
  }

  get dirty(): boolean {
    return this.source.dirtyHi > this.source.dirtyLo;
  }

  // Upload the dirty rows now (no-op when clean). Before the source's first
  // bind there is no GL texture yet: the first bind uploads everything.
  flush(): void {
    if (this.dirty) this.source.update();
  }
}
