// K1495: K1492's shots.mjs plus RP=today (no rp=gf: today's renderer; fl set live AND, with URLFL=1, by reload).
// K1492: one frozen rest state of a link under rp=gf, the Crossing fade set LIVE (like a slider drag, no reload) to
// each value of FLS, shot in each thread look of LOOKS (1 border, 0 fill), plus the geometry the profiles need:
// per crossing side, the under centreline (device px), its normals, and the over centreline near the crossing.
// The K868 recipe of K1482's cap.mjs (load, freeze, __knotStepUntil(SIMT), clocks pinned); reloads until the
// physics hash is HASH (when given; else the first load's hash is the target and is printed).
//
//   node .claude/probes/K1492/shots.mjs <base> <outDir> <profileDir> [query=3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1]
//     env HASH=<target> SIMT=20 DSF=2 TRIES=6 FLS=0/0.14/0.5/1.2 LOOKS=1/0 WARM=1 (load once, no capture)
//         PATCH=<json [[find, replace], ...]> rewrites ANY shader source (probe-only term switches; see patch_*.json)
//         URLFL=1 (also one reload per fl with &fl=<v> after the token, border look; shots url_fl<v>.png)
//   writes <outDir>/b_fl<v>.png (border), f_fl<v>.png (fill), geo.json
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
const [, , base, outDir, profileDir, query = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1"] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), TRIES = +(process.env.TRIES ?? 6);
const FLS = (process.env.FLS ?? "0/0.14/0.5/1.2").split("/").map(Number);
const LOOKS = (process.env.LOOKS ?? "1/0").split("/").map(Number);
let HASH = process.env.HASH ?? "";
const GF = (process.env.RP ?? "gf") !== "today";
const PATCH = process.env.PATCH ? JSON.parse(readFileSync(process.env.PATCH, "utf8")) : [];
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const T0 = Date.now(); const T = () => ((Date.now() - T0) / 1000).toFixed(0) + "s";
async function load(q0) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`pageerror ${e.message.slice(0, 200)}`));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  if (PATCH.length) await page.evaluateOnNewDocument((PT) => { const ss = WebGL2RenderingContext.prototype.shaderSource; window.__patchHits = {}; WebGL2RenderingContext.prototype.shaderSource = function (sh, src) { for (const [a, b] of PT) { const n = src.split(a).length - 1; if (n) { window.__patchHits[a.slice(0, 40)] = (window.__patchHits[a.slice(0, 40)] ?? 0) + n; src = src.split(a).join(b); } } return ss.call(this, sh, src); }; }, PATCH);
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  await page.goto(`${base}/?${q0}&phw=0&snd=none&prp=off${GF ? "&rp=gf" : ""}`, { waitUntil: "load", timeout: 900000 });
  await page.bringToFront();
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (GF) await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 300 }, f0);
  return page;
}
async function redraw(page) {
  if (!GF) { const f0 = await page.evaluate(() => window.__knotLoop().frames); await page.waitForFunction((f) => window.__knotLoop().frames > f + 10, { timeout: 900000, polling: 200 }, f0); await sleep(700); return; }
  const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw?.(); return globalThis.__knotGf.stats.composites; });
  await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 900000, polling: 200 }, c0);
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
    const dev = (p) => [(p.x * view.s + view.x) * dsf, (p.y * view.s + view.y) * dsf];
    const W = innerWidth * dsf, H = innerHeight * dsf;
    const passes = new Map(), passArc = [];
    ps.crossings.forEach((c, ci) => {
      const o = arcOf(r.chainSamples[c.over.chain], r.renderCtrl(c.over)), u = arcOf(r.chainSamples[c.under.chain], r.renderCtrl(c.under));
      passArc[ci] = { o, u };
      for (const [ch, a] of [[c.over.chain, o], [c.under.chain, u]]) { if (!passes.has(ch)) passes.set(ch, []); passes.get(ch).push(a); }
    });
    const sides = [];
    ps.crossings.forEach((c, ci) => {
      const So = r.chainSamples[c.over.chain], Su = r.chainSamples[c.under.chain];
      if (!So || !Su) return;
      const { o: oArc, u: uArc } = passArc[ci];
      const cs = dev(at(Su, uArc));
      if (cs[0] < 60 || cs[1] < 60 || cs[0] > W - 60 || cs[1] > H - 60) return;
      const over = [];
      for (let a = oArc - 3.4; a <= oArc + 3.4; a += 0.01) over.push(dev(at(So, a)));
      for (const side of [1, -1]) {
        let lim = 3.0;
        for (const a of passes.get(c.under.chain)) {
          let d = (a - uArc) * side;
          if (Su.closed) d = ((d % Su.totalLength) + Su.totalLength) % Su.totalLength;
          if (d > 1e-3) lim = Math.min(lim, d / 2);
        }
        if (!Su.closed) lim = Math.min(lim, side > 0 ? Su.totalLength - uArc : uArc);
        const prof = [];
        for (let da = 0; da <= lim + 1e-9; da += 0.01) prof.push([+da.toFixed(3), ...dev(at(Su, uArc + side * da))]);
        sides.push({ ci, side, self: c.over.chain === c.under.chain, uc: c.under.chain, oc: c.over.chain, lim, at: cs, prof, over });
      }
    });
    return { view, dsf, pxPerWorld: view.s * dsf, h: r.style.threadWidth / 2, fade: r.fadeLength, crossings: ps.crossings.length, sides };
  }, DSF);
}
for (let k = 0; k < TRIES; k++) {
  const page = await load(query);
  if (process.env.WARM === "1") { console.log(T(), "warm ok"); await page.close(); break; }
  const h = await freeze(page);
  if (HASH && h !== HASH) { console.log(T(), `hash ${h} != ${HASH}, reload`); await page.close(); continue; }
  if (!HASH) HASH = h;
  await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
  await page.mouse.move(2, 2);
  await sleep(1200);
  for (const lk of LOOKS) {
    await page.evaluate((v) => { window.__knotRenderer().threadLook = v; }, lk);
    for (const v of FLS) {
      await page.evaluate((v) => { window.__knotRenderer().fadeLength = v; }, v);
      await sleep(600);
      await redraw(page);
      await page.screenshot({ path: join(outDir, `${lk === 1 ? "b" : lk === 0 ? "f" : "x"}_fl${v}.png`) });
    }
    console.log(T(), `look ${lk} done`);
  }
  await page.evaluate(() => { window.__knotRenderer().threadLook = 1; });
  const geo = await geometry(page);
  writeFileSync(join(outDir, "geo.json"), JSON.stringify({ hash: h, query, simT: SIMT, ...geo }));
  console.log(T(), `hash ${h}, crossings ${geo.crossings}, sides on screen ${geo.sides.length}, patch ${await page.evaluate(() => JSON.stringify(window.__patchHits ?? null))}, stamp ${await page.evaluate(() => document.title + " " + (window.__knotBuild?.() ?? ""))}`);
  await page.close();
  if (process.env.URLFL === "1") {
    const ULK = +(process.env.URLLOOK ?? 1);
    for (const v of FLS) {
      for (let kk = 0; kk < TRIES; kk++) {
        const p2 = await load(`${query}&fl=${v}`);
        const h2 = await freeze(p2);
        if (h2 !== HASH) { console.log(T(), `url fl ${v}: hash ${h2} != ${HASH}, reload`); await p2.close(); continue; }
        await p2.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
        await p2.mouse.move(2, 2);
        await p2.evaluate((v) => { window.__knotRenderer().threadLook = v; }, ULK);
        await sleep(1200); await redraw(p2);
        await p2.screenshot({ path: join(outDir, `url_${ULK === 1 ? "b" : "f"}_fl${v}.png`) });
        console.log(T(), `url fl ${v}: fadeLength ${await p2.evaluate(() => window.__knotRenderer().fadeLength)}`);
        await p2.close(); break;
      }
    }
  }
  break;
}
await browser.close();
console.log(T(), "done", HASH);
