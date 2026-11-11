// K1240 S4: the redesign in the app, behind the link flag `rp=outline`.
// The threads draw from src/render/outline (the outline's border band and
// the triangle fill with the section paint) in place of the ribbon
// renderer's base and fillet layers; everything else (plucks, the reveal's
// FX, markers, the gameplay layers) draws as before.
//
// WHERE IT BUILDS: a module worker of its own (outline_worker.ts), fed the
// scene export's SceneIn (gathered on main, as field_b_app gathers it).
// Measured on def in Node (k1240s4_eq.ts / k1240s4_parts.ts, 2026-11-10):
// a structure + first frame takes ~3.0 s and every moved frame ~2.9 s
// (the band alone ~2.5 s: 6.3M vertices, 68.6k of 73.8k piece points tied).
// On main that is a 3 s freeze per moved frame; in K7's physics worker it
// would stall the sim for as long. Its own worker keeps both live: the
// outline trails the threads by one build while they move and catches up
// when they rest. One request in flight; a move during it sends the next.
//
// DRAW: when new data or a new camera arrives, the fill (paint program,
// depth LEQUAL on the fill key, as the prototype's page) and the band
// (tie alpha, blended) go into an offscreen target the canvas's size,
// premultiplied; a RenderContainer at the ribbon root's slot 2 (over the
// hidden base and fillet layers, under the plucks) composites it, one
// texel per pixel. When pixi draws the root into another target (a pluck
// ripple's filter), the composite instead runs after app.render(), over
// the whole canvas.
//
// Failure never reaches the ticker: a worker or GL error turns the pass
// off and brings the ribbon layers back.
import { RenderContainer, type Container, type WebGLRenderer } from "pixi.js";
import { gatherSceneInput, type SceneExportCtx } from "../field/scene_export_hook";
import { buildFieldScene } from "../field/scene_export";
import { pixiLabelHost } from "../field/label_b_host";
import type { SceneIn } from "./outline";
import type { OutlineReply, OutlineRequest } from "./outline_worker";

const CTRL_ARC = 0.47;
const RUN_TEX_W = 1024;
const BAND_TEX_W = 1024; // band_gpu.BAND_TEX_W (not imported: it would pull draw.ts into main)

