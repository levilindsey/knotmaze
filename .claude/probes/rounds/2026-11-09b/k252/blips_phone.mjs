// K252 on the phone (K156 round 2026-11-09b): the head indicator's off-screen blips in follow play at 411x753,
// the real phone, the pass's own tab and HEAD host. A port of K198 stage 2's blips.mjs "play" (which ran in a
// desktop Chrome emulating the phone) onto the phone-pass kit: real touch taps (page.touchscreen.tap), no new
// pages, no keys. Every rAF logs the head indicator's status ("pending" = off screen, waiting out the 0.45 s
// show delay; "shown"), so an episode's length is measured to the frame.
// Run: node blips_phone.mjs <config.json> <seeds comma> <moves> <brisk|patient> [tag]
import { writeFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const KIT = pathToFileURL(process.env.KIT || "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-ab935dd12e804fe68/scripts/phone_pass/");
const { BUILDS, connect, myPage, load, sleep, out, assertFree, checkBuild, thermal } = await import(new URL("lib.mjs", KIT).href);

const seeds = (process.argv[3] || "7").split(",").filter(Boolean);
const MOVES = Number(process.argv[4] || 40);
const style = process.argv[5] || "brisk";
const tag = process.argv[6] || "k252";
const head = BUILDS[1];
const rnd = (v, n = 1) => (v == null ? v : Math.round(v * 10 ** n) / 10 ** n);
const log = (...a) => { const s = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "); console.log(s); appendFileSync(out(tag, "log.txt"), s + "\n"); };

const chrome = (page) => page.evaluate(() => {
  const menu = document.querySelector(".kp-menu");
  const r = menu ? menu.getBoundingClientRect() : null;
  return { vw: innerWidth, vh: innerHeight, menu: r && r.width > 0 ? { x: r.x, y: r.y, r: r.right, b: r.bottom } : null, panelOpen: menu?.getAttribute("aria-expanded") === "true" };
});
async function setPanelClosed(page) {
  const c = await chrome(page);
  if (!c.panelOpen || !c.menu) return c;
  await page.touchscreen.tap((c.menu.x + c.menu.r) / 2, (c.menu.y + c.menu.b) / 2);
  await sleep(450);
  return chrome(page);
}
async function waitStill(page, maxMs) {
  let prev = await page.evaluate(() => window.__knotView());
  const t0 = Date.now();
  let still = 0;
  while (Date.now() - t0 < maxMs) {
    await sleep(100);
    const v = await page.evaluate(() => window.__knotView());
    if (Math.abs(v.x - prev.x) < 0.3 && Math.abs(v.y - prev.y) < 0.3 && Math.abs(v.s - prev.s) < 1e-3 * v.s) { if (++still >= 3) return v; } else still = 0;
    prev = v;
  }
  return prev;
}
const startLog = (page) => page.evaluate(() => {
  window.__hb = { log: [], last: null, t0: performance.now(), on: true, frames: 0, dts: [], lastT: performance.now() };
  const tick = (t) => {
    if (!window.__hb.on) return;
    window.__hb.frames++;
    window.__hb.dts.push(t - window.__hb.lastT); window.__hb.lastT = t;
    const k = window.__knotIndicators();
    const e = k.indicators.find((i) => i.id === "head");
    const st = e?.status ?? "?";
    if (st !== window.__hb.last) { window.__hb.log.push({ t: Math.round((performance.now() - window.__hb.t0) * 10) / 10, st }); window.__hb.last = st; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const stopLog = (page) => page.evaluate(() => {
  window.__hb.on = false;
  const d = window.__hb.dts.slice(1).sort((a, b) => a - b);
  return { log: window.__hb.log, frames: window.__hb.frames, ms: performance.now() - window.__hb.t0, p50: d[Math.floor(0.5 * (d.length - 1))], p95: d[Math.floor(0.95 * (d.length - 1))], max: d[d.length - 1], over50: d.filter((x) => x > 50).length };
});
// Episodes: a run of "pending"/"shown" frames between on-screen ones (K198's definition, unchanged).
function episodes(lg, endMs) {
  const o = [];
  let cur = null;
  for (const l of lg) {
    const off = l.st === "pending" || l.st === "shown";
    if (off && !cur) cur = { start: l.t, shownAt: l.st === "shown" ? l.t : null };
    else if (off && cur && l.st === "shown" && cur.shownAt == null) cur.shownAt = l.t;
    else if (!off && cur) { cur.end = l.t; o.push(cur); cur = null; }
  }
  if (cur) { cur.end = endMs; cur.open = true; o.push(cur); }
  return o.map((e) => ({ at: rnd(e.start, 0), offMs: rnd(e.end - e.start, 0), shownMs: e.shownAt == null ? 0 : rnd(e.end - e.shownAt, 0), pendingMs: rnd((e.shownAt ?? e.end) - e.start, 0), open: !!e.open }));
}

const results = { head: head.sha, host: head.host, style, moves: MOVES, runs: [], errors: [] };
const save = () => writeFileSync(out(tag, `blips_${style}.json`), JSON.stringify(results, null, 1));
let browser;
try {
  browser = await connect();
  const page = await myPage(browser);
  page.removeAllListeners("pageerror");
  page.on("pageerror", (e) => results.errors.push("pageerror: " + String(e.message).slice(0, 160)));
  const reduce = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (reduce) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  results.reduceReportedByPhone = reduce;
  for (const seed of seeds) {
    assertFree();
    const th0 = thermal();
    const q = `?${seed}.J&am=instant&cam=follow&snd=none`;
    const ld = await load(page, `${head.host}/${q}`, 30000);
    checkBuild(head, ld.stamp);
    const ch = await setPanelClosed(page);
    await waitStill(page, 12000);
    await sleep(800);
    await startLog(page);
    const fabric = () => page.evaluate(() => { const f = window.__knotFabric?.(); return f ? { head: f.head, solved: f.solved, animating: f.animating, choices: f.choices } : null; });
    let taps = 0;
    const visited = new Map();
    for (let i = 0; i < MOVES; i++) {
      assertFree();
      let st = await fabric();
      if (!st || st.solved) break;
      if (style === "patient") await waitStill(page, 6000); else await sleep(120);
      st = await fabric();
      if (!st?.choices?.length) break;
      // Wander: the least-visited choice (long walks, not the shortest route), ties by cost.
      const scored = st.choices.map((c) => ({ c, n: visited.get(String(c.far)) ?? 0 }));
      scored.sort((a, b) => a.n - b.n || a.c.cost - b.c.cost);
      const best = scored[0].c;
      visited.set(String(best.far), (visited.get(String(best.far)) ?? 0) + 1);
      const sx = Math.max(2, Math.min(ch.vw - 2, best.screen.x));
      const sy = Math.max(2, Math.min(ch.vh - 2, best.screen.y));
      await page.touchscreen.tap(sx, sy);
      taps++;
      await sleep(60);
      for (let j = 0; j < 120; j++) { if (!(await page.evaluate(() => window.__knotFabric?.()?.animating))) break; await sleep(40); }
    }
    await sleep(2500);
    const s = await stopLog(page);
    const eps = episodes(s.log, s.ms);
    const solved = await page.evaluate(() => !!window.__knotFabric?.()?.solved);
    const run = { seed, link: q, stamp: ld.stamp.slice(0, 60), panelOpenAfter: ch.panelOpen, vp: [ch.vw, ch.vh], taps, solved, frames: s.frames, seconds: rnd(s.ms / 1000), fps: rnd(s.frames / (s.ms / 1000)), p50: rnd(s.p50), p95: rnd(s.p95), max: rnd(s.max), over50: s.over50, eps, thermal: [th0, thermal()], log: s.log };
    results.runs.push(run);
    log(`seed ${seed} ${style}:`, JSON.stringify({ taps, solved, fps: run.fps, p95: run.p95, max: run.max, over50: run.over50, n: eps.length, shown: eps.filter((e) => e.shownMs > 0).length, eps }));
    save();
  }
} catch (e) {
  results.errors.push("ABORT: " + e.message);
  log("ABORT", e.message);
} finally {
  save();
  try { if (browser) await browser.disconnect(); } catch {}
}
log("done", JSON.stringify({ runs: results.runs.length, errors: results.errors }));
