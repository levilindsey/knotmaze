// K1247 WASM step 3: replay one recorded def frame's kernel calls (record.ts)
// through the verbatim JS kernels (kernels_js.ts) and the AssemblyScript port
// (build/kernels.wasm), check every answer against the recording bit for bit,
// then time JS against WASM per kernel: one WASM call per kernel call, and
// batched (one WASM call per frame, the input copy counted; with and without
// the per-frame polyline copy). Run under the perf lock (run_locked.ps1).
//   node scripts/run_node.mjs .claude/probes/K1240/wasm/bench.ts [scene] [reps] [wasm file in build/]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { footNearM, footWinFast, marginOfC, fwA, kfXY, kfCst, JS_SOURCE_SHA, type Poly, type FArm, type FFoot, type WalkCache, type FCache } from "./kernels_js";

const here = dirname(fileURLToPath(import.meta.url));
const scene = process.argv[2] ?? "def";
const REPS = Number(process.argv[3] ?? 40);
const wasmName = process.argv[4] ?? "kernels.wasm";
const verifyOnly = process.argv.includes("--verify");
type Meta = {
  sourceSha: string; h: number;
  polys: { pi: number; id: number; n: number; nseg: number; closed: boolean; len: number; s0: number; nblk: number; off: Record<string, number> }[];
  tans: { pi: number; len: number; off: { tx: number; ty: number; gf: number; gb: number } }[];
  calls: Record<"fnm" | "fwf" | "moc", { stride: number; count: number; off: number }>;
};
const meta = JSON.parse(readFileSync(join(here, "out", `rec_${scene}.json`), "utf8")) as Meta;
const raw = readFileSync(join(here, "out", `rec_${scene}.bin`));
const D = new Float64Array(raw.byteLength / 8);
new Uint8Array(D.buffer).set(raw);
if (meta.sourceSha !== JS_SOURCE_SHA) console.log(`WARNING: recording from outline.ts ${meta.sourceSha}, kernels_js from ${JS_SOURCE_SHA}`);

// ---- JS side: polys, tangents, arms -----------------------------------------
const maxPi = Math.max(...meta.polys.map((p) => p.pi));
const E = new Float64Array(0);
const sl = (o: number, len: number): Float64Array => D.slice(o, o + len);
const polys: Poly[] = [];
for (let pi = 0; pi <= maxPi; pi++) polys.push({ id: -1, n: 0, closed: false, nseg: 0, len: 0, s0: 0, x: E, y: E, s: E, segLen: E, dx: E, dy: E, bx0: E, by0: E, bx1: E, by1: E, bk: E, nblk: 0 });
for (const m of meta.polys) {
  const o = m.off; const ns = m.nseg;
  polys[m.pi] = { id: m.id, n: m.n, closed: m.closed, nseg: ns, len: m.len, s0: m.s0,
    x: sl(o.x, m.n), y: sl(o.y, m.n), s: sl(o.s, m.n), segLen: sl(o.segLen, ns), dx: sl(o.dx, ns), dy: sl(o.dy, ns),
    bx0: sl(o.bx0, ns), by0: sl(o.by0, ns), bx1: sl(o.bx1, ns), by1: sl(o.by1, ns), bk: sl(o.bk, 4 * m.nblk), nblk: m.nblk };
}
const tanTx: Float64Array[] = []; const tanTy: Float64Array[] = []; const tanGF: Float64Array[] = []; const tanGB: Float64Array[] = [];
for (let pi = 0; pi <= maxPi; pi++) { tanTx.push(E); tanTy.push(E); tanGF.push(E); tanGB.push(E); }
for (const t of meta.tans) { tanTx[t.pi] = sl(t.off.tx, t.len); tanTy[t.pi] = sl(t.off.ty, t.len); tanGF[t.pi] = sl(t.off.gf, t.len); tanGB[t.pi] = sl(t.off.gb, t.len); }
const armKey = new Map<string, number>(); const armObj: FArm[] = []; const aSR: number[] = []; const aDir: number[] = []; const aL: number[] = [];
function armOf(pi: number, dir: number, sR: number, L: number): number {
  const key = `${pi}|${dir}|${sR}|${L}`;
  let ai = armKey.get(key);
  if (ai === undefined) { ai = armObj.length; armKey.set(key, ai); armObj.push({ pi, dir, sR, L }); aSR.push(sR); aDir.push(dir); aL.push(L); }
  return ai;
}

