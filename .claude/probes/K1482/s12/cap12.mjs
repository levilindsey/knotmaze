// K1482 s12: copy of s11/cap11.mjs; NAME=<shot name> (default gf/today), writes crossing landmarks (xings, device px from
// the physics particles through the page's root transform) into sites_<name>.json, and a second screenshot <name>_b.png
// 2 s later with the transform read before/after (view settled?).
// K1482 s11: copy of ../cap.mjs that also prints console errors/warnings naming a shader, compile or link failure
// K1482: one frozen rest state of a link under rp=gf AND today's renderer, at 1600x900 DSF 2, plus the scene's sites.
// The K868 recipe (load, freeze, __knotStepUntil(SIMT), clocks pinned); each page is reloaded until its physics hash
// is HASH (when given; else the gf page's first hash becomes the target), so today | gf compare one state.
//
//   node .claude/probes/K1482/cap.mjs <base> <outDir> <profileDir> [query=3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1]
//     env HASH=<target>  SIMT=20  DSF=2  TRIES=6  TODAY=1 (also shoot today's renderer)  GF=1  FL=<fade> (sets fadeLength
//     live after the freeze, no reload)  WARM=1 (load gf once, wait for composites, no capture)
//   writes <outDir>/gf.png, today.png, sites.json ({hash, view, sites:[{site, kind, x, y (device px), wx, wy}]})
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [, , base, outDir, profileDir, query = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), TRIES = +(process.env.TRIES ?? 6);
let HASH = process.env.HASH ?? "";
// K1482 s5: PATCH=<json [[find, replace], ...]> rewrites the gf look program's source (probe-only term switches)
// K1482 s7: PATCHF=<json> does the same to the field programs (sources holding "#define MAXP")
// K1482 s11: PATCHT=<json> does the same to today's ribbon programs (sources holding "gapKeepAt")
const PATCHT = process.env.PATCHT ? JSON.parse((await import("node:fs")).readFileSync(process.env.PATCHT, "utf8")) : [];
const PATCHF = process.env.PATCHF ? JSON.parse((await import("node:fs")).readFileSync(process.env.PATCHF, "utf8")) : [];
const PATCH = process.env.PATCH ? JSON.parse((await import("node:fs")).readFileSync(process.env.PATCH, "utf8")) : [];
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", ...(process.env.PATCH || process.env.PATCHF || process.env.PATCHT ? ["--disable-gpu-watchdog"] : []), "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const T0 = Date.now(); const T = () => ((Date.now() - T0) / 1000).toFixed(0) + "s";
async function load(gf) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`pageerror ${e.message.slice(0, 200)}`)); page.on("console", (m) => { const t = m.text(); if (/ERROR|compile|shader|link/i.test(t) && m.type() !== "log") console.log(`console.${m.type()} ${t.slice(0, 600)}`); });
  await page.evaluateOnNewDocument((POOL0) => { window.__knotLoopMode = "continuous"; window.__lost = 0; if (POOL0) globalThis.__knotGfOpts = { pool: false }; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (...a) { if (!this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => { if (this.isConnected) window.__lost++; }); } return gc.apply(this, a); }; }, process.env.POOL === "0");
  if (PATCH.length || PATCHF.length || PATCHT.length) await page.evaluateOnNewDocument((PT, PF, PTT) => { const ss = WebGL2RenderingContext.prototype.shaderSource; window.__patchHits = {}; WebGL2RenderingContext.prototype.shaderSource = function (sh, src) { for (const [a, b] of src.includes("#define MAXP") ? PF : []) { const n = src.split(a).length - 1; window.__patchHits["F:" + a.slice(0, 40)] = (window.__patchHits["F:" + a.slice(0, 40)] ?? 0) + n; src = src.split(a).join(b); } for (const [a, b] of src.includes("gapKeepAt") ? PTT : []) { const n = src.split(a).length - 1; window.__patchHits["T:" + a.slice(0, 40)] = (window.__patchHits["T:" + a.slice(0, 40)] ?? 0) + n; src = src.split(a).join(b); } if (src.includes("lkGap")) for (const [a, b] of PT) { const n = src.split(a).length - 1; window.__patchHits[a.slice(0, 40)] = (window.__patchHits[a.slice(0, 40)] ?? 0) + n; src = src.split(a).join(b); } return ss.call(this, sh, src); }; }, PATCH, PATCHF, PATCHT);
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  let q = `${query}&phw=0&snd=none&prp=off`;
  if (gf) q += "&rp=gf"; else q = q.replace(/&gfh=1/, "");
  await page.goto(`${base}/?${q}`, { waitUntil: "load", timeout: 900000 });
  await page.bringToFront();
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (gf) await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 300 }, f0);
  return page;
}
async function redraw(page, gf) {
  if (gf) {
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw(); return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 900000, polling: 200 }, c0);
  } else {
    const f0 = await page.evaluate(() => window.__knotLoop().frames);
    await page.waitForFunction((f) => window.__knotLoop().frames > f + 6, { timeout: 900000, polling: 200 }, f0);
  }
  await sleep(700);
}
async function freeze(page) {
  return page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    const r = window.__knotRenderer();
    r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
  }, SIMT);
}
async function shoot(gf, name) {
  for (let k = 0; k < TRIES; k++) {
    const page = await load(gf);
    if (process.env.WARM === "1") { console.log(T(), `warm ${gf ? "gf" : "today"} ok, lost ${await page.evaluate(() => window.__lost)}`); await page.close(); return true; }
    const h = await freeze(page);
    if (HASH && h !== HASH) { console.log(T(), `${name}: hash ${h} != ${HASH}, reload`); await page.close(); continue; }
    if (!HASH) HASH = h;
    await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
    if (process.env.FL) await page.evaluate((v) => { window.__knotRenderer().fadeLength = v; }, +process.env.FL);
    await sleep(1500);
    await redraw(page, gf);
    await page.mouse.move(2, 2);
    const wtA = await page.evaluate(() => { const t = window.__knotRenderer().root.worldTransform; return [t.a, t.b, t.c, t.d, t.tx, t.ty]; });
    await page.screenshot({ path: join(outDir, `${name}.png`) });
    await sleep(2000);
    await page.screenshot({ path: join(outDir, `${name}_b.png`) });
    const wtB = await page.evaluate(() => { const t = window.__knotRenderer().root.worldTransform; return [t.a, t.b, t.c, t.d, t.tx, t.ty]; });
    console.log(T(), `${name}: transform before ${JSON.stringify(wtA)} after ${JSON.stringify(wtB)}`);
    if (process.env.FLS) for (const v of process.env.FLS.split("/")) { await page.evaluate((v) => { window.__knotRenderer().fadeLength = v; }, +v); await sleep(800); await redraw(page, gf); await page.screenshot({ path: join(outDir, `${name}_fls${v}.png`) }); console.log(T(), `fls ${v}: fadeLength ${await page.evaluate(() => window.__knotRenderer().fadeLength)}, home ${await page.evaluate(() => JSON.stringify(globalThis.__knotGf?.home ?? null))}`); }
    if (gf && process.env.FILL === "1") { await page.evaluate(() => { window.__knotRenderer().threadLook = 0; }); await redraw(page, gf); await page.screenshot({ path: join(outDir, `${name}_fill.png`) }); await page.evaluate(() => { window.__knotRenderer().threadLook = 1; }); await redraw(page, gf); }
    if (gf || !process.env.GF || process.env.GF === "0") {
      const S = await page.evaluate(async () => {
        const R = window.__knotRenderer(); const root = R.root; let o = root; // world -> CSS through the root's transform
        const wt = root.worldTransform; const dpr = window.devicePixelRatio;
        const toDev = (x, y) => [(wt.a * x + wt.c * y + wt.tx) * dpr, (wt.b * x + wt.d * y + wt.ty) * dpr];
        const sites = [];
        const ps = window.__knotPS?.() ?? null;
        const pos = (c, i) => { const s = R.chainSamples[c]; return [s.positions[2 * i], s.positions[2 * i + 1]]; };
        (R.junctionArms ?? []).forEach((j, k) => {
          let sx = 0, sy = 0, n = 0;
          for (const a of j.arms) { const ss = R.chainSamples[a.chain]; if (!ss) continue;  }
          sites.push({ site: `j${k}`, kind: "junction", arms: j.arms.length, nA: n, wx: n ? sx / n : null, wy: n ? sy / n : null, particles: [...j.particles] });
        });
        const fused = R.chainTipFused ?? [];
        fused.forEach((f, c) => { const s = R.chainSamples[c]; if (!s || !f) return; if (f[0]) { const p = pos(c, 0); sites.push({ site: `t${c}s`, kind: "tail", wx: p[0], wy: p[1] }); } if (f[1]) { const p = pos(c, s.count - 1); sites.push({ site: `t${c}e`, kind: "tail", wx: p[0], wy: p[1] }); } });
        const xings = []; const P = ps.positions; const at = (pass) => { const ch = ps.chains[pass.chain]; const f = R.renderCtrl(pass); const i0 = Math.max(0, Math.min(ch.length - 1, Math.floor(f))); const i1 = Math.min(ch.length - 1, i0 + 1); const u = f - i0; return [P[2 * ch[i0]] * (1 - u) + P[2 * ch[i1]] * u, P[2 * ch[i0] + 1] * (1 - u) + P[2 * ch[i1] + 1] * u]; };
        ps.crossings.forEach((c, k) => { const a = at(c.over), b = at(c.under); xings.push({ k, over: c.over.chain, under: c.under.chain, wx: (a[0] + b[0]) / 2, wy: (a[1] + b[1]) / 2, sep: Math.hypot(a[0] - b[0], a[1] - b[1]) }); });
        return { xings, sites, toDevA: [wt.a * dpr, wt.b * dpr, wt.c * dpr, wt.d * dpr, wt.tx * dpr, wt.ty * dpr], dpr, scale: root.scale.x, h: R.style.threadWidth / 2, fade: R.fadeLength, lost: window.__lost };
      });
      // junction centres from the physics particles when the samples did not give one
      const ex = await page.evaluate(() => ({ pos: Array.from(window.__knotPS().positions) }));
      for (const s of S.sites) if (s.kind === "junction" && (s.wx == null) && ex.pos.length) { let x = 0, y = 0; for (const p of s.particles) { x += ex.pos[2 * p]; y += ex.pos[2 * p + 1]; } s.wx = x / s.particles.length; s.wy = y / s.particles.length; }
      const A = S.toDevA;
      for (const s of S.xings) { s.x = A[0] * s.wx + A[2] * s.wy + A[4]; s.y = A[1] * s.wx + A[3] * s.wy + A[5]; }
      for (const s of S.sites) { s.x = A[0] * s.wx + A[2] * s.wy + A[4]; s.y = A[1] * s.wx + A[3] * s.wy + A[5]; delete s.particles; }
      if (gf && process.env.TABLES === "1") { const TT = await page.evaluate(() => { const T = globalThis.__knotGf.tables; const o = {}; for (const [k, v] of Object.entries(T)) { if (ArrayBuffer.isView(v)) o[k] = { __t: v.constructor.name, v: Array.from(v, (x) => (x === Infinity ? "Inf" : x === -Infinity ? "-Inf" : x !== x ? "NaN" : x)) }; else o[k] = v; } return o; }); writeFileSync(join(outDir, `tables_${name}.json`), JSON.stringify(TT)); }
      if (gf && process.env.SCENE === "1") { const SC = await page.evaluate(async () => { const enc = (v) => { if (ArrayBuffer.isView(v)) return { __t: v.constructor.name, v: Array.from(v, (x) => (x === Infinity ? "Inf" : x === -Infinity ? "-Inf" : x !== x ? "NaN" : x)) }; if (Array.isArray(v)) return v.map(enc); if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = enc(x); return o; } if (typeof v === "number" && !Number.isFinite(v)) return v !== v ? "NaN" : v > 0 ? "Inf" : "-Inf"; return v; }; const r = await window.__knotSceneExport({ name: "k1482s4" }); return enc(r.scene); }); writeFileSync(join(outDir, `scene_${name}.json`), JSON.stringify(SC)); }
      // K1482 s8: DUMPGW=1 writes GfGapTable's source (gf_app.ts gwSnap's fields) and today's chainCuts / underWindows
      if (process.env.DUMPGW === "1") { const GW = await page.evaluate(() => { const enc = (v) => { if (ArrayBuffer.isView(v)) return { __t: v.constructor.name, v: Array.from(v, (x) => (x === Infinity ? "Inf" : x === -Infinity ? "-Inf" : x !== x ? "NaN" : x)) }; if (v instanceof Map) return { __m: [...v.entries()].map(([k, x]) => [k, enc(x)]) }; if (Array.isArray(v)) return v.map(enc); if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = enc(x); return o; } if (typeof v === "number" && !Number.isFinite(v)) return v !== v ? "NaN" : v > 0 ? "Inf" : "-Inf"; return v; }; const r = window.__knotRenderer(); return enc({ kd: r.kd, kcv: r.kcv, chainSamples: r.chainSamples.map((s) => (s ? { positions: s.positions, count: s.count } : null)), crossings: r.ps.crossings.map((c) => ({ overChain: c.over.chain, overCtrl: r.renderCtrl(c.over), underChain: c.under.chain, underCtrl: r.renderCtrl(c.under) })), style: { threadWidth: r.style.threadWidth, casingWidth: r.style.casingWidth }, fadeLength: r.fadeLength, FILLET_REACH_PER_HALF: r.FILLET_REACH_PER_HALF, cuspRadius: r.cuspRadius, junctionArcCtrls: r.junctionArcCtrls, chainCuts: r.chainCuts, underWindows: r.underWindows }); }); writeFileSync(join(outDir, `gw_${name}.json`), JSON.stringify(GW)); }
      // K1482 s12: DUMPPS=1 writes the physics chains + particle positions and the renderer's chainSamples (world units)
      if (process.env.DUMPPS === "1") { const PS = await page.evaluate(() => { const ps = window.__knotPS(); const R = window.__knotRenderer(); return { chains: ps.chains, positions: Array.from(ps.positions), samples: R.chainSamples.map((s) => (s ? { count: s.count, positions: Array.from(s.positions.slice(0, 2 * s.count)) } : null)), tipFused: R.chainTipFused ?? null }; }); writeFileSync(join(outDir, `ps_${name}.json`), JSON.stringify(PS)); }
      writeFileSync(join(outDir, `sites_${name}.json`), JSON.stringify({ hash: h, query, simT: SIMT, ...S }, null, 1));
    }
    console.log(T(), `${name}: hash ${h}, lost ${await page.evaluate(() => window.__lost)}, pool ${await page.evaluate(() => JSON.stringify({ hits: window.__patchHits, tms: (globalThis.__knotGf?.stats?.tablesMs ?? []).slice(-4).map((v) => +v.toFixed(1)), wms: Array.isArray(globalThis.__knotGf?.stats?.workMs) ? globalThis.__knotGf.stats.workMs.slice(-4).map((v) => +v.toFixed(1)) : globalThis.__knotGf?.stats?.workMs, pool: globalThis.__knotGf?.stats?.pool, home: globalThis.__knotGf?.home, homeOn: globalThis.__knotGf?.tables?.homeOn }))}`);
    await page.close();
    return true;
  }
  console.log(T(), `${name}: no load reached ${HASH}`);
  return false;
}
try {
  if (process.env.GF !== "0") await shoot(true, process.env.NAME ?? "gf");
  if (process.env.TODAY === "1") await shoot(false, process.env.NAME ?? "today");
} finally { await browser.close(); }
console.log(T(), "done", HASH);
