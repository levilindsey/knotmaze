// K1362 s7: the two-pass split's intermediate targets. Pass 1 (gf_glsl.ts
// SPLIT1, the tier's scan, keys and corners) writes each pixel's pieces into
// four unsigned-integer targets; pass 2 (SPLIT2, layers() and composite())
// reads them back with texelFetch. The targets share the GfTarget's
// depth-stencil, which carries the route: pass 1 sets 1 where it kept the
// pixel, pass 2 draws stencil 1, the full program stencil 0 (gf_pass.ts).
//
// Layout per pixel (16 bytes per piece the tier holds, + 8), piece j in target j (zero past the pixel's np):
//   x = chain | (group + 1) << 16
//   y = (lo + 32768) | (hi - lo) << 16 | (nearest segment - lo) << 24
//   z, w = the key and the ramp, as float bits
// target np (RG32UI): x = corner 0 | corner 1 << 16;
//   y = (thru corner + 1) | yielded << 16 | nk << 17 | np << 19
// A value outside its field discards in pass 1, so the full program draws it.

/** The targets' formats: one RGBA32UI per piece the tier holds (np), then one RG32UI (corners and counts). */
export const gfSplitBytes = (np: number): number => np * 16 + 8;

export class GfPieces {
  readonly gl: WebGL2RenderingContext;
  readonly fbo: WebGLFramebuffer;
  /** The pieces' targets (np of them), then the corners' (tex[np]). */
  readonly tex: WebGLTexture[] = [];
  readonly np: number;
  private ds: WebGLRenderbuffer | null = null;
  w = 0; h = 0;
  constructor(gl: WebGL2RenderingContext, np: number) {
    this.gl = gl; this.np = np;
    this.fbo = gl.createFramebuffer()!;
    for (let i = 0; i <= np; i++) this.tex.push(gl.createTexture()!);
  }

  /** Bind the pieces' framebuffer at w x h over ds (the target's depth-stencil, already sized w x h). */
  bind(w: number, h: number, ds: WebGLRenderbuffer): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    let changed = false;
    if (w !== this.w || h !== this.h) {
      this.w = w; this.h = h; changed = true;
      for (let i = 0; i <= this.np; i++) {
        gl.bindTexture(gl.TEXTURE_2D, this.tex[i]);
        if (i < this.np) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, w, h, 0, gl.RGBA_INTEGER, gl.UNSIGNED_INT, null);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32UI, w, h, 0, gl.RG_INTEGER, gl.UNSIGNED_INT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, this.tex[i], 0);
      }
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.drawBuffers(this.tex.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    }
    if (ds !== this.ds || changed) {
      this.ds = ds;
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, ds);
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`gf pieces incomplete (${st})`);
    }
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteFramebuffer(this.fbo);
    for (const t of this.tex) gl.deleteTexture(t);
  }
}