// ---- the recorded calls, unpacked ---------------------------------------------
const cF = meta.calls.fnm; const nF = cF.count;
const fnmIn = new Float64Array(nF * 8); const fnmRef = new Float64Array(nF * 6); const fnmArm: FArm[] = [];
let oddHints = 0;
for (let i = 0; i < nF; i++) {
  const r = cF.off + i * cF.stride;
  fnmIn.set(D.subarray(r, r + 8), i * 8); fnmRef.set(D.subarray(r + 8, r + 14), i * 6);
  fnmArm.push(armObj[armOf(D[r], D[r + 1], D[r + 2], D[r + 3])]);
  const hk = D[r + 7]; if (!Number.isInteger(hk)) oddHints++;
}
const cW = meta.calls.fwf; const nW = cW.count;
const fwfIn = new Float64Array(nW * 10); const fwfRef = new Float64Array(nW * 6); const fwfPoly: Poly[] = [];
for (let i = 0; i < nW; i++) {
  const r = cW.off + i * cW.stride;
  fwfIn.set(D.subarray(r, r + 10), i * 10); fwfRef.set(D.subarray(r + 10, r + 16), i * 6); fwfPoly.push(polys[D[r]]);
}
const cM = meta.calls.moc; const nM = cM.count;
const mocIn = new Float64Array(nM * 24); const mocRef = new Float64Array(nM * 16); const mocAi = new Int32Array(nM);
for (let i = 0; i < nM; i++) {
  const r = cM.off + i * cM.stride;
  mocIn.set(D.subarray(r, r + 24), i * 24); mocRef.set(D.subarray(r + 24, r + 40), i * 16);
  mocAi[i] = armOf(D[r], D[r + 1], D[r + 2], D[r + 3]);
  if (!Number.isInteger(D[r + 8])) oddHints++;
}
const C: FCache = { h: meta.h, polys, armObj, armSR: Float64Array.from(aSR), armDir: Int32Array.from(aDir), armL: Float64Array.from(aL), tanTx, tanTy, tanGF, tanGB };

// ---- JS runners -------------------------------------------------------------------
const out: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const ft: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const wc: WalkCache = { valid: false, qx: 0, qy: 0, footStartS: 0, footEndS: 0, hiS: 0, kHi: 0, bkHi: 0, minF: 0, loS: 0, kLo: 0, bkLo: 0, maxB: 0, oLo: 0, oHi: 0 };
function jsFnm(res: Float64Array): void {
  const I = fnmIn;
  for (let i = 0; i < nF; i++) {
    const r = i * 8;
    kfXY[0] = I[r + 4]; kfXY[1] = I[r + 5]; out.u = I[r + 6]; out.k = I[r + 7];
    footNearM(C, fnmArm[i], out);
    const o = i * 6; res[o] = out.d; res[o + 1] = out.x; res[o + 2] = out.y; res[o + 3] = out.s; res[o + 4] = out.k; res[o + 5] = out.u;
  }
}
function jsFwf(res: Float64Array): void {
  const I = fwfIn; const A = fwA;
  for (let i = 0; i < nW; i++) {
    const r = i * 10;
    A[0] = I[r + 1]; A[1] = I[r + 2]; A[2] = I[r + 3]; A[3] = I[r + 4]; A[4] = I[r + 5]; A[5] = I[r + 6]; A[6] = I[r + 7]; A[7] = I[r + 8]; A[8] = I[r + 9];
    footWinFast(fwfPoly[i], out);
    const o = i * 6; res[o] = out.d; res[o + 1] = out.x; res[o + 2] = out.y; res[o + 3] = out.s; res[o + 4] = out.k; res[o + 5] = out.u;
  }
}
// marginOfC's WalkCache is restored from the recording before each call (in
// the frame it persists per arm); both sides pay the same restore.
function jsMoc(res: Float64Array): void {
  const I = mocIn; const c = wc;
  for (let i = 0; i < nM; i++) {
    const r = i * 24;
    kfCst.qx = I[r + 4]; kfCst.qy = I[r + 5]; ft.u = I[r + 6]; ft.d = I[r + 7]; ft.k = I[r + 8];
    c.valid = I[r + 9] !== 0; c.qx = I[r + 10]; c.qy = I[r + 11]; c.footStartS = I[r + 12]; c.footEndS = I[r + 13]; c.hiS = I[r + 14]; c.kHi = I[r + 15]; c.bkHi = I[r + 16];
    c.minF = I[r + 17]; c.loS = I[r + 18]; c.kLo = I[r + 19]; c.bkLo = I[r + 20]; c.maxB = I[r + 21]; c.oLo = I[r + 22]; c.oHi = I[r + 23];
    const v = marginOfC(C, mocAi[i], ft, c);
    const o = i * 16; res[o] = v; res[o + 1] = c.valid ? 1 : 0; res[o + 2] = c.qx; res[o + 3] = c.qy; res[o + 4] = c.footStartS; res[o + 5] = c.footEndS;
    res[o + 6] = c.hiS; res[o + 7] = c.kHi; res[o + 8] = c.bkHi; res[o + 9] = c.minF; res[o + 10] = c.loS; res[o + 11] = c.kLo; res[o + 12] = c.bkLo;
    res[o + 13] = c.maxB; res[o + 14] = c.oLo; res[o + 15] = c.oHi;
  }
}

