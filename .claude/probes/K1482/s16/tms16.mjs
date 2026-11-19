// K1482 s16: the gf tables build time (stats.tablesMs, one entry per table build, worker or in-thread) on one link,
// two preview builds, paired: ROUNDS rounds, each loads both builds (order alternating) in ONE headed Chrome, waits for
// gf's first composite, lets the sim run SETTLE s, then forces REB rebuilds (__knotGf.rebuild) and keeps the median
// of their tablesMs. Untimed warm load of each build first. Prints and writes per round (a, b, b/a) and the medians.
// Not under the perf lock: label the numbers "under load".
//   node tms16.mjs <out.json> <profileDir> <urlA> <urlB> [ROUNDS=7] [REB=5] [SETTLE=8]
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , outFile, profileDir, urlA, urlB, R = "7", RB = "5", ST = "8"] = process.argv;
const ROUNDS = +R, REB = +RB, SETTLE = +ST;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const med = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
async function one(url, timed) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "load", timeout: 900000 });
  await page.bringToFront();
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
  let res = null;
  if (timed) {
    await sleep(SETTLE * 1000);
    const first = await page.evaluate(() => globalThis.__knotGf.stats.tablesMs[0]);
    const v = [];
    for (let k = 0; k < REB; k++) {
      const n = await page.evaluate(() => { const n = globalThis.__knotGf.stats.tablesMs.length; globalThis.__knotGf.rebuild(); return n; });
      await page.waitForFunction((n0) => globalThis.__knotGf.stats.tablesMs.length > n0, { timeout: 120000, polling: 50 }, n);
      v.push(await page.evaluate(() => { const t = globalThis.__knotGf.stats.tablesMs; return t[t.length - 1]; }));
      await sleep(300);
    }
    res = { first, reb: v, med: med(v) };
  }
  await page.close();
  return res;
}
await one(urlA, false); await one(urlB, false);
const rows = [];
for (let i = 0; i < ROUNDS; i++) {
  let a, b;
  if (i % 2 === 0) { a = await one(urlA, true); b = await one(urlB, true); } else { b = await one(urlB, true); a = await one(urlA, true); }
  rows.push({ a, b, ratio: b.med / a.med });
  console.log(`round ${i + 1}: A ${a.med.toFixed(2)} ms [${a.reb.map((x) => x.toFixed(1)).join(" ")}] first ${a.first?.toFixed(1)} | B ${b.med.toFixed(2)} ms [${b.reb.map((x) => x.toFixed(1)).join(" ")}] first ${b.first?.toFixed(1)} | B/A ${(b.med / a.med).toFixed(3)}`);
}
const sum = { urlA, urlB, rounds: rows, medA: med(rows.map((r) => r.a.med)), medB: med(rows.map((r) => r.b.med)), medRatio: med(rows.map((r) => r.ratio)), note: "under load (no perf lock)" };
console.log(`median A ${sum.medA.toFixed(2)} ms, B ${sum.medB.toFixed(2)} ms, paired median B/A ${sum.medRatio.toFixed(3)} (under load)`);
writeFileSync(outFile, JSON.stringify(sum, null, 1));
await browser.close();
