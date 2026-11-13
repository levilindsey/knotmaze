// K1362 s3: rp=gf's pass and table build, timed WITHOUT a timer query, so the same bundle runs on the
// desktop and on the Pixel (which has none). Bundled (minified, as the app ships) by k1362s3_run.mjs and
// loaded by k1362s3_bench.html. Per scene (a K868 scene JSON):
//   tables   buildTables() N times after a warm-up: total and parts (T.ms), median / p90; then pack + upload
//   pass     the shipped program and timing variants (stage 2's surgery, plus "once": the cfg loop runs
//            layers() once), each timed by SYNC: draw, then a 1-pixel readPixels (it returns only when the
//            GPU is done). Modes:
//              sync1    back to back, one sync per pass, after warmMs of the same (the clock is up)
//              sync4    4 passes per sync, ms / 4 (the GPU never idles between them)
//              frame1   one pass per requestAnimationFrame, synced (the app's pacing)
//              busy     per rAF: 2 untimed passes, a sync, then the timed pass + sync (stage 2's busy_finish)
//            The "empty" variant is the same raster with a trivial fragment; its time is subtracted.
//   counts   the probe program's segments and corners per pixel (mean, p95; live = pixels with a segment)
// The target is an offscreen RGBA8 framebuffer of w x h; the tables' grid box is fit to it (fit * min(w/boxW,
// h/boxH) px per unit), centred, so the pixels shaded do not depend on the page's own viewport.
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";
import { GfPass, GfTarget, compileProgram, type GfMap } from "../../../src/render/gpu_field/gf_pass";
import { GF_VS, gfFs } from "../../../src/render/gpu_field/gf_glsl";
import { MAXP } from "../../../src/render/gpu_field/tables";
import { MAXK } from "../../../src/render/gpu_field/eval";
import type { FieldScene } from "../../../src/render/field/scene";

type Rect = [number, number, number, number];
export interface BenchCfg {
  scenes: string[]; base: string; w: number; h: number; fit: number;
  nTables: number; nPass: number; warmMs: number; settleFrames: number; variants: string[]; modes: string[]; counts: boolean;
  /** extra variants by name: [find, replace] pairs applied in turn to the shipped app shader (no rebuild needed) */
  surgery?: Record<string, [string, string][]>;
}