// ---- WASM side ----------------------------------------------------------------------
const wasmPath = join(here, "build", wasmName);
const wasmBytes = readFileSync(wasmPath);
const inst = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes), {});
const ex = inst.exports as unknown as {
  memory: WebAssembly.Memory; heapBase(): number; setup(hdr: number, out: number, mfoot: number, cache: number, h: number): void;
  fnm(pi: number, dir: number, sR: number, L: number, x: number, y: number, hs: number, hk: number): void; fnmBatch(i: number, o: number, n: number): void;
  fwf(pi: number, px: number, py: number, lo: number, hi: number, stopAt: number, initBd: number, hintLo: number, hintHi: number, prune: number): void; fwfBatch(i: number, o: number, n: number): void;
  moc(pi: number, dir: number, sR: number, L: number, x: number, y: number, u: number, d: number, k: number): number; mocBatch(i: number, o: number, n: number): void;
};
let brk = Math.max(1024, (ex.heapBase() + 15) & ~15);
function alloc(bytes: number): number { const a = brk; brk = (brk + bytes + 15) & ~15; return a; }
const OUT = alloc(48); const MFOOT = alloc(48); const CACHE = alloc(120); const HDR = alloc((maxPi + 1) * 128);
const POLY_FIELDS = ["x", "y", "s", "segLen", "dx", "dy", "bx0", "by0", "bx1", "by1", "bk"] as const;
type Copy = { src: Float64Array; at: number };
const copies: Copy[] = []; const hdrI: [number, number][] = []; const hdrF: [number, number][] = [];
for (const m of meta.polys) {
  const p = polys[m.pi]; const hb = HDR + m.pi * 128;
  hdrI.push([hb, m.n], [hb + 4, m.nseg], [hb + 8, m.closed ? 1 : 0], [hb + 12, m.nblk]); hdrF.push([hb + 16, m.len], [hb + 24, m.s0]);
  POLY_FIELDS.forEach((f, j) => { const a = p[f]; const at = alloc(a.length * 8); copies.push({ src: a, at }); hdrI.push([hb + 32 + 4 * j, at]); });
}
for (const t of meta.tans) {
  const hb = HDR + t.pi * 128;
  [tanTx, tanTy, tanGF, tanGB].forEach((T, j) => { const a = T[t.pi]; const at = alloc(a.length * 8); copies.push({ src: a, at }); hdrI.push([hb + 76 + 4 * j, at]); });
}
const polyBytes = brk - HDR;
const FNM_IN = alloc(nF * 64); const FNM_OUT = alloc(nF * 48);
const FWF_IN = alloc(nW * 80); const FWF_OUT = alloc(nW * 48);
const MOC_IN = alloc(nM * 192); const MOC_OUT = alloc(nM * 128);
ex.memory.grow(Math.ceil(brk / 65536) - ex.memory.buffer.byteLength / 65536 + 1);
const M = new Float64Array(ex.memory.buffer); const MI = new Int32Array(ex.memory.buffer);
for (const [a, v] of hdrI) MI[a >> 2] = v;
for (const [a, v] of hdrF) M[a >> 3] = v;
ex.setup(HDR, OUT, MFOOT, CACHE, meta.h);
function copyPolys(): void { for (let i = 0; i < copies.length; i++) { const c = copies[i]; M.set(c.src, c.at >> 3); } }
copyPolys();

