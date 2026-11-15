// K1387 s1: does a LEAN update (rp=gf's renderer mode) leave every under-gap output the full solve writes, and does the
// drag release's site tester read fresh footprints (K1388)? Headed real-time Chrome off-screen, phone viewport, phw=0.
// Per scenario, in ONE synchronous call on the live page: a full update (lean off for that call), a lean update, a full
// update again. F/F2 is the control (must be 0); F/L is the check (base: the under-gap outputs vanish; K1387: 0).
// Compared bitwise: underWindows, chainCuts, the live slots' (under chain, under center, cut -/+, all -/+, uw ramp),
// diagData x, y, and the consumers' answers over every chain: underGapVisibility (arc step 0.1), underClipBand(c, arc,
// 0.4) (step 0.2), underCutCtrls(c, 0.3) and its shownOnly form. Scenarios: intro (default appearance, 3 times),
// rest, mid-drag, xp=threads play after choice taps (mid-move and settled), fi=fuse burn after moves.
// K1388: a spy on PluckOverlay.siteTester records, at every call the app makes during a real drag release, whether the
// last update was lean (leanStale), and how many site verdicts (every chain, ctrl step 0.5) and footprint entries the
// tester's footprints get wrong against a full update's.
// Consumer calls are counted per scenario (frames between the checks), to show each one runs there.
//   node .claude/probes/K1387/k1387_exact.mjs <base url> [label]
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , base, label = "run"] = process.argv;
const LINK = "b.FMKB4DIQ";
const profileDir = join(tmpdir(), `k1387-exact-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=520,900",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toTimeString().slice(0, 8), ...a);

const CHECK = () => {
  const r = window.__knotRenderer?.(); const ps = window.__knotPS?.();
  if (!r || !ps) return { err: "no renderer" };
  if (r.lean !== true) return { err: "lean not on" };
  const nC = r.chainSamples.length; const nx = ps.crossings.length;
  const call = (f) => { try { return f(); } catch (e) { return "ERR " + e.message; } };
  const cap = () => {
    // K1387 s2: the consumers first, as the app asks them (each flushes its own chain's lazy march), then every chain
    // flushed (leanFlushAll, absent on older builds) and the fields read. Maps compare order-independently by key.
    const vis = []; const band = []; const cuts = [];
    for (let c = 0; c < nC; c++) {
      const s = r.chainSamples[c]; if (!s) continue; const T = s.totalLength;
      for (let a = 0; a < T; a += 0.1) vis.push(r.underGapVisibility(c, a));
      for (let a = 0; a < T; a += 0.2) band.push(JSON.stringify(call(() => r.underClipBand(c, a, 0.4))));
      cuts.push(JSON.stringify(call(() => r.underCutCtrls(c, 0.3))), JSON.stringify(call(() => r.underCutCtrls(c, 0.3, true))));
    }
    r.leanFlushAll?.();
    const mapOf = (m) => [...m.entries()].filter(([, v]) => v.length).sort((a, b) => a[0] - b[0]).map(([k, v]) => [k, Array.from(v)]);
    const uw = mapOf(r.underWindows); const cc = mapOf(r.chainCuts);
    const slots = [];
    for (let s = 0; s < r.slotLive.length; s++) if (r.slotLive[s]) slots.push([s, r.slotUnderChain[s], r.slotUnderCenter[s], r.slotCutNeg[s], r.slotCutPos[s], r.slotAllNeg[s], r.slotAllPos[s], r.slotUwRamp[s]]);
    const dd = Array.from({ length: nx * 2 }, (_, i) => r.diagData[Math.floor(i / 2) * 5 + (i % 2)]);
    return { uw: JSON.stringify(uw), uwN: uw.reduce((n, e) => n + e[1].length / 3, 0), cc: JSON.stringify(cc), slots, dd, vis, band, cuts };
  };
  const diff = (a, b) => {
    const out = {}; let first = null;
    const eqArr = (k, x, y) => { let n = Math.abs(x.length - y.length); const m = Math.min(x.length, y.length);
      for (let i = 0; i < m; i++) { const u = x[i], v = y[i]; const same = Array.isArray(u) ? JSON.stringify(u) === JSON.stringify(v) : Object.is(u, v);
        if (!same) { n++; first ??= `${k}[${i}]: ${JSON.stringify(u)} vs ${JSON.stringify(v)}`; } } out[k] = n; };
    out.uw = a.uw === b.uw ? 0 : 1; if (out.uw) first ??= `uw: ${a.uw.slice(0, 120)} vs ${b.uw.slice(0, 120)}`;
    out.cc = a.cc === b.cc ? 0 : 1; if (out.cc) first ??= "chainCuts";
    eqArr("slots", a.slots, b.slots); eqArr("dd", a.dd, b.dd); eqArr("vis", a.vis, b.vis); eqArr("band", a.band, b.band); eqArr("cuts", a.cuts, b.cuts);
    out.n = Object.values(out).reduce((s, v) => s + v, 0); out.first = first; return out;
  };
  const full = () => { r.lean = false; r.update(); r.lean = true; };
  // The check's own consumer calls and marches stay out of the between-check counts (TAKE).
  const n0 = r.__k1387n ? { ...r.__k1387n } : null; const st = () => (r.leanMarchStats ? { ...r.leanMarchStats } : null);
  const s0 = st();
  full(); const F = cap();
  const s1 = st(); r.update(); const leanNow = r.leanNow; const stale = r.leanStale; const s2 = st(); const L = cap(); const s3 = st();
  full(); const F2 = cap();
  if (n0) Object.assign(r.__k1387n, n0);
  const s4 = st(); if (s4 && r.__k1387s) { r.__k1387s.queued += s4.queued - s0.queued; r.__k1387s.marched += s4.marched - s0.marched; }
  const march = s1 && { queued: s2.queued - s1.queued, inUpdate: s2.marched - s1.marched, byReaders: s3.marched - s2.marched, pendingAfter: s3.pending };
  const hidden = F.vis.filter((v) => v < 0.5).length; const bands = F.band.filter((v) => v !== "null").length;
  return { chains: nC, crossings: nx, windows: F.uwN, liveSlots: F.slots.length, visHidden: hidden, bands, leanNow, staleAfterLean: stale,
    ctrl: diff(F, F2), FL: diff(F, L), leanWindows: L.uwN, march };
};

// Count the consumers' calls between checks (instance patches; the app calls them through the instance).
const COUNT = () => {
  const r = window.__knotRenderer?.(); if (!r || r.__k1387n) return !!r;
  r.__k1387n = { vis: 0, band: 0, cuts: 0 };
  for (const [k, name] of [["vis", "underGapVisibility"], ["band", "underClipBand"], ["cuts", "underCutCtrls"]]) {
    const orig = r[name]; r[name] = function (...a) { r.__k1387n[k]++; return orig.apply(this, a); };
  }
  // K1387 s2: the lazy march's counters (slots queued by lean updates, slots the app's readers marched).
  r.__k1387s = r.leanMarchStats ? { ...r.leanMarchStats } : null;
  return true;
};
const TAKE = () => {
  const r = window.__knotRenderer(); const n = { ...r.__k1387n }; for (const k in r.__k1387n) r.__k1387n[k] = 0;
  const st = r.leanMarchStats;
  if (st && r.__k1387s) { n.queued = st.queued - r.__k1387s.queued; n.marched = st.marched - r.__k1387s.marched; r.__k1387s = { ...st }; }
  return n;
};

// K1388: the spy on the overlay's siteTester (what both the base's direct call and the branch's pluckSiteTester reach).
const SPY = () => {
  const r = window.__knotRenderer(); const h = r.pluckHost; const pl = h.plucks; const ps = window.__knotPS();
  const fp = () => [h.eraseExtentNeg, h.eraseExtentPos, h.overHalfNeg, h.overHalfPos].map((a) => Array.from(a));
  window.__k1387spy = [];
  const orig = pl.siteTester;
  pl.siteTester = function (...args) {
    const rec = { leanStale: r.leanStale, viaFacade: new Error().stack.includes("pluckSiteTester") };
    const verdicts = (t) => { const v = []; ps.chains.forEach((ch, c) => { for (let k = 0; k < ch.length; k += 0.5) v.push(t(c, k)); }); return v; };
    const fp0 = fp(); const t0 = orig.apply(this, args); const v0 = verdicts(t0);
    // A full update (what leanFresh runs), then the same questions.
    const was = r.lean; r.lean = false; r.update(); r.lean = was;
    const fp1 = fp(); const v1 = verdicts(orig.apply(this, args));
    rec.sites = v0.length; rec.verdictsWrong = v0.reduce((n, x, i) => n + (x !== v1[i] ? 1 : 0), 0);
    rec.footprintsWrong = fp0.reduce((n, arr, k) => n + arr.reduce((m, x, i) => m + (Object.is(x, fp1[k][i]) ? 0 : 1), 0), 0);
    rec.calls = [];
    window.__k1387spy.push(rec);
    return (c, k) => { const v = t0(c, k); rec.calls.push([c, k, v]); return v; };
  };
  return typeof r.pluckSiteTester;
};

const load = async (page, url, settle = true) => {
  await page.setViewport({ width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { if (await page.evaluate(COUNT)) break; await sleep(20); }
  if (!settle) return;
  while (Date.now() - t0 < 45000) { const p = await page.evaluate(() => window.__knotPerf?.(1)); if (p && p.asleep && p.state !== "loading" && p.totalFrames > 30) break; await sleep(200); }
  await sleep(500);
};
const report = (name, x, n) => {
  const s = (d) => `${d.n}${d.first ? ` (${d.first.slice(0, 140)})` : ""}`;
  say(`${name}: chains ${x.chains} crossings ${x.crossings} windows ${x.windows} (lean ${x.leanWindows}) live ${x.liveSlots} hiddenVis ${x.visHidden} bands ${x.bands} leanRan ${x.staleAfterLean} | ctrl F/F2 ${s(x.ctrl)} | F/L ${s(x.FL)} | slots ${x.FL.slots} vis ${x.FL.vis} band ${x.FL.band} cuts ${x.FL.cuts} dd ${x.FL.dd}${x.march ? ` | march ${JSON.stringify(x.march)}` : ""}${n ? ` | calls ${JSON.stringify(n)}` : ""}`);
  if (x.err) say(name, "ERR", x.err);
  return x;
};
const move = async (page, k) => {
  for (let i = 0; i < k; i++) {
    const f = await page.evaluate(() => { const f = window.__knotFabric?.(); return f && { ch: f.choices.map((c) => c.screen), animating: f.animating }; });
    if (!f || !f.ch.length) return i;
    const p = f.ch.find((q) => q.x > 20 && q.x < 391 && q.y > 60 && q.y < 700) ?? f.ch[0];
    await page.touchscreen.tap(p.x, p.y);
    await sleep(900);
  }
  return k;
};

const out = {};
try {
  const page = await browser.newPage();
  const build = async () => page.evaluate(() => document.title + " " + (document.querySelector("[data-build]")?.textContent ?? ""));
  // 1. The intro (default appearance): checks at three times while it reveals.
  await load(page, `${base}/?${LINK}&snd=none&rp=gf&phw=0`, false);
  // Poll the intro's progress (state, live slots, under windows, the reveal) and check it every ~1.5 s once any
  // reveal clock passes 0.3 s (base never marks a slot live under lean), until the reveal is done, or 40 s.
  const STATUS = () => {
    const p = window.__knotPerf?.(1); const r = window.__knotRenderer?.(); const rv = window.__knotReveal?.();
    let live = 0; if (r) for (let s = 0; s < r.slotLive.length; s++) live += r.slotLive[s] ? 1 : 0;
    let uw = 0; if (r) for (const v of r.underWindows.values()) uw += v.length / 3;
    return { state: p?.state, live, total: r?.slotLive.length ?? 0, uw, clock: rv?.clock ?? 0, done: !!rv?.done, reveal: rv ? JSON.stringify(rv).slice(0, 90) : String(rv) };
  };
  const tw = Date.now();
  while (Date.now() - tw < 90000) { const p = await page.evaluate(() => window.__knotPerf?.(1)); if (p && p.state !== "loading") break; await sleep(100); }
  say(`intro: loading took ${Date.now() - tw} ms`);
  const tl = Date.now(); let lastCheck = 0; let lastLine = ""; let checks = 0;
  while (Date.now() - tl < 40000) {
    const st = await page.evaluate(STATUS);
    const line = `state ${st.state} live ${st.live}/${st.total} uw ${st.uw}`;
    if (line !== lastLine) { say(`intro +${Date.now() - tl}ms: ${line} reveal ${st.reveal}`); lastLine = line; }
    if (st.clock > 0.3 && Date.now() - lastCheck > 1500) {
      const n = await page.evaluate(TAKE);
      out[`intro${checks}`] = report(`intro check ${checks} +${Date.now() - tl}ms`, await page.evaluate(CHECK), n);
      lastCheck = Date.now(); checks++;
      if (st.done && checks > 4) break;
    }
    await sleep(250);
  }
  // 2. Rest, then 3. mid-drag (live, between moves) and the release's site tester.
  await load(page, `${base}/?${LINK}&am=instant&snd=none&rp=gf&phw=0`);
  await page.evaluate(TAKE);
  out.rest = report("rest", await page.evaluate(CHECK));
  say("spy:", await page.evaluate(SPY));
  const [x0, y0, x1, y1] = [150, 330, 265, 455];
  await page.touchscreen.touchStart(x0, y0);
  let grabbed = -1;
  for (let i = 1; i <= 24; i++) {
    const u = i / 60; await page.touchscreen.touchMove(x0 + (x1 - x0) * u, y0 + (y1 - y0) * Math.sin(u * Math.PI)); await sleep(50);
    if (i === 3) grabbed = await page.evaluate(() => window.__knotPS().grabbedParticle);
    if (i === 16) out.drag = report("mid-drag (live)", await page.evaluate(CHECK), await page.evaluate(TAKE));
  }
  await page.touchscreen.touchEnd();
  await sleep(300);
  const spy = await page.evaluate(() => window.__k1387spy);
  say(`release: grabbed ${grabbed}, site tester calls ${spy.length}`);
  for (const s of spy) say(`  leanStale ${s.leanStale} viaFacade ${s.viaFacade} sites ${s.sites} verdictsWrong ${s.verdictsWrong} footprintsWrong ${s.footprintsWrong} app asked ${JSON.stringify(s.calls)}`);
  out.spy = spy;
  // 4. The thread reveal in play: after taps, mid-move and settled.
  await load(page, `${base}/?${LINK}&am=instant&snd=none&rp=gf&phw=0&xp=threads`);
  await page.evaluate(TAKE);
  out.xpRest = report("xp=threads rest", await page.evaluate(CHECK));
  const moved = await move(page, 3);
  const f = await page.evaluate(() => window.__knotFabric().choices.map((c) => c.screen));
  const p = f.find((q) => q.x > 20 && q.x < 391 && q.y > 60 && q.y < 700) ?? f[0];
  await page.touchscreen.tap(p.x, p.y); await sleep(120);
  out.xpMid = report(`xp=threads mid-move (after ${moved + 1} taps)`, await page.evaluate(CHECK), await page.evaluate(TAKE));
  await sleep(2000);
  out.xpSettled = report("xp=threads settled", await page.evaluate(CHECK), await page.evaluate(TAKE));
  // 5. The burn race (fi=fuse) after moves.
  await load(page, `${base}/?${LINK}&am=instant&snd=none&rp=gf&phw=0&fi=fuse`);
  await page.evaluate(TAKE);
  const mv = await move(page, 4);
  await sleep(1500);
  out.burn = report(`fi=fuse after ${mv} moves`, await page.evaluate(CHECK), await page.evaluate(TAKE));
  await sleep(2500);
  out.burn2 = report("fi=fuse +2.5 s", await page.evaluate(CHECK), await page.evaluate(TAKE));
  say("build:", await build());
} finally {
  await browser.close();
}
let bad = 0;
for (const [k, x] of Object.entries(out)) if (k !== "spy" && (x.err || x.ctrl?.n)) { bad++; say("control or error in", k); }
say(`done; ${bad} bad controls`);
