// count.mjs (K8 sdf phone): where the gap search's work goes, per fragment.
//   node count.mjs <host> <outDir> <tag> <query>
// Opens <query> (the default strip pass) and <query>&rp=sdf in one headed
// off-screen Chrome (1400x900, dsf 1, ANGLE d3d11, fresh profile), each
// slept (MAXREST ms cap), frozen, pinned and still, as ss_ab.mjs does.
//
// COUNTERS: shaderSource is patched before any page script runs. Every
// thread fragment program (the SDF's gapKeepAt(pxW, vPos, gTurn, vDir, vIds)
// call or the strip's gapKeep(pxW, gTurn)) gains global int counters in the
// shared GAP_FRAG_LIB:
//   seg   gapSeg calls (the fast nearest search's segment tests)
//   full  gapSegFull calls (the exclusion search: self-crossing slots and the
//         far-branch smooth-min)
//   prot  gapProtCover loop iterations
//   slot  slots holding an id (before the texel-0 reject)
//   win   slots past the window test (a search runs)
//   chunk chunks scanned (after the chunk-circle cull)
// and, right after the call, `if (k8Mode > 0) { finalColor = k8Out(); return; }`
// (k8Mode is an extra uniform pixi never sets, so 0 = the normal look).
// ACCUMULATE: one extra renderer.render of the frozen stage with the screen
// framebuffer swapped for an RGBA32F one, clear 0, blend ONE ONE: each
// pixel sums its fragments' counters (overdraw included, as the GPU pays
// it). Draws of other programs keep their depth/stencil but write no color.
//   mode 1: R = seg + full, G = 1 (fragments), B = win, A = any slot
//   mode 2: R = full, G = chunk, B = slot, A = prot
// Stats over drawn pixels (G > 0): mean, p50/p90/p99, max per pixel, and
// per-fragment means; a heatmap of mode 1's R (per-pixel segment tests).
//
// WALK (rp=sdf page): the SDF vertex's window lookup replayed on the CPU
// from the page's own RANGES (g3RangeScratch, g3WinBase, g3NWin): binary
// search iterations, walk-back length and ids per segment; the pre-42900cac
// scan (first 16 entries only) and the ids it lost; the strip's per-sample
// ids (idScratch) for comparison.
import puppeteer from "puppeteer-core";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , host, outDir, tag, query] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 1400, H = 900;
mkdirSync(outDir, { recursive: true });

