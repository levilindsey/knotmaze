// K1314 s14: k1314s13_gpu2.ts with k1314s14_off (K1314S14_OFF=1 = master: S13 and S14 flags off).
// K1314 s13: k1324_s2_gpu.ts (copied) plus a "mirror" line: GPU vs attr.w * band_gpu.alphaCpu (honours the slots: an untied
// piece's alpha is attr.w; the probe's own CPU applies tieAlpha to every sample). K1314S13_OFF=1 = master (s12).
//   [K1314S13_OFF=1] node scripts/run_node.mjs .claude/probes/K1314/k1314s13_gpu2.ts <scene> <x> <y> [--r=0.8]
import "./k1314s14_off";
// K1324 s2 (K1331): the burial rule's GPU twin. The app's band program (BAND_FS through krvSource(.., false))
// runs in headed Chrome on bandGpu's own chain and pass textures, one 1 px point per sample (each band vertex
// and each triangle's centroid within r of the spot, with the quad's flat chain and slots), and its alpha is
// compared with the CPU's: attr.w * draw.tieAlpha(chain, x, y, s, dC). A control runs the same shader with the
// burial term removed from its text, and the CPU with buryOpts off: both must move the same samples.
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s2_gpu.ts <scene> <x> <y> [--r=0.8]
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as D from "../../../src/render/outline/draw";
import { alphaCpu, bandGpu, BAND_SLOTS, BAND_TEX_W } from "../../../src/render/outline/band_gpu";
import { KRV_SHADERS, krvSource } from "../../../src/render/outline/outline_app";
import { buildModel } from "../K1314/k1314_census";

