// K1040 S4a: the band pass's probe page (bundled by s4a.mjs).
//   window.s4a.check(scene, {scale})   check #12: GPU band vs form B's ink,
//       sections normal to every chain, run ends through checks.ts's InkProbe
//   window.s4a.crops(scene, {scale, sites})  ref | GPU crops at device sites
//   window.s4a.time(scene, {scale, frames, rounds})  render sync, label alone
//       vs label + band, back to back, interleaved rounds
// The band draws into the canvas's default framebuffer (no target of its own,
// as in the app's frame pass), reading the label pass's L.
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { buildLabelB, type LabelBTables } from "../../../../src/render/field/label_b";
import { LabelBPass, type Affine } from "../../../../src/render/field/label_b_pass";
import { buildBandB, type BandBTables } from "../../../../src/render/field/band_b";
import { BandBPass } from "../../../../src/render/field/band_b_pass";
import { imageProbe, runsOn, type InkProbe } from "../../../../src/render/field/checks";

const canvas = document.createElement("canvas");
canvas.width = 4;
canvas.height = 4;
document.body.appendChild(canvas);
let lost = 0;
canvas.addEventListener("webglcontextlost", () => lost++);
const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, preserveDrawingBuffer: true }) as WebGL2RenderingContext;

function renderer(): string {
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
}

function camera(scene: FieldScene, scale: number): { M: Affine; W: number; H: number } {
  const [a, b, c, d, e, f] = scene.camera.worldToCss;
  const [vw, vh] = scene.camera.viewport;
  return { M: [a * scale, b * scale, c * scale, d * scale, e * scale, f * scale], W: Math.round(vw * scale), H: Math.round(vh * scale) };
}

// K923's fit, as s3's page.ts (timing only: form B and the tables keep the
// scene's own aa): the chains' bbox plus h, times 1.04, centred on a
// fit[0] x fit[1] CSS px canvas at the scale (the Pixel's 411x753).
function fitCamera(scene: FieldScene, h: number, fit: [number, number], scale: number): { M: Affine; W: number; H: number } {
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

interface Setup {
  scene: FieldScene;
  scale: number;
  fb: FormB;
  T: LabelBTables;
  B: BandBTables;
  M: Affine;
  W: number;
  H: number;
  ppd: number;
  label: LabelBPass;
  band: BandBPass;
  prepLabelMs: number;
  prepBandMs: number;
}

let cur: Setup | null = null;

function setup(scene: FieldScene, scale: number, fit?: [number, number]): Setup {
  if (cur) {
    cur.label.dispose();
    cur.band.dispose();
    cur = null;
  }
  scene.look.ctrlArc ??= 0.47;
  const fb = new FormB(scene, { dpr: scale });
  const t0 = performance.now();
  const T = buildLabelB(fb);
  const t1 = performance.now();
  const B = buildBandB(fb, T);
  const t2 = performance.now();
  const { M, W, H } = fit ? fitCamera(scene, fb.h, fit, scale) : camera(scene, scale);
  canvas.width = W;
  canvas.height = H;
  const label = new LabelBPass(gl);
  label.resize(W, H);
  label.upload(T);
  const band = new BandBPass(gl);
  band.upload(T, B);
  const ppd = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2]));
  cur = { scene, scale, fb, T, B, M, W, H, ppd, label, band, prepLabelMs: t1 - t0, prepBandMs: t2 - t1 };
  return cur;
}

function frame(S: Setup, withBand: boolean): void {
  S.label.draw(S.M);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, S.W, S.H);
  gl.disable(gl.SCISSOR_TEST);
  gl.colorMask(true, true, true, true);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (withBand) S.band.draw(S.M, S.label.label!, S.W, S.H);
}

const px4 = new Uint8Array(4);
function syncBoth(S: Setup): void {
  S.label.sync();
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px4);
}