const INSTR = () => {
  const P = WebGL2RenderingContext.prototype;
  const st = (window.__k8c = { on: false, mode: 0, tag: new WeakMap(), prog: new WeakMap(), loc: new WeakMap(), cur: null, fbo: null, drawn: 0, masked: 0, compiled: [], cm: [true, true, true, true] });
  const DECL = `
int k8Seg = 0; int k8Full = 0; int k8Prot = 0; int k8Slot = 0; int k8Win = 0; int k8Chunk = 0;
uniform int k8Mode;
vec4 k8Out() {
  if (k8Mode == 2) return vec4(float(k8Full), float(k8Chunk), float(k8Slot), float(k8Prot));
  return vec4(float(k8Seg + k8Full), 1.0, float(k8Win), k8Slot > 0 ? 1.0 : 0.0);
}
`;
  const oSrc = P.shaderSource;
  P.shaderSource = function (sh, src) {
    let kind = null;
    let call = null;
    if (src.includes("gapKeepAt(pxW, vPos, gTurn, vDir, vIds);")) { kind = "sdf"; call = /float gk = gapKeepAt\(pxW, vPos, gTurn, vDir, vIds\);/; }
    else if (src.includes("float gk = gapKeep(pxW, gTurn);")) { kind = "strip"; call = /float gk = gapKeep\(pxW, gTurn\);/; }
    if (kind) {
      const reps = {};
      const rep = (name, re, to) => { let n = 0; src = src.replace(new RegExp(re.source, "g"), (m, ...g) => { n++; return to(m, ...g); }); reps[name] = n; };
      rep("decl", /\nvoid gapSeg\(/, (m) => "\n" + DECL + m.slice(1));
      rep("seg", /(void gapSeg\([^)]*\)\s*\{)/, (m) => m + " k8Seg++;");
      rep("full", /(void gapSegFull\([^)]*\)\s*\{)/, (m) => m + " k8Full++;");
      rep("prot", /if \(j >= n - 1\) break;/, (m) => m + " k8Prot++;");
      rep("slot", /if \(abs\(idf \+ 1\.0\) < 0\.5\) continue;/, (m) => m + " k8Slot++;");
      rep("win", /if \(m <= -pxW\) continue;/, (m) => m + " k8Win++;");
      rep("chunk", /int r = g\.w \+ k0 \* g\.y, i;/, (m) => m + " k8Chunk++;");
      rep("call", call, (m) => m + " if (k8Mode > 0) { finalColor = k8Out(); return; }");
      st.tag.set(sh, kind);
      st.compiled.push({ kind, reps });
    }
    return oSrc.call(this, sh, src);
  };
  const oAttach = P.attachShader;
  P.attachShader = function (p, sh) { const k = st.tag.get(sh); if (k) st.prog.set(p, k); return oAttach.call(this, p, sh); };
  const oUse = P.useProgram;
  P.useProgram = function (p) { st.cur = p; return oUse.call(this, p); };
  const oBind = P.bindFramebuffer;
  P.bindFramebuffer = function (t, fb) { return oBind.call(this, t, st.on && fb === null ? st.fbo : fb); };
  const oCC = P.clearColor;
  P.clearColor = function (...a) { return st.on ? oCC.call(this, 0, 0, 0, 0) : oCC.apply(this, a); };
  const oBF = P.blendFunc, oBFS = P.blendFuncSeparate, oBE = P.blendEquation, oBES = P.blendEquationSeparate, oDis = P.disable, oCM = P.colorMask;
  P.blendFunc = function (...a) { return st.on ? oBF.call(this, 1, 1) : oBF.apply(this, a); };
  P.blendFuncSeparate = function (...a) { return st.on ? oBF.call(this, 1, 1) : oBFS.apply(this, a); };
  P.blendEquation = function (...a) { return st.on ? oBE.call(this, this.FUNC_ADD) : oBE.apply(this, a); };
  P.blendEquationSeparate = function (...a) { return st.on ? oBE.call(this, this.FUNC_ADD) : oBES.apply(this, a); };
  P.disable = function (cap) { if (st.on && cap === this.BLEND) return; return oDis.call(this, cap); };
  P.colorMask = function (...a) { st.cm = a; return oCM.apply(this, a); };
  for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced", "drawRangeElements"]) {
    const o = P[name];
    P[name] = function (...a) {
      if (!st.on) return o.apply(this, a);
      const kind = st.cur && st.prog.get(st.cur);
      if (kind) {
        let loc = st.loc.get(st.cur);
        if (loc === undefined) { loc = this.getUniformLocation(st.cur, "k8Mode"); st.loc.set(st.cur, loc); }
        if (loc) this.uniform1i(loc, st.mode);
        oCM.call(this, true, true, true, true);
        st.drawn++;
        const r = o.apply(this, a);
        oCM.apply(this, st.cm);
        if (loc) this.uniform1i(loc, 0);
        return r;
      }
      st.masked++;
      oCM.call(this, false, false, false, false);
      const r = o.apply(this, a);
      oCM.apply(this, st.cm);
      return r;
    };
  }
  st.orig = { oBind, oCC, oBF, oBE };
  window.__k8 = { lost: 0 };
  const hook = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (!this.__k8hooked && /webgl/.test(String(type))) {
      this.__k8hooked = true;
      this.addEventListener("webglcontextlost", () => { if (this.isConnected) window.__k8.lost++; });
    }
    return hook.call(this, type, ...rest);
  };
};

