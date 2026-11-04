// K1040 S3: the label pass's probe page (bundled by verdict.mjs with esbuild
// into out/page.js, loaded from page.html over file://; its favicon is a
// data URL, so no 404 reaches the console, K1039).
//   window.s3.verdict(scene, {scale})  the GPU label at every pixel centre
//                                      against FormB.evalPoint, classified
//   window.s3.time(scene, {scale, frames})  GPU time per draw (timer query),
//                                      render sync, prep and upload times
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { buildLabelB, labelAt, type LabelBTables } from "../../../../src/render/field/label_b";
import { LabelBPass, type Affine, type LabelBMode } from "../../../../src/render/field/label_b_pass";
import { labelBTentSources, labelBTentVSources, TENT_NW, type LabelBTentSources, type LabelBTentVSources } from "../../../../src/render/field/label_b_tent_glsl";

// K1040 S3d: opts.mode names the pass's mode (capsule | tent | tentv); opts.tent
// is S3c's flag for "tent".
const modeOf = (o: { tent?: boolean; mode?: string }): LabelBMode => (o.mode ?? (o.tent ? "tent" : "capsule")) as LabelBMode;
import { labelVerdict, sampleOf, type LabelSample } from "../../../../src/render/field/label_b_verdict";

const canvas = document.createElement("canvas");
canvas.width = 4;
canvas.height = 4;
document.body.appendChild(canvas);
let lost = 0;
canvas.addEventListener("webglcontextlost", () => lost++);
const gl = canvas.getContext("webgl2", { antialias: false, depth: false, preserveDrawingBuffer: false }) as WebGL2RenderingContext;

function renderer(): string {
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
}

function camera(scene: FieldScene, scale: number): { M: Affine; W: number; H: number } {
  const [a, b, c, d, e, f] = scene.camera.worldToCss;
  const [vw, vh] = scene.camera.viewport;
  return { M: [a * scale, b * scale, c * scale, d * scale, e * scale, f * scale], W: Math.round(vw * scale), H: Math.round(vh * scale) };
}

interface Site {
  i: number;
  j: number;
  cls: string;
  why: string;
  x: number;
  y: number;
  ref: unknown;
  gpu: { code: number; chain: number; s: number; key: number; d: number; fill: number };
  /** labelAt's float64 mirror at the same point and its verdict: a rule defect if it fails too. */
  mirror: { code: number; chain: number; s: number; key: number; fill: boolean; cls: string; why: string };
}

// K1040 S3c: the tent pass (opts.tent) and the coarser target (opts.lr: the
// pass draws into ceil(W / lr) x ceil(H / lr) with the camera over lr; the
// census reads each coarse texel at its own centre, device px ((i + 0.5) lr,
// (j + 0.5) lr), against form B at the scale). A DEFECT is re-verdicted at
// the margins in BUCKETS (device px); the first that clears it is its bucket.
const BUCKETS = [0.003, 0.01, 0.03, 0.1, 0.3, 1];

function coarse(M: Affine, W: number, H: number, lr: number): { M: Affine; W: number; H: number } {
  if (lr === 1) return { M, W, H };
  return { M: M.map((v) => v / lr) as unknown as Affine, W: Math.ceil(W / lr), H: Math.ceil(H / lr) };
}