/** The canvas's ink (R), top-down rows. */
function readInk(S: Setup): Uint8Array {
  const raw = new Uint8Array(S.W * S.H * 4);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.readPixels(0, 0, S.W, S.H, gl.RGBA, gl.UNSIGNED_BYTE, raw);
  const out = new Uint8Array(S.W * S.H);
  for (let j = 0; j < S.H; j++) {
    const src = (S.H - 1 - j) * S.W * 4;
    const dst = j * S.W;
    for (let i = 0; i < S.W; i++) out[dst + i] = raw[src + 4 * i];
  }
  return out;
}

function gpuProbe(S: Setup, ink: Uint8Array): InkProbe {
  const rgba = new Uint8Array(S.W * S.H * 4);
  for (let i = 0; i < S.W * S.H; i++) {
    const g = 255 - ink[i];
    rgba[4 * i] = g;
    rgba[4 * i + 1] = g;
    rgba[4 * i + 2] = g;
    rgba[4 * i + 3] = 255;
  }
  return imageProbe({ w: S.W, h: S.H, rgba }, { worldToCss: S.scene.camera.worldToCss, dpr: S.scale } as never, 0, 0, [255, 255, 255], [0, 0, 0], "gpu");
}

/** Form B's ink at device pixel centres, lazily, quantized as the canvas is, read by imageProbe's rule. */
function refProbe(S: Setup): InkProbe & { at(i: number, j: number): number } {
  const { W, H, M, fb } = S;
  const cache = new Float32Array(W * H).fill(NaN);
  const [a, b, c, d, e, f] = M;
  const det = a * d - b * c;
  const at = (i: number, j: number): number => {
    const ii = Math.min(W - 1, Math.max(0, i));
    const jj = Math.min(H - 1, Math.max(0, j));
    const k = jj * W + ii;
    let v = cache[k];
    if (v !== v) {
      const u = ii + 0.5 - e;
      const w = jj + 0.5 - f;
      const x = (d * u - c * w) / det;
      const y = (-b * u + a * w) / det;
      const ink = fb.evalPoint(x, y).ink;
      v = Math.round(Math.min(1, Math.max(0, ink)) * 255) / 255;
      cache[k] = v;
    }
    return v;
  };
  return {
    exact: false,
    label: "formB",
    at,
    cov(x, y) {
      const u = a * x + c * y + e - 0.5;
      const v = b * x + d * y + f - 0.5;
      const i = Math.floor(u);
      const j = Math.floor(v);
      const fu = u - i;
      const fv = v - j;
      return (at(i, j) * (1 - fu) + at(i + 1, j) * fu) * (1 - fv) + (at(i, j + 1) * (1 - fu) + at(i + 1, j + 1) * fu) * fv;
    },
  };
}

interface Spot {
  dF: number;
  u: number;
  v: number;
  chain: number;
  k: number;
  side: number;
  gpu: [number, number][];
  ref: [number, number][];
}