function wFnm(res: Float64Array): void {
  const I = fnmIn; const ob = OUT >> 3; const W = M;
  for (let i = 0; i < nF; i++) {
    const r = i * 8; const a = fnmArm[i];
    ex.fnm(a.pi, a.dir, a.sR, a.L, I[r + 4], I[r + 5], I[r + 6], I[r + 7]);
    const o = i * 6; res[o] = W[ob]; res[o + 1] = W[ob + 1]; res[o + 2] = W[ob + 2]; res[o + 3] = W[ob + 3]; res[o + 4] = W[ob + 4]; res[o + 5] = W[ob + 5];
  }
}
function wFwf(res: Float64Array): void {
  const I = fwfIn; const ob = OUT >> 3; const W = M;
  for (let i = 0; i < nW; i++) {
    const r = i * 10;
    ex.fwf(I[r], I[r + 1], I[r + 2], I[r + 3], I[r + 4], I[r + 5], I[r + 6], I[r + 7], I[r + 8], I[r + 9]);
    const o = i * 6; res[o] = W[ob]; res[o + 1] = W[ob + 1]; res[o + 2] = W[ob + 2]; res[o + 3] = W[ob + 3]; res[o + 4] = W[ob + 4]; res[o + 5] = W[ob + 5];
  }
}
function wMoc(res: Float64Array): void {
  const I = mocIn; const cb = CACHE >> 3; const W = M;
  for (let i = 0; i < nM; i++) {
    const r = i * 24;
    for (let j = 0; j < 15; j++) W[cb + j] = I[r + 9 + j];
    const v = ex.moc(I[r], I[r + 1], I[r + 2], I[r + 3], I[r + 4], I[r + 5], I[r + 6], I[r + 7], I[r + 8]);
    const o = i * 16; res[o] = v;
    for (let j = 0; j < 15; j++) res[o + 1 + j] = W[cb + j];
  }
}
function wBatch(inp: Float64Array, inAt: number, outAt: number, outLen: number, run: () => void, res: Float64Array, polysToo: boolean): void {
  if (polysToo) copyPolys();
  M.set(inp, inAt >> 3);
  run();
  res.set(M.subarray(outAt >> 3, (outAt >> 3) + outLen));
}
const fnmK = (): void => ex.fnmBatch(FNM_IN, FNM_OUT, nF);
const fwfK = (): void => ex.fwfBatch(FWF_IN, FWF_OUT, nW);
const mocK = (): void => ex.mocBatch(MOC_IN, MOC_OUT, nM);

// ---- verification ---------------------------------------------------------------------
function compare(res: Float64Array, ref: Float64Array): { bad: number; maxAbs: number } {
  let bad = 0; let maxAbs = 0;
  for (let i = 0; i < ref.length; i++) {
    if (!Object.is(res[i], ref[i])) { bad++; const d = Math.abs(res[i] - ref[i]); if (!(d <= maxAbs)) maxAbs = d; }
  }
  return { bad, maxAbs };
}
type Kern = { name: string; n: number; ref: Float64Array; js: (r: Float64Array) => void; call: (r: Float64Array) => void; batch: (r: Float64Array, p: boolean) => void; kernel: () => void };
const K: Kern[] = [
  { name: "footNearM", n: nF, ref: fnmRef, js: jsFnm, call: wFnm, batch: (r, p) => wBatch(fnmIn, FNM_IN, FNM_OUT, nF * 6, fnmK, r, p), kernel: fnmK },
  { name: "footWinFast", n: nW, ref: fwfRef, js: jsFwf, call: wFwf, batch: (r, p) => wBatch(fwfIn, FWF_IN, FWF_OUT, nW * 6, fwfK, r, p), kernel: fwfK },
  { name: "marginOfC", n: nM, ref: mocRef, js: jsMoc, call: wMoc, batch: (r, p) => wBatch(mocIn, MOC_IN, MOC_OUT, nM * 16, mocK, r, p), kernel: mocK },
];
const verify: Record<string, Record<string, { bad: number; maxAbs: number }>> = {};
function verifyAll(tag: string): boolean {
  let ok = true;
  for (const k of K) {
    const r1 = new Float64Array(k.ref.length); const r2 = new Float64Array(k.ref.length); const r3 = new Float64Array(k.ref.length);
    k.js(r1); k.call(r2); k.batch(r3, true);
    const v = { js: compare(r1, k.ref), wasmCall: compare(r2, k.ref), wasmBatch: compare(r3, k.ref) };
    verify[`${tag}:${k.name}`] = v;
    const line = Object.entries(v).map(([m, c]) => `${m} ${c.bad === 0 ? "exact" : `${c.bad} differ (max ${c.maxAbs.toExponential(2)})`}`).join(", ");
    console.log(`${tag} ${k.name} (${k.n} calls): ${line}`);
    if (v.js.bad || v.wasmCall.bad || v.wasmBatch.bad) ok = false;
  }
  return ok;
}
console.log(`${scene}: outline.ts ${JS_SOURCE_SHA}, wasm ${wasmName} ${wasmBytes.length} B, polys ${meta.polys.length} (${(polyBytes / 1e6).toFixed(2)} MB in wasm memory), arms ${armObj.length}, non-integer k hints ${oddHints}`);
const okBefore = verifyAll("verify");
if (verifyOnly) process.exit(okBefore ? 0 : 1);