const PAINT_VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=2) in float aKey;
layout(location=3) in ivec4 aRun;
layout(location=4) in vec4 aW;
layout(location=5) in vec4 aS;
uniform mat3 uMat;
uniform float uKS;
flat out ivec4 vRun;
out vec4 vW;
out vec4 vS;
void main() {
  vec3 p = uMat * vec3(aPos, 1.0);
  gl_Position = vec4(p.xy, clamp(-aKey / uKS, -1.0, 1.0), 1.0);
  vRun = aRun; vW = aW; vS = aS;
}`;
// draw.ts's paint fragment shader, verbatim.
const PAINT_FS = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uRuns;
flat in ivec4 vRun;
in vec4 vW;
in vec4 vS;
out vec4 o;
vec4 tx(int q) { return texelFetch(uRuns, ivec2(q % ${RUN_TEX_W}, q / ${RUN_TEX_W}), 0); }
float ez(float u, float e) { return u + (u * u * (3.0 - 2.0 * u) - u) * e; }
vec3 runCol(int r, float s) {
  vec4 t0 = tx(4 * r); vec4 t1 = tx(4 * r + 1); vec4 t2 = tx(4 * r + 2); vec4 t3 = tx(4 * r + 3);
  float cu = s;
  if (t2.w > 0.0) cu = s + t2.w * floor((0.5 * (t0.x + t0.y) - s) / t2.w + 0.5);
  float da = cu - t0.x; float db = t0.y - cu;
  if (t0.z > 0.0 && da < t0.z) return mix(t1.rgb, t2.rgb, ez(clamp(da / t0.z, 0.0, 1.0), t1.w));
  if (t0.w > 0.0 && db < t0.w) return mix(t3.rgb, t2.rgb, ez(clamp(db / t0.w, 0.0, 1.0), t1.w));
  return t2.rgb;
}
void main() {
  vec3 c = vec3(0.0); float W = 0.0;
  for (int k = 0; k < 4; k++) {
    int r = vRun[k]; float w = vW[k];
    if (r < 0 || !(w > 0.0)) continue;
    c += w * runCol(r, vS[k]); W += w;
  }
  o = vec4(W > 0.0 ? c / W : vec3(0.0), 1.0);
}`;
// band_gpu's band: one quad per border segment, the tie alpha per fragment.
// The fragment shader is band_gpu.alphaCpu line for line (that function's
// test ties it to the prototype's per-vertex alphaAt).
const BAND_VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec3 aA;
layout(location=3) in ivec4 aSl;
uniform mat3 uMat;
out vec2 vPos;
out vec3 vA;
flat out ivec4 vSl;
void main() {
  vec3 p = uMat * vec3(aPos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  vPos = aPos;
  vA = aA;
  vSl = aSl;
}`;
const BAND_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uChain;
uniform sampler2D uPass;
uniform vec3 uInk;
uniform float uH;
uniform float uW;
uniform float uZt;
in vec2 vPos;
in vec3 vA;
flat in ivec4 vSl;
out vec4 o;
const int TW = ${BAND_TEX_W};
vec4 T(int q, int k) { int i = q * 4 + k; return texelFetch(uPass, ivec2(i % TW, i / TW), 0); }
vec4 S(int i) { return texelFetch(uChain, ivec2(i % TW, i / TW), 0); }
float dS(float len, float a, float c) { float d = c - a; if (len > 0.0) { d = mod(d, len); if (d > 0.5 * len) d -= len; } return d; }
float sst(float e0, float e1, float x) { float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
void main() {
  float s = vA.x;
  float keyC = vA.z - vA.y * uZt / uH;
  float seenO[4]; float seenS[4]; float seenL[4]; float seenF[4];
  int n = 0;
  for (int q = 0; q < 4; q++) {
    int pid = vSl[q];
    if (pid < 0) continue;
    vec4 t0 = T(pid, 0); vec4 t1 = T(pid, 1); vec4 t2 = T(pid, 2); vec4 t3 = T(pid, 3);
    float ds = dS(t2.y, t0.x, s);
    if (ds < -t0.y || ds > t0.z) continue;
    float r = t0.w; float so = t1.x; int ob = int(t1.y); int on = int(t1.z);
    float oLen = t2.x; float skipR = t2.z;
    float best = 1e30; float bs = 0.0; float bz = 0.0;
    for (int w = 0; w < 2; w++) {
      int k0 = int(w == 0 ? t3.x : t3.z); int k1 = int(w == 0 ? t3.y : t3.w);
      for (int k = k0; k <= k1; k++) {
        int j = k + 1 == on ? 0 : k + 1;
        vec4 A = S(ob + k); vec4 B = S(ob + j);
        float lk = j == 0 ? max(oLen, 0.0) - A.z : B.z - A.z;
        float mid = A.z + 0.5 * lk;
        if (abs(dS(oLen, so, mid)) > r + 0.5 * lk) continue;
        if (skipR > 0.0 && abs(dS(oLen, s, mid)) < skipR) continue;
        vec2 e = B.xy - A.xy; float l2 = dot(e, e);
        float t = l2 > 0.0 ? clamp(dot(vPos - A.xy, e) / l2, 0.0, 1.0) : 0.0;
        float d = length(vPos - A.xy - t * e);
        if (d < best) { best = d; bs = A.z + t * lk; bz = A.w + (B.w - A.w) * t; }
      }
    }
    if (!(best < uH)) continue;
    float g = clamp((uH - best) / uW, 0.0, 1.0);
    float keyO = bz - best * uZt / uH;
    float f = 1.0 - g * sst(-uZt, uZt, keyO - keyC);
    int m = -1;
    for (int u = 0; u < 4; u++) if (m < 0 && u < n && seenO[u] == t1.w && abs(dS(seenL[u], seenS[u], bs)) < uH) m = u;
    if (m < 0) { seenO[n] = t1.w; seenS[n] = bs; seenL[n] = oLen; seenF[n] = f; n++; }
    else if (f < seenF[m]) { seenS[m] = bs; seenF[m] = f; }
  }
  float a = 1.0;
  for (int u = 0; u < 4; u++) if (u < n) a *= seenF[u];
  o = vec4(uInk, a);
}`;
const COMP_VS = `#version 300 es
void main() {
  int id = gl_VertexID;
  gl_Position = vec4(id == 1 ? 3.0 : -1.0, id == 2 ? 3.0 : -1.0, 0.0, 1.0);
}`;
const COMP_FS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uC;
out vec4 o;
void main() {
  vec4 c = texelFetch(uC, ivec2(gl_FragCoord.xy), 0);
  if (c.a <= 0.0) discard;
  o = c;
}`;

type U = WebGLUniformLocation | null;

/** The GL side: programs, the outline's buffers, the offscreen target. */
class OutlinePass {
  readonly gl: WebGL2RenderingContext;
  w = 0;
  h = 0;
  private paint: WebGLProgram;
  private band: WebGLProgram;
  private comp: WebGLProgram;
  private uP: { mat: U; ks: U; runs: U };
  private uB: { mat: U; chain: U; pass: U; ink: U; h: U; w: U; zt: U };
  private chainTex: WebGLTexture;
  private passTex: WebGLTexture;
  private band_: { ink: [number, number, number]; h: number; W: number; zt: number } = { ink: [0, 0, 0], h: 1, W: 1, zt: 0 };
  private uC: U;
  private pVao: WebGLVertexArrayObject;
  private bVao: WebGLVertexArrayObject;
  private cVao: WebGLVertexArrayObject;
  private bufs: Record<"pos" | "key" | "w" | "s" | "run" | "idx" | "bPos" | "bAttr" | "bSl", WebGLBuffer>;
  private runTex: WebGLTexture;
  private fbo: WebGLFramebuffer;
  private color: WebGLTexture | null = null;
  private depth: WebGLRenderbuffer | null = null;
  nIdx = 0;
  nBand = 0;
  ks = 1;
  hasData = false;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const mk = (vs: string, fs: string, what: string): WebGLProgram => {
      const sh = (type: number, src: string): WebGLShader => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`outline ${what}: ${gl.getShaderInfoLog(s)}`);
        return s;
      };
      const p = gl.createProgram()!;
      const v = sh(gl.VERTEX_SHADER, vs);
      const f = sh(gl.FRAGMENT_SHADER, fs);
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`outline ${what} link: ${gl.getProgramInfoLog(p)}`);
      gl.deleteShader(v);
      gl.deleteShader(f);
      return p;
    };
    this.paint = mk(PAINT_VS, PAINT_FS, "paint");
    this.band = mk(BAND_VS, BAND_FS, "band");
    this.comp = mk(COMP_VS, COMP_FS, "composite");
    this.uP = { mat: gl.getUniformLocation(this.paint, "uMat"), ks: gl.getUniformLocation(this.paint, "uKS"), runs: gl.getUniformLocation(this.paint, "uRuns") };
    const ub = (n: string): U => gl.getUniformLocation(this.band, n);
    this.uB = { mat: ub("uMat"), chain: ub("uChain"), pass: ub("uPass"), ink: ub("uInk"), h: ub("uH"), w: ub("uW"), zt: ub("uZt") };
    this.uC = gl.getUniformLocation(this.comp, "uC");
    const nb = (): WebGLBuffer => gl.createBuffer()!;
    this.bufs = { pos: nb(), key: nb(), w: nb(), s: nb(), run: nb(), idx: nb(), bPos: nb(), bAttr: nb(), bSl: nb() };
    const attr = (b: WebGLBuffer, loc: number, n: number, int = false): void => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(loc);
      if (int) gl.vertexAttribIPointer(loc, n, gl.INT, 0, 0);
      else gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
    };
    this.pVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.pVao);
    attr(this.bufs.pos, 0, 2);
    attr(this.bufs.key, 2, 1);
    attr(this.bufs.run, 3, 4, true);
    attr(this.bufs.w, 4, 4);
    attr(this.bufs.s, 5, 4);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufs.idx);
    this.bVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.bVao);
    attr(this.bufs.bPos, 0, 2);
    attr(this.bufs.bAttr, 1, 3);
    attr(this.bufs.bSl, 3, 4, true);
    this.cVao = gl.createVertexArray()!;
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.runTex = gl.createTexture()!;
    this.chainTex = gl.createTexture()!;
    this.passTex = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;
  }

  /** A worker reply into the buffers (idx and run only on a restructure). */
  upload(r: OutlineReply): void {
    const gl = this.gl;
    const put = (b: WebGLBuffer, d: ArrayBufferView): void => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW);
    };
    put(this.bufs.pos, r.pos);
    put(this.bufs.key, r.pkey);
    put(this.bufs.w, r.w);
    put(this.bufs.s, r.s);
    if (r.run) put(this.bufs.run, r.run);
    if (r.idx) {
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufs.idx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, r.idx, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      this.nIdx = r.idx.length;
    }
    put(this.bufs.bPos, r.bandPos);
    put(this.bufs.bAttr, r.bandAttr);
    put(this.bufs.bSl, r.bandSlots);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.nBand = r.bandCount;
    this.band_ = { ink: r.ink, h: r.h, W: r.W, zt: r.zt };
    this.ks = r.ks;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.runTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, r.texW, r.texH, 0, gl.RGBA, gl.FLOAT, r.tex);
    const ftex = (t: WebGLTexture, d: Float32Array, h: number): void => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, BAND_TEX_W, h, 0, gl.RGBA, gl.FLOAT, d);
    };
    ftex(this.chainTex, r.chainTex, r.chainTexH);
    ftex(this.passTex, r.passTex, r.passTexH);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.hasData = true;
  }

  private target(w: number, h: number): void {
    const gl = this.gl;
    if (w === this.w && h === this.h && this.color) return;
    if (this.color) gl.deleteTexture(this.color);
    if (this.depth) gl.deleteRenderbuffer(this.depth);
    this.color = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.color);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.depth = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.color, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`outline target: framebuffer status ${st}`);
    this.w = w;
    this.h = h;
  }

  /** The fill, then the band, into the offscreen target (premultiplied). */
  draw(mat: Float32Array, w: number, h: number): void {
    const gl = this.gl;
    this.target(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (this.hasData) {
      // The fill: the highest key wins (LEQUAL: a tie goes to the later
      // triangle, as the prototype's page).
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.useProgram(this.paint);
      gl.uniformMatrix3fv(this.uP.mat, false, mat);
      gl.uniform1f(this.uP.ks, this.ks);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.runTex);
      gl.uniform1i(this.uP.runs, 0);
      gl.bindVertexArray(this.pVao);
      gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_INT, 0);
      gl.disable(gl.DEPTH_TEST);
      // The band over it at its tie alpha; alpha accumulates premultiplied.
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.band);
      gl.uniformMatrix3fv(this.uB.mat, false, mat);
      const B = this.band_;
      gl.uniform3f(this.uB.ink, B.ink[0], B.ink[1], B.ink[2]);
      gl.uniform1f(this.uB.h, B.h);
      gl.uniform1f(this.uB.w, B.W);
      gl.uniform1f(this.uB.zt, B.zt);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.chainTex);
      gl.uniform1i(this.uB.chain, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.passTex);
      gl.uniform1i(this.uB.pass, 1);
      gl.bindVertexArray(this.bVao);
      gl.drawArrays(gl.TRIANGLES, 0, this.nBand);
      gl.disable(gl.BLEND);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
    }
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** The target over whatever is bound, one texel per pixel. */
  composite(): void {
    if (!this.color) return;
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.comp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.color);
    gl.uniform1i(this.uC, 0);
    gl.bindVertexArray(this.cVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
  }

  dispose(): void {
    const gl = this.gl;
    for (const b of Object.values(this.bufs)) gl.deleteBuffer(b);
    gl.deleteVertexArray(this.pVao);
    gl.deleteVertexArray(this.bVao);
    gl.deleteVertexArray(this.cVao);
    gl.deleteProgram(this.paint);
    gl.deleteProgram(this.band);
    gl.deleteProgram(this.comp);
    gl.deleteTexture(this.runTex);
    gl.deleteTexture(this.chainTex);
    gl.deleteTexture(this.passTex);
    if (this.color) gl.deleteTexture(this.color);
    if (this.depth) gl.deleteRenderbuffer(this.depth);
    gl.deleteFramebuffer(this.fbo);
  }
}

export interface OutlineApp {
  frame(): void;
  after(): void;
  dispose(): void;
}

let warned = false;

export function createOutlineApp(ctx: SceneExportCtx, requestFrame: () => void): OutlineApp {
  let pass: OutlinePass | null = null;
  let host: { restore(): void } | null = null;
  let worker: Worker | null = null;
  let off = false;
  let lastR: unknown = null;
  let hidden: Container[] = [];
  let rc: RenderContainer | null = null;
  let seenCount = -1;
  let inFlight = false;
  let nextId = 1;
  let sentAt = 0;
  let dirty = false;
  let camKey = "";
  let composited = false;
  let drawn: (Float32Array | null)[] = [];
  const stats = {
    posts: 0,
    replies: 0,
    restructures: 0,
    errors: 0,
    fallback: "",
    gatherMs: 0,
    postMs: 0,
    workerMs: 0,
    structureMs: 0,
    frameMs: 0,
    roundTripMs: 0,
    uploadMs: 0,
    drawMs: 0,
    draws: 0,
    composites: 0,
    compositesAfter: 0,
    bandCount: 0,
    triangles: 0,
    chains: 0,
    key: "",
    /** The last frame's parts in the worker (OutlineModel.parts). */
    parts: null as { frame: number; zChains: number; fill: number; paint: number; band: number } | null,
    /** The last 512 replies' [frame, round trip, upload, then parts in OutlineModel.parts order] ms and draws' ms, for medians (K1240 S4b). */
    replyMs: [] as number[][],
    drawMsLog: [] as number[],
    /** Each restructure: when (performance.now ms), why (the worker's cause), its worker ms. */
    rebuilds: [] as { at: number; cause: string; ms: number }[],
  };

  const gl = (): WebGL2RenderingContext | null => {
    const g = (ctx.app.renderer as unknown as { gl?: unknown }).gl;
    return typeof WebGL2RenderingContext !== "undefined" && g instanceof WebGL2RenderingContext ? g : null;
  };

  // The ribbon layers the outline replaces: base (child 0) and fillets (1).
  const attach = (): void => {
    const r = ctx.scene.renderer;
    if (!r) return;
    detach();
    const root = r.root;
    hidden = [root.children[0], root.children[1]].filter((c): c is Container => !!c && c.visible);
    for (const c of hidden) c.visible = false;
    rc = new RenderContainer({
      render: (renderer) => {
        if (!pass || off) return;
        const g = pass.gl;
        // Only the canvas itself maps one texel to one pixel.
        if (g.getParameter(g.FRAMEBUFFER_BINDING) !== null) return;
        try {
          pass.composite();
          composited = true;
          stats.composites++;
        } finally {
          const wr = renderer as unknown as WebGLRenderer;
          wr.shader.resetState();
          wr.geometry.resetState();
          wr.texture.resetState();
          wr.state.resetState();
          wr.buffer.resetState();
        }
      },
    });
    root.addChildAt(rc, Math.min(2, root.children.length));
  };
  const detach = (): void => {
    for (const c of hidden) c.visible = true;
    hidden = [];
    if (rc) {
      rc.parent?.removeChild(rc);
      rc.destroy();
      rc = null;
    }
  };

  const release = (): void => {
    worker?.terminate();
    worker = null;
    inFlight = false;
    pass?.dispose();
    pass = null;
    detach();
  };

  const fallback = (why: string): void => {
    off = true;
    stats.fallback = why;
    if (!warned) {
      warned = true;
      console.warn(`K1240 outline: ${why}; rp=outline off`);
    }
    try {
      release();
    } finally {
      ctx.app.renderer.resetState();
      requestFrame();
    }
  };

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

  // World to clip through the root's transform (CSS px) and the canvas's
  // device pixels; GLSL's mat3 is column-major.
  const camera = (): { mat: Float32Array; w: number; h: number; key: string } => {
    const canvas = ctx.app.canvas as HTMLCanvasElement;
    const w = canvas.width;
    const h = canvas.height;
    const sx = w / ctx.app.screen.width;
    const sy = h / ctx.app.screen.height;
    const root = ctx.root;
    const a = root.scale.x * sx;
    const d = root.scale.y * sy;
    const e = root.position.x * sx;
    const f = root.position.y * sy;
    const mat = new Float32Array([(2 * a) / w, 0, 0, 0, (-2 * d) / h, 0, (2 * e) / w - 1, 1 - (2 * f) / h, 1]);
    return { mat, w, h, key: `${w}x${h} ${a} ${d} ${e} ${f}` };
  };

  const onReply = (e: MessageEvent<OutlineReply>): void => {
    inFlight = false;
    const r = e.data;
    if (off) return;
    stats.replies++;
    stats.roundTripMs = performance.now() - sentAt;
    if (r.error) {
      stats.errors++;
      fallback(`worker failed (${r.error})`);
      return;
    }
    const g = gl();
    if (!g) return fallback("no WebGL2 context");
    try {
      if (!pass) {
        pass = new OutlinePass(g);
        host = pixiLabelHost(ctx.app.renderer as unknown as WebGLRenderer);
      }
      const t0 = performance.now();
      pass.upload(r);
      stats.uploadMs = performance.now() - t0;
      if (r.restructured) {
        stats.restructures++;
        const at = Math.round(performance.now());
        stats.rebuilds.push({ at, cause: r.cause ?? "?", ms: Math.round(r.ms) });
        if (stats.rebuilds.length > 64) stats.rebuilds.shift();
        console.info(`K1240 outline: restructure (${r.cause}) ${Math.round(r.ms)} ms`);
      }
      stats.workerMs = r.ms;
      stats.structureMs = r.structureMs;
      if (!r.restructured) {
        stats.frameMs = r.frameMs;
        stats.parts = r.parts;
        const p = r.parts;
        stats.replyMs.push([r.frameMs, stats.roundTripMs, stats.uploadMs, p?.frame ?? 0, p?.zChains ?? 0, p?.fill ?? 0, p?.paint ?? 0, p?.band ?? 0]);
        if (stats.replyMs.length > 512) stats.replyMs.shift();
      }
      stats.bandCount = r.bandCount;
      stats.triangles = pass.nIdx / 3;
      stats.key = r.key.length > 64 ? `${r.key.slice(0, 64)}...` : r.key;
      dirty = true;
    } catch (err) {
      fallback(`upload failed (${err instanceof Error ? err.message : String(err)})`);
      return;
    } finally {
      ctx.app.renderer.resetState();
    }
    requestFrame();
  };

  const send = (): void => {
    const ps = ctx.scene.ps;
    if (!ps) return;
    const t0 = performance.now();
    const { input } = gatherSceneInput(
      ctx,
      { zPos: new Float64Array(ps.positions.length / 2), positions: ps.positions, simTime: 0 },
      "outline",
      "outline"
    );
    const { scene } = buildFieldScene(input);
    scene.look.ctrlArc ??= CTRL_ARC;
    stats.gatherMs = performance.now() - t0;
    stats.chains = scene.chains.length;
    snapshot();
    if (!worker) {
      worker = new Worker(new URL("./outline_worker.ts", import.meta.url), { type: "module", name: "outline" });
      worker.onmessage = onReply;
      worker.onerror = (ev) => fallback(`worker error (${ev.message})`);
    }
    const t1 = performance.now();
    const req: OutlineRequest = { id: nextId++, scene: scene as unknown as SceneIn };
    worker.postMessage(req);
    stats.postMs = performance.now() - t1;
    stats.posts++;
    sentAt = performance.now();
    inFlight = true;
  };

  const frame = (): void => {
    if (off) return;
    const r = ctx.scene.renderer;
    if (!r || !ctx.scene.ps) return;
    try {
      if (r !== lastR) {
        lastR = r;
        seenCount = -1;
        drawn = [];
        attach();
      }
      if (!inFlight && (r.updateCount !== seenCount || drawn.length === 0)) {
        seenCount = r.updateCount;
        // Before the renderer's first update there are no samples yet:
        // wait for them (the export throws on a chain without any).
        if (r.chainSamples.length < ctx.scene.ps.chains.length || r.chainSamples.some((s) => !s)) seenCount = -1;
        else if (drawn.length === 0 || moved()) send();
      }
      if (!pass) return;
      const cam = camera();
      if (dirty || cam.key !== camKey) {
        const t0 = performance.now();
        pass.draw(cam.mat, cam.w, cam.h);
        host?.restore();
        stats.drawMs = performance.now() - t0;
      stats.drawMsLog.push(stats.drawMs);
      if (stats.drawMsLog.length > 512) stats.drawMsLog.shift();
        stats.draws++;
        dirty = false;
        camKey = cam.key;
      }
      composited = false;
    } catch (e) {
      ctx.app.renderer.resetState();
      fallback(`failed (${e instanceof Error ? e.message : String(e)})`);
    }
  };

  const after = (): void => {
    if (off || !pass || composited) return;
    // The root went through another target this render (a pluck ripple's
    // filter): composite over the canvas instead.
    try {
      const g = pass.gl;
      g.bindFramebuffer(g.FRAMEBUFFER, null);
      g.viewport(0, 0, pass.w, pass.h);
      g.disable(g.SCISSOR_TEST);
      g.disable(g.STENCIL_TEST);
      pass.composite();
      stats.compositesAfter++;
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
    if (G.__knotOutline === api) delete G.__knotOutline;
  };

  // Probe access: the stats, a forced resend, and whether the last build
  // is the threads' current pose (nothing in flight, nothing moved since).
  const api = {
    stats,
    get settled(): boolean {
      return !inFlight && !dirty && drawn.length > 0 && !moved();
    },
    resend(): void {
      drawn = [];
      seenCount = -1;
      requestFrame();
    },
  };
  (globalThis as unknown as Record<string, unknown>).__knotOutline = api;

  return { frame, after, dispose };
}