// Check #12 (K1040 F11): sections normal to each chain every 6 device px,
// both sides, t in [h - W - 4 px, h + 4 px] (never past (h - W) / 2), sampled
// every 0.25 px; runs (coverage >= 0.5) through each probe; with equal run
// counts, dF = the largest run-end difference in device px. "Away from
// corners": a section within 2h + W + r of a corner's V, q, t_a or t_b is
// skipped.
function check(scene: FieldScene, opts: { scale?: number; keep?: number } = {}) {
  const scale = opts.scale ?? 2;
  const S = setup(scene, scale);
  frame(S, true);
  const ink = readInk(S);
  const gpu = gpuProbe(S, ink);
  const ref = refProbe(S);
  const { fb, ppd } = S;
  const h = fb.h;
  const Wb = fb.W;
  const ex: [number, number, number][] = [];
  for (const c of fb.corners) {
    const r = 2 * h + Wb + (Number.isFinite(c.r) ? Math.max(0, c.r) : 0);
    for (const [x, y] of [
      [c.Vx, c.Vy],
      [c.qx, c.qy],
      [c.tax, c.tay],
      [c.tbx, c.tby],
    ])
      if (Number.isFinite(x) && Number.isFinite(y)) ex.push([x, y, r]);
  }
  const near = (x: number, y: number): boolean => {
    for (const [cx, cy, r] of ex) if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
    return false;
  };
  const step = 6 / ppd;
  const tA = Math.max(h - Wb - 4 / ppd, (h - Wb) / 2);
  const tB = h + 4 / ppd;
  const st = 0.25 / ppd;
  let n = 0;
  let inked = 0;
  let skipped = 0;
  let over = 0;
  let over8 = 0;
  let over2 = 0;
  let mism = 0;
  const top: Spot[] = [];
  const mis: Spot[] = [];
  const keep = opts.keep ?? 16;
  const t0 = performance.now();
  fb.polys.forEach((p, ci) => {
    let carry = 0;
    for (let k = 0; k < p.nseg; k++) {
      const k1 = k + 1 === p.n ? 0 : k + 1;
      const ax = p.x[k];
      const ay = p.y[k];
      const dx = p.x[k1] - ax;
      const dy = p.y[k1] - ay;
      const l = Math.sqrt(dx * dx + dy * dy);
      if (!(l > 1e-9)) continue;
      const tx = dx / l;
      const ty = dy / l;
      let s = carry;
      for (; s < l; s += step) {
        const px = ax + tx * s;
        const py = ay + ty * s;
        if (near(px, py)) {
          skipped++;
          continue;
        }
        for (const side of [1, -1]) {
          const nx = -ty * side;
          const ny = tx * side;
          const f = (t: number): [number, number] => [px + nx * t, py + ny * t];
          const rg = runsOn(gpu, f, tA, tB, st);
          const rr = runsOn(ref, f, tA, tB, st);
          n++;
          if (rg.length || rr.length) inked++;
          const [a, b, c, d, e, ff] = S.M;
          const u = a * px + c * py + e;
          const v = b * px + d * py + ff;
          if (rg.length !== rr.length) {
            mism++;
            if (mis.length < keep) mis.push({ dF: Infinity, u, v, chain: ci, k, side, gpu: rg, ref: rr });
            continue;
          }
          let dF = 0;
          for (let m = 0; m < rg.length; m++) dF = Math.max(dF, Math.abs(rg[m][0] - rr[m][0]), Math.abs(rg[m][1] - rr[m][1]));
          dF *= ppd;
          if (dF > 1 / 32) over++;
          if (dF > 1 / 8) over8++;
          if (dF > 0.5) over2++;
          if (top.length < keep || dF > top[top.length - 1].dF) {
            top.push({ dF, u, v, chain: ci, k, side, gpu: rg, ref: rr });
            top.sort((x, y) => y.dF - x.dF);
            if (top.length > keep) top.length = keep;
          }
        }
      }
      carry = s - l;
    }
  });
  const ms = performance.now() - t0;
  let inkPx = 0;
  for (let i = 0; i < ink.length; i++) if (ink[i] > 0) inkPx++;
  return {
    lost,
    renderer: renderer(),
    W: S.W,
    H: S.H,
    ppd,
    h,
    Wb,
    aa: fb.aa,
    segs: S.T.nInst,
    strips: S.B.nInst,
    groups: S.B.nGroups,
    windows: S.B.nWin,
    maxGroupWin: S.B.maxGroupWin,
    maxWinSegs: S.B.maxWinSegs,
    corners: fb.corners.length,
    prepLabelMs: S.prepLabelMs,
    prepBandMs: S.prepBandMs,
    inkPx,
    n,
    inked,
    skipped,
    over,
    over8,
    over2,
    mism,
    worst: top,
    mis,
    ms,
  };
}