// ---- timing ---------------------------------------------------------------------------------
const pct = (a: number[], q: number): number => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const results: Record<string, Record<string, { med: number; p95: number }>> = {};
const scratch = new Float64Array(Math.max(nF * 6, nW * 6, nM * 16));
const tPoly: number[] = [];
for (const k of K) {
  const modes: [string, () => void][] = [
    ["js", () => k.js(scratch)],
    ["wasmCall", () => k.call(scratch)],
    ["wasmBatch", () => k.batch(scratch, false)],
    ["wasmBatch+polys", () => k.batch(scratch, true)],
    ["wasmKernelOnly", () => k.kernel()],
  ];
  const T: number[][] = modes.map(() => []);
  for (let w = 0; w < 15; w++) for (const [, f] of modes) f();
  for (let rep = 0; rep < REPS; rep++) {
    for (let j = 0; j < modes.length; j++) {
      const mi = (j + rep) % modes.length;
      const t0 = performance.now(); modes[mi][1](); T[mi].push(performance.now() - t0);
    }
    const t0 = performance.now(); copyPolys(); tPoly.push(performance.now() - t0);
  }
  results[k.name] = {};
  for (let j = 0; j < modes.length; j++) results[k.name][modes[j][0]] = { med: pct(T[j], 0.5), p95: pct(T[j], 0.95) };
  const r = results[k.name]; const js = r.js.med;
  console.log(`${k.name}: ` + modes.map(([m]) => `${m} ${r[m].med.toFixed(3)} ms (p95 ${r[m].p95.toFixed(3)})`).join(", "));
  console.log(`  ratio js/wasm: call ${(js / r.wasmCall.med).toFixed(2)}x, batch ${(js / r.wasmBatch.med).toFixed(2)}x, batch+polys ${(js / r["wasmBatch+polys"].med).toFixed(2)}x, kernel only ${(js / r.wasmKernelOnly.med).toFixed(2)}x; per call js ${(js * 1e6 / k.n).toFixed(0)} ns, wasm call ${(r.wasmCall.med * 1e6 / k.n).toFixed(0)} ns`);
}
console.log(`poly copy into wasm memory (${(polyBytes / 1e6).toFixed(2)} MB): median ${pct(tPoly, 0.5).toFixed(3)} ms, p95 ${pct(tPoly, 0.95).toFixed(3)} ms`);
const okAfter = verifyAll("after");
mkdirSync(join(here, "out"), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
writeFileSync(join(here, "out", `bench_${scene}_${wasmName.replace(/\W/g, "_")}_${stamp}.json`), JSON.stringify({ scene, wasm: wasmName, wasmBytes: wasmBytes.length, reps: REPS, node: process.version, jsSha: JS_SOURCE_SHA, calls: { fnm: nF, fwf: nW, moc: nM }, polyCopy: { med: pct(tPoly, 0.5), p95: pct(tPoly, 0.95), bytes: polyBytes }, results, verify }, null, 1));
process.exit(okBefore && okAfter ? 0 : 1);