function verdict(scene: FieldScene, opts: { scale?: number; maxSites?: number; stride?: number; tent?: boolean; mode?: string; lr?: number } = {}) {
  const scale = opts.scale ?? 2;
  const stride = opts.stride ?? 1;
  const lr = opts.lr ?? 1;
  scene.look.ctrlArc ??= 0.47;
  const t0 = performance.now();
  const fb = new FormB(scene, { dpr: scale });
  const t1 = performance.now();
  const T = buildLabelB(fb);
  const t2 = performance.now();
  const dev = camera(scene, scale);
  const { M: Mc, W, H } = coarse(dev.M, dev.W, dev.H, lr);
  const pass = new LabelBPass(gl, true, modeOf(opts));
  pass.tentEpsPx /= lr;
  pass.resize(W, H);
  pass.upload(T);
  pass.draw(Mc);
  const { word, dbg } = pass.read();
  const t3 = performance.now();
  const [a, b, c, d, e, f] = dev.M;
  const det = a * d - b * c;
  const counts: Record<string, number> = {};
  const add = (k: string) => (counts[k] = (counts[k] ?? 0) + 1);
  const sites: Site[] = [];
  const maxSites = opts.maxSites ?? 80;
  let covered = 0;
  let gpuCovered = 0;
  let n = 0;
  const D = dbg as Float32Array;
  for (let j = 0; j < H; j += stride) {
    for (let i = 0; i < W; i += stride) {
      const u = (i + 0.5) * lr - e;
      const v = (j + 0.5) * lr - f;
      const x = (d * u - c * v) / det;
      const y = (-b * u + a * v) / det;
      const px = j * W + i;
      const w = word[px];
      const g: LabelSample =
        w === 0
          ? { code: -1, chain: -1, s: 0, key: -Infinity, fill: false }
          : { code: (w >>> 19) & 0xff, chain: (w & 0xff) - 1, s: D[4 * px + 1], key: D[4 * px], fill: D[4 * px + 3] > 0.5 };
      if (w !== 0) gpuCovered++;
      const vd = labelVerdict(fb, T, x, y, g);
      if (vd.ref.top !== -1) covered++;
      n++;
      add(vd.cls);
      if (vd.cls !== "agree") add(`${vd.cls}:${vd.why}`);
      let bk = "";
      if (vd.cls === "DEFECT") {
        bk = "none";
        for (const ep of BUCKETS)
          if (labelVerdict(fb, T, x, y, g, ep).cls !== "DEFECT") {
            bk = String(ep);
            break;
          }
        add(`bucket:${bk}`);
        add(`bucket:${bk}:${vd.why}`);
      }
      if ((vd.cls === "DEFECT" || (vd.cls === "fade" && sites.length < maxSites / 2)) && sites.length < maxSites) {
        const mg = sampleOf(labelAt(fb, T, x, y));
        const mv = labelVerdict(fb, T, x, y, mg);
        sites.push({
          i,
          j,
          cls: vd.cls,
          why: bk ? `${vd.why}@${bk}` : vd.why,
          x,
          y,
          ref: vd.ref,
          gpu: { code: g.code, chain: g.chain, s: g.s, key: g.key, d: D[4 * px + 2], fill: D[4 * px + 3] },
          mirror: { ...mg, cls: mv.cls, why: mv.why },
        });
      }
    }
  }
  const t4 = performance.now();
  pass.dispose();
  return {
    lost,
    renderer: renderer(),
    W,
    H,
    scale,
    stride,
    mode: pass.mode,
    lr,
    n,
    chains: T.nChains,
    segs: T.nInst,
    fills: T.nFills,
    groups: T.nGroups,
    covered,
    gpuCovered,
    counts,
    sites,
    ms: { formB: t1 - t0, prep: t2 - t1, gpuAndRead: t3 - t2, census: t4 - t3 },
  };
}
function nextFrame(): Promise<void> {
  return new Promise((res) => requestAnimationFrame(() => res()));
}

