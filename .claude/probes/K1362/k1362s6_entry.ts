// K1362 s6 (from s5) (from k1362s4_entry.ts): adds the TILE route (gf_tiles.ts). A variant "g<tc>[f|F][_<tiers>]" (f = the optimistic bound plus the stencil fallback, F = that without the ramp test) draws through
// it: tiles of tc x tc grid cells, the tiers "<p><k>[r]" joined by "_" (none given: GF_TILE_TIERS; "g2_" alone: the
// full program on every reached tile), e.g. g2_11_22_32r. Its record gains route (tiles per class, empty, total, the
// classification's CPU ms over 5 uploads).
// From s4: the routed pass (gf_pass.ts GF_TIERS) against stage 3's program, timed WITHOUT a timer query so the same
// bundle runs on the desktop and the Pixel (k1362s3_entry.ts's method: sync4 = 4 targets rotated, a 1-px readPixels
// sync; frame1 = one pass per rAF; the "empty" variant is subtracted by the summary). Per scene (a K868 scene JSON):
//   pass     each variant is a GfPass (its own programs and texture), named:
//              s3      stage 3's shipped program (k1362s6_gf_glsl_s3.ts), drawn alone
//              full    today's full program alone (probe-only state removed)
//              empty   a trivial fragment over the same rect
//              t<tiers> the tiers, then the full program, through the stencil route; each tier is "<p><k>[r][h]"
//                      (r: carries ramps, h: mediump), joined by "_": t43 = {p4 k3 no ramps}, t22_43h, t43_43r
//   cover    per tiered variant, the share of the rect each prefix of its tiers draws (the rest goes to full)
//   cmp      every variant read back in RGBA32F against cfg.ref: ink (r) and coverage (g) differences
// Each (variant, mode) records its phone-side Date.now() window, so k1362s6_gpuclk.mjs puts the clock beside it.
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";
import { GfPass, GfTarget, type GfMap } from "../../../src/render/gpu_field/gf_pass";
import { gfFs, type GfTier } from "../../../src/render/gpu_field/gf_glsl";
import { GfEval } from "../../../src/render/gpu_field/eval";
import type { FieldScene } from "../../../src/render/field/scene";

type Rect = [number, number, number, number];
export interface BenchCfg {
  scenes: string[]; base: string; w: number; h: number; fit: number;
  nPass: number; warmMs: number; settleFrames: number; variants: string[]; modes: string[];
  cover?: boolean; ref?: string; cmp?: boolean;
}

const sortN = (a: number[]): number[] => a.slice().sort((x, y) => x - y);
const q = (a: number[], p: number): number => { const s = sortN(a); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const st = (a: number[]): { n: number; p50: number; p90: number; min: number; max: number } =>
  ({ n: a.length, p50: +q(a, 0.5).toFixed(3), p90: +q(a, 0.9).toFixed(3), min: +q(a, 0).toFixed(3), max: +q(a, 1).toFixed(3) });
const raf = (): Promise<number> => new Promise((r) => requestAnimationFrame((t) => r(t)));

const EMPTY = `#version 300 es
precision highp float;
out vec4 o0;
void main() { o0 = vec4(gl_FragCoord.xy * 1e-4, 0.0, 1.0); }`;
const DISCARD = `#version 300 es
precision highp float;
out vec4 o0;
void main() { discard; }`;

function parseTiers(name: string): GfTier[] {
  return name.slice(1).split("_").map((t) => {
    const m = /^(\d)(\d)(r?)(h?)(s?)$/.exec(t);
    if (!m) throw new Error("bad tier " + t);
    return { p: +m[1], k: +m[2], ramps: m[3] === "r", half: m[4] === "h", reg: m[5] === "s" };
  });
}
function makePass(gl: WebGL2RenderingContext, name: string, fullFs?: string): GfPass {
  if (name === "empty") return new GfPass(gl, false, [], () => EMPTY);
  if (name === "full") return new GfPass(gl, false, []);
  if (name === "fullS") return new GfPass(gl, false, [], () => gfFs(false, true, undefined, true)); // K1362 s6: the full program, register form
  if (name === "fullp") return new GfPass(gl, true, []);
  // t<tiers>[_...]: each tier "<p><k>[r][h][s]" (s = register form, gf_reg.ts), then the full program
  const tiers = parseTiers(name);
  return new GfPass(gl, false, tiers, (t) => (t ? gfFs(false, true, t) : fullFs ?? gfFs(false, true)));
}

function info(gl: WebGL2RenderingContext): Record<string, unknown> {
  const d = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    timerQuery: !!gl.getExtension("EXT_disjoint_timer_query_webgl2"),
    floatRT: !!gl.getExtension("EXT_color_buffer_float"),
    ua: navigator.userAgent, dpr: devicePixelRatio,
  };
}