const sortN = (a: number[]): number[] => a.slice().sort((x, y) => x - y);
const q = (a: number[], p: number): number => { const s = sortN(a); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const st = (a: number[]): { n: number; p50: number; p90: number; min: number; max: number } =>
  ({ n: a.length, p50: +q(a, 0.5).toFixed(3), p90: +q(a, 0.9).toFixed(3), min: +q(a, 0).toFixed(3), max: +q(a, 1).toFixed(3) });
const raf = (): Promise<number> => new Promise((r) => requestAnimationFrame((t) => r(t)));

function variants(surgery: Record<string, [string, string][]> = {}): Record<string, string> {
  const src = gfFs(false);
  const rep = (s: string, a: string, b: string): string => { if (!s.includes(a)) throw new Error("surgery: missing " + a); return s.replace(a, b); };
  const early = (s: string, v: string): string => rep(s, "    // keys and membership", `    o0 = ${v}; return;\n    // keys and membership`);
  return {
    full: src,
    notan: gfFs(false, false),
    scan: early(src, "vec4(float(np), float(nSeg), pd[0], 1.0)"),
    dist: early(rep(rep(src, "int nSeg = 0; int nK = 0;", "int nSeg = 0; int nK = 0; float acc = BIG;"), "if (d2 >= rc2) continue;", "acc = min(acc, d2); continue;"), "vec4(acc, float(nSeg), 0.0, 1.0)"),
    cells: early(rep(src, "for (int i = 0; i < chn; i++) {", "nSeg += chn + v0; for (int i = 0; i < 0; i++) {"), "vec4(float(nSeg), 0.0, 0.0, 1.0)"),
    once: rep(src, "for (int cfg = 0; cfg <= nr; cfg++) {", "for (int cfg = 0; cfg <= 0; cfg++) {"),
    empty: rep(src, "void main() {", "void main() {\n  o0 = vec4(gl_FragCoord.xy * 1e-4, 0.0, 1.0); return;"),
    // the post-scan body split (s3 breakdown): keys = scan + keys/membership + corners near p (stops before the
    // configurations); lay1 = once without composite() (layers once; its outputs kept live); small = full with the
    // per-pixel arrays halved (MAXP 4, MAXK 3: the 4 nearest pieces, 3 corners; a register-pressure probe, not the look)
    keys: rep(src, "    // configurations over the ramping pieces", "    o0 = vec4(float(np + nk + pg[0]), pkey[0] + pramp[0], krho[0] + float(kIn[0]), 1.0); return;\n    // configurations over the ramping pieces"),
    lay1: rep(rep(src, "for (int cfg = 0; cfg <= nr; cfg++) {", "for (int cfg = 0; cfg <= 0; cfg++) {"), "float r = composite();", "float r = sv[0] + skey[0] + sa[0] + float(ns + sord[0] + swk[0]);"),
    small: rep(rep(rep(src, `#define MAXP ${MAXP}`, "#define MAXP 4"), `#define MAXK ${MAXK}`, "#define MAXK 3"), `#define MAXS ${MAXP + MAXK}`, "#define MAXS 7"),
    ...Object.fromEntries(Object.entries(surgery).map(([k, reps]) => [k, reps.reduce((s, [a, b]) => rep(s, a, b), src)])),
  };
}

function info(gl: WebGL2RenderingContext): Record<string, unknown> {
  const d = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    vendor: d ? gl.getParameter(d.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    timerQuery: !!gl.getExtension("EXT_disjoint_timer_query_webgl2"),
    floatRT: !!gl.getExtension("EXT_color_buffer_float"),
    ua: navigator.userAgent, dpr: devicePixelRatio, hw: navigator.hardwareConcurrency,
  };
}

export async function bench(cfg: BenchCfg): Promise<Record<string, unknown>> {
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 64;
  document.body.appendChild(canvas);
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: true, preserveDrawingBuffer: false, powerPreference: "high-performance" })!;
  if (!gl) throw new Error("no WebGL2");
  const out: Record<string, unknown> = { info: info(gl), cfg, scenes: {} as Record<string, unknown> };
  const V = variants(cfg.surgery);
  const px = new Uint8Array(4);
  for (const name of cfg.scenes) {
    const rec: Record<string, unknown> = {};
    (out.scenes as Record<string, unknown>)[name] = rec;
    const scene = (await (await fetch(`${cfg.base}/${name}.json`)).json()) as FieldScene;
    (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
    // The map: fit the grid box (from a first build) to the target, then rebuild at that scale's aa.
    let T: GfTables = buildTables(scene, { aa: 0.01 });
    let s = 1; let cx = 0; let cy = 0;
    for (let k = 0; k < 2; k++) {
      const bw = T.gW * T.G; const bh = T.gH * T.G;
      s = cfg.fit * Math.min(cfg.w / bw, cfg.h / bh);
      cx = T.gx0 + bw / 2; cy = T.gy0 + bh / 2;
      T = buildTables(scene, { aa: 0.5 / s });
    }
    const aa = 0.5 / s;
    // world x = (fragX - e) / s; world y = (H - fragY - f) / s, with the box centred
    const e = cfg.w / 2 - s * cx; const f = cfg.h / 2 - s * cy;
    const map: GfMap = [1 / s, -e / s, -1 / s, (cfg.h - f) / s];
    rec.scale = s; rec.aa = aa;
    rec.grid = { gW: T.gW, gH: T.gH, G: T.G, nK: T.nK, nV: T.nV, nA: T.nA, nCh: T.nCh };

    // --- tables ---
    for (let i = 0; i < 5; i++) buildTables(scene, { aa });
    const parts: Record<string, number[]> = { vtx: [], pins: [], arms: [], corners: [], bins: [], total: [], wall: [] };
    for (let i = 0; i < cfg.nTables; i++) {
      const t0 = performance.now();
      T = buildTables(scene, { aa });
      const t1 = performance.now();
      for (const k of Object.keys(T.ms)) parts[k].push((T.ms as Record<string, number>)[k]);
      parts.wall.push(t1 - t0);
      if (i % 10 === 9) await raf();
    }
    rec.tables = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, st(v)]));

    // --- pass ---
    const pass = new GfPass(gl, false);
    const pk: number[] = []; const up: number[] = [];
    for (let i = 0; i < 12; i++) { pass.upload(T); if (i >= 2) { pk.push(pass.packMs); up.push(pass.uploadMs); } }
    rec.pack = st(pk); rec.upload = st(up);
    // sync4 draws into 4 targets in turn: on a tile-based GPU (the Pixel's PowerVR), 4 opaque draws into ONE target
    // in one render pass could be hidden-surface-removed down to the last one's fragments.
    const targets = [0, 1, 2, 3].map(() => { const tg = new GfTarget(gl, 1, false); tg.resize(cfg.w, cfg.h); return tg; });
    const rect: Rect = pass.gridRect(map, cfg.w, cfg.h);
    rec.rect = rect; rec.px = (rect[2] - rect[0]) * (rect[3] - rect[1]);
    const sync = (): void => { gl.readPixels(rect[0], rect[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    const draw = (j = 0): void => pass.draw(targets[j & 3], map, rect, false);
    const P = pass as unknown as { prog: WebGLProgram; u: Map<string, WebGLUniformLocation | null> };
    const prog0 = P.prog; const u0 = P.u;
    const res: Record<string, Record<string, unknown>> = {};
    for (const vn of cfg.variants) {
      let prog = prog0; let u = u0;
      if (vn !== "full") {
        prog = compileProgram(gl, GF_VS, V[vn]);
        u = new Map(); for (const k of u0.keys()) u.set(k, gl.getUniformLocation(prog, k));
      }
      P.prog = prog; P.u = u;
      const r: Record<string, unknown> = {};
      draw(); sync();
      for (const mode of cfg.modes) {
        const ms: number[] = [];
        if (mode === "sync1" || mode === "sync4") {
          const k = mode === "sync4" ? 4 : 1;
          const tw = performance.now();
          while (performance.now() - tw < cfg.warmMs) { for (let j = 0; j < k; j++) draw(j); sync(); }
          for (let i = 0; i < cfg.nPass; i++) {
            const t0 = performance.now();
            for (let j = 0; j < k; j++) draw(j);
            sync();
            ms.push((performance.now() - t0) / k);
          }
        } else if (mode === "frame1" || mode === "busy") {
          // One pass per frame (busy: 2 more, untimed, before it) for settleFrames first, so the GPU's clock
          // governor has seen this load (the sync modes before it left the clock up), then nPass timed frames.
          const busy = mode === "busy";
          const iv: number[] = []; const all: number[] = []; let tl = await raf();
          for (let i = 0; i < cfg.settleFrames + cfg.nPass; i++) {
            const tf = await raf(); iv.push(tf - tl); tl = tf;
            if (busy) { draw(1); draw(2); sync(); }
            const t0 = performance.now(); draw(); sync(); const dt = performance.now() - t0;
            all.push(dt); if (i >= cfg.settleFrames) ms.push(dt);
          }
          r[mode + "_early"] = st(all.slice(0, 20)); // the first 20 frames: the clock the sync modes left, decaying
          r[mode + "_rafMs"] = st(iv.slice(cfg.settleFrames));
        }
        r[mode] = st(ms);
        await raf();
      }
      res[vn] = r;
      P.prog = prog0; P.u = u0;
      if (prog !== prog0) gl.deleteProgram(prog);
    }
    rec.pass = res;
    rec.glError = gl.getError();

    // --- counts (the probe program over the same rect) ---
    if (cfg.counts) {
      try {
        const pp = new GfPass(gl, true);
        const tg = new GfTarget(gl, 3, true);
        pp.upload(T); tg.resize(cfg.w, cfg.h);
        pp.draw(tg, map, rect, false);
        const a1 = new Float32Array(cfg.w * cfg.h * 4); const a2 = new Float32Array(cfg.w * cfg.h * 4);
        tg.read(1, a1); tg.read(2, a2);
        const segs: number[] = []; const ks: number[] = []; const nps: number[] = []; const nss: number[] = [];
        for (let y = rect[1]; y < rect[3]; y++)
          for (let x = rect[0]; x < rect[2]; x++) { const i = 4 * (y * cfg.w + x); segs.push(a1[i + 3]); ks.push(a2[i]); nps.push(a2[i + 1]); nss.push(a2[i + 2]); }
        const mean = (v: number[]): number => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
        const live = segs.filter((x) => x > 0);
        const frac = (v: number[], t: number): number => +(v.filter((x) => x > t).length / Math.max(1, v.length)).toFixed(4);
        rec.counts = { px: segs.length, segMean: +mean(segs).toFixed(2), segP95: q(segs, 0.95), kMean: +mean(ks).toFixed(2), kP95: q(ks, 0.95),
          livePx: live.length, liveMean: +mean(live).toFixed(2), liveP95: q(live, 0.95),
          // pieces / surfaces per pixel, and the share over the "small" variant's caps (MAXP 4, MAXK 3)
          npMean: +mean(nps).toFixed(2), npP95: q(nps, 0.95), npOver4: frac(nps, 4), nsMean: +mean(nss).toFixed(2), kOver3: frac(ks, 3),
          npHist: [0, 1, 2, 3, 4].map((n) => +(nps.filter((x) => x === n).length / Math.max(1, nps.length)).toFixed(4)),
          kHist: [0, 1, 2, 3].map((n) => +(ks.filter((x) => x === n).length / Math.max(1, ks.length)).toFixed(4)),
          // pixels with at most one piece and no corner (the "skip1" variant's early-out set)
          simple: +(nps.filter((x, i) => x <= 1 && ks[i] === 0).length / Math.max(1, nps.length)).toFixed(4) };
        pp.dispose(); tg.dispose();
      } catch (err) { rec.counts = { error: String(err) }; }
    }
    pass.dispose(); for (const tg of targets) tg.dispose();
  }
  canvas.remove();
  return out;
}

/** The table build through a captured drag (K1247 s18's frames, FieldScene each): every frame built once per rep,
 * after `warm` builds of frame 0, at aa = 0.5 / scale (the scale bench() fit for the same target). */
export async function drag(urls: string[], aa: number, reps: number, warm = 5): Promise<Record<string, unknown>> {
  const frames: FieldScene[] = [];
  for (const u of urls) { const s = (await (await fetch(u)).json()) as FieldScene; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; frames.push(s); }
  for (let i = 0; i < warm; i++) buildTables(frames[0], { aa });
  const parts: Record<string, number[]> = { vtx: [], pins: [], arms: [], corners: [], bins: [], total: [], wall: [] };
  for (let r = 0; r < reps; r++) {
    for (const s of frames) {
      const t0 = performance.now();
      const T = buildTables(s, { aa });
      parts.wall.push(performance.now() - t0);
      for (const k of Object.keys(T.ms)) parts[k].push((T.ms as Record<string, number>)[k]);
      await raf();
    }
  }
  return { frames: frames.length, reps, aa, parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, st(v)])) };
}
