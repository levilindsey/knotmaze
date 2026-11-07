// K1040 S4b: form B's border ink in the app, behind the fieldBand flag (URL
// `fbb`, border look only; docs/design/K1040_s4b_band.md).
//
// The label app's twin (src/render/label/label_app.ts, K868): frame_loop.ts
// imports this module (dynamically) on the first repaint with the border
// look and fieldBand on, calls frame() before each app.render() and after()
// after it; with the flag off nothing here loads, runs, allocates or
// compiles. The renderer's labelInk switch (panel_wiring.ts) turns the
// border look's own strokes and fan rims off while either pass draws the ink.
//
// frame(): rebuild if due, then the label pass (label_b_pass.ts: form B's
// top surface per pixel, L) and the band pass (band_b_pass.ts: the foot term,
// corners included) into this module's coverage target C (RGBA8, cleared to
// 0; the band blends MAX). after(): C over the canvas in the ink's colour,
// premultiplied, alpha kept (label_band.ts's composite). C's rows follow
// gl_FragCoord, as the canvas's do, so the composite reads it unflipped.
//
// When it rebuilds: whenever the drawn positions (the renderer's samples)
// changed since the last build, and when the camera's scale changed (form
// B's aa is one device pixel in world units). The rebuild is form B, the
// label tables and the band tables, all on the main thread; its cost is
// S5's (the CPU prep), not measured here. A pan keeps the tables.
//
// Failure never reaches the ticker: a failed build, compile or draw turns
// the flag off (params.fieldBand = false; the renderer's labelInk falls back
// to the label ink's own flag) and asks for a frame.
import { buildFieldScene } from "./scene_export";
import { gatherSceneInput, type SceneExportCtx } from "./scene_export_hook";
import { FormB } from "./form_b";
import { buildLabelB } from "./label_b";
import { LabelBPass, type Affine } from "./label_b_pass";
import { pixiLabelHost } from "./label_b_host";
import { buildBandB } from "./band_b";
import { BandBPass } from "./band_b_pass";
import type { WebGLRenderer } from "pixi.js";

// The scene export leaves look.ctrlArc unset; K1040's probes use 0.47.
const CTRL_ARC = 0.47;
// The ink's colour with no border colour picked (label_app.ts's INK_AUTO:
// one colour for every section, a K868 residual).
const INK_AUTO: [number, number, number] = [0.12, 0.11, 0.09];

export interface FieldBApp {
  frame(): void;
  after(): void;
  dispose(): void;
}