function readRect(gl: WebGL2RenderingContext, tg: GfTarget, r: Rect): Float32Array {
  const out = new Float32Array((r[2] - r[0]) * (r[3] - r[1]) * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fbo);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.readPixels(r[0], r[1], r[2] - r[0], r[3] - r[1], gl.RGBA, gl.FLOAT, out);
  return out;
}

// The dpr 1 picture for Levi: one scene's field (fill under ink, GfComposite's formula, over a dark backdrop) at
// the phone's full resolution (cfg.w x cfg.h) beside the same frame drawn at dpr 1 (cfg.w1 x cfg.h1, aa one dpr-1 px)
// and upscaled to the screen bilinearly as the browser shows a low-resolution canvas; then the two crops with the
// most partly inked px, both versions, at x4 (nearest). Returns a PNG data URL.
async function pic(cfg: BenchCfg & { w1: number; h1: number; crop: number }): Promise<Record<string, unknown>> {
  const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
  const gl = canvas.getContext("webgl2", { antialias: false })!;
  const scene = (await (await fetch(`${cfg.base}/${cfg.scenes[0]}.json`)).json()) as FieldScene;
  (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  const FILL = [0.96, 0.93, 0.86]; const INK = [0.12, 0.11, 0.09]; const BG = [0.16, 0.17, 0.21];
  const render = (w: number, h: number): { img: ImageData; ink: Float32Array } => {
    let T: GfTables = buildTables(scene, { aa: 0.01 }); let s = 1; let cx = 0; let cy = 0;
    for (let k = 0; k < 2; k++) {
      const bw = T.gW * T.G; const bh = T.gH * T.G;
      s = cfg.fit * Math.min(cfg.w / bw, cfg.h / bh) * (w / cfg.w);
      cx = T.gx0 + bw / 2; cy = T.gy0 + bh / 2;
      T = buildTables(scene, { aa: 0.5 / s });
    }
    const e = w / 2 - s * cx; const f = h / 2 - s * cy;
    const map: GfMap = [1 / s, -e / s, -1 / s, (h - f) / s];
    const pass = new GfPass(gl, false); pass.upload(T);
    const tg = new GfTarget(gl, 1, true); tg.resize(w, h);
    pass.draw(tg, map, pass.gridRect(map, w, h), false);
    const raw = readRect(gl, tg, [0, 0, w, h]);
    const img = new ImageData(w, h); const ink = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = ((h - 1 - y) * w + x) * 4; const o = (y * w + x) * 4; // readPixels is bottom-up
      const a = Math.min(1, Math.max(0, raw[i])); const c = Math.min(1, Math.max(0, raw[i + 1]));
      ink[y * w + x] = a;
      for (let ch = 0; ch < 3; ch++) {
        const pre = INK[ch] * a + FILL[ch] * c * (1 - a); const al = a + (1 - a) * c;
        img.data[o + ch] = Math.round(255 * (pre + BG[ch] * (1 - al))); // sRGB values, blended as the app's premultiplied composite
      }
      img.data[o + 3] = 255;
    }
    return { img, ink };
  };
  const W = cfg.w; const H = cfg.h;
  const A = render(W, H); const B = render(cfg.w1, cfg.h1);
  const cv = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")!]; };
  const [ca, xa] = cv(W, H); xa.putImageData(A.img, 0, 0);
  const [cb0, xb0] = cv(cfg.w1, cfg.h1); xb0.putImageData(B.img, 0, 0);
  const [cb, xb] = cv(W, H); xb.imageSmoothingEnabled = true; xb.imageSmoothingQuality = "low"; xb.drawImage(cb0, 0, 0, W, H);
  const C = cfg.crop; const cand: [number, number, number][] = [];
  for (let y = 0; y + C <= H; y += C / 4) for (let x = 0; x + C <= W; x += C / 4) {
    let n = 0; for (let yy = y; yy < y + C; yy += 2) for (let xx = x; xx < x + C; xx += 2) { const v = A.ink[yy * W + xx]; if (v > 0.05 && v < 0.95) n++; }
    cand.push([n, x, y]);
  }
  cand.sort((p, q) => q[0] - p[0]);
  const crops = [cand[0]]; for (const c of cand) if (Math.hypot(c[1] - crops[0][1], c[2] - crops[0][2]) > 3 * C) { crops.push(c); break; }
  const half = Math.round(W / 2); const hh = Math.round(H / 2); const g = 16; const z = 4 * C;
  const outW = Math.max(2 * half + g, 2 * z + g); const outH = 28 + hh + g + crops.length * (z + g + 22);
  const [co, xo] = cv(outW, outH); xo.fillStyle = "#fff"; xo.fillRect(0, 0, outW, outH); xo.fillStyle = "#000"; xo.font = "18px sans-serif";
  xo.fillText(`${cfg.scenes[0]}: left full resolution ${W}x${H}, right dpr 1 (${cfg.w1}x${cfg.h1}) shown upscaled`, 4, 20);
  xo.imageSmoothingEnabled = true; xo.drawImage(ca, 0, 28, half, hh); xo.drawImage(cb, half + g, 28, half, hh);
  xo.strokeStyle = "#e33"; xo.lineWidth = 2;
  let y0 = 28 + hh + g;
  crops.forEach((c, k) => {
    for (const dx of [0, half + g]) xo.strokeRect(dx + c[1] / 2, 28 + c[2] / 2, C / 2, C / 2);
    xo.fillText(`crop ${k + 1} at x4: full resolution | dpr 1`, 4, y0 + 16); y0 += 22;
    xo.imageSmoothingEnabled = false;
    xo.drawImage(ca, c[1], c[2], C, C, 0, y0, z, z); xo.drawImage(cb, c[1], c[2], C, C, z + g, y0, z, z);
    y0 += z + g;
  });
  return { png: co.toDataURL("image/png"), crops };
}

