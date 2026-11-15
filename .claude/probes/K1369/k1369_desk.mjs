// K1369 s1: where main's physics allowance goes, on the desktop. Headed, off-screen, real-GPU Chrome (diag_screenshot's
// launch); an init script wraps Worker.prototype.postMessage and logs every `frame` allowance main posts (time, dt) and
// every rAF, then the run waits for the first sleep and reports: the allowance posted against wall time from the first
// post to the sleep, the post intervals, the wall time with no post (gaps over 50 ms), the dts that fall short of their
// interval, the loop report (__knotLoop) and __knotPerf / __knotSettle.
//   node .claude/probes/K1369/k1369_desk.mjs <url> <label> [gfOptsJson] [maxS=45]
// Output: .claude/probes/K1369/out/desk_<label>.json (untracked) and one summary line.
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [, , url, label, gfOptsArg, maxSArg] = process.argv;
const maxS = Number(maxSArg ?? 45);
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
const profileDir = join(tmpdir(), `k1369-desk-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.evaluateOnNewDocument((gfOpts) => {
    if (gfOpts) window.__knotGfOpts = JSON.parse(gfOpts);
    const posts = [], raf = [], other = {};
    window.__k1369 = { posts, raf, other };
    const orig = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (msg, ...rest) {
      const ty = msg && typeof msg === "object" ? msg.type : typeof msg;
      if (ty === "frame") posts.push([performance.now(), msg.dt]);
      else other[ty] = (other[ty] ?? 0) + 1;
      return orig.call(this, msg, ...rest);
    };
    const loop = (now) => { raf.push(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }, gfOptsArg && gfOptsArg !== "-" ? gfOptsArg : null);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  await page.bringToFront();
  let perf = null, sleptAt = null;
  while ((Date.now() - t0) / 1000 < maxS) {
    await new Promise((r) => setTimeout(r, 250));
    perf = await page.evaluate(() => { const p = window.__knotPerf?.(); return p ? { asleep: p.asleep, state: p.state, now: performance.now() } : null; });
    if (perf && perf.asleep && perf.state !== "loading") { sleptAt = perf.now; break; }
  }
  const d = await page.evaluate(() => ({
    k: window.__k1369, loop: window.__knotLoop?.(), perf: window.__knotPerf?.(), settle: window.__knotSettle?.(),
    gf: window.__knotGf ? Object.fromEntries(Object.entries(window.__knotGf.stats ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])) : null,
  }));
  const posts = d.k.posts;
  const first = posts.length ? posts[0][0] : null;
  const end = sleptAt ?? (posts.length ? posts[posts.length - 1][0] : null);
  const live = posts.filter((p) => p[0] <= end);
  const iv = [], dts = [];
  let gapMs = 0, shortMs = 0, nGap = 0;
  for (let i = 1; i < live.length; i++) {
    const g = live[i][0] - live[i - 1][0];
    iv.push(g); dts.push(live[i][1] * 1000);
    if (g > 50) { gapMs += g; nGap++; }
    if (g - live[i][1] * 1000 > 1) shortMs += g - live[i][1] * 1000;
  }
  const sumDt = live.reduce((s, p) => s + p[1], 0);
  const raf = d.k.raf.filter((t) => first != null && t >= first && t <= end);
  const rafIv = raf.slice(1).map((t, i) => t - raf[i]);
  const sum = {
    label, url, gfOpts: gfOptsArg ?? null, firstPostS: first && first / 1000, sleptS: sleptAt && sleptAt / 1000,
    wallS: first != null && end != null ? (end - first) / 1000 : null, posts: live.length, sumDtS: sumDt,
    allowPerWall: first != null ? sumDt / ((end - first) / 1000) : null,
    postIv: { p50: q(iv, 0.5), p90: q(iv, 0.9), max: q(iv, 1) }, dt: { p50: q(dts, 0.5), p90: q(dts, 0.9), max: q(dts, 1) },
    gapsOver50: { n: nGap, ms: gapMs }, shortfallMs: shortMs,
    raf: { n: raf.length, p50: q(rafIv, 0.5), p90: q(rafIv, 0.9), max: q(rafIv, 1) },
    sim: d.perf?.sim ?? d.perf?.simTime, physMs: d.perf?.physMs, substeps: d.perf?.substeps, lagS: d.settle?.budget?.lagS ?? d.perf?.lagS,
    loop: d.loop && { mode: d.loop.mode, frames: d.loop.frames, emptyRuns: d.loop.emptyRuns, restarts: d.loop.restarts?.count ?? d.loop.restarts },
    other: d.k.other, gf: d.gf, errs,
  };
  writeFileSync(join(outDir, `desk_${label}.json`), JSON.stringify({ sum, posts: live, raf }, null, 1));
  console.log(`${label}: wall ${sum.wallS?.toFixed(2)} s, allow/wall ${sum.allowPerWall?.toFixed(3)}, posts ${sum.posts}, ` +
    `postIv p50/p90/max ${sum.postIv.p50?.toFixed(1)}/${sum.postIv.p90?.toFixed(1)}/${sum.postIv.max?.toFixed(0)}, dt p50/p90/max ` +
    `${sum.dt.p50?.toFixed(1)}/${sum.dt.p90?.toFixed(1)}/${sum.dt.max?.toFixed(0)}, gaps>50 ${nGap} = ${gapMs.toFixed(0)} ms, ` +
    `shortfall ${shortMs.toFixed(0)} ms, raf p50 ${sum.raf.p50?.toFixed(1)} n ${sum.raf.n}, physMs ${sum.physMs?.toFixed?.(0)} ` +
    `substeps ${sum.substeps} lag ${sum.lagS?.toFixed?.(2)}${errs.length ? " ERR " + errs[0] : ""}`);
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* profile in use */ }
}
