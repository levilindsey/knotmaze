// K1247 s24: s23's twin, plus each slot-only quad's float64 window margin per differing pass (m: how far the
// quad's s span is inside (+) or outside (-) the pass's lo/hi + h window; |m| near float32's ulp at s = a tie).
// K1247 s23: the band placement on the GPU (band_place.ts, ob=1's default path) against band_rec's CPU
// placement (BandRecState without gpu), over a captured drag: every frame's tables go through the real
// BAND_PLACE_VS under transform feedback in headed Chrome, and every vertex of every used quad is
// compared (device px, s, dC, z, alpha, chain, slots). Padding quads (past a piece's used count) only
// need zero area.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s23_twin.ts <dragDir> [--every=1] [--out=file.json]
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { OB_DI, alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { dSC, zChains } from "../../../src/render/outline/draw";
import { BandRecState } from "../../../src/render/outline/band_rec";
import { bandGpu } from "../../../src/render/outline/band_gpu";
import { BAND_PLACE_OUT, BAND_PLACE_STRIDE, BAND_PLACE_VS } from "../../../src/render/outline/band_place";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=")[1];
let slTie = 0; let slOther = 0; const slM: number[] = []; const dir = args[0]; const EVERY = Number(opt("every", "1")); const OUT = opt("out", ""); const DBG = opt("dbg", "").split(":").map(Number); const ONLY = opt("only", "");
OB_DI.on = true;
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
// s22's fidelity (k1247s22_rec.ts): per piece, the max over both polylines' vertices, both ways, of the
// point-to-polyline distance between today's band (bandGpu) and a placement, px at ppu 40.
const dPoly = (x: number, y: number, P: ArrayLike<number>, n: number): number => {
  let best = Infinity;
  for (let i = 0; i + 1 < n; i++) {
    const ax = P[2 * i]; const ay = P[2 * i + 1]; const ex = P[2 * i + 2] - ax; const ey = P[2 * i + 3] - ay; const l2 = ex * ex + ey * ey;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
    const dx = ax + u * ex - x; const dy = ay + u * ey - y; const d = dx * dx + dy * dy; if (d < best) best = d;
  }
  if (n === 1) best = (P[0] - x) ** 2 + (P[1] - y) ** 2;
  return Math.sqrt(best);
};
// s24: decimated pieces (how 3, today's points squeezed into the range) measured apart, GPU placement.
const fidD: number[] = []; let dWorst: { f: number; d: number; g: number; chain: number; x: number; y: number } | null = null;
const HOW = [0, 0, 0, 0]; const fidG: number[] = []; const fidC: number[] = []; const fWorst: { f: number; d: number; g: number; c: number; kind: string; chain: number; x: number; y: number }[] = [];
const fid = (f: number, lay: { off: Int32Array | number[]; cap: Int32Array | number[]; used: Int32Array | number[]; how: Uint8Array | number[] }, tb: ReturnType<typeof frame>, today: { pos: Float32Array }, G: (v: number, k: number) => number, C: (v: number, k: number) => number): void => {
  let qG = 0;
  for (const p of tb.pieces) {
    const np = p.pts.length / 2; if (np < 2) continue;
    const q0 = qG; qG += np - 1; const d = p.di as number; const hw = lay.how[d]; if (hw !== 1 && hw !== 3) continue;
    const TO = new Float64Array(2 * np); const TI = new Float64Array(2 * np);
    for (let i = 0; i < np - 1; i++) { const w = 6 * (q0 + i); TO[2 * i] = today.pos[2 * w]; TO[2 * i + 1] = today.pos[2 * w + 1]; TI[2 * i] = today.pos[2 * (w + 2)]; TI[2 * i + 1] = today.pos[2 * (w + 2) + 1]; }
    { const w = 6 * (q0 + np - 2); TO[2 * np - 2] = today.pos[2 * (w + 1)]; TO[2 * np - 1] = today.pos[2 * (w + 1) + 1]; TI[2 * np - 2] = today.pos[2 * (w + 4)]; TI[2 * np - 1] = today.pos[2 * (w + 4) + 1]; }
    const one = (P: (v: number, k: number) => number): [number, number, number] => {
      const RO: number[] = []; const RI: number[] = []; const vo = 6 * lay.off[d];
      for (let i = 0; i < Math.min(lay.cap[d], lay.used[d]); i++) { const w = vo + 6 * i; if (i === 0) { RO.push(P(w, 0), P(w, 1)); RI.push(P(w + 2, 0), P(w + 2, 1)); } RO.push(P(w + 1, 0), P(w + 1, 1)); RI.push(P(w + 4, 0), P(w + 4, 1)); }
      const nr = RO.length / 2; let e = 0; let ex = 0; let ey = 0; const upd = (dd: number, x: number, y: number): void => { if (dd > e) { e = dd; ex = x; ey = y; } };
      for (let i = 0; i < nr; i++) { upd(dPoly(RO[2 * i], RO[2 * i + 1], TO, np), RO[2 * i], RO[2 * i + 1]); upd(dPoly(RI[2 * i], RI[2 * i + 1], TI, np), RI[2 * i], RI[2 * i + 1]); }
      for (let i = 0; i < np; i++) { upd(dPoly(TO[2 * i], TO[2 * i + 1], RO, nr), TO[2 * i], TO[2 * i + 1]); upd(dPoly(TI[2 * i], TI[2 * i + 1], RI, nr), TI[2 * i], TI[2 * i + 1]); }
      return [e * 40, ex, ey];
    };
    const g = one(G); const c = one(C);
    if (hw === 3) { fidD.push(g[0]); if (g[0] > (dWorst?.g ?? 0)) dWorst = { f, d, g: g[0], chain: p.chain, x: g[1], y: g[2] }; continue; }
    fidG.push(g[0]); fidC.push(c[0]);
    if (g[0] > 0.1) fWorst.push({ f, d, g: g[0], c: c[0], kind: p.kind, chain: p.chain, x: g[1], y: g[2] });
  }
};
const fq = (a: number[]): string => { const s = [...a].sort((x, y) => x - y); const q = (p: number): number => s[Math.min(s.length - 1, Math.floor(p * s.length))]; return `p50 ${q(0.5).toFixed(4)} p99 ${q(0.99).toFixed(3)} max ${q(1).toFixed(3)}, > 0.25 px ${a.filter((x) => x > 0.25).length} of ${a.length}`; };
try {  const page = await browser.newPage();
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
    if (f % EVERY !== 0 || (ONLY !== "" && f !== Number(ONLY))) continue;
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
    { const tb = frame(st, sc); const today = bandGpu(tb, sc, zz); fid(f, layC, tb, today, (v, k) => Fv[S * v + k], (v, k) => c.pos[2 * v + k]); for (const p of tb.pieces) HOW[layC.how[p.di as number]]++; }
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
        if (qBad) { let eM = 0; let sM = 0; for (let k = 0; k < 6; k++) { const v = 6 * q + k; const o = S * v; eM = Math.max(eM, Math.hypot(Fv[o] - c.pos[2 * v], Fv[o + 1] - c.pos[2 * v + 1]) * px); sM = Math.max(sM, Math.abs(Fv[o + 2] - c.attr[4 * v])); } if (eM > 0.5 || sM > 1e-3) slTie++; else { slOther++; const gS = [0, 1, 2, 3].map((j) => Iv[S * 6 * q + 7 + j]); const cS = [0, 1, 2, 3].map((j) => c.slots[24 * q + j]); const ch = c.chain[6 * q]; const C = zz.zc[ch]; let pbq = 0; for (let k = 0; k < ch; k++) pbq += zz.passes[k].length; let sa = Infinity; let sb = -Infinity; for (let k = 0; k < 6; k++) { const s = c.attr[4 * (6 * q + k)]; if (s < sa) sa = s; if (s > sb) sb = s; } const ms = [...gS, ...cS].filter((g) => g >= 0 && (gS.indexOf(g) < 0 || cS.indexOf(g) < 0)).map((g) => { const Pj = zz.passes[ch][g - pbq]; const da = dSC(C, Pj.s, sa); const db = da + (sb - sa); const m = Math.min(Math.max(da, db) + Pj.lo + c.h, Pj.hi + c.h - Math.min(da, db)); slM.push(Math.abs(m)); return `${g}:m ${m.toExponential(2)}`; }).join(" "); if (slOther <= 40) console.log(`slot-only f${f} d${d} q${q - q0} eMax ${eM.toFixed(4)} px sMax ${sM.toExponential(2)} s ${sa.toFixed(5)}..${sb.toFixed(5)}: gpu ${gS.join(",")} cpu ${cS.join(",")} ${ms}`); } }
        if (qBad) { badSl++; if (DBG.length === 2) console.log(`slots f${f} d${d} q${q - q0}: gpu ${[0, 1, 2, 3].map((j) => Iv[S * 6 * q + 7 + j]).join(",")} cpu ${[0, 1, 2, 3].map((j) => c.slots[24 * q + j]).join(",")}`); }
        if (DBG.length === 2 && DBG[0] === f && DBG[1] === d) { const e = [0, 1, 2, 3, 4, 5].map((k) => Math.hypot(Fv[S * (6 * q + k)] - c.pos[2 * (6 * q + k)], Fv[S * (6 * q + k) + 1] - c.pos[2 * (6 * q + k) + 1]) * px); console.log(`q${q - q0}/${used} err ${e.map((x) => x.toFixed(2)).join(" ")} s cpu ${c.attr[24 * q].toFixed(4)} gpu ${Fv[S * 6 * q + 2].toFixed(4)}`); }
      }
    }
  }
} finally {
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may hold it a moment */ }
}
console.log(`${dir}: ${nFr} frames on ${gpuName}; ${nQ} used quads`);
console.log(`device px GPU vs CPU ${qs(dP)}; |s| ${qs(dS)}; |z| ${qs(dZ)}`);
if (slM.length) { slM.sort((a, b) => a - b); console.log(`slot-only window margins |m|: n ${slM.length} max ${slM[slM.length - 1].toExponential(2)} p50 ${slM[slM.length >> 1].toExponential(2)}`); }
console.log(`dC/alpha mismatches ${badA}; chain mismatches ${badCh}; quads with other slots ${badSl} (with a moved vertex, the recCs tie: ${slTie}; slots only: ${slOther}) (CPU quads past BAND_SLOTS ${dropped}); padding quads with area ${padBad}`);
console.log(`worst: ${worst.slice(0, 5).map((w) => `f${w.f} d${w.piece}(how ${w.how}) ${w.d.toFixed(3)} at (${w.x.toFixed(2)}, ${w.y.toFixed(2)})`).join("; ")}`);
fWorst.sort((a, b) => b.g - a.g);
console.log(`fidelity vs today (ppu 40), GPU: ${fq(fidG)}; CPU records: ${fq(fidC)}`);
console.log(`pieces over the frames by placement: absent ${HOW[0]}, records ${HOW[1]}, today's points padded ${HOW[2]}, decimated ${HOW[3]}`);
if (fidD.length) console.log(`decimated pieces vs today (ppu 40), GPU: ${fq(fidD)}; worst f${dWorst?.f} c${dWorst?.chain} d${dWorst?.d} (${dWorst?.x.toFixed(2)},${dWorst?.y.toFixed(2)}) ${dWorst?.g.toFixed(3)}`);
console.log(`fid worst: ${fWorst.slice(0, 6).map((w) => `f${w.f} ${w.kind} c${w.chain} d${w.d} (${w.x.toFixed(2)},${w.y.toFixed(2)}) gpu ${w.g.toFixed(3)} cpu ${w.c.toFixed(3)}`).join("; ")}`);
if (OUT) writeFileSync(OUT, JSON.stringify({ fWorst: fWorst.slice(0, 100),  dir, frames: nFr, quads: nQ, px: qs(dP), s: qs(dS), z: qs(dZ), badA, badCh, badSl, dropped, padBad, worst }));
