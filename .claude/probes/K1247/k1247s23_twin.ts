// K1247 s23: the band placement on the GPU (band_place.ts, ob=1's default path) against band_rec's CPU
// placement (BandRecState without gpu), over a captured drag: every frame's tables go through the real
// BAND_PLACE_VS under transform feedback in headed Chrome, and every vertex of every used quad is
// compared (device px, s, dC, z, alpha, chain, slots). Padding quads (past a piece's used count) only
// need zero area.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s23_twin.ts <dragDir> [--every=1] [--out=file.json]
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { BandRecState } from "../../../src/render/outline/band_rec";
import { BAND_PLACE_OUT, BAND_PLACE_STRIDE, BAND_PLACE_VS } from "../../../src/render/outline/band_place";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=")[1];
const dir = args[0]; const EVERY = Number(opt("every", "1")); const OUT = opt("out", "");
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; return s; });
const px = scenes[0].camera.pxPerUnit * (scenes[0].camera.dpr || 1);
const st = structure(scenes[0]);
const SC = new BandRecState(false); const SG = new BandRecState(true);
const puppeteer = (await import("puppeteer-core")).default;
const profile = mkdtempSync(join(tmpdir(), "k1247s23-"));
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profile, args: ["--window-size=400,300"] });
const qs = (a: number[]): string => { if (!a.length) return "-"; const s = [...a].sort((x, y) => x - y); const q = (p: number): number => s[Math.min(s.length - 1, Math.floor(p * s.length))]; return `p50 ${q(0.5).toExponential(2)} p99 ${q(0.99).toExponential(2)} max ${s[s.length - 1].toExponential(2)}`; };
const dP: number[] = []; const dS: number[] = []; const dZ: number[] = []; let badA = 0; let badCh = 0; let badSl = 0; let nQ = 0; let padBad = 0; let dropped = 0; let nFr = 0; let gpuName = "";
const worst: { f: number; x: number; y: number; d: number; piece: number; how: number }[] = [];
try {
  const page = await browser.newPage();
  await page.evaluate((VS: string, OUTV: string[]) => {
    const cv = document.createElement("canvas"); const gl = cv.getContext("webgl2")!;
    const sh = (t: number, s: string): WebGLShader => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(String(gl.getShaderInfoLog(o))); return o; };
    const p = gl.createProgram()!; gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, "#version 300 es\nprecision highp float; out vec4 o; void main() { o = vec4(1.0); }"));
    gl.transformFeedbackVaryings(p, OUTV, gl.INTERLEAVED_ATTRIBS); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(String(gl.getProgramInfoLog(p)));
    (globalThis as unknown as { G: unknown }).G = { gl, p };
  }, BAND_PLACE_VS, BAND_PLACE_OUT);
  for (let f = 0; f < scenes.length; f++) {
    const sc = f === 0 ? scenes[0] : alignJunctionArms(st, scenes[f]); const zz = zChains(sc);
    const c = SC.band(st, frame(st, sc), sc, zz); const layC = SC.lay!;
    const g = SG.band(st, frame(st, sc), sc, zz); const R = g.rec!;
    if (f % EVERY !== 0) continue;
    nFr++; dropped += c.dropped;
    const D = { CT: Array.from(g.chainTex), CI: Array.from(g.chainInfo), PS: Array.from(g.passTex), TB: Array.from(R.tab), FB: Array.from(R.fb), SL: Array.from(R.fbSl), PF: Array.from(R.pf), nD: R.nD, h: g.h, W: g.W, n: g.count };
    const out = await page.evaluate((D: Record<string, number[] | number>, STR: number) => {
      const { gl, p } = (globalThis as unknown as { G: { gl: WebGL2RenderingContext; p: WebGLProgram } }).G;
      gl.useProgram(p);
      const tex = (name: string, arr: number[], unit: number): void => {
        const h = Math.max(1, Math.ceil(arr.length / 4 / 1024)); const d = new Float32Array(4 * 1024 * h); d.set(arr);
        const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1024, h, 0, gl.RGBA, gl.FLOAT, d);
        gl.uniform1i(gl.getUniformLocation(p, name), unit);
      };
      const ciH = Math.max(1, Math.ceil((D.CI as number[]).length / 4 / 1024));
      tex("uBpTab", D.TB as number[], 1); tex("uBpFb", D.FB as number[], 2); tex("uBpSl", D.SL as number[], 3); tex("uBpPass", D.PS as number[], 4);
      tex("uRecChain", D.CT as number[], 5); tex("uRecCi", D.CI as number[], 6); tex("uRecPf", D.PF as number[], 7);
      void ciH;
      gl.uniform1i(gl.getUniformLocation(p, "uBpND"), D.nD as number); gl.uniform1f(gl.getUniformLocation(p, "uBpH"), D.h as number); gl.uniform1f(gl.getUniformLocation(p, "uBpW"), D.W as number);
      const M = D.n as number;
      const ob = gl.createBuffer(); gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, ob); gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 4 * STR * M, gl.STREAM_READ);
      const tf = gl.createTransformFeedback(); gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, ob);
      gl.enable(gl.RASTERIZER_DISCARD); gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, M); gl.endTransformFeedback(); gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      const raw = new Float32Array(STR * M); gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, ob); gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, raw);
      gl.deleteBuffer(ob); gl.deleteTransformFeedback(tf);
      const ren = gl.getExtension("WEBGL_debug_renderer_info");
      return { gpu: ren ? String(gl.getParameter(ren.UNMASKED_RENDERER_WEBGL)) : "?", err: gl.getError(), raw: Array.from(new Uint32Array(raw.buffer)) };
    }, D, BAND_PLACE_STRIDE);
    gpuName = out.gpu; if (out.err) console.log(`frame ${f}: glError ${out.err}`);
    const U = new Uint32Array(out.raw); const Fv = new Float32Array(U.buffer); const Iv = new Int32Array(U.buffer); const S = BAND_PLACE_STRIDE;
    if (c.count !== g.count) console.log(`frame ${f}: count ${c.count} vs ${g.count}`);
    for (let d = 0; d < layC.off.length; d++) {
      const q0 = layC.off[d]; const used = layC.used[d]; const cap = layC.cap[d];
      for (let q = q0; q < q0 + cap; q++) {
        if (q >= q0 + used) {
          // Padding: zero area (all six at one point) is all the draw needs.
          const x0 = Fv[S * 6 * q]; const y0 = Fv[S * 6 * q + 1];
          for (let k = 1; k < 6; k++) if (Fv[S * (6 * q + k)] !== x0 || Fv[S * (6 * q + k) + 1] !== y0) { padBad++; break; }
          continue;
        }
        nQ++;
        let qBad = false;
        for (let k = 0; k < 6; k++) {
          const v = 6 * q + k; const o = S * v;
          const e = Math.hypot(Fv[o] - c.pos[2 * v], Fv[o + 1] - c.pos[2 * v + 1]) * px;
          dP.push(e);
          if (worst.length < 40 || e > worst[worst.length - 1].d) { worst.push({ f, x: c.pos[2 * v], y: c.pos[2 * v + 1], d: e, piece: d, how: layC.how[d] }); worst.sort((a, b) => b.d - a.d); if (worst.length > 40) worst.length = 40; }
          dS.push(Math.abs(Fv[o + 2] - c.attr[4 * v])); dZ.push(Math.abs(Fv[o + 4] - c.attr[4 * v + 2]));
          if (Math.abs(Fv[o + 3] - c.attr[4 * v + 1]) > 1e-5 || Math.abs(Fv[o + 5] - c.attr[4 * v + 3]) > 1e-5) badA++;
          if (Iv[o + 6] !== c.chain[v]) badCh++;
          for (let j = 0; j < 4; j++) if (Iv[o + 7 + j] !== c.slots[4 * v + j]) qBad = true;
        }
        if (qBad) badSl++;
      }
    }
  }
} finally {
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may hold it a moment */ }
}
console.log(`${dir}: ${nFr} frames on ${gpuName}; ${nQ} used quads`);
console.log(`device px GPU vs CPU ${qs(dP)}; |s| ${qs(dS)}; |z| ${qs(dZ)}`);
console.log(`dC/alpha mismatches ${badA}; chain mismatches ${badCh}; quads with other slots ${badSl} (CPU quads past BAND_SLOTS ${dropped}); padding quads with area ${padBad}`);
console.log(`worst: ${worst.slice(0, 5).map((w) => `f${w.f} d${w.piece}(how ${w.how}) ${w.d.toFixed(3)} at (${w.x.toFixed(2)}, ${w.y.toFixed(2)})`).join("; ")}`);
if (OUT) writeFileSync(OUT, JSON.stringify({ dir, frames: nFr, quads: nQ, px: qs(dP), s: qs(dS), z: qs(dZ), badA, badCh, badSl, dropped, padBad, worst }));
