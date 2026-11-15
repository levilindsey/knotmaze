// K1387 s1: what a lean renderer.update() costs on the desktop, base against branch, ABBA over fresh pages of one
// headed off-screen Chrome (real GPU, occlusion flags). Each page: `?b.FMKB4DIQ&am=instant&snd=none&rp=gf&phw=0` (the
// in-thread host: every load sleeps in the same state), wait for sleep, then N rounds of one timed lean update and one
// timed full update (lean off for that call), alternated so drift hits both. Reports per page the median and mean ms of
// each, and per build the medians over its pages. Hold the perf lock while it runs.
//   node .claude/probes/K1387/k1387_cost.mjs <base origin A> <branch origin B> [rounds=4] [n=60]
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , hostA, hostB, roundsArg = "4", nArg = "60"] = process.argv;
const rounds = +roundsArg, N = +nArg;
const profileDir = join(tmpdir(), `k1387-cost-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=520,900",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toTimeString().slice(0, 8), ...a);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const res = { A: { lean: [], full: [] }, B: { lean: [], full: [] } };
const page = await browser.newPage();
await page.setViewport({ width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
try {
  for (let r = 0; r < rounds; r++) for (const k of r % 2 ? ["B", "A"] : ["A", "B"]) {
    const host = k === "A" ? hostA : hostB;
    await page.goto(`${host}/?b.FMKB4DIQ&am=instant&snd=none&rp=gf&phw=0`, { waitUntil: "load", timeout: 90000 });
    const t0 = Date.now();
    for (;;) {
      const st = await page.evaluate(() => { const p = window.__knotPerf?.(1); return p ? { state: p.state, asleep: p.asleep } : null; });
      if (st && st.state !== "loading" && st.asleep) break;
      if (Date.now() - t0 > 120000) throw new Error(`page ${k} never slept`);
      await sleep(500);
    }
    await sleep(1500);
    const got = await page.evaluate((n) => {
      const r = window.__knotRenderer(); if (r.lean !== true) return { err: "lean not on" };
      const lean = [], full = [];
      for (let i = 0; i < 5; i++) { r.update(); r.lean = false; r.update(); r.lean = true; } // warm both paths
      for (let i = 0; i < n; i++) {
        let t = performance.now(); r.update(); lean.push(performance.now() - t);
        r.lean = false; t = performance.now(); r.update(); full.push(performance.now() - t); r.lean = true;
      }
      return { lean, full, stamp: document.querySelector("#stamp, .stamp")?.textContent?.slice(0, 40) ?? null };
    }, N);
    if (got.err) throw new Error(got.err);
    res[k].lean.push(med(got.lean)); res[k].full.push(med(got.full));
    say(`round ${r} ${k} (${got.stamp}): lean median ${med(got.lean).toFixed(2)} mean ${mean(got.lean).toFixed(2)} | full median ${med(got.full).toFixed(2)} mean ${mean(got.full).toFixed(2)} ms`);
  }
  for (const k of ["A", "B"]) say(`${k === "A" ? "base  " : "branch"} pages' medians: lean ${res[k].lean.map((v) => v.toFixed(2)).join(" ")} -> ${med(res[k].lean).toFixed(2)} ms; full ${res[k].full.map((v) => v.toFixed(2)).join(" ")} -> ${med(res[k].full).toFixed(2)} ms`);
} finally {
  await browser.close();
}
