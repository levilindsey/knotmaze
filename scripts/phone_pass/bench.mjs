// phone_pass frame bench (K156; K81's gate.mjs made generic): base vs head,
// interleaved (the order swaps every rep), on the pass's own tab only.
//  - fabric: per (rep, build) load the link, wait for the knot to sleep, then
//    sample at each move count of cfg.moves (default 0, 10, 21), walking the
//    cheapest route in the same page (the walk may stop early on a short
//    maze: the row's `made` says how far it got).
//  - knot: the knot-mode control (mf=0, no moves).
//  - load (K147): a fresh navigation that records rAF callbacks from the
//    document's first moment for cfg.loadSeconds (default 15): time to the
//    first frame with a canvas, frames over 50 ms, the longest frame, time to
//    first sleep. On a default link and on K147's slow case (gs=18).
// Each fabric/knot sample is K10's method (+1.5 s, a 4 s rAF window) plus a
// synchronous render timer (the phone has no GPU timer). One row per sample
// in <out>/bench.jsonl; summary.mjs makes the tables.
// Usage: node bench.mjs <config.json>      (env SCENARIOS=fabric,knot,load)
import { CFG, BUILDS, connect, myPage, load, rafWindow, sleep, logLine, thermal, assertFree, stampOf, stampSha, checkBuild, ensureViewport, EMU_READ } from "./lib.mjs";
import { makeMoves, waitView, renderLoop } from "./walk.mjs";

const SCEN = (process.env.SCENARIOS || "fabric,knot,load").split(",");
const Q = "am=instant&snd=none";
const FILE = "bench.jsonl";
const LOADS = [["default", "b.J&snd=none"], ["slow", "b.J&gs=18&snd=none"]]; // probe links name a design: a bare URL is today's daily

const browser = await connect();
const page = await myPage(browser);
await page.bringToFront();

async function sample(b, rep, cell, moves, extra = {}) {
  assertFree();
  let sleptAt = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    if (/asleep/.test(await stampOf(page))) { sleptAt = +((Date.now() - t0) / 1000).toFixed(1); break; }
    await sleep(500);
    assertFree();
  }
  await sleep(1500);
  const k10 = await rafWindow(page, 4000);
  const stamp = await stampOf(page);
  checkBuild(b, stamp);
  const render = await page.evaluate(renderLoop, 60).catch((e) => ({ err: String(e.message).slice(0, 60) }));
  const meta = await page.evaluate(() => {
    const k = window.__knotFabric && window.__knotFabric();
    const v = window.__knotView && window.__knotView();
    // vp: the page's viewport (CSS px) and dpr. The phone may sit in landscape (810x331 on 2026-10-14), and a floor taken in one orientation does not carry to the other.
    return { fab: k ? { n: k.pathEdges.length, head: k.head, solved: k.solved } : null, view: v ? { x: +v.x.toFixed(1), y: +v.y.toFixed(1), s: +v.s.toFixed(3) } : null, vp: [window.innerWidth, window.innerHeight, +window.devicePixelRatio.toFixed(3)], vis: document.visibilityState };
  });
  // emu (K193): what the page says about the viewport it measured in (EMU_READ: orientation, canvas backing size ...).
  const emu = await page.evaluate(EMU_READ).catch(() => null);
  const row = { cell, rep, build: b.key, moves, sha: stampSha(stamp), asleep: /asleep/.test(stamp), sleptAtS: sleptAt, ...extra, k10, render, ...meta, emu, thermal: thermal() };
  logLine(FILE, row);
  console.log(`rep${rep} ${b.key.padEnd(4)} ${cell.padEnd(6)} m${String(moves).padStart(2)} ${row.sha} ${row.asleep ? "asleep" : "AWAKE "} fps ${k10.fps} p50 ${k10.p50} p95 ${k10.p95} max ${k10.max} >25:${k10.over25} render ${render?.median ?? "-"} ms th ${row.thermal?.status}`);
}

