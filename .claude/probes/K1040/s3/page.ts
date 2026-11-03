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
import { LabelBPass, type Affine } from "../../../../src/render/field/label_b_pass";
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

function verdict(scene: FieldScene, opts: { scale?: number; maxSites?: number; stride?: number } = {}) {
  const scale = opts.scale ?? 2;
  const stride = opts.stride ?? 1;
  scene.look.ctrlArc ??= 0.47;
  const t0 = performance.now();
  const fb = new FormB(scene, { dpr: scale });
  const t1 = performance.now();
  const T = buildLabelB(fb);
  const t2 = performance.now();
  const { M, W, H } = camera(scene, scale);
  const pass = new LabelBPass(gl, true);
  pass.resize(W, H);
  pass.upload(T);
  pass.draw(M);
  const { word, dbg } = pass.read();
  const t3 = performance.now();
  const [a, b, c, d, e, f] = M;
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
      const u = i + 0.5 - e;
      const v = j + 0.5 - f;
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
      if ((vd.cls === "DEFECT" || (vd.cls === "fade" && sites.length < maxSites / 2)) && sites.length < maxSites) {
        const mg = sampleOf(labelAt(fb, T, x, y));
        const mv = labelVerdict(fb, T, x, y, mg);
        sites.push({
          i,
          j,
          cls: vd.cls,
          why: vd.why,
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
// and no draw, only the 1-px readback (K923's floor).
async function time(scene: FieldScene, opts: { scale?: number; frames?: number; noscan?: boolean; fit?: [number, number]; b2b?: boolean; floor?: boolean } = {}) {
  const scale = opts.scale ?? 2;
  const frames = opts.frames ?? 60;
  scene.look.ctrlArc ??= 0.47;
  const fb = new FormB(scene, { dpr: scale });
  const tp0 = performance.now();
  const T: LabelBTables = buildLabelB(fb);
  if (opts.noscan) T.nb.fill(0);
  const prepMs = performance.now() - tp0;
  const { M, W, H } = opts.fit ? fitCamera(scene, fb.h, opts.fit, scale) : camera(scene, scale);
  const pass = new LabelBPass(gl, false);
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

(window as unknown as { s3: unknown }).s3 = { verdict, time, renderer };