const COMP_VS = `#version 300 es
void main() {
  int id = gl_VertexID;
  gl_Position = vec4(id == 1 ? 3.0 : -1.0, id == 2 ? 3.0 : -1.0, 0.0, 1.0);
}`;
const COMP_FS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uC;
uniform vec3 uInk;
out vec4 o;
void main() {
  float c = texelFetch(uC, ivec2(gl_FragCoord.xy), 0).r;
  if (c <= 0.0) discard;
  o = vec4(uInk * c, c);
}`;

/** The coverage target C and its composite. */
class Cover {
  readonly gl: WebGL2RenderingContext;
  width = 0;
  height = 0;
  private tex: WebGLTexture | null = null;
  private fbo: WebGLFramebuffer;
  private prog: WebGLProgram;
  private uC: WebGLUniformLocation | null;
  private uInk: WebGLUniformLocation | null;
  private vao: WebGLVertexArrayObject;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const mk = (type: number, src: string): WebGLShader => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`field_b composite: ${gl.getShaderInfoLog(sh)}`);
      return sh;
    };
    const pr = gl.createProgram()!;
    const v = mk(gl.VERTEX_SHADER, COMP_VS);
    const f = mk(gl.FRAGMENT_SHADER, COMP_FS);
    gl.attachShader(pr, v);
    gl.attachShader(pr, f);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(`field_b composite link: ${gl.getProgramInfoLog(pr)}`);
    gl.deleteShader(v);
    gl.deleteShader(f);
    this.prog = pr;
    this.uC = gl.getUniformLocation(pr, "uC");
    this.uInk = gl.getUniformLocation(pr, "uInk");
    this.vao = gl.createVertexArray()!;
    this.fbo = gl.createFramebuffer()!;
  }

  /** Binds C (sized w x h, cleared to 0) as the draw target. */
  begin(w: number, h: number): void {
    const gl = this.gl;
    if (w !== this.width || h !== this.height || !this.tex) {
      if (this.tex) gl.deleteTexture(this.tex);
      this.tex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`field_b cover: framebuffer status ${st}`);
      this.width = w;
      this.height = h;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, true);
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));
  }

  /** C over the canvas (the default framebuffer) in one colour. */
  composite(ink: [number, number, number]): void {
    if (!this.tex) return;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.uC, 0);
    gl.uniform3f(this.uInk, ink[0], ink[1], ink[2]);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
    gl.disable(gl.BLEND);
  }

  /** C's coverage, one byte per pixel (0-255), row 0 = the canvas's top. */
  read(): Uint8Array {
    const gl = this.gl;
    const w = this.width;
    const h = this.height;
    const all = new Uint8Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, all);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const out = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out[j * w + i] = all[((h - 1 - j) * w + i) * 4];
    return out;
  }

  dispose(): void {
    const gl = this.gl;
    if (this.tex) gl.deleteTexture(this.tex);
    this.tex = null;
    gl.deleteFramebuffer(this.fbo);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.prog);
  }
}

// One console warning per page, however often the flag comes back on.
let warned = false;

export function createFieldBApp(ctx: SceneExportCtx, requestFrame: () => void): FieldBApp {
  let label: LabelBPass | null = null;
  let band: BandBPass | null = null;
  let cover: Cover | null = null;
  let host: { restore(): void } | null = null;
  let built = false;
  let off = false;
  let lastR: unknown = null;
  let builtCount = -1;
  let builtScale = 0;
  let M: Affine | null = null;
  let T: ReturnType<typeof buildLabelB> | null = null;
  let B: ReturnType<typeof buildBandB> | null = null;
  let uploaded = false;
  let drawn: (Float32Array | null)[] = [];
  const stats = { rebuilds: 0, kept: 0, renders: 0, fallback: "", chains: 0, corners: 0, instances: 0, buildMs: 0 };

  const snapshot = (): void => {
    const ss = ctx.scene.renderer?.chainSamples ?? [];
    drawn = ss.map((s) => (s ? s.positions.slice(0, s.count * 2) : null));
  };
  const moved = (): boolean => {
    const ss = ctx.scene.renderer?.chainSamples ?? [];
    if (ss.length !== drawn.length) return true;
    for (let c = 0; c < ss.length; c++) {
      const s = ss[c];
      const d = drawn[c];
      if (!s || !d) {
        if (s !== null || d !== null) return true;
        continue;
      }
      const n = s.count * 2;
      if (n !== d.length) return true;
      const p = s.positions;
      for (let i = 0; i < n; i++) if (p[i] !== d[i]) return true;
    }
    return false;
  };

  const gl = (): WebGL2RenderingContext | null => {
    const g = (ctx.app.renderer as unknown as { gl?: unknown }).gl;
    return typeof WebGL2RenderingContext !== "undefined" && g instanceof WebGL2RenderingContext ? g : null;
  };

  const release = (): void => {
    label?.dispose();
    label = null;
    band?.dispose();
    band = null;
    cover?.dispose();
    cover = null;
    T = null;
    B = null;
    built = false;
    uploaded = false;
  };

  const fallback = (why: string): void => {
    off = true;
    stats.fallback = why;
    if (!warned) {
      warned = true;
      console.warn(`K1040 field band: ${why}; fieldBand off`);
    }
    ctx.params.fieldBand = false;
    if (ctx.scene.renderer) ctx.scene.renderer.labelInk = ctx.params.labelInk;
    release();
    requestFrame();
  };

  // The camera: world to device pixels, the root's transform (as the scene
  // export's) scaled from the screen's CSS pixels to the canvas's.
  const camera = (): { M: Affine; w: number; h: number; scale: number; dpr: number } => {
    const canvas = ctx.app.canvas as HTMLCanvasElement;
    const w = canvas.width;
    const h = canvas.height;
    const sx = w / ctx.app.screen.width;
    const sy = h / ctx.app.screen.height;
    const root = ctx.root;
    const s = root.scale.x;
    const t = root.scale.y;
    return { M: [s * sx, 0, 0, t * sy, root.position.x * sx, root.position.y * sy], w, h, scale: s * sx, dpr: sx };
  };

  const rebuild = (dpr: number): void => {
    const t0 = performance.now();
    const ps = ctx.scene.ps!;
    const { input } = gatherSceneInput(
      ctx,
      { zPos: new Float64Array(ps.positions.length / 2), positions: ps.positions, simTime: 0 },
      "field",
      "field"
    );
    const { scene } = buildFieldScene(input);
    scene.look.ctrlArc ??= CTRL_ARC;
    const fb = new FormB(scene, { dpr });
    T = buildLabelB(fb);
    B = buildBandB(fb, T);
    built = true;
    uploaded = false;
    stats.rebuilds++;
    stats.chains = scene.chains.length;
    stats.corners = B.nCorners;
    stats.instances = B.nInst;
    stats.buildMs = performance.now() - t0;
  };

  const render = (cam: { M: Affine; w: number; h: number }): void => {
    const g = gl();
    if (!g) return fallback("no WebGL2 context");
    if (!label) {
      host = pixiLabelHost(ctx.app.renderer as unknown as WebGLRenderer);
      label = new LabelBPass(g, false, "capsule", { host });
      band = new BandBPass(g);
      cover = new Cover(g);
      uploaded = false;
    }
    if (!T || !B || !band || !cover) return;
    label.resize(cam.w, cam.h);
    if (!uploaded) {
      label.upload(T);
      band.upload(T, B);
      uploaded = true;
    }
    M = cam.M;
    label.draw(cam.M);
    cover.begin(cam.w, cam.h);
    band.draw(cam.M, label.label!, cam.w, cam.h);
    host?.restore();
    stats.renders++;
  };

  const frame = (): void => {
    if (off) return;
    const r = ctx.scene.renderer;
    const ps = ctx.scene.ps;
    if (!r || !ps) return;
    if (r !== lastR) {
      lastR = r;
      builtCount = -1;
      drawn = [];
    }
    try {
      const cam = camera();
      const count = r.updateCount;
      if (count !== builtCount || cam.scale !== builtScale || !built) {
        builtCount = count;
        if (!built || cam.scale !== builtScale || moved()) {
          rebuild(cam.dpr);
          builtScale = cam.scale;
          snapshot();
        } else stats.kept++;
      }
      if (off || !built) return;
      render(cam);
    } catch (e) {
      // Never into the ticker: a failed build or compile turns the flag off.
      ctx.app.renderer.resetState();
      fallback(`failed (${e instanceof Error ? e.message : String(e)})`);
    }
  };

  const after = (): void => {
    if (off || !cover || !built) return;
    const bc = ctx.scene.renderer?.borderColor ?? 0;
    const ink: [number, number, number] = bc ? [((bc >> 16) & 255) / 255, ((bc >> 8) & 255) / 255, (bc & 255) / 255] : INK_AUTO;
    try {
      cover.composite(ink);
    } catch (e) {
      fallback(`composite failed (${e instanceof Error ? e.message : String(e)})`);
    } finally {
      ctx.app.renderer.resetState();
    }
  };

  const dispose = (): void => {
    release();
    off = true;
    const G = globalThis as unknown as Record<string, unknown>;
    if (G.__knotFieldB === api) delete G.__knotFieldB;
  };

  // Probe access: the stats, the camera, a forced rebuild, C's coverage.
  const api = {
    stats,
    get camera() {
      return M;
    },
    renderNow(force = false): void {
      if (force) {
        builtCount = -1;
        built = false;
        drawn = [];
      }
      frame();
    },
    readCover(): { w: number; h: number; data: Uint8Array } | null {
      if (!cover || !cover.width) return null;
      const data = cover.read();
      ctx.app.renderer.resetState();
      return { w: cover.width, h: cover.height, data };
    },
    /** Off draws the strips only (S4a2's band). */
    setCorners(on: boolean): void {
      if (band) band.corners = on;
    },
  };
  (globalThis as unknown as Record<string, unknown>).__knotFieldB = api;

  return { frame, after, dispose };
}