// Page side, before the document's own scripts: every rAF callback's time.
const RECORDER = () => {
  const rec = (window.__rafRec = { t: [], firstCanvas: null, on: true });
  const step = (t) => {
    if (!rec.on) return;
    rec.t.push(t);
    if (rec.firstCanvas === null && document.querySelector("canvas")) rec.firstCanvas = t;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

async function loadSample(b, rep, name, query) {
  assertFree();
  await page.goto("about:blank"); // release the last build's page first
  await sleep(800);
  await ensureViewport(page); // K193: the portrait override is in place before the app's first byte
  const reg = await page.evaluateOnNewDocument(RECORDER);
  try {
    await page.goto(`${b.host}/?${query}`, { waitUntil: "load", timeout: 90000 });
    let firstSleepS = null, last = null;
    for (;;) {
      assertFree();
      last = await page.evaluate(() => {
        const t = [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((s) => /^P\d/.test(s.trim()));
        return { t: performance.now(), stamp: (t || "").trim() };
      });
      if (firstSleepS === null && /asleep/.test(last.stamp)) firstSleepS = +(last.t / 1000).toFixed(2);
      if (last.t >= CFG.loadSeconds * 1000) break;
      await sleep(500);
    }
    const rec = await page.evaluate(() => { window.__rafRec.on = false; return { t: window.__rafRec.t, firstCanvas: window.__rafRec.firstCanvas }; });
    const emu = await page.evaluate(EMU_READ).catch(() => null); // K193: the viewport this fresh load ran in
    checkBuild(b, last.stamp);
    const dts = rec.t.slice(1).map((v, i) => v - rec.t[i]);
    const s = [...dts].sort((x, y) => x - y);
    const r1 = (v) => (typeof v === "number" ? Number(v.toFixed(1)) : null);
    const row = {
      cell: "load", link: name, rep, build: b.key, sha: stampSha(last.stamp),
      frames: rec.t.length, fps: +(rec.t.length / CFG.loadSeconds).toFixed(1), over50: dts.filter((d) => d > 50).length,
      max: r1(s[s.length - 1]), p95: r1(s[Math.floor(0.95 * (s.length - 1))]),
      firstFrameMs: r1(rec.t[0]), ttff: r1(rec.firstCanvas), firstSleepS, asleepAtEnd: /asleep/.test(last.stamp), stampEnd: last.stamp.slice(0, 110), emu, thermal: thermal(),
    };
    logLine(FILE, row);
    console.log(`rep${rep} ${b.key.padEnd(4)} load ${name.padEnd(7)} ${row.sha} frames ${row.frames} >50:${row.over50} max ${row.max} ttff ${row.ttff} sleep ${firstSleepS ?? "-"} s`);
  } finally {
    await page.removeScriptToEvaluateOnNewDocument(reg.identifier).catch(() => {});
  }
}

try {
  for (let rep = 0; rep < CFG.reps; rep++) {
    const order = rep % 2 === 0 ? BUILDS : [...BUILDS].reverse();
    if (SCEN.includes("fabric")) {
      for (const b of order) {
        const { stamp, sleptAt } = await load(page, `${b.host}/?b.J&${Q}`, 40000);
        checkBuild(b, stamp);
        console.log(`-- rep${rep} ${b.key} fabric loaded: ${stamp.slice(0, 44)} slept ${sleptAt}`);
        let done = 0;
        const st = {};
        for (const m of CFG.moves) {
          let mv = null;
          if (m > done) {
            const want = m - done;
            mv = await makeMoves(page, want, st);
            done += mv.made;
            if (mv.made < want) console.log("   walk stopped:", JSON.stringify(mv));
          } else await waitView(page);
          await sample(b, rep, "fabric", m, { made: done, mv });
        }
      }
    }
    if (SCEN.includes("knot")) {
      for (const b of order) {
        const { stamp, sleptAt } = await load(page, `${b.host}/?b.J&${Q}&mf=0`, 40000);
        checkBuild(b, stamp);
        console.log(`-- rep${rep} ${b.key} knot loaded: ${stamp.slice(0, 44)} slept ${sleptAt}`);
        await sample(b, rep, "knot", 0);
      }
    }
    if (SCEN.includes("load")) {
      for (const [name, query] of LOADS) for (const b of order) await loadSample(b, rep, name, query);
    }
  }
} finally {
  await browser.disconnect();
}