function pct(a: number[], q: number): number {
  if (!a.length) return NaN;
  const s = a.slice().sort((u, v) => u - v);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

// K923 bench.js's fit (S3b step 4): the chains' bbox plus h, times 1.04,
// centred on a fit[0] x fit[1] CSS px canvas at the scale (the Pixel's
// 411x753 at dpr 2 is 822x1506 device px).
function fitCamera(scene: FieldScene, h: number, fit: [number, number], scale: number) {
  const W = Math.round(fit[0] * scale);
  const H = Math.round(fit[1] * scale);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const ch of scene.chains)
    for (let i = 0; i + 1 < ch.pts.length; i += 2) {
      const x = ch.pts[i], y = ch.pts[i + 1];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  x0 -= h; y0 -= h; x1 += h; y1 += h;
  const s = Math.min(W / ((x1 - x0) * 1.04), H / ((y1 - y0) * 1.04));
  const M = [s, 0, 0, s, W / 2 - ((x0 + x1) / 2) * s, H / 2 - ((y0 + y1) / 2) * s] as unknown as Affine;
  return { M, W, H };
}

// opts.fit: K923's fit on that canvas (else the scene's own camera);
// opts.b2b: K923's render sync, the frames back to back in one task after
// 10 warm-up renders (else one a frame, after a rAF); opts.floor: no upload
// and no draw, only the 1-px readback of L (not K923's floor, which also
// cleared the full-size default framebuffer; this page's canvas is never
// drawn to).
async function time(scene: FieldScene, opts: { scale?: number; frames?: number; noscan?: boolean; fit?: [number, number]; b2b?: boolean; floor?: boolean; tent?: boolean; mode?: string; lr?: number } = {}) {
  const scale = opts.scale ?? 2;
  const frames = opts.frames ?? 60;
  const lr = opts.lr ?? 1;
  scene.look.ctrlArc ??= 0.47;
  const fb = new FormB(scene, { dpr: scale });
  const tp0 = performance.now();
  const T: LabelBTables = buildLabelB(fb);
  if (opts.noscan) T.nb.fill(0);
  const prepMs = performance.now() - tp0;
  const dev = opts.fit ? fitCamera(scene, fb.h, opts.fit, scale) : camera(scene, scale);
  const { M, W, H } = coarse(dev.M, dev.W, dev.H, lr);
  const pass = new LabelBPass(gl, false, modeOf(opts));
  pass.tentEpsPx /= lr;
  pass.resize(W, H);
  pass.upload(T);
  // Warm-up (shader compile, first allocation).
  for (let k = 0; k < (opts.b2b ? 10 : 1); k++) {
    pass.draw(M);
    pass.sync();
  }
  const up: number[] = [];
  const sync: number[] = [];
  for (let k = 0; k < frames; k++) {
    if (!opts.b2b) await nextFrame();
    const u0 = performance.now();
    if (!opts.floor) pass.upload(T);
    const u1 = performance.now();
    if (!opts.floor) pass.draw(M);
    pass.sync();
    const u2 = performance.now();
    up.push(u1 - u0);
    sync.push(u2 - u1);
    pass.poll();
  }
  for (let k = 0; k < 120 && pass.poll() > 0; k++) await nextFrame();
  const gpu = pass.times.slice();
  const builds = pass.instanceBuilds;
  pass.dispose();
  return {
    lost,
    renderer: renderer(),
    W,
    H,
    mode: pass.mode,
    lr,
    segs: T.nInst,
    fills: T.nFills,
    groups: T.nGroups,
    timer: pass.hasTimer,
    gpu: { n: gpu.length, p50: pct(gpu, 0.5), p95: pct(gpu, 0.95) },
    sync: { p50: pct(sync, 0.5), p95: pct(sync, 0.95) },
    upload: { p50: pct(up, 0.5), p95: pct(up, 0.95), bytes: (T.pts.length + T.chain.length + T.span.length + T.fill.length + T.nb.length) * 4 },
    prepMs,
    instanceBuilds: builds,
  };
}

// K1040 S3d step 1: the tent pass's cost split by K923's render sync, the
// variants interleaved in rounds on one scene (one pass per variant, kept for
// the page's life; 5 warm-ups a variant a round):
//   tent     the control (S3c's tent)
//   empty    the upload and the clears, no draws
//   noup     no per-frame upload (the tables from the round's start)
//   degen    every vertex clipped (z = 2): the vertex shaders and primitive
//            assembly, no binning and no fragments
//   fs0      a fragment shader that only sums the flats (the varyings live)
//   fsconst  a constant word (the flats dead: the linker may drop them and
//            the vertex work that feeds them)
//   half     half the segment strips
//   nw1      one-facet wedges: 8 vertices a strip instead of 12
//   floor    the 1-px readback alone
// Step 2's (the vertex-light tent, mode tentv, and the fixed part's split):
//   tentv      the vertex-light tent
//   tentvdegen tentv with every vertex clipped (its VS, as degen)
//   tentvinv   tentv, D invalidated after the draws (no depth store)
//   emptynoup  the empty pass without the upload (clears, stores, submit)
//   emptyinv   the empty pass with D invalidated
//   uponly     the upload and the readback, no pass at all
//   kick       no upload, no pass: a 1x1 target (R32UI + DEPTH32F) cleared and
//              read back, the cost of a submit and its wait with no store to speak of
const VARIANTS = ["tent", "empty", "noup", "degen", "fs0", "fsconst", "half", "nw1", "floor"];
let kickFb: WebGLFramebuffer | null = null;
const kickPx = new Uint32Array(4);
function kickSync(): void {
  const prevFb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  if (!kickFb) {
    const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const mk = (internal: number, format: number, type: number) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, 1, 1, 0, format, type, null);
      return t;
    };
    const c = mk(gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT);
    const d = mk(gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT);
    gl.bindTexture(gl.TEXTURE_2D, prevTex);
    kickFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, kickFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, c, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, d, 0);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, kickFb);
  gl.clearBufferuiv(gl.COLOR, 0, [0, 0, 0, 0]);
  gl.clearBufferfv(gl.DEPTH, 0, [1]);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.readPixels(0, 0, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, kickPx);
  gl.bindFramebuffer(gl.FRAMEBUFFER, prevFb);
}