export async function bench(cfg: BenchCfg): Promise<Record<string, unknown>> {
  if ((cfg as { pic?: boolean }).pic) return pic(cfg as BenchCfg & { w1: number; h1: number; crop: number });
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 64;
  document.body.appendChild(canvas);
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: true, preserveDrawingBuffer: false, powerPreference: "high-performance" })!;
  if (!gl) throw new Error("no WebGL2");
  const out: Record<string, unknown> = { info: info(gl), cfg, scenes: {} as Record<string, unknown> };
  const px = new Uint8Array(4);
  if ((cfg as { dbg?: boolean }).dbg) {
    // each variant compiled and drawn alone on a small rect: its GL error, context loss and time
    const log: string[] = [];
    const sc = (await (await fetch(`${cfg.base}/${cfg.scenes[0]}.json`)).json()) as FieldScene;
    (sc.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
    const T0 = buildTables(sc, { aa: 0.01 });
    for (const tr of [{ p: 4, k: 3, ramps: false }, { p: 4, k: 3, ramps: true }, { p: 8, k: 6, ramps: false }] as GfTier[]) {
      const sh = gl.createShader(gl.FRAGMENT_SHADER)!; gl.shaderSource(sh, gfFs(false, true, tr)); gl.compileShader(sh);
      const lg = gl.getShaderInfoLog(sh) ?? "";
      log.push(`${JSON.stringify(tr)} ok ${gl.getShaderParameter(sh, gl.COMPILE_STATUS)} log ${lg.length}: ${lg.replace(/\s+/g, " ").slice(0, 300)}`);
    }
    const alive = async (lbl: string): Promise<void> => {
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); await raf(); await raf();
      const sh = gl.createShader(gl.FRAGMENT_SHADER)!; gl.shaderSource(sh, EMPTY); gl.compileShader(sh);
      log.push(`${lbl}: err ${gl.getError()} compile ${gl.getShaderParameter(sh, gl.COMPILE_STATUS)} lost ${gl.isContextLost()}`); gl.deleteShader(sh);
    };
    if ((cfg as { steps?: boolean }).steps) {
      await alive("start");
      const tg = new GfTarget(gl, 1, false); tg.resize(64, 64); gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fbo);
      tg.ensureStencil(); await alive("ensureStencil");
      gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1, 0); await alive("clearBufferfi");
      gl.clearBufferiv(gl.STENCIL, 0, [0]); await alive("clearBufferiv");
      const ps = makePass(gl, "empty"); ps.upload(T0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fbo); gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.EQUAL, 0, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      ps.draw(tg, [1, 0, -1, 64], [0, 0, 64, 64], false); await alive("emptyDraw");
      gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fbo); gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.DEPTH_STENCIL_ATTACHMENT]); await alive("invalidate");
      tg.dispose(); await alive("dispose");
      const p2 = makePass(gl, "t43"); p2.upload(T0); const t2 = new GfTarget(gl, 1, false); t2.resize(64, 64);
      p2.draw(t2, [1, 0, -1, 64], [0, 0, 64, 64], false); await alive("t43draw");
      p2.draw(t2, [1, 0, -1, 64], [0, 0, 64, 64], false); await alive("t43draw2");
      out.dbg = log; canvas.remove(); return out;
    }
    for (const vn of cfg.variants) {
      const a = performance.now(); gl.getError();
      let ps: GfPass; try { ps = makePass(gl, vn); } catch (e) { log.push(`${vn} make ${String(e).slice(0, 80)} lost ${gl.isContextLost()}`); break; } ps.upload(T0);
      const tg = new GfTarget(gl, 1, false); tg.resize(64, 64);
      try { ps.draw(tg, [1, 0, -1, 64], [0, 0, 64, 64], false); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } catch (e) { log.push(vn + " threw " + String(e).slice(0, 100)); }
      log.push(`${vn} err ${gl.getError()} lost ${gl.isContextLost()} ${(performance.now() - a).toFixed(0)} ms`);
      if (gl.isContextLost()) break;
      ps.dispose(); tg.dispose();
    }
    out.dbg = log; canvas.remove(); return out;
  }
  for (const name of cfg.scenes) {
    const rec: Record<string, unknown> = {};
    (out.scenes as Record<string, unknown>)[name] = rec;
    const scene = (await (await fetch(`${cfg.base}/${name}.json`)).json()) as FieldScene;
    (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
    let T: GfTables = buildTables(scene, { aa: 0.01 });
    let s = 1; let cx = 0; let cy = 0;
    for (let k = 0; k < 2; k++) {
      const bw = T.gW * T.G; const bh = T.gH * T.G;
      s = cfg.fit * Math.min(cfg.w / bw, cfg.h / bh);
      cx = T.gx0 + bw / 2; cy = T.gy0 + bh / 2;
      T = buildTables(scene, { aa: 0.5 / s });
    }
    const e = cfg.w / 2 - s * cx; const f = cfg.h / 2 - s * cy;
    const map: GfMap = [1 / s, -e / s, -1 / s, (cfg.h - f) / s];
    rec.scale = s;
    rec.grid = { nK: T.nK, nV: T.nV, nA: T.nA, nCh: T.nCh, halfOk: Math.max(T.nV, T.nK, T.nA, T.nCh) < 32000 };
    const targets = [0, 1, 2, 3].map(() => { const tg = new GfTarget(gl, 1, false); tg.resize(cfg.w, cfg.h); return tg; });
    const sync = (r: Rect): void => { gl.readPixels(r[0], r[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    const res: Record<string, Record<string, unknown>> = {};
    let rect: Rect = [0, 0, 0, 0];
    for (const vn of cfg.variants) {
      const tc = performance.now();
      const pass = makePass(gl, vn);
      pass.upload(T);
      rect = pass.gridRect(map, cfg.w, cfg.h);
      const draw = (j = 0): void => pass.draw(targets[j & 3], map, rect, false);
      draw(); sync(rect);
      const r: Record<string, unknown> = { firstMs: +(performance.now() - tc).toFixed(1) };
      if (pass.tc > 0 && pass.route) {
        const um: number[] = []; for (let i = 0; i < 5; i++) { pass.upload(T); um.push(pass.routeMs); }
        const R0 = pass.route;
        r.route = { tiers: pass.tiers.map((t) => `${t.p}${t.k}${t.ramps ? "r" : ""}`), count: R0.count, empty: R0.empty, total: R0.total,
          share: R0.count.map((c) => +(c / R0.total).toFixed(4)), ms: st(um) };
      }
      for (const mode of cfg.modes) {
        const ms: number[] = [];
        const t0 = Date.now();
        if (mode === "sync4") {
          const tw = performance.now();
          while (performance.now() - tw < cfg.warmMs) { for (let j = 0; j < 4; j++) draw(j); sync(rect); }
          for (let i = 0; i < cfg.nPass; i++) {
            const a = performance.now();
            for (let j = 0; j < 4; j++) draw(j);
            sync(rect);
            ms.push((performance.now() - a) / 4);
          }
        } else if (mode === "frame1") {
          const iv: number[] = []; let tl = await raf();
          for (let i = 0; i < cfg.settleFrames + cfg.nPass; i++) {
            const tf = await raf(); iv.push(tf - tl); tl = tf;
            const a = performance.now(); draw(); sync(rect); const dt = performance.now() - a;
            if (i >= cfg.settleFrames) ms.push(dt);
          }
          r.frame1_rafMs = st(iv.slice(cfg.settleFrames));
        }
        r[mode] = st(ms);
        r[mode + "_t"] = [t0, Date.now()];
        await raf();
      }
      r.glError = gl.getError();
      res[vn] = r;
      pass.dispose();
    }
    rec.pass = res;
    rec.rect = rect; rec.px = (rect[2] - rect[0]) * (rect[3] - rect[1]);
    for (const tg of targets) tg.dispose();

    // --- cover: the share of the rect each prefix of a variant's tiers draws ---
    const ft = new GfTarget(gl, 1, true); ft.resize(cfg.w, cfg.h);
    if (cfg.cover) {
      const cov: Record<string, number[]> = {};
      for (const vn of cfg.variants.filter((v) => /^t\d/.test(v))) {
        const tiers = parseTiers(vn);
        cov[vn] = [];
        for (let i = 1; i <= tiers.length; i++) {
          const pp = new GfPass(gl, false, tiers.slice(0, i), (t) => (t ? gfFs(false, true, t) : DISCARD));
          pp.upload(T); pp.draw(ft, map, rect, false);
          const a = readRect(gl, ft, rect);
          let n = 0; for (let k = 3; k < a.length; k += 4) if (a[k] > 0) n++;
          cov[vn].push(+(n / (a.length / 4)).toFixed(4));
          pp.dispose();
        }
      }
      rec.cover = cov;
    }
    // --- cmp: each variant's read-back against cfg.ref (RGBA32F) ---
    if (cfg.cmp && cfg.ref) {
      const grab = (vn: string): Float32Array => { const pp = makePass(gl, vn); pp.upload(T); pp.draw(ft, map, rect, false); const a = readRect(gl, ft, rect); pp.dispose(); return a; };
      const R = grab(cfg.ref);
      // the CPU mirror at a stride of pixels: how far the reference and each variant sit from it
      const E = new GfEval(T); const W0 = rect[2] - rect[0]; const npx = R.length / 4; const stride = Math.max(1, Math.floor(npx / 3000));
      const mirr: number[] = []; for (let i = 0; i < npx; i += stride) { const px0 = rect[0] + (i % W0) + 0.5; const py0 = rect[1] + Math.floor(i / W0) + 0.5; mirr.push(E.eval(map[0] * px0 + map[1], map[2] * py0 + map[3]).ink); }
      const vsM = (X: Float32Array): number[] => { let a = 0; let b = 0; let mx = 0; let j = 0; for (let i = 0; i < npx; i += stride, j++) { const d = Math.abs(X[i * 4] - mirr[j]); if (d > 1e-2) a++; if (d > 1e-1) b++; if (d > mx) mx = d; } return [j, a, b, +mx.toExponential(2)]; };
      rec.mirror = { [cfg.ref]: vsM(R) } as Record<string, number[]>;
      const cmp: Record<string, unknown> = {};
      for (const vn of cfg.variants.filter((v) => v !== cfg.ref && v !== "empty")) {
        const A = grab(vn); (rec.mirror as Record<string, number[]>)[vn] = vsM(A);
        let onlyA = 0; let onlyR = 0; let sumA = 0; let sumR = 0; for (let k = 0; k < A.length; k += 4) { if (A[k] > 0 && !(R[k] > 0)) onlyA++; if (R[k] > 0 && !(A[k] > 0)) onlyR++; sumA += A[k]; sumR += R[k]; }
        let nd = 0; let n3 = 0; let n2 = 0; let n1 = 0; let mx = 0; let mc = 0; let un = 0; let worst = -1;
        for (let k = 0; k < A.length; k += 4) {
          if ((A[k + 3] > 0) !== (R[k + 3] > 0)) un++;
          const d = Math.abs(A[k] - R[k]); const dc = Math.abs(A[k + 1] - R[k + 1]);
          if (d > 0 || dc > 0) nd++;
          if (d > 1e-3) n3++; if (d > 1e-2) n2++; if (d > 1e-1) n1++;
          if (d > mx) { mx = d; worst = k / 4; }
          if (dc > mc) mc = dc;
        }
        const W = rect[2] - rect[0];
        cmp[vn] = { diffPx: nd, over1e3: n3, over1e2: n2, over1e1: n1, maxInk: +mx.toExponential(2), maxCov: +mc.toExponential(2), unwritten: un,
          onlyA, onlyR, sumA: +sumA.toFixed(0), sumR: +sumR.toFixed(0), worstVals: worst >= 0 ? [A[worst * 4], R[worst * 4], A[worst * 4 + 1], R[worst * 4 + 1]] : null, worstAt: worst >= 0 ? [rect[0] + (worst % W), rect[1] + Math.floor(worst / W)] : null };
      }
      rec.cmp = cmp;
    }
    ft.dispose();
    rec.glError = gl.getError();
  }
  canvas.remove();
  return out;
}