// One accumulation render; stats and the heatmap computed in the page.
const ACC = (mode) => {
  const st = window.__k8c;
  const L = window.__knotBackgroundLayer();
  const R = L.renderer, gl = R.gl;
  const Wd = gl.drawingBufferWidth, Hd = gl.drawingBufferHeight;
  if (!st.fbo) {
    if (!gl.getExtension("EXT_color_buffer_float")) return { error: "no EXT_color_buffer_float" };
    if (!gl.getExtension("EXT_float_blend")) return { error: "no EXT_float_blend" };
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, Wd, Hd);
    const rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, Wd, Hd);
    const fb = gl.createFramebuffer();
    st.orig.oBind.call(gl, gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rb);
    const s = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    st.orig.oBind.call(gl, gl.FRAMEBUFFER, null);
    if (s !== gl.FRAMEBUFFER_COMPLETE) return { error: "fbo " + s };
    st.fbo = fb;
  }
  st.drawn = 0; st.masked = 0;
  st.orig.oBind.call(gl, gl.FRAMEBUFFER, st.fbo);
  gl.viewport(0, 0, Wd, Hd);
  st.orig.oCC.call(gl, 0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  st.on = true; st.mode = mode;
  gl.enable(gl.BLEND);
  st.orig.oBF.call(gl, gl.ONE, gl.ONE);
  st.orig.oBE.call(gl, gl.FUNC_ADD);
  try { R.render({ container: R.lastObjectRendered }); } finally { st.on = false; }
  const px = new Float32Array(Wd * Hd * 4);
  st.orig.oBind.call(gl, gl.FRAMEBUFFER, st.fbo);
  gl.readPixels(0, 0, Wd, Hd, gl.RGBA, gl.FLOAT, px);
  st.orig.oBind.call(gl, gl.FRAMEBUFFER, null);
  const err = gl.getError();
  const ch = [0, 1, 2, 3].map(() => ({ sum: 0, max: 0 }));
  let drawnPx = 0;
  const rv = [];
  for (let i = 0; i < Wd * Hd; i++) {
    const o = i * 4;
    const isDrawn = mode === 1 ? px[o + 1] > 0 : px[o + 1] > 0 || px[o + 2] > 0;
    if (!isDrawn) continue;
    drawnPx++;
    for (let c = 0; c < 4; c++) { const v = px[o + c]; ch[c].sum += v; if (v > ch[c].max) ch[c].max = v; }
    rv.push(px[o]);
  }
  rv.sort((a, b) => a - b);
  const pct = (q) => (rv.length ? rv[Math.min(rv.length - 1, Math.floor(q * rv.length))] : 0);
  const out = { mode, Wd, Hd, drawn: st.drawn, masked: st.masked, glError: err, drawnPx, ch: ch.map((c) => ({ sum: c.sum, max: c.max })), p50: pct(0.5), p90: pct(0.9), p99: pct(0.99) };
  if (mode === 1) {
    // Heatmap of R (segment tests per pixel), clipped at 400.
    const cv = document.createElement("canvas");
    cv.width = Wd; cv.height = Hd;
    const c2 = cv.getContext("2d");
    const im = c2.createImageData(Wd, Hd);
    const clip = 400;
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const o = ((Hd - 1 - y) * Wd + x) * 4, d = (y * Wd + x) * 4;
      const g = px[o + 1];
      let r = 0, gg = 0, b = 0;
      if (g > 0) {
        const t = Math.min(px[o] / clip, 1);
        if (px[o] === 0) { r = 40; gg = 40; b = 40; }
        else if (t < 0.25) { b = 90 + 660 * t; }
        else if (t < 0.5) { r = 1020 * (t - 0.25); b = 255 - 1020 * (t - 0.25); }
        else if (t < 0.75) { r = 255; gg = 1020 * (t - 0.5); }
        else { r = 255; gg = 255; b = 1020 * (t - 0.75); }
      }
      im.data[d] = r; im.data[d + 1] = gg; im.data[d + 2] = b; im.data[d + 3] = 255;
    }
    c2.putImageData(im, 0, 0);
    out.png = cv.toDataURL("image/png");
  }
  if (R.resetState) R.resetState();
  return out;
};