const [nm, xs, ys] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const r = Number(process.argv.find((a) => a.startsWith("--r="))?.slice(4) ?? 0.8);
const x0 = Number(xs); const y0 = Number(ys);
const m = buildModel(nm);
const b = bandGpu(m.table, m.scene, m.zz);
const zt = b.zt; const h = b.h; const W = b.W;
// Samples: P (x, y), A (s, dC, z, alpha), CH, SL.
const P: number[] = []; const A: number[] = []; const CH: number[] = []; const SL: number[] = [];
const add = (vs: number[], wt: number[], vf: number): void => {
  let x = 0; let y = 0; const a = [0, 0, 0, 0];
  vs.forEach((v, i) => { x += wt[i] * b.pos[2 * v]; y += wt[i] * b.pos[2 * v + 1]; for (let k = 0; k < 4; k++) a[k] += wt[i] * b.attr[4 * v + k]; });
  if (Math.hypot(x - x0, y - y0) > r) return;
  P.push(x, y); A.push(...a); CH.push(b.chain[vf]); for (let k = 0; k < BAND_SLOTS; k++) SL.push(b.slots[BAND_SLOTS * vf + k]);
};
for (let q = 0; 6 * q + 5 < b.count; q++) {
  const v = 6 * q; if (b.chain[v] < 0) continue;
  for (let t = 0; t < 2; t++) {
    const tri = [v + 3 * t, v + 3 * t + 1, v + 3 * t + 2];
    for (const u of tri) add([u], [1], v);
    add(tri, [1 / 3, 1 / 3, 1 / 3], v);
  }
}
const N = P.length / 2;
const cpu = (on: boolean): number[] => {
  D.buryOpts.on = on; const ta = D.tieAlpha(m.zz, h, W, zt); const out: number[] = [];
  for (let i = 0; i < N; i++) out.push(A[4 * i + 3] * ta(CH[i], P[2 * i], P[2 * i + 1], A[4 * i], A[4 * i + 1]));
  D.buryOpts.on = true; return out;
};
const cOn = cpu(true); const cOff = cpu(false);
const FS = krvSource(KRV_SHADERS.BAND_FS, false);
const FS0 = FS.replace("keyO - keyC + bury", "keyO - keyC");
if (FS0 === FS) throw new Error("burial term not found in BAND_FS");
const VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aA;
layout(location=2) in int aCh;
layout(location=3) in ivec4 aSl;
uniform int uWd; uniform int uHt;
out vec2 vPos; out vec4 vA; flat out ivec4 vSl; flat out int vCh;
void main() {
  int i = gl_VertexID;
  vec2 px = vec2(float(i % uWd) + 0.5, float(i / uWd) + 0.5) / vec2(float(uWd), float(uHt));
  gl_Position = vec4(px * 2.0 - 1.0, 0.0, 1.0); gl_PointSize = 1.0;
  vPos = aPos; vA = aA; vSl = aSl; vCh = aCh;
}`;
const puppeteer = (await import("puppeteer-core")).default;
const profile = mkdtempSync(join(tmpdir(), "k1324s2-"));
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profile, args: ["--window-size=400,300"] });
const page = await browser.newPage();
const run = async (fs: string): Promise<{ a: number[]; gpu: string; err: string }> => page.evaluate((I: Record<string, unknown>) => {
  const cv = document.createElement("canvas"); const gl = cv.getContext("webgl2") as WebGL2RenderingContext;
  if (!gl.getExtension("EXT_color_buffer_float")) return { a: [], gpu: "", err: "no EXT_color_buffer_float" };
  const ri = gl.getExtension("WEBGL_debug_renderer_info"); const gpu = ri ? String(gl.getParameter(ri.UNMASKED_RENDERER_WEBGL)) : "";
  const sh = (t: number, s: string): WebGLShader => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(String(gl.getShaderInfoLog(o))); return o; };
  const p = gl.createProgram()!;
  try { gl.attachShader(p, sh(gl.VERTEX_SHADER, I.VS as string)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, I.FS as string)); } catch (e) { return { a: [], gpu, err: String(e) }; }
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return { a: [], gpu, err: String(gl.getProgramInfoLog(p)) };
  gl.useProgram(p);
  const TW = I.TW as number;
  const tex = (name: string, arr: number[], hh: number, unit: number): void => {
    const d = new Float32Array(4 * TW * hh); d.set(arr.slice(0, d.length));
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TW, hh, 0, gl.RGBA, gl.FLOAT, d);
    gl.uniform1i(gl.getUniformLocation(p, name), unit);
  };
  tex("uChain", I.CT as number[], I.CH as number, 0); tex("uPass", I.PS as number[], I.PH as number, 1);
  const n = I.N as number; const Wd = 256; const Ht = Math.max(1, Math.ceil(n / Wd));
  gl.uniform1i(gl.getUniformLocation(p, "uWd"), Wd); gl.uniform1i(gl.getUniformLocation(p, "uHt"), Ht);
  gl.uniform1f(gl.getUniformLocation(p, "uH"), I.h as number); gl.uniform1f(gl.getUniformLocation(p, "uW"), I.W as number);
  gl.uniform1f(gl.getUniformLocation(p, "uZt"), I.zt as number); gl.uniform1i(gl.getUniformLocation(p, "uPre"), 0);
  gl.uniform3f(gl.getUniformLocation(p, "uInk"), 0, 0, 0);
  const va = gl.createVertexArray(); gl.bindVertexArray(va);
  const buf = (loc: number, data: ArrayBufferView, size: number, int: boolean): void => {
    const o = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, o); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc);
    if (int) gl.vertexAttribIPointer(loc, size, gl.INT, 0, 0); else gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  buf(0, new Float32Array(I.P as number[]), 2, false); buf(1, new Float32Array(I.A as number[]), 4, false);
  buf(2, new Int32Array(I.CHN as number[]), 1, true); buf(3, new Int32Array(I.SL as number[]), 4, true);
  const rt = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + 7); gl.bindTexture(gl.TEXTURE_2D, rt); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, Wd, Ht);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rt, 0);
  gl.viewport(0, 0, Wd, Ht); gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, -1); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINTS, 0, n);
  const px = new Float32Array(4 * Wd * Ht); gl.readPixels(0, 0, Wd, Ht, gl.RGBA, gl.FLOAT, px);
  const a: number[] = []; for (let i = 0; i < n; i++) a.push(px[4 * i + 3]);
  return { a, gpu, err: "" };
}, { VS, FS: fs, TW: BAND_TEX_W, CT: Array.from(b.chainTex), CH: b.chainTexH, PS: Array.from(b.passTex), PH: b.passTexH, N, P, A, CHN: CH, SL, h, W, zt });
const gOn = await run(FS); const gOff = await run(FS0);
await browser.close(); try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may hold it */ }
if (gOn.err || gOff.err) { console.log("GPU error:", gOn.err || gOff.err); process.exit(1); }
const st = (g: number[], c: number[]): string => { let mx = 0; let wi = -1; let n1 = 0; for (let i = 0; i < N; i++) { const d = Math.abs(g[i] - c[i]); if (d > mx) { mx = d; wi = i; } if (d > 0.01) n1++; } return `max |gpu-cpu| ${mx.toFixed(4)} (#${wi}${wi >= 0 ? ` at ${P[2 * wi].toFixed(2)},${P[2 * wi + 1].toFixed(2)} gpu ${g[wi].toFixed(3)} cpu ${c[wi].toFixed(3)}` : ""}), >0.01: ${n1}`; };
const movedG: number[] = []; const movedC: number[] = [];
for (let i = 0; i < N; i++) { if (Math.abs(gOn.a[i] - gOff.a[i]) > 0.01) movedG.push(i); if (Math.abs(cOn[i] - cOff[i]) > 0.01) movedC.push(i); }
console.log(`${nm} (${x0},${y0}) r ${r}: ${N} samples, GPU ${gOn.gpu}`);
console.log(`burial on : ${st(gOn.a, cOn)}`);
{ const mirA: number[] = []; for (let i = 0; i < N; i++) mirA.push(A[4 * i + 3] * alphaCpu(b, P[2 * i], P[2 * i + 1], A[4 * i], A[4 * i + 1], A[4 * i + 2], SL.slice(BAND_SLOTS * i, BAND_SLOTS * i + BAND_SLOTS))); console.log(`mirror    : ${st(gOn.a, mirA)} (gpu vs attr.w * alphaCpu, slots honoured)`); }
console.log(`burial off: ${st(gOff.a, cOff)}`);
console.log(`moved by the rule (>0.01): GPU ${movedG.length}, CPU ${movedC.length}, both ${movedG.filter((i) => movedC.includes(i)).length}`);
if (process.env.DEBUG) {
  let k = 0;
  for (let i = 0; i < N && k < 6; i++) {
    if (Math.abs(gOff.a[i] - cOff[i]) <= 0.01) continue; k++;
    const sl = SL.slice(BAND_SLOTS * i, BAND_SLOTS * i + BAND_SLOTS);
    const mir = alphaCpu(b, P[2 * i], P[2 * i + 1], A[4 * i], A[4 * i + 1], A[4 * i + 2], sl);
    console.log(`  off #${i} (${P[2 * i].toFixed(2)},${P[2 * i + 1].toFixed(2)}) ch ${CH[i]} sl ${sl.join(",")} A ${A.slice(4 * i, 4 * i + 4).map((v) => v.toFixed(3)).join(",")}: gpu ${gOff.a[i].toFixed(3)} cpu ${cOff[i].toFixed(3)} alphaCpu ${mir.toFixed(3)}`);
  }
}
for (const i of movedG.slice(0, 8)) console.log(`  #${i} (${P[2 * i].toFixed(2)},${P[2 * i + 1].toFixed(2)}) ch ${CH[i]}: gpu ${gOff.a[i].toFixed(3)} -> ${gOn.a[i].toFixed(3)}, cpu ${cOff[i].toFixed(3)} -> ${cOn[i].toFixed(3)}`);
