// K1196 22E watch: the in-play frame tail at the phone pass's 7-moves
// stand, ABBA per pair. Stand (named per brief task 3): link
// `b.J&am=instant&fw=0&snd=none&phw=0` (the phone pass's fabric link
// `?b.J&am=instant&snd=none`, scripts/phone_pass/bench.mjs, with the
// K1196 bench's own fw=0&phw=0 added so the layout is deterministic);
// walk = 7 cheapest moves (walk.mjs makeMoves' pick: the lowest-cost
// choice), driven by __knotTurnMove as bench.mjs's play driver does.
// Collector: bench.mjs's PLAYBENCH copied, one named change - it keeps
// the per-frame frameMs array so the tail (p95, p99, max, frames over
// 2x the median) can be read from it. Sequence per load set: a
// same-build control pair (the pair's base twice) first, then ABBA x4
// over the pair's two builds. One run times ONE pair:
//   K1196_PAIR=baseSha,headSha node tail22e.mjs <outDir>
// under the perf lock (run_locked.ps1 -Batch); never time without it.
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, waitAsleep, viewStill, sleep } from "./lib.mjs";

// lib.mjs's openPage with the host as an argument (both builds of a
// pair are served at once, on two ports, so one run can ABBA them).
async function openPageAt(browser, host, query, log, vp) {
  const page = await browser.newPage();
  page.on("console", (m) => log.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
  await page.setViewport(vp);
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous";
    window.__ctxLost = 0;
    document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true);
  });
  await page.goto(`${host}/?${query}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer() && window.__knotFabric && window.__knotFabric(), { timeout: 60000 });
  return page;
}

const OUT = resolve(process.argv[2] || "out_tail");
mkdirSync(OUT, { recursive: true });
const QUERY = "b.J&am=instant&fw=0&snd=none&phw=0";
const VIEW = { width: 1600, height: 900, deviceScaleFactor: 2 };
const MOVES = 7;

const TAILBENCH = (N) => new Promise((resolve) => {
  const canvas = document.querySelector("canvas");
  const gl = canvas.getContext("webgl2");
  const names = ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced", "drawRangeElements"];
  const orig = {};
  let tFirst = -1, draws = 0;
  for (const n of names) {
    if (typeof gl[n] !== "function") continue;
    orig[n] = gl[n];
    gl[n] = function (...a) { if (tFirst < 0) tFirst = performance.now(); draws++; return orig[n].apply(this, a); };
  }
  const frame = [];
  const px = new Uint8Array(4);
  let last = -1, lost = 0, done = false, tail = 0;
  const onLost = () => { lost++; };
  canvas.addEventListener("webglcontextlost", onLost);
  const t0 = performance.now();
  const log = [];
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  (async () => {
    for (let i = 0; i < N; i++) {
      for (let w = 0; w < 600 && window.__knotFabric().animating; w++) await delay(20);
      const k = window.__knotFabric();
      if (!k.choices.length) { log.push({ i, stop: "no choices" }); break; }
      const best = k.choices.reduce((a, b) => (b.cost < a.cost ? b : a));
      const ok = window.__knotTurnMove(best.edge);
      let sawAnim = false;
      for (let w = 0; w < 600; w++) {
        await delay(20);
        const a = window.__knotFabric().animating;
        if (a) sawAnim = true;
        if (!a && (sawAnim || w > 10)) break;
      }
      log.push({ i, eid: best.edge, head1: window.__knotFabric().head, ok, sawAnim, atMs: +(performance.now() - t0).toFixed(1) });
    }
    done = true;
  })().catch((e) => { log.push({ error: String(e && e.message || e) }); done = true; });
  const cb = () => {
    const now = performance.now();
    if (tFirst >= 0) {
      const t1 = performance.now();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      frame.push(performance.now() - tFirst);
      void t1;
    }
    tFirst = -1; draws = 0;
    if (done) { if (++tail >= 5) {
      for (const n of Object.keys(orig)) gl[n] = orig[n];
      canvas.removeEventListener("webglcontextlost", onLost);
      resolve({ frames: frame.map((x) => +x.toFixed(3)), contextLost: lost, windowSec: +((now - t0) / 1000).toFixed(3), playLog: log });
      return;
    } }
    if (now - t0 > 180000) {
      for (const n of Object.keys(orig)) gl[n] = orig[n];
      canvas.removeEventListener("webglcontextlost", onLost);
      resolve({ error: "play window over 180 s", frames: frame.map((x) => +x.toFixed(3)), playLog: log, contextLost: lost });
      return;
    }
    requestAnimationFrame(cb);
  };
  let armed = false;
  const start = () => { tFirst = -1; draws = 0; requestAnimationFrame(cb); };
  const arm = (n) => { const f = gl[n]; gl[n] = function (...a) { if (!armed) { armed = true; queueMicrotask(start); } return f.apply(this, a); }; };
  for (const n of Object.keys(orig)) arm(n);
  setTimeout(() => { if (!armed) { armed = true; start(); } }, 1000);
});

const stats = (a) => {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  const q = (f) => +b[Math.min(b.length - 1, Math.floor(f * b.length))].toFixed(3);
  const med = q(0.5);
  return { n: b.length, mean: +(b.reduce((x, y) => x + y, 0) / b.length).toFixed(3), p50: med, p95: q(0.95), p99: q(0.99), max: +b[b.length - 1].toFixed(3), over2x: b.filter((x) => x > 2 * med).length };
};

async function waitRest(page, maxMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const ok = await page.evaluate(() => {
      if (typeof window.__knotPerf !== "function" || !window.__knotRenderer || !window.__knotRenderer()) return false;
      const p = window.__knotPerf();
      const rv = window.__knotReveal ? window.__knotReveal() : null;
      return (p.state === "frozen" || p.asleep) && (!rv || (rv.done && !rv.fxAlive)) && !p.plucks;
    }).catch(() => false);
    if (ok) return Date.now() - t0;
    await sleep(250);
  }
  return -1;
}
const stampOf = (page) => page.evaluate(() =>
  ([...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t.trim())) || "").trim().slice(0, 90));

// Builds are told apart by the HOST each load ran against (the batch
// file serves one build at a time and sets K1196_BUILD per segment);
// this script just runs its sequence against the current host.
const SEQ = [
  { round: -1, build: "pairbase" }, { round: -1, build: "pairbase" },
  ...[0, 1, 2, 3].flatMap((round) => round % 2 === 0
    ? [{ round, build: "pairbase" }, { round, build: "pairhead" }]
    : [{ round, build: "pairhead" }, { round, build: "pairbase" }]),
];
const records = [];
const browser = await openBrowser();
try {
  for (let seq = 0; seq < SEQ.length; seq++) {
    const { round, build } = SEQ[seq];
    const log = [];
    const page = await openPageAt(browser, build === "pairhead" ? process.env.K1196_HOST_HEAD : process.env.K1196_HOST_BASE, QUERY, log, VIEW);
    page.setDefaultTimeout(240000);
    try {
      await waitAsleep(page);
      await viewStill(page);
      await waitRest(page);
      await sleep(500);
      const play = await page.evaluate(TAILBENCH, MOVES);
      const s = stats(play.frames || []);
      records.push({ seq, round, build, host: build === "pairhead" ? process.env.K1196_HOST_HEAD : process.env.K1196_HOST_BASE, stamp: await stampOf(page), tail: s, windowSec: play.windowSec, playLog: play.playLog, contextLost: play.contextLost, error: play.error || null, pageErrors: log.filter((l) => l.includes("pageerror")) });
      appendFileSync(join(OUT, "rounds.jsonl"), JSON.stringify(records[records.length - 1]) + "\n");
      console.log(`[${seq}] ${build} round ${round}: n ${s?.n} p50 ${s?.p50} p95 ${s?.p95} p99 ${s?.p99} max ${s?.max} over2x ${s?.over2x} moves ${play.playLog?.length} window ${play.windowSec} s`);
      if (play.contextLost) throw new Error(`webgl context lost (${play.contextLost})`);
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
writeFileSync(join(OUT, "tail_all.json"), JSON.stringify({ when: new Date().toISOString(), query: QUERY, pair: process.env.K1196_PAIR || "", records }, null, 1));
console.log(`wrote ${join(OUT, "tail_all.json")} (${records.length} loads)`);