const WALK = () => {
  const r = window.__knotRenderer();
  const S = r.g3RangeScratch, WB = r.g3WinBase, NW = r.g3NWin;
  if (!S || !WB || !NW) return { error: "no RANGES" };
  const RF = 4;
  const agg = { chains: 0, segs: 0, nWinHist: {}, chainsOver16: 0, bsIt: 0, walk: 0, walkMax: 0, ids: 0, idsMax: 0, oldIds: 0, oldLost: 0, segsLosing: 0, stripIds: 0, stripSamples: 0, walkHist: {} };
  const perChain = [];
  for (let c = 0; c < r.chainSamples.length; c++) {
    const smp = r.chainSamples[c];
    if (!smp) continue;
    const count = smp.count, closed = smp.closed;
    const nSeg = closed ? count : count - 1;
    const wb = WB[c], nw = NW[c];
    agg.chains++;
    const hb = nw > 16 ? ">16" : nw > 8 ? "9-16" : nw > 4 ? "5-8" : nw > 0 ? "1-4" : "0";
    agg.nWinHist[hb] = (agg.nWinHist[hb] || 0) + 1;
    if (nw > 16) agg.chainsOver16++;
    let cw = 0, cwMax = 0, cIds = 0, cLost = 0;
    for (let k = 0; k < nSeg; k++) {
      const fk = k;
      let lo = 0, hi = nw, it = 0;
      for (; it < 20; it++) { if (lo >= hi) break; const mid = (lo + hi) >> 1; if (S[(wb + mid) * RF + 1] <= fk + 0.5) lo = mid + 1; else hi = mid; }
      let slot = 0, w = 0;
      for (; w < 64; w++) {
        const wi = lo - 1 - w;
        if (wi < 0 || slot > 3) break;
        const o = (wb + wi) * RF;
        if (Math.floor(S[o + 3] / 64) - 1 < fk - 0.5) break;
        if (S[o + 2] >= fk - 0.5) slot++;
      }
      // pre-42900cac: the first 16 entries, inclusive +-0.5
      let os = 0, lost = 0;
      for (let e = 0; e < nw; e++) {
        const o = (wb + e) * RF;
        const covers = fk >= S[o + 1] - 0.5 && fk <= S[o + 2] + 0.5;
        if (!covers) continue;
        if (e < 16 && os <= 3) os++;
        else if (e >= 16) lost++;
      }
      agg.segs++; agg.bsIt += it; agg.walk += w; if (w > agg.walkMax) agg.walkMax = w;
      const wk = w >= 16 ? "16+" : w >= 8 ? "8-15" : w >= 4 ? "4-7" : String(w);
      agg.walkHist[wk] = (agg.walkHist[wk] || 0) + 1;
      agg.ids += slot; if (slot > agg.idsMax) agg.idsMax = slot;
      agg.oldIds += os; agg.oldLost += lost; if (lost) agg.segsLosing++;
      cw += w; if (w > cwMax) cwMax = w; cIds += slot; cLost += lost;
    }
    const ids = r.idScratch && r.idScratch.get(c);
    if (ids) for (let i = 0; i < count; i++) { agg.stripSamples++; for (let s = 0; s < 4; s++) if (ids[i * 4 + s] > -0.5) agg.stripIds++; }
    perChain.push({ c, count, closed, nWin: nw, walkMean: nSeg ? +(cw / nSeg).toFixed(2) : 0, walkMax: cwMax, idsPerSeg: nSeg ? +(cIds / nSeg).toFixed(2) : 0, lostIds: cLost });
  }
  perChain.sort((a, b) => b.nWin - a.nWin);
  return {
    chains: agg.chains, segs: agg.segs, nWinHist: agg.nWinHist, chainsOver16: agg.chainsOver16,
    bsItMean: +(agg.bsIt / agg.segs).toFixed(2), walkMean: +(agg.walk / agg.segs).toFixed(2), walkMax: agg.walkMax, walkHist: agg.walkHist,
    sdfIdsPerSeg: +(agg.ids / agg.segs).toFixed(3), oldIdsPerSeg: +(agg.oldIds / agg.segs).toFixed(3), oldLostIds: agg.oldLost, segsLosing: agg.segsLosing,
    stripIdsPerSample: agg.stripSamples ? +(agg.stripIds / agg.stripSamples).toFixed(3) : null,
    top: perChain.slice(0, 6),
  };
};

const PIN = () => {
  const r = window.__knotRenderer(), proto = Object.getPrototypeOf(r);
  r.advanceClocks = function () {}; r.paintClock = 100; r.pulseBorn = 0;
  r.tickPaint = function () { return proto.tickPaint.call(this, 0); };
  r.flowTime = 0;
  try {
    const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
    if (L) { L.tick = function () { return false; }; L.clock.time = 40; if (L.active) L.renderTexture(); }
  } catch (e) { /* no background layer */ }
  for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
};

