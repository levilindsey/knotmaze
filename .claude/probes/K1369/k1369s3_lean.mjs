// K1369 s3: lean is the renderer's mode under rp=gf (ribbon_renderer.ts `lean`, set by gf_app's attach). Three pages,
// phone viewport, in-thread physics:
//  A. rp=gf, no __knotGfOpts: r.lean is on by default. At rest and frozen mid-drag, in ONE synchronous call: a full
//     update (lean off for that call), then diagData poisoned (NaN) and a lean update, twice, then full again. Compares
//     every renderer field gf's gather reads that update() writes (chainSamples, chainTipFused, freeTips, diagData x, y)
//     bitwise. F/F2 = the full-vs-full control; F/L and F2/L2 = the check. At rest it also checks freshness: after a lean
//     update (underWindows empty, footprints poisoned), pickThread refills underWindows exactly as a full update does,
//     and a pluck reads the full update's footprints (eraseExtent*, overHalf*) bitwise; while that pluck is live an
//     update runs the full solve (diagData's cut field written); once it is cleared, lean again.
//  B. rp=gf with __knotGfOpts = { lean: false }: r.lean stays off (the A/B knob).
//  C. no rp=gf: r.lean off (today's look).
// Exit 1 on any mismatch.
//   node .claude/probes/K1369/k1369s3_lean.mjs <base url> [link=b.FMKB4DIQ]
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";