// K1040 S3e step 1: the floor before building. No LabelBPass, no upload: each
// variant owns a full-size target (the pass's W x H, made once a size), and
// one "frame" is its clears, its draws (if any) and the 1-px readback:
//   ideal      K923's setup: a 32-bit target (R32UI, texStorage2D) cleared and
//              stored; depth a DEPTH_COMPONENT24 renderbuffer, cleared and
//              invalidated after the (no) draws
//   idealnoinv ideal, its depth not invalidated (stored)
//   idealnod   the 32-bit target alone, no depth attachment
//   ideal8     ideal in K923's own format, RGBA8UI (PVR compression?)
//   ideal32f   ideal with a DEPTH_COMPONENT32F renderbuffer (the lean D)
//   idealpt    ideal plus one 1-px point, depth tested, before the
//              invalidation: depth invalidated inside an open render pass
//   idealpt32f idealpt with the DEPTH_COMPONENT32F renderbuffer
//   idealnoclr no clear: both attachments invalidated at the start (a
//              DONT_CARE load), the 1-px point, depth invalidated after;
//              idealpt - idealnoclr = what the clears cost over no load at all
//   idealfsq   the color cleared by a full-screen draw instead (DONT_CARE
//              load, depth still cleared and invalidated): a clear as a draw
const IDEAL = new Set(["ideal", "idealnoinv", "idealnod", "ideal8", "ideal32f", "idealpt", "idealpt32f", "idealnoclr", "idealfsq"]);
type IdealTarget = { fb: WebGLFramebuffer; w: number; h: number; depth: boolean; color: WebGLTexture; rb: WebGLRenderbuffer | null };
const idealTargets = new Map<string, IdealTarget>();
let idealProg: WebGLProgram | null = null;
let idealUMode: WebGLUniformLocation | null = null;
const idealPx = new Uint32Array(4);
function idealProgram(): WebGLProgram {
  if (idealProg) return idealProg;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`ideal shader: ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const vs = "#version 300 es\nuniform int uMode;\nvoid main() {\n  if (uMode == 0) { gl_Position = vec4(0.0, 0.0, 0.0, 1.0); gl_PointSize = 1.0; }\n  else { gl_Position = vec4(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0, 0.0, 1.0); }\n}\n";
  const fs = "#version 300 es\nprecision highp float;\nprecision highp int;\nuniform int uMode;\nout uvec4 oWord;\nvoid main() { oWord = uvec4(uMode == 0 ? 1u : 0u); }\n";
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`ideal program: ${gl.getProgramInfoLog(p)}`);
  idealProg = p;
  idealUMode = gl.getUniformLocation(p, "uMode");
  return p;
}
function idealTarget(v: string, w: number, h: number): IdealTarget {
  const have = idealTargets.get(v);
  if (have && have.w === w && have.h === h) return have;
  if (have) {
    gl.deleteFramebuffer(have.fb);
    gl.deleteTexture(have.color);
    if (have.rb) gl.deleteRenderbuffer(have.rb);
  }
  const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D);
  const prevFb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  const color = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, color);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, v === "ideal8" ? gl.RGBA8UI : gl.R32UI, w, h);
  gl.bindTexture(gl.TEXTURE_2D, prevTex);
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
  let rb: WebGLRenderbuffer | null = null;
  if (v !== "idealnod") {
    rb = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, v === "ideal32f" || v === "idealpt32f" ? gl.DEPTH_COMPONENT32F : gl.DEPTH_COMPONENT24, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
  }
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`ideal ${v}: incomplete`);
  gl.bindFramebuffer(gl.FRAMEBUFFER, prevFb);
  const t = { fb, w, h, depth: rb !== null, color, rb };
  idealTargets.set(v, t);
  return t;
}
function idealFrame(v: string, w: number, h: number): void {
  const t = idealTarget(v, w, h);
  const prevFb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
  gl.viewport(0, 0, w, h);
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.BLEND);
  gl.disable(gl.CULL_FACE);
  gl.colorMask(true, true, true, true);
  const draw = v === "idealpt" || v === "idealpt32f" || v === "idealnoclr" || v === "idealfsq";
  if (v === "idealnoclr") gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.COLOR_ATTACHMENT0, gl.DEPTH_ATTACHMENT]);
  else if (v === "idealfsq") gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.COLOR_ATTACHMENT0]);
  else gl.clearBufferuiv(gl.COLOR, 0, [0, 0, 0, 0]);
  if (t.depth && v !== "idealnoclr") {
    gl.depthMask(true);
    gl.clearBufferfv(gl.DEPTH, 0, [1]);
  }
  if (draw) {
    gl.useProgram(idealProgram());
    gl.bindVertexArray(null);
    if (v === "idealfsq") {
      gl.disable(gl.DEPTH_TEST);
      gl.uniform1i(idealUMode, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.uniform1i(idealUMode, 0);
      gl.drawArrays(gl.POINTS, 0, 1);
      gl.disable(gl.DEPTH_TEST);
    }
  }
  if (t.depth && v !== "idealnoinv") gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.DEPTH_ATTACHMENT]);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.readPixels(0, 0, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, idealPx);
  gl.bindFramebuffer(gl.FRAMEBUFFER, prevFb);
}
const vpasses = new Map<string, LabelBPass>();
function variantPass(v: string): LabelBPass {
  const have = vpasses.get(v);
  if (have) return have;
  const src = labelBTentSources(false);
  const swap = (s: string, a: string, b: string) => {
    if (s.split(a).length !== 2) throw new Error(`variant ${v}: ${JSON.stringify(a.slice(0, 40))} not found once`);
    return s.replace(a, b);
  };
  const GLPOS = "-2.0 * key * uKeyScale, 1.0);\n";
  const FSMAIN = "void main() {\n  vec2 dev = vec2(gl_FragCoord.x";
  const FSREST = "\n  return;\n  vec2 dev = vec2(gl_FragCoord.x";
  let probe: { tentSources?: LabelBTentSources; tentVSources?: LabelBTentVSources; segVerts?: number } = {};
  if (v === "degen") {
    const d = (s: string) => swap(s, GLPOS, GLPOS + "  gl_Position.z = 2.0;\n");
    probe = { tentSources: { ...src, segVs: d(src.segVs), capVs: d(src.capVs), fillVs: d(src.fillVs) } };
  } else if (v === "fs0") {
    const body = "void main() {\n  oWord = floatBitsToUint(dot(vAB, vec4(1.0)) + dot(vS, vec4(1.0)) + dot(vSp, vec3(1.0))) ^ uint(vI.x + vI.y + vI.z + vI.w);";
    probe = { tentSources: { ...src, fs: swap(src.fs, FSMAIN, body + FSREST) } };
  } else if (v === "fsconst") {
    probe = { tentSources: { ...src, fs: swap(src.fs, FSMAIN, "void main() {\n  oWord = 1u;" + FSREST) } };
  } else if (v === "nw1") {
    const n = (s: string) => swap(s, `#define NW ${TENT_NW}\n`, "#define NW 1\n");
    probe = { tentSources: { segVs: n(src.segVs), capVs: n(src.capVs), fillVs: n(src.fillVs), fs: n(src.fs) }, segVerts: 8 };
  } else if (v === "tentvdegen") {
    const sv = labelBTentVSources(false);
    const d = (s: string) => swap(s, GLPOS, GLPOS + "  gl_Position.z = 2.0;\n");
    probe = { tentSources: { ...src, fillVs: d(src.fillVs) }, tentVSources: { ...sv, segVs: d(sv.segVs), capVs: d(sv.capVs) } };
  } else if (!["tent", "empty", "noup", "half", "floor", "tentv", "tentvinv", "emptynoup", "emptyinv", "uponly", "kick"].includes(v)) throw new Error(`no variant ${v}`);
  const pass = new LabelBPass(gl, false, v.startsWith("tentv") ? "tentv" : "tent", probe);
  if (v === "empty" || v === "emptynoup" || v === "emptyinv") pass.probeDraw = false;
  if (v === "emptyinv" || v === "tentvinv") pass.probeInvalidateDepth = true;
  if (v === "half") pass.probeSegFrac = 0.5;
  vpasses.set(v, pass);
  return pass;
}