async function run(browser, name, q) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluateOnNewDocument(INSTR);
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(`${host}/?${q}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(1, 1);
  await page.waitForFunction(() => typeof window.__knotPerf === "function" && window.__knotRenderer && window.__knotRenderer(), { timeout: 90000, polling: 250 });
  const t0 = Date.now();
  let restMs = -1;
  const maxRest = Number(process.env.MAXREST ?? 240000);
  while (Date.now() - t0 < maxRest) {
    const ok = await page.evaluate(() => { const p = window.__knotPerf(); return (p.state === "frozen" || p.asleep) && !p.plucks; });
    if (ok) { restMs = Date.now() - t0; break; }
    await sleep(500);
  }
  await page.evaluate(async () => (typeof window.__knotPhysFreeze === "function" ? await window.__knotPhysFreeze(true) : null));
  const dump = await page.evaluate(async () => (typeof window.__knotPhysDump === "function" ? await window.__knotPhysDump({}) : null));
  await page.evaluate(PIN);
  await sleep(1500);
  const a = await page.evaluate(ACC, 1);
  const b = await page.evaluate(ACC, 2);
  const walk = /rp=sdf/.test(q) ? await page.evaluate(WALK) : null;
  const meta = await page.evaluate(() => {
    const r = window.__knotRenderer();
    const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
    const gl = L && L.renderer && L.renderer.gl;
    return { compiled: window.__k8c.compiled, pass: r.stripPass && r.stripPass.constructor.name, fallback: !!r.rpFallback, glError: gl ? gl.getError() : -1, lost: gl ? gl.isContextLost() : null, lostEvents: window.__k8.lost };
  });
  if (a.png) { writeFileSync(join(outDir, `${tag}_${name}_heat.png`), Buffer.from(a.png.split(",")[1], "base64")); delete a.png; }
  await page.close();
  const hash = dump && (dump.hash || dump.h || (dump.state && dump.state.hash));
  const per = (s) => +(s / Math.max(a.ch[1].sum, 1)).toFixed(2);
  const summary = {
    name, q, restMs, hash: hash ?? null, pass: meta.pass, fallback: meta.fallback, drawnPx: a.drawnPx, frags: a.ch[1].sum, overdrawMax: a.ch[1].max,
    segPerPx: +(a.ch[0].sum / Math.max(a.drawnPx, 1)).toFixed(2), segPx_p50: a.p50, segPx_p90: a.p90, segPx_p99: a.p99, segPx_max: a.ch[0].max,
    segPerFrag: per(a.ch[0].sum), searchesPerFrag: per(a.ch[2].sum), fragsWithSlot: a.ch[3].sum,
    fullPerFrag: per(b.ch[0].sum), chunksPerFrag: per(b.ch[1].sum), slotsPerFrag: per(b.ch[2].sum), protPerFrag: per(b.ch[3].sum),
    totals: { seg: a.ch[0].sum, full: b.ch[0].sum, chunk: b.ch[1].sum, slot: b.ch[2].sum, prot: b.ch[3].sum, win: a.ch[2].sum },
    draws: { counted: a.drawn, masked: a.masked }, accGlError: [a.glError, b.glError], errors, meta: { compiled: meta.compiled, glError: meta.glError, lost: meta.lost, lostEvents: meta.lostEvents },
    walk,
  };
  if (a.error || b.error) summary.accError = [a.error, b.error];
  return summary;
}

const profile = mkdtempSync(join(tmpdir(), "k8count-"));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile,
  args: ["--use-angle=d3d11", "--window-position=-2400,0", `--window-size=${W},${H + 140}`, "--no-first-run", "--no-default-browser-check", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
  defaultViewport: null,
});
const res = [];
try {
  for (const [name, q] of [["strip", query], ["sdf", `${query}&rp=sdf`]]) {
    const s = await run(browser, name, q);
    res.push(s);
    console.log(JSON.stringify(s));
  }
} finally {
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ }
}
writeFileSync(join(outDir, `${tag}.json`), JSON.stringify(res, null, 1));