const [, , base, linkArg] = process.argv;
const link = linkArg ?? "b.FMKB4DIQ";
const profileDir = join(tmpdir(), `k1369s3-lean-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=520,900",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHECK = () => {
  const r = window.__knotRenderer?.(); const ps = window.__knotPS?.();
  if (!r || !ps) return { err: "no renderer" };
  if (r.lean !== true) return { err: "lean not on under rp=gf" };
  const nx = ps.crossings.length;
  const cap = () => ({
    s: r.chainSamples.map((s) => s && { count: s.count, closed: s.closed, total: s.totalLength,
      pos: Array.from(s.positions.slice(0, s.count * 2)), arc: Array.from(s.controlArcLengths) }),
    tuck: JSON.stringify(r.chainTipFused), free: JSON.stringify(r.freeTips.map((t) => [t.chain, t.atEnd])),
    dd: Array.from({ length: nx * 2 }, (_, i) => r.diagData[Math.floor(i / 2) * 5 + (i % 2)]),
  });
  const full = () => { r.lean = false; r.update(); r.lean = true; };
  const diff = (a, b) => {
    let n = 0, first = null;
    const eq = (x, y, where) => { if (!Object.is(x, y)) { n++; first ??= `${where}: ${x} vs ${y}`; } };
    a.s.forEach((sa, c) => { const sb = b.s[c];
      eq(sa.count, sb.count, `c${c} count`); eq(sa.closed, sb.closed, `c${c} closed`); eq(sa.total, sb.total, `c${c} total`);
      sa.pos.forEach((v, i) => eq(v, sb.pos[i], `c${c} pos${i}`)); sa.arc.forEach((v, i) => eq(v, sb.arc[i], `c${c} arc${i}`)); });
    eq(a.tuck, b.tuck, "tuck"); eq(a.free, b.free, "freeTips");
    a.dd.forEach((v, i) => eq(v, b.dd[i], `diag${i}`));
    return { n, first };
  };
  full(); const F = cap();
  r.diagData.fill(NaN); r.update(); const L = cap(); const staleL = r.leanStale === true && r.leanNow === false;
  const uwL = r.underWindows.size;
  r.diagData.fill(NaN); r.update(); const L2 = cap();
  full(); const F2 = cap();
  const nan = (x) => x.dd.filter((v) => Number.isNaN(v)).length;
  return { crossings: nx, chains: r.chainSamples.length, ctrl: diff(F, F2), FL: diff(F, L), F2L2: diff(F2, L2),
    nanL: nan(L), nanL2: nan(L2), staleL, underWindowsAfterLean: uwL };
};
// Freshness at rest (one synchronous call).
const FRESH = () => {
  const r = window.__knotRenderer(); const ps = window.__knotPS(); const h = r.pluckHost;
  const nx = ps.crossings.length;
  const fp = () => [h.eraseExtentNeg, h.eraseExtentPos, h.overHalfNeg, h.overHalfPos].map((a) => Array.from(a));
  const poisonFp = () => { for (const a of [h.eraseExtentNeg, h.eraseExtentPos, h.overHalfNeg, h.overHalfPos]) a.fill(NaN); };
  const uw = () => JSON.stringify([...r.underWindows.entries()].sort((a, b) => a[0] - b[0]));
  const same = (a, b) => { let n = 0; a.forEach((arr, k) => arr.forEach((v, i) => { if (!Object.is(v, b[k][i])) n++; })); return n; };
  const poisonCut = () => { for (let i = 0; i < nx; i++) r.diagData[i * 5 + 2] = NaN; };
  const cutNaN = () => { let n = 0; for (let i = 0; i < nx; i++) if (Number.isNaN(r.diagData[i * 5 + 2])) n++; return n; };
  const full = () => { r.lean = false; r.update(); r.lean = true; };
  // The control: how many cut fields a full update leaves unwritten (gated crossings).
  full(); poisonCut(); full(); const ctrlNaN = cutNaN();
  const Ffp = fp(); const Fuw = uw();
  // pickThread after a lean update.
  r.update(); const uwLean = r.underWindows.size;
  r.pickThread(0, 0, 1e-6);
  const pick = { uwLean, refilled: uw() === Fuw, staleAfter: r.leanStale };
  // A pluck after a lean update, footprints poisoned.
  r.update(); poisonFp();
  const leanFpNaN = fp().flat().filter((v) => Number.isNaN(v)).length;
  let plucked = false, at = null;
  for (let c = 0; c < ps.chains.length && !plucked; c++) {
    const n = ps.chains[c].length;
    for (const f of [0.5, 0.3, 0.7]) { const k = Math.floor(n * f); if (window.__knotPluck(c, k)) { plucked = true; at = [c, k]; break; } }
  }
  const pl = { plucked, at, active: r.plucks.activeCount, leanFpNaN, fpDiff: same(fp(), Ffp), uwSame: uw() === Fuw };
  // While it is live: full solves.
  poisonCut(); r.update(); pl.liveNaN = cutNaN(); pl.liveStale = r.leanStale;
  // Cleared: lean again.
  r.plucks.clear(); poisonCut(); r.update(); pl.clearedNaN = cutNaN(); pl.clearedStale = r.leanStale;
  full();
  return { nx, ctrlNaN, pick, pluck: pl };
};
const load = async (page, url, opts) => {
  await page.setViewport({ width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  if (opts) await page.evaluateOnNewDocument((o) => { globalThis.__knotGfOpts = o; }, opts);
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { const p = await page.evaluate(() => window.__knotPerf?.(1)); if (p && p.asleep && p.state !== "loading" && p.totalFrames > 30) break; await sleep(200); }
  await sleep(500);
};
let bad = false;
try {
  const page = await browser.newPage();
  await load(page, `${base}/?${link}&am=instant&snd=none&rp=gf&phw=0`, null);
  const rest = await page.evaluate(CHECK);
  console.log("A rest:", JSON.stringify(rest));
  const fresh = await page.evaluate(FRESH);
  console.log("A fresh:", JSON.stringify(fresh));
  const [x0, y0, x1, y1] = [150, 330, 265, 455];
  await page.touchscreen.touchStart(x0, y0);
  for (let i = 1; i <= 24; i++) { const u = i / 60; await page.touchscreen.touchMove(x0 + (x1 - x0) * u, y0 + (y1 - y0) * Math.sin(u * Math.PI)); await sleep(50); }
  await page.evaluate(async () => { if (typeof window.__knotPhysFreeze === "function") await window.__knotPhysFreeze(true); else window.__knotPS().step = function () {}; });
  await sleep(200);
  const drag = await page.evaluate(CHECK);
  console.log("A drag:", JSON.stringify(drag));
  await page.touchscreen.touchEnd();
  for (const x of [rest, drag]) if (x.err || x.ctrl.n || x.FL.n || x.F2L2.n || x.nanL || x.nanL2 || !x.staleL || x.underWindowsAfterLean) bad = true;
  const p = fresh.pluck, k = fresh.pick;
  if (k.uwLean !== 0 || !k.refilled || k.staleAfter !== false) bad = true;
  if (!p.plucked || !(p.active > 0) || !(p.leanFpNaN > 0) || p.fpDiff || !p.uwSame || p.liveNaN !== fresh.ctrlNaN || p.liveStale
    || p.clearedNaN !== fresh.nx || !p.clearedStale) bad = true;
  await page.close();
  const pageB = await browser.newPage();
  await load(pageB, `${base}/?${link}&am=instant&snd=none&rp=gf&phw=0`, { lean: false });
  const b = await pageB.evaluate(() => ({ lean: window.__knotRenderer?.().lean }));
  console.log("B rp=gf, lean:false:", JSON.stringify(b));
  if (b.lean !== false) bad = true;
  await pageB.close();
  const pageC = await browser.newPage();
  await load(pageC, `${base}/?${link}&am=instant&snd=none&phw=0`, null);
  const c = await pageC.evaluate(() => ({ lean: window.__knotRenderer?.().lean, gf: !!window.__knotGf }));
  console.log("C today's look:", JSON.stringify(c));
  if (c.lean !== false) bad = true;
  console.log(bad ? "CHECK lean s3: MISMATCH" : "CHECK lean s3: exact (rest, mid-drag; pick and pluck fresh; live pluck full; knob and default off)");
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* in use */ }
}
process.exit(bad ? 1 : 0);