/** Crops (device px, top-left u0, v0, size z): ref and GPU ink bytes. */
function crops(scene: FieldScene, opts: { scale?: number; sites: [number, number, number][] }) {
  const S = cur && cur.scene === scene ? cur : setup(scene, opts.scale ?? 2);
  frame(S, true);
  const ink = readInk(S);
  const ref = refProbe(S);
  const out: { u0: number; v0: number; z: number; ref: number[]; gpu: number[] }[] = [];
  for (const [uc, vc, z] of opts.sites) {
    const u0 = Math.round(uc - z / 2);
    const v0 = Math.round(vc - z / 2);
    const r: number[] = [];
    const g: number[] = [];
    for (let j = 0; j < z; j++)
      for (let i = 0; i < z; i++) {
        const ii = u0 + i;
        const jj = v0 + j;
        const inside = ii >= 0 && jj >= 0 && ii < S.W && jj < S.H;
        r.push(inside ? Math.round(ref.at(ii, jj) * 255) : 0);
        g.push(inside ? ink[jj * S.W + ii] : 0);
      }
    out.push({ u0, v0, z, ref: r, gpu: g });
  }
  return out;
}

/** Junction sites: one corner V per group (up to n, spread), in device px, plus the device size of 7 h. */
function junctionSites(scene: FieldScene, opts: { scale?: number; n?: number }) {
  const S = cur && cur.scene === scene ? cur : setup(scene, opts.scale ?? 2);
  const { fb, M } = S;
  const [a, b, c, d, e, f] = M;
  const byG = new Map<number, [number, number]>();
  for (const cn of fb.corners) if (!byG.has(cn.g) && Number.isFinite(cn.Vx)) byG.set(cn.g, [cn.Vx, cn.Vy]);
  let pts = [...byG.values()];
  if (pts.length === 0) {
    // No junctions (fat): chain points spread over the frame.
    for (const p of fb.polys) for (let k = 0; k < p.n; k += Math.max(1, Math.floor(p.n / 3))) pts.push([p.x[k], p.y[k]]);
  }
  const want = opts.n ?? 6;
  if (pts.length > want) {
    const pick: [number, number][] = [];
    for (let q = 0; q < want; q++) pick.push(pts[Math.floor((q * pts.length) / want)]);
    pts = pick;
  }
  const z = Math.max(48, Math.min(128, Math.ceil(7 * fb.h * S.ppd)));
  return pts
    .map(([x, y]) => [a * x + c * y + e, b * x + d * y + f, z] as [number, number, number])
    .filter(([u, v]) => u >= 0 && v >= 0 && u < S.W && v < S.H);
}