async function timeMany(scene: FieldScene, opts: { variants?: string[]; scale?: number; frames?: number; rounds?: number; fit?: [number, number] } = {}) {
  const scale = opts.scale ?? 2;
  const frames = opts.frames ?? 60;
  const rounds = opts.rounds ?? 3;
  const vs = opts.variants ?? VARIANTS;
  scene.look.ctrlArc ??= 0.47;
  const fb = new FormB(scene, { dpr: scale });
  const tp0 = performance.now();
  const T: LabelBTables = buildLabelB(fb);
  const prepMs = performance.now() - tp0;
  const dev = opts.fit ? fitCamera(scene, fb.h, opts.fit, scale) : camera(scene, scale);
  const { M, W, H } = coarse(dev.M, dev.W, dev.H, 1);
  const per = Math.ceil(frames / rounds);
  const acc: Record<string, { up: number[]; sync: number[] }> = {};
  for (const v of vs) acc[v] = { up: [], sync: [] };
  for (let r = 0; r < rounds; r++) {
    for (const v of vs) {
      if (IDEAL.has(v)) {
        for (let k = 0; k < 5; k++) idealFrame(v, W, H);
        for (let k = 0; k < per; k++) {
          const u1 = performance.now();
          idealFrame(v, W, H);
          const u2 = performance.now();
          acc[v].up.push(0);
          acc[v].sync.push(u2 - u1);
        }
        continue;
      }
      const pass = variantPass(v);
      if (pass.width !== W || pass.height !== H) pass.resize(W, H);
      pass.upload(T);
      for (let k = 0; k < 5; k++) {
        pass.draw(M);
        pass.sync();
        if (v === "kick") kickSync();
      }
      for (let k = 0; k < per; k++) {
        const u0 = performance.now();
        if (v !== "noup" && v !== "floor" && v !== "emptynoup" && v !== "kick") pass.upload(T);
        const u1 = performance.now();
        if (v !== "floor" && v !== "uponly" && v !== "kick") pass.draw(M);
        if (v === "kick") kickSync();
        else pass.sync();
        const u2 = performance.now();
        acc[v].up.push(u1 - u0);
        acc[v].sync.push(u2 - u1);
      }
    }
  }
  const variants: Record<string, { sync: { p50: number; p95: number }; upload: { p50: number; p95: number } }> = {};
  for (const v of vs) variants[v] = { sync: { p50: pct(acc[v].sync, 0.5), p95: pct(acc[v].sync, 0.95) }, upload: { p50: pct(acc[v].up, 0.5), p95: pct(acc[v].up, 0.95) } };
  return {
    lost,
    renderer: renderer(),
    W,
    H,
    segs: T.nInst,
    fills: T.nFills,
    groups: T.nGroups,
    prepMs,
    rounds,
    frames: per * rounds,
    bytes: (T.pts.length + T.chain.length + T.span.length + T.fill.length + T.nb.length) * 4,
    variants,
  };
}

(window as unknown as { s3: unknown }).s3 = { verdict, time, timeMany, renderer };
