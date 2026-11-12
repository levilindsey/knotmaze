// K1247 s19: the shader placement (fillRec 2: rec_glsl.ts) vs stage 18's CPU placement (fillRec 1)
// over a captured drag, in Node, through a float32 twin of the shader; with --gpu=<frame> the real
// shader also runs on that frame in headed Chrome under transform feedback (GPU vs twin, GPU vs CPU).
// Reports device px over every live fill vertex (the records twin-placed, the rest fillRec 2's own),
// |key| and |s| differences, the static slots the records keep from frame 0, the worst spots.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s19_twin.ts <dragDir> [outJson] [--gpu=<frame>]
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { REC_TEXELS, SLOTS, fillFrame, fillResolution, fillStructure, recStrips, type FillFrame, type StripItem } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";
import { recVs } from "../../../src/render/outline/rec_glsl";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const gpuArg = process.argv.find((a) => a.startsWith("--gpu="));
const gpuFrame = gpuArg ? Number(gpuArg.slice(6)) : -1;
const dir = args[0]; const outJson = args[1];
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; delete s.look.fillRec; return s; });
const sc0 = scenes[0];
const px = sc0.camera.pxPerUnit * (sc0.camera.dpr || 1);
const st = structure(sc0);
const fs = fillStructure(st, fillResolution(st, frame(st, sc0)));
const strips = recStrips(fs);
// Record vertices: (fill vertex, strip ordinal, row, column).
const recV: number[] = []; const recO: number[] = []; const recRI: number[] = [];
for (let o = 0; o < strips.length; o++) {
  const it = fs.items[strips[o]] as StripItem; const W = it.N + 1;
  for (let r = 0; r < 3; r++) for (let i = 2; i <= it.N - 2; i++) { recV.push(it.base + r * W + i); recO.push(o); recRI.push((r << 16) | i); }
}
const isRec = new Uint8Array(fs.nV); for (const v of recV) isRec[v] = 1;
const F = Math.fround;
// The chain table as band_gpu packs it (chainTex, chainInfo).
function chainTables(zz: ReturnType<typeof zChains>): { CT: Float32Array; CI: Float32Array } {
  let nS = 0; const base: number[] = []; for (const c of zz.zc) { base.push(nS); nS += c.n; }
  const CT = new Float32Array(4 * Math.max(1, nS)); const CI = new Float32Array(4 * Math.max(1, zz.zc.length));
  zz.zc.forEach((c, i) => {
    for (let k = 0; k < c.n; k++) { const o = 4 * (base[i] + k); CT[o] = c.xs[k]; CT[o + 1] = c.ys[k]; CT[o + 2] = c.s[k]; CT[o + 3] = c.z[k]; }
    CI[4 * i] = base[i]; CI[4 * i + 1] = c.n; CI[4 * i + 2] = c.closed && c.len > 0 ? c.len : -1;
  });
  return { CT, CI };
}
// The float32 twin of rec_glsl's recPlace: [x, y, key, s].
function twin(CT: Float32Array, CI: Float32Array, T: Float32Array, FB: Float32Array, hW: number, zt: number, sag: number, o: number, ri: number): number[] {
  const g = (q: number, k: number): number => CT[4 * q + k];
  const tan = (b: number, n: number, closed: boolean, i: number): number[] => {
    const a = closed ? (i - 1 + n) % n : Math.max(0, i - 1); const c = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
    const avx = F(g(b + i, 0) - g(b + a, 0)); const avy = F(g(b + i, 1) - g(b + a, 1)); const bvx = F(g(b + c, 0) - g(b + i, 0)); const bvy = F(g(b + c, 1) - g(b + i, 1));
    const dx = F(avx + bvx); const dy = F(avy + bvy); let l = F(Math.hypot(dx, dy)); if (!(l > 0)) l = 1;
    const out = [F(dx / l), F(dy / l), 0];
    const la = F(Math.hypot(avx, avy)); const lb = F(Math.hypot(bvx, bvy));
    if (la > 1e-12 && lb > 1e-12) { const cr = F(F(F(avx * bvy) - F(avy * bvx)) / F(la * lb)); const dt = F(F(F(avx * bvx) + F(avy * bvy)) / F(la * lb)); out[2] = F(F(Math.atan2(cr, dt)) / F(0.5 * F(la + lb))); }
    return out;
  };
  const wrap = (b: number, m: number, L: number, u0: number): number => { let u = u0; if (L > 0) { if (u < 0 || u >= L) u = F(u - F(L * Math.floor(F(u / L)))); } else u = Math.min(Math.max(u, 0), g(b + m, 2)); return u; };
  const seg = (b: number, n: number, L: number, u: number): [number, number, number] => {
    const m = n - 1; let k: number;
    if (u >= g(b + m, 2)) k = L > 0 ? m : m - 1;
    else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (g(b + q, 2) <= u) lo = q; else hi = q; } k = lo; }
    const j = k < m ? k + 1 : 0; const sk = g(b + k, 2); const e = k < m ? g(b + k + 1, 2) : L; const sl = F(e - sk);
    return [k, j, sl > 0 ? F(F(u - sk) / sl) : 0];
  };
  const off = (b: number, n: number, L: number, u0: number, sgn: number, stp: number): number[] => {
    const [k, j, f] = seg(b, n, L, wrap(b, n - 1, L, u0));
    const ta = tan(b, n, L > 0, k); const tb = tan(b, n, L > 0, j);
    const x = F(g(b + k, 0) + F(F(g(b + j, 0) - g(b + k, 0)) * f)); const y = F(g(b + k, 1) + F(F(g(b + j, 1) - g(b + k, 1)) * f));
    let ax = F(ta[0] + F(F(tb[0] - ta[0]) * f)); let ay = F(ta[1] + F(F(tb[1] - ta[1]) * f)); let l = F(Math.hypot(ax, ay)); if (!(l > 0)) l = 1; ax = F(ax / l); ay = F(ay / l);
    const kap = F(ta[2] + F(F(tb[2] - ta[2]) * f)); const ak = Math.abs(kap);
    const bb = sgn * kap > 0 ? Math.min(hW, F(0.9 / ak)) : F(hW + F(F(F(F(sag * stp) * stp) * ak) * F(1 + F(hW * ak))) / 8);
    return [F(x - F(F(sgn * bb) * ay)), F(y + F(F(sgn * bb) * ax))];
  };
  const zAt = (b: number, n: number, L: number, u0: number): number => {
    const m = n - 1; const u = wrap(b, m, L, u0);
    if (!(L > 0) && u >= g(b + m, 2)) return g(b + m, 3);
    const [k, j, f] = seg(b, n, L, u); return F(g(b + k, 3) + F(F(g(b + j, 3) - g(b + k, 3)) * f));
  };
  const q = 4 * REC_TEXELS * o; const r = ri >> 16; const i = ri & 65535; const N = T[q + 9];
  if (T[q + 7] < 0.5) { const p = 4 * (T[q + 10] + r * (N + 1) + i); return [FB[p], FB[p + 1], FB[p + 2], FB[p + 3]]; }
  const ci = 4 * T[q + 8]; const b = CI[ci]; const n = CI[ci + 1]; const L = CI[ci + 2];
  const z = zAt(b, n, L, F(T[q + 4] + F(F(T[q + 5] * i) / N)));
  const sL = F(T[q] + F(F(T[q + 1] * i) / N)); const sR = F(T[q + 2] + F(F(T[q + 3] * i) / N));
  const pl = r !== 2 ? off(b, n, L, sL, T[q + 6], F(T[q + 1] / N)) : [0, 0];
  const pr = r !== 0 ? off(b, n, L, sR, -T[q + 6], F(T[q + 3] / N)) : [0, 0];
  if (r === 0) return [pl[0], pl[1], F(z - zt), sL];
  if (r === 2) return [pr[0], pr[1], F(z - zt), sR];
  return [F((pl[0] + pr[0]) / 2), F((pl[1] + pr[1]) / 2), z, F((sL + sR) / 2)];
}
const qs = (xs: number[]): string => { if (!xs.length) return "none"; const s = Float64Array.from(xs).sort(); const at = (f: number): number => s[Math.min(s.length - 1, Math.floor(f * s.length))]; return `p50 ${at(0.5).toFixed(4)} p99 ${at(0.99).toFixed(4)} max ${s[s.length - 1].toFixed(4)}`; };
const dRec: number[] = []; const dDyn: number[] = []; const kD: number[] = []; const sD: number[] = [];
let staticBad = 0; let nFbStrips = 0; let nFbFrames = 0; let fr0: FillFrame | null = null;
const worst: { f: number; v: number; d: number; x: number; y: number }[] = [];
let gpuIn: Record<string, unknown> | null = null; let gpuWant: { tw: number[]; cpu: number[] } | null = null;
for (let k = 0; k < scenes.length; k++) {
  const sc = alignJunctionArms(st, scenes[k]);
  const tb = frame(st, sc); const zz = zChains(sc);
  const a = fillFrame(fs, st, tb, { ...sc, look: { ...sc.look, fillRec: 1 } }, zz);
  const b = fillFrame(fs, st, tb, { ...sc, look: { ...sc.look, fillRec: 2 } }, zz);
  if (!fr0) fr0 = a;
  const rec = b.rec!; const { CT, CI } = chainTables(zz);
  let fbs = 0; for (let o = 0; o < strips.length; o++) if (rec.strip[4 * REC_TEXELS * o + 7] < 0.5) fbs++;
  nFbStrips += fbs; if (fbs) nFbFrames++;
  const tw = new Float64Array(4 * fs.nV);
  for (let q = 0; q < recV.length; q++) { const t = twin(CT, CI, rec.strip, rec.fb, rec.hW, rec.zt, 0, recO[q], recRI[q]); tw.set(t, 4 * recV[q]); }
  for (let v = 0; v < fs.nV; v++) {
    if (!(a.key[v] > -999) && !(b.key[v] > -999)) continue;
    const R = isRec[v] === 1;
    const x = R ? tw[4 * v] : b.pos[2 * v]; const y = R ? tw[4 * v + 1] : b.pos[2 * v + 1];
    const kk = R ? tw[4 * v + 2] : b.key[v]; const ss = R ? tw[4 * v + 3] : b.s4[SLOTS * v];
    const d = Math.hypot(x - a.pos[2 * v], y - a.pos[2 * v + 1]) * px;
    (R ? dRec : dDyn).push(d); kD.push(Math.abs(kk - a.key[v])); sD.push(Math.abs(ss - a.s4[SLOTS * v]));
    if (d > 0.01) worst.push({ f: k, v, d, x: a.pos[2 * v], y: a.pos[2 * v + 1] });
    if (R) { for (let s = 0; s < SLOTS; s++) if (a.w4[SLOTS * v + s] !== fr0.w4[SLOTS * v + s] || (s > 0 && a.s4[SLOTS * v + s] !== fr0.s4[SLOTS * v + s])) staticBad++; }
  }
  if (k === gpuFrame) {
    gpuIn = { CT: Array.from(CT), CI: Array.from(CI), T: Array.from(rec.strip), FB: Array.from(rec.fb), hW: rec.hW, zt: rec.zt, recO, recRI };
    const twv: number[] = []; const cpu: number[] = [];
    for (const v of recV) { twv.push(tw[4 * v], tw[4 * v + 1], tw[4 * v + 2], tw[4 * v + 3]); cpu.push(a.pos[2 * v], a.pos[2 * v + 1], a.key[v], a.s4[SLOTS * v]); }
    gpuWant = { tw: twv, cpu };
  }
}
console.log(`${dir}: ${scenes.length} frames, ${fs.nV} fill verts, ${recV.length} record verts (${strips.length} strips), ${px.toFixed(1)} device px/unit`);
console.log(`fallback strips: ${nFbStrips} over ${nFbFrames} frames`);
console.log(`device px, records (twin) vs CPU: ${qs(dRec)}`);
console.log(`device px, worker-placed (fillRec 2) vs CPU: ${qs(dDyn)}`);
console.log(`|key|: ${qs(kD)}   |s|: ${qs(sD)}   static slots that moved: ${staticBad}`);
worst.sort((p, q) => q.d - p.d);
const spots: typeof worst = [];
for (const w of worst) { if (spots.every((s) => Math.hypot(s.x - w.x, s.y - w.y) > 3)) spots.push(w); if (spots.length >= 5) break; }
console.log(`worst: ${spots.map((s) => `f${s.f} v${s.v} ${s.d.toFixed(4)}px @(${s.x.toFixed(1)},${s.y.toFixed(1)})`).join("; ") || "none"}`);
let gpuRes: Record<string, string> | null = null;
if (gpuIn && gpuWant) {
  const VS = recVs(`#version 300 es
layout(location=0) in vec2 aPos;
layout(location=2) in float aKey;
layout(location=5) in vec4 aS;
out vec4 tf;
void main() {
  tf = vec4(aPos, aKey, aS.x); gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}`);
  const puppeteer = (await import("puppeteer-core")).default;
  const profile = mkdtempSync(join(tmpdir(), "k1247s19-"));
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profile, args: ["--window-size=400,300"] });
  try {
    const page = await browser.newPage();
    const out = await page.evaluate((VS: string, D: Record<string, unknown>) => {
      const cv = document.createElement("canvas"); const gl = cv.getContext("webgl2")!;
      const ren = gl.getExtension("WEBGL_debug_renderer_info"); const gpu = ren ? gl.getParameter(ren.UNMASKED_RENDERER_WEBGL) : "?";
      const sh = (t: number, s: string): WebGLShader => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(String(gl.getShaderInfoLog(o))); return o; };
      const p = gl.createProgram()!; gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, "#version 300 es\nprecision highp float; out vec4 o; void main() { o = vec4(1.0); }"));
      gl.transformFeedbackVaryings(p, ["tf"], gl.INTERLEAVED_ATTRIBS); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(String(gl.getProgramInfoLog(p)));
      gl.useProgram(p);
      const tex = (name: string, arr: number[], unit: number): void => {
        const h = Math.max(1, Math.ceil(arr.length / 4 / 1024)); const d = new Float32Array(4 * 1024 * h); d.set(arr);
        const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1024, h, 0, gl.RGBA, gl.FLOAT, d);
        gl.uniform1i(gl.getUniformLocation(p, name), unit);
      };
      tex("uRecChain", D.CT as number[], 9); tex("uRecCi", D.CI as number[], 10); tex("uRecStrip", D.T as number[], 11); tex("uRecFb", D.FB as number[], 12);
      gl.uniform1f(gl.getUniformLocation(p, "uRecHW"), D.hW as number); gl.uniform1f(gl.getUniformLocation(p, "uRecZt"), D.zt as number); gl.uniform1f(gl.getUniformLocation(p, "uRecSag"), 0);
      const O = D.recO as number[]; const RI = D.recRI as number[]; const M = O.length;
      const tag = new Int32Array(2 * M); for (let q = 0; q < M; q++) { tag[2 * q] = O[q]; tag[2 * q + 1] = RI[q]; }
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, tag, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(6); gl.vertexAttribIPointer(6, 2, gl.INT, 0, 0);
      const ob = gl.createBuffer(); gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, ob); gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 16 * M, gl.STREAM_READ);
      const tf = gl.createTransformFeedback(); gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, ob);
      gl.enable(gl.RASTERIZER_DISCARD); gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, M); gl.endTransformFeedback(); gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      const res = new Float32Array(4 * M); gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, ob); gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, res);
      return { gpu, err: gl.getError(), res: Array.from(res) };
    }, VS, gpuIn);
    const M = (gpuIn.recO as number[]).length; const dT: number[] = []; const dC: number[] = []; const kT: number[] = []; const sC: number[] = [];
    for (let q = 0; q < M; q++) {
      const g = out.res.slice(4 * q, 4 * q + 4); const t = gpuWant.tw.slice(4 * q, 4 * q + 4); const c = gpuWant.cpu.slice(4 * q, 4 * q + 4);
      dT.push(Math.hypot(g[0] - t[0], g[1] - t[1]) * px); dC.push(Math.hypot(g[0] - c[0], g[1] - c[1]) * px);
      kT.push(Math.abs(g[2] - c[2])); sC.push(Math.abs(g[3] - c[3]));
    }
    gpuRes = { gpu: String(out.gpu), glError: String(out.err), vsTwin: qs(dT), vsCpu: qs(dC), keyVsCpu: qs(kT), sVsCpu: qs(sC) };
    console.log(`GPU frame ${gpuFrame} (${out.gpu}, glError ${out.err}): ${M} records; device px GPU vs twin ${qs(dT)}; GPU vs CPU ${qs(dC)}; |key| ${qs(kT)}; |s| ${qs(sC)}`);
  } finally { await browser.close(); rmSync(profile, { recursive: true, force: true }); }
}
if (outJson) writeFileSync(outJson, JSON.stringify({ spots, dRec: qs(dRec), dDyn: qs(dDyn), key: qs(kD), s: qs(sD), staticBad, nFbStrips, gpu: gpuRes }));
