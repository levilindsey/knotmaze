// K1548 (27U) diagnostic: why does fade.mjs's coverage read keep 0 sides on link A, and what
// reference would keep them? Loads today fl=0 (reference + geometry), then today/gf/gfh at
// fl 0,0.5,1.2,0.14 on ONE frozen state, saves every shot plus geo.json and diag.json
// (per side: the under colour at the gap's outer end and at the walk's far end, in the
// reference frame, and their distances from the backdrop).
//   node .claude/probes/K1548/diagA.mjs <base> <outDir> <profileDir>
//     env Q=3.FGH1HtvQeDjm6e4BII SIMT=20 DSF=2
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
const [, , base, outDir, profileDir] = process.argv;
if (!base || !outDir || !profileDir) { console.error("usage: diagA.mjs <base> <outDir> <profileDir>"); process.exit(2); }
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2);
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--disable-gpu-watchdog", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const Q = process.env.Q ?? "3.FGH1HtvQeDjm6e4BII";
const linkOf = (mode, fl) => `${base}/?${Q}&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=${fl}` +
  (mode === "gf" ? "&rp=gf" : mode === "gfh" ? "&rp=gf&gfh=1" : "");
async function load(mode, fl) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`[${mode} ${fl}] pageerror ${e.message}`));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  await page.goto(linkOf(mode, fl), { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (mode !== "today") await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
  await alignFreezeParity(page, SIMT);
  const hash = await page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    const r = window.__knotRenderer();
    r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
  }, SIMT);
  await sleep(2500);
  if (mode !== "today") {
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 60000, polling: 100 }, c0);
    await sleep(600);
  }
  const png = await page.screenshot({ type: "png" });
  console.log(`[${mode} fl=${fl}] hash ${hash}`);
  return { page, png, hash };
}
async function geometry(page) {
  return page.evaluate((dsf) => {
    const r = window.__knotRenderer(), ps = window.__knotPS(), view = window.__knotView();
    const arcOf = (S, f) => {
      const cal = S.controlArcLengths, n = cal.length;
      if (S.closed) { const ff = ((f % n) + n) % n, i = Math.floor(ff), u = ff - i, j = (i + 1) % n; const a0 = cal[i], a1 = j === 0 ? S.totalLength : cal[j]; return a0 + (a1 - a0) * u; }
      const ff = Math.max(0, Math.min(n - 1, f)), i = Math.min(Math.floor(ff), n - 2), u = Math.max(0, Math.min(1, ff - i));
      return cal[i] + (cal[i + 1] - cal[i]) * u;
    };
    const at = (S, arc) => {
      const n = S.count, pos = S.positions;
      const a = S.closed ? ((arc % S.totalLength) + S.totalLength) % S.totalLength : Math.max(0, Math.min(S.totalLength, arc));
      const fi = S.closed ? (a / S.totalLength) * n : (a / S.totalLength) * (n - 1);
      const i = Math.floor(fi) % n, j = S.closed ? (i + 1) % n : Math.min(i + 1, n - 1), u = fi - Math.floor(fi);
      return { x: pos[i * 2] + (pos[j * 2] - pos[i * 2]) * u, y: pos[i * 2 + 1] + (pos[j * 2 + 1] - pos[i * 2 + 1]) * u };
    };
    const canvas = document.querySelector("canvas");
    const onCanvas = (x, y) => x > 8 && y > 8 && x < innerWidth - 8 && y < innerHeight - 8 && document.elementFromPoint(x, y) === canvas;
    const scr = (p) => ({ x: p.x * view.s + view.x, y: p.y * view.s + view.y });
    const passes = new Map(); const passArc = [];
    ps.crossings.forEach((c, ci) => {
      const o = arcOf(r.chainSamples[c.over.chain], r.renderCtrl(c.over)), u = arcOf(r.chainSamples[c.under.chain], r.renderCtrl(c.under));
      passArc[ci] = { o, u };
      for (const [ch, a] of [[c.over.chain, o], [c.under.chain, u]]) { if (!passes.has(ch)) passes.set(ch, []); passes.get(ch).push(a); }
    });
    const out = [];
    ps.crossings.forEach((c, ci) => {
      const So = r.chainSamples[c.over.chain], Su = r.chainSamples[c.under.chain];
      if (!So || !Su) return;
      const { o: oArc, u: uArc } = passArc[ci];
      const cs = scr(at(Su, uArc));
      if (!onCanvas(cs.x, cs.y)) return;
      let slot = null;
      try { const d = r.gaps.describeSlot(ci); slot = { margin: d.margin, fade: d.fade, hOver: d.hOver, win: [d.winNeg, d.winPos] }; } catch { /* none */ }
      const hOver = slot?.hOver ?? r.style.threadWidth / 2;
      for (const side of [1, -1]) {
        let lim = 3.0;
        for (const a of passes.get(c.under.chain)) {
          let d = (a - uArc) * side;
          if (Su.closed) d = ((d % Su.totalLength) + Su.totalLength) % Su.totalLength;
          if (d > 1e-3) lim = Math.min(lim, d / 2);
        }
        if (!Su.closed) lim = Math.min(lim, side > 0 ? Su.totalLength - uArc : uArc);
        const prof = []; let ok = true;
        for (let da = 0; da <= lim + 1e-9; da += 0.01) {
          const q = at(Su, uArc + side * da);
          let dO = 1e9;
          for (let a = oArc - 3.4; a <= oArc + 3.4; a += 0.02) { const w = at(So, a), d = Math.hypot(w.x - q.x, w.y - q.y); if (d < dO) dO = d; }
          const s = scr(q);
          if (!onCanvas(s.x, s.y)) { ok = false; break; }
          prof.push({ da: +da.toFixed(3), x: s.x * dsf, y: s.y * dsf, dO });
        }
        if (!ok || prof.length < 10) continue;
        out.push({ ci, side, sel: c.over.chain === c.under.chain, lim, hOver, slot, at: [Math.round(cs.x), Math.round(cs.y)], prof });
      }
    });
    return { view, crossings: ps.crossings.length, sides: out };
  }, DSF);
}
try {
  const R = await load("today", 0);
  const geo = await geometry(R.page);
  writeFileSync(join(outDir, "geo.json"), JSON.stringify(geo));
  writeFileSync(join(outDir, "shot_today_0.png"), R.png);
  console.log(`geo crossings ${geo.crossings} sides ${geo.sides.length} view s=${geo.view.s}`);
  const refHash = R.hash;
  await R.page.close();
  for (const fl of [0, 0.5, 1.2, 0.14]) {
    for (const mode of ["today", "gf", "gfh"]) {
      if (fl === 0 && mode === "today") continue;
      let P = null;
      for (let t = 0; t < 4 && !P; t++) { const c = await load(mode, fl); if (c.hash === refHash) P = c; else { console.log(` retry hash ${c.hash}`); await c.page.close(); } }
      if (!P) { console.log(`[${mode} fl=${fl}] NO same-state load`); continue; }
      writeFileSync(join(outDir, `shot_${mode}_${fl}.png`), P.png);
      await P.page.close();
    }
  }
} finally { await browser.close(); }
console.log("diagA done");