function pct(a: number[], q: number): number {
  if (!a.length) return NaN;
  const s = a.slice().sort((u, v) => u - v);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

// Render sync (K923's b2b): draw + 1-px readbacks of L and the canvas, frames
// back to back in one task after warm-up; arms interleaved per round.
function time(scene: FieldScene, opts: { scale?: number; frames?: number; rounds?: number; fit?: [number, number] } = {}) {
  const scale = opts.scale ?? 2;
  const frames = opts.frames ?? 40;
  const rounds = opts.rounds ?? 5;
  const S = setup(scene, scale, opts.fit);
  for (let k = 0; k < 10; k++) {
    frame(S, true);
    syncBoth(S);
    frame(S, false);
    syncBoth(S);
  }
  const acc: Record<string, number[]> = { label: [], band: [] };
  for (let r = 0; r < rounds; r++)
    for (const arm of r % 2 ? ["band", "label"] : ["label", "band"]) {
      for (let k = 0; k < frames; k++) {
        const t0 = performance.now();
        frame(S, arm === "band");
        syncBoth(S);
        acc[arm].push(performance.now() - t0);
      }
    }
  return {
    lost,
    renderer: renderer(),
    W: S.W,
    H: S.H,
    strips: S.B.nInst,
    segs: S.T.nInst,
    prepLabelMs: S.prepLabelMs,
    prepBandMs: S.prepBandMs,
    label: { p50: pct(acc.label, 0.5), p95: pct(acc.label, 0.95), n: acc.label.length },
    band: { p50: pct(acc.band, 0.5), p95: pct(acc.band, 0.95), n: acc.band.length },
  };
}

/**
 * Diagnosis: along each spot's section (as check #12 walks it), the pixels
 * where the GPU's byte and form B's differ by more than `tol`: form B's whole
 * PixelEval at the pixel centre, the GPU byte and the label word, decoded.
 */
function diag(scene: FieldScene, opts: { scale?: number; spots: { u: number; v: number; chain: number; k: number; side: number }[]; tol?: number; max?: number }) {
  const S = cur && cur.scene === scene ? cur : setup(scene, opts.scale ?? 2);
  frame(S, true);
  const ink = readInk(S);
  const { word } = S.label.read();
  const { fb, M, ppd, W, H } = S;
  const [a, b, c, d, e, f] = M;
  const det = a * d - b * c;
  const tol = opts.tol ?? 8;
  const out: unknown[] = [];
  for (const sp of opts.spots) {
    const p = fb.polys[sp.chain];
    const k1 = sp.k + 1 === p.n ? 0 : sp.k + 1;
    const dx = p.x[k1] - p.x[sp.k];
    const dy = p.y[k1] - p.y[sp.k];
    const l = Math.sqrt(dx * dx + dy * dy);
    const tx = dx / l;
    const ty = dy / l;
    const u0 = sp.u - e;
    const w0 = sp.v - f;
    const px = (d * u0 - c * w0) / det;
    const py = (-b * u0 + a * w0) / det;
    const nx = -ty * sp.side;
    const ny = tx * sp.side;
    const seen = new Set<number>();
    const rows: unknown[] = [];
    const tA = Math.max(fb.h - fb.W - 4 / ppd, (fb.h - fb.W) / 2);
    const tB = fb.h + 4 / ppd;
    for (let t = tA; t <= tB; t += 0.25 / ppd) {
      const qx = px + nx * t;
      const qy = py + ny * t;
      const i = Math.floor(a * qx + c * qy + e);
      const j = Math.floor(b * qx + d * qy + f);
      if (i < 0 || j < 0 || i >= W || j >= H) continue;
      const key = j * W + i;
      if (seen.has(key)) continue;
      seen.add(key);
      const uc = i + 0.5 - e;
      const vc = j + 0.5 - f;
      const x = (d * uc - c * vc) / det;
      const y = (-b * uc + a * vc) / det;
      const r = fb.evalPoint(x, y);
      const rb = Math.round(Math.min(1, Math.max(0, r.ink)) * 255);
      const gb = ink[key];
      if (Math.abs(rb - gb) <= tol) continue;
      const wd = word[key];
      rows.push({
        i,
        j,
        tPx: +(t * ppd).toFixed(2),
        ref: rb,
        gpu: gb,
        top: r.top,
        rchain: r.chain,
        rs: +r.s.toFixed(4),
        term: r.term ? { kind: r.term.kind, surf: r.term.surf, chain: r.term.chain, s: +r.term.s.toFixed(4), k: r.term.k, D: +(r.term.D * ppd).toFixed(3), w: +r.term.w.toFixed(3), v: +r.term.v.toFixed(3) } : null,
        nSurf: r.nSurf,
        label: wd ? { chain: (wd & 255) - 1, s11: (wd >>> 8) & 2047, code: (wd >>> 19) & 255, fill: (wd >>> 27) & 1, cap: (wd >>> 28) & 1 } : 0,
      });
      if (rows.length >= (opts.max ?? 24)) break;
    }
    out.push({ spot: sp, rows });
  }
  return out;
}

(window as unknown as { s4a: unknown }).s4a = { check, crops, junctionSites, time, diag, renderer };
