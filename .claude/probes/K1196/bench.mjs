// K1196 (batch 20 Run F): time two-ended pulses on loops and cycles, at
// rest and in play, against the start head's one-ended pulses.
//
// Measures follow scripts/bench_frame.mjs (K8/K932) and S4's rest bench
// (`.claude/probes/K1139/out/s4cyc/bench_rest.json`): per frame, the time
// of the frame's first draw call, then a 1-px readPixels in a rAF
// callback registered after the app's ticker, so frameMs = first draw ->
// the read returned (CPU submission plus queued GPU work), submitMs =
// first draw -> the read call, finishMs = blocked in the read. The in-page
// BENCH below is that function copied; the only changes are the play
// variant's stop rule (named inline) and this header.
//
// States (stands copied verbatim from .claude/probes/K1139/stands_cyc.mjs,
// rule 11; baseline is that file's shared k111 link with no moves):
//   baseline  k111 start head (mentr_b), no moves: one-ended pulses only
//             (S4's rest-bench state; its recorded numbers are 7.15 ms
//             base / 7.10 ms S4 frameP50, ABBA x4, 5 s, desktop).
//   cyc       k111, moves 0,246,82,83,199,150,151,38,155,211, head
//             node_221: cycle arm e210 lit from both ends.
//   loop      seed 1 &pr=8, moves 185,186,187,122,50,118,117,165,60,9,
//             178,57,101, head node_635: self-loop e102 lit from both
//             its ends.
// The harness knows a two-ended arm is lit from the dumped declaration:
// __knotPulses() items (pulse_path.ts PulseItem, the shape lib.mjs's
// dumpPulses reports per arm) with two === true for the target edge,
// cross-checked against dumpPulses' head. It stops if a stand lights
// none (batch 8 rule 2).
//
// Rest: BENCH over 5 s of drawn frames, desktop 1600x900 @2 (bench_frame's
// size), renderer asleep, continuous loop mode (lib.mjs openPage) so an
// asleep page still draws. Play: the same collector while an in-page
// driver plays moves back to back (next move as soon as the fabric is
// not animating, so the move animation and the declaration's refresh are
// in the window), for a fixed count of 24 moves on every state:
//   baseline  e0 back and forth (mentr_b <-> node_12, the start head's
//             only run; 24 is even, so play ends at the start head)
//   cyc       [210, 39] repeated (node_221 -> node_218 -> node_221 ...:
//             around the e210/e39 cycle; both heads keep e210 two-ended)
//   loop      e102 repeated (the self-loop at node_635; the head stays)
// Move counts are the same (24) on every state; the windows therefore
// differ in length, because a move's animation scales with its run
// (measured while building this harness: e0 1.49 s, e102 1.05 s,
// e210 0.37 s, e39 0.12 s). Window seconds and the driver's per-move
// two-ended log are in every play record.
//
// Sequence: a same-build control pair (baseline twice) first, then 4
// ABBA rounds; even rounds run baseline, cyc, loop and odd rounds
// loop, cyc, baseline, so the baseline is interleaved in every round.
// Each load measures rest, then play, on the same page. All timing
// runs under the perf lock (run_locked.ps1 -Batch, batch_all.txt);
// never time without it.
//   node bench.mjs <outDir>
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(join(OUT, "dumps"), { recursive: true });
const SEC_REST = 5;
const MOVES_PLAY = 24;
const VIEW = { width: 1600, height: 900, deviceScaleFactor: 2 };

const STATES = {
  baseline: { query: "k111&am=instant&fw=0&snd=none&phw=0", moves: [], target: null, play: [0] },
  cyc: { query: linkOf(STANDS.cyc), moves: [...STANDS.cyc.moves], target: 210, play: [210, 39] },
  loop: { query: linkOf(STANDS.loop), moves: [...STANDS.loop.moves], target: 102, play: [102] },
};

// In-page CAPS and rest BENCH: copied from scripts/bench_frame.mjs
// (its CAPS and BENCH), unchanged except BENCH's name here.
const CAPS = () => {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2");
  if (!gl) return { webgl2: false };
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const prec = (stage, type) => { const p = gl.getShaderPrecisionFormat(stage, type); return p ? { rangeMin: p.rangeMin, rangeMax: p.rangeMax, precision: p.precision } : null; };
  const out = {
    webgl2: true,
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
    maxVaryingComponents: gl.getParameter(gl.MAX_VARYING_COMPONENTS),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    precision: {
      vertexHighp: prec(gl.VERTEX_SHADER, gl.HIGH_FLOAT), vertexMediump: prec(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT),
      fragmentHighp: prec(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT), fragmentMediump: prec(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT),
    },
    timerQuery: !!gl.getExtension("EXT_disjoint_timer_query_webgl2"),
    colorBufferFloat: !!gl.getExtension("EXT_color_buffer_float"),
    floatLinear: !!gl.getExtension("OES_texture_float_linear"),
    dpr: devicePixelRatio, viewport: `${innerWidth}x${innerHeight}`,
    ua: navigator.userAgent.slice(0, 140),
  };
  const lose = gl.getExtension("WEBGL_lose_context");
  if (lose) lose.loseContext();
  return out;
};

const BENCH = (SEC) => new Promise((resolve) => {
  const statsOf = (a) => {
    if (!a.length) return null;
    const b = [...a].sort((x, y) => x - y);
    const q = (f) => +b[Math.min(b.length - 1, Math.floor(f * b.length))].toFixed(3);
    return { n: b.length, mean: +(b.reduce((x, y) => x + y, 0) / b.length).toFixed(3), p50: q(0.5), p90: q(0.9), p95: q(0.95), max: +b[b.length - 1].toFixed(3) };
  };
  const canvas = document.querySelector("canvas");
  const gl = canvas.getContext("webgl2");
  const names = ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced", "drawRangeElements"];
  const orig = {};
  let tFirst = -1, draws = 0, drawsTotal = 0;
  for (const n of names) {
    if (typeof gl[n] !== "function") continue;
    orig[n] = gl[n];
    gl[n] = function (...a) { if (tFirst < 0) tFirst = performance.now(); draws++; return orig[n].apply(this, a); };
  }
  const r = window.__knotRenderer ? window.__knotRenderer() : null;
  let upd = null;
  if (r && typeof r.update === "function") {
    const proto = Object.getPrototypeOf(r), own = Object.prototype.hasOwnProperty.call(r, "update") ? r.update : null;
    upd = { ms: 0, n: 0, restore: () => { if (own) r.update = own; else delete r.update; } };
    const base = own || proto.update;
    r.update = function (...a) { const t = performance.now(); const v = base.apply(this, a); upd.ms += performance.now() - t; upd.n++; return v; };
  }
  const frame = [], submit = [], fin = [], iv = [], perFrameDraws = [];
  const px = new Uint8Array(4);
  let last = -1, lost = 0;
  const onLost = () => { lost++; };
  canvas.addEventListener("webglcontextlost", onLost);
  const t0 = performance.now();
  const cb = () => {
    const now = performance.now();
    if (last >= 0) iv.push(now - last);
    last = now;
    if (tFirst >= 0) {
      const t1 = performance.now();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t2 = performance.now();
      frame.push(t2 - tFirst); submit.push(t1 - tFirst); fin.push(t2 - t1); perFrameDraws.push(draws);
      drawsTotal += draws;
    }
    tFirst = -1; draws = 0;
    if (now - t0 < SEC * 1000) { requestAnimationFrame(cb); return; }
    for (const n of Object.keys(orig)) gl[n] = orig[n];
    if (upd) upd.restore();
    canvas.removeEventListener("webglcontextlost", onLost);
    const p = window.__knotPerf ? window.__knotPerf() : null;
    resolve({
      frameMs: statsOf(frame), submitMs: statsOf(submit), finishMs: statsOf(fin), intervalMs: statsOf(iv.slice(1)),
      framesDrawn: frame.length, rafFrames: iv.length + 1, drawsPerFrame: frame.length ? +(drawsTotal / frame.length).toFixed(1) : 0,
      updateMsPerCall: upd && upd.n ? +(upd.ms / upd.n).toFixed(3) : null, updateCalls: upd ? upd.n : null,
      perf: p ? { state: p.state, asleep: p.asleep } : null, contextLost: lost,
    });
  };
  let armed = false;
  const start = () => { tFirst = -1; draws = 0; requestAnimationFrame(cb); };
  const arm = (n) => { const f = gl[n]; gl[n] = function (...a) { if (!armed) { armed = true; queueMicrotask(start); } return f.apply(this, a); }; };
  for (const n of Object.keys(orig)) arm(n);
  setTimeout(() => { if (!armed) { armed = true; start(); } }, 1000);
});

// Play variant: BENCH's collector, but the window runs until N moves
// have been played back to back by the in-page driver (the only change
// from BENCH: its stop rule). The driver waits for the fabric to stop
// animating before each move, logs the head and the declared two-ended
// edges before and after each move, and the collector keeps 5 frames
// past the last move's end.
const PLAYBENCH = (cycle, target, N) => new Promise((resolve) => {
  const statsOf = (a) => {
    if (!a.length) return null;
    const b = [...a].sort((x, y) => x - y);
    const q = (f) => +b[Math.min(b.length - 1, Math.floor(f * b.length))].toFixed(3);
    return { n: b.length, mean: +(b.reduce((x, y) => x + y, 0) / b.length).toFixed(3), p50: q(0.5), p90: q(0.9), p95: q(0.95), max: +b[b.length - 1].toFixed(3) };
  };
  const canvas = document.querySelector("canvas");
  const gl = canvas.getContext("webgl2");
  const names = ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced", "drawRangeElements"];
  const orig = {};
  let tFirst = -1, draws = 0, drawsTotal = 0;
  for (const n of names) {
    if (typeof gl[n] !== "function") continue;
    orig[n] = gl[n];
    gl[n] = function (...a) { if (tFirst < 0) tFirst = performance.now(); draws++; return orig[n].apply(this, a); };
  }
  const r = window.__knotRenderer ? window.__knotRenderer() : null;
  let upd = null;
  if (r && typeof r.update === "function") {
    const proto = Object.getPrototypeOf(r), own = Object.prototype.hasOwnProperty.call(r, "update") ? r.update : null;
    upd = { ms: 0, n: 0, restore: () => { if (own) r.update = own; else delete r.update; } };
    const base = own || proto.update;
    r.update = function (...a) { const t = performance.now(); const v = base.apply(this, a); upd.ms += performance.now() - t; upd.n++; return v; };
  }
  const frame = [], submit = [], fin = [], iv = [];
  const px = new Uint8Array(4);
  let last = -1, lost = 0, done = false, tail = 0;
  const onLost = () => { lost++; };
  canvas.addEventListener("webglcontextlost", onLost);
  const t0 = performance.now();
  const log = [];
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  (async () => {
    const twos = () => window.__knotPulses().filter((p) => p.two).map((p) => p.edge);
    for (let i = 0; i < N; i++) {
      for (let w = 0; w < 600 && window.__knotFabric().animating; w++) await delay(20);
      const head0 = window.__knotFabric().head;
      const before = twos();
      const eid = cycle[i % cycle.length];
      const ok = window.__knotTurnMove(eid);
      let sawAnim = false;
      for (let w = 0; w < 600; w++) {
        await delay(20);
        const a = window.__knotFabric().animating;
        if (a) sawAnim = true;
        if (!a && (sawAnim || w > 10)) break;
      }
      log.push({ i, eid, head0, head1: window.__knotFabric().head, ok, sawAnim, twoBefore: before, twoAfter: twos(), atMs: +(performance.now() - t0).toFixed(1) });
    }
    done = true;
  })().catch((e) => { log.push({ error: String(e && e.message || e) }); done = true; });
  const cb = () => {
    const now = performance.now();
    if (last >= 0) iv.push(now - last);
    last = now;
    if (tFirst >= 0) {
      const t1 = performance.now();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t2 = performance.now();
      frame.push(t2 - tFirst); submit.push(t1 - tFirst); fin.push(t2 - t1);
      drawsTotal += draws;
    }
    tFirst = -1; draws = 0;
    if (done) { if (++tail >= 5) {
      for (const n of Object.keys(orig)) gl[n] = orig[n];
      if (upd) upd.restore();
      canvas.removeEventListener("webglcontextlost", onLost);
      const p = window.__knotPerf ? window.__knotPerf() : null;
      resolve({
        frameMs: statsOf(frame), submitMs: statsOf(submit), finishMs: statsOf(fin), intervalMs: statsOf(iv.slice(1)),
        framesDrawn: frame.length, rafFrames: iv.length + 1, drawsPerFrame: frame.length ? +(drawsTotal / frame.length).toFixed(1) : 0,
        updateMsPerCall: upd && upd.n ? +(upd.ms / upd.n).toFixed(3) : null, updateCalls: upd ? upd.n : null,
        perf: p ? { state: p.state, asleep: p.asleep } : null, contextLost: lost,
        windowSec: +((now - t0) / 1000).toFixed(3), playLog: log,
      });
      return;
    } }
    if (now - t0 > 180000) { // safety: never hang the batch
      for (const n of Object.keys(orig)) gl[n] = orig[n];
      if (upd) upd.restore();
      canvas.removeEventListener("webglcontextlost", onLost);
      resolve({ error: "play window over 180 s", playLog: log, contextLost: lost });
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

// K1196_ONLY=baseline,cyc runs one load per named state (smoke only;
// its numbers are never reported). Otherwise the ABBA sequence:
// control pair first, then 4 rounds, baseline interleaved, order
// flipped on odd rounds.
const SEQ = process.env.K1196_ONLY
  ? process.env.K1196_ONLY.split(",").map((state) => ({ round: 99, state: state.trim() }))
  : [
  { round: -1, state: "baseline" }, { round: -1, state: "baseline" },
  ...[0, 1, 2, 3].flatMap((round) =>
    round % 2 === 0
      ? [{ round, state: "baseline" }, { round, state: "cyc" }, { round, state: "loop" }]
      : [{ round, state: "loop" }, { round, state: "cyc" }, { round, state: "baseline" }]),
];

const records = [];
const browser = await openBrowser();
let caps = null;
try {
  for (let seq = 0; seq < SEQ.length; seq++) {
    const { round, state } = SEQ[seq];
    const st = STATES[state];
    const log = [];
    const page = await openPage(browser, st.query, log, VIEW);
    page.setDefaultTimeout(240000);
    try {
      if (!caps) caps = await page.evaluate(CAPS);
      await waitAsleep(page);
      await viewStill(page);
      for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`${state}: stand move e${eid} refused`);
      await sleep(300);
      const restMs = await waitRest(page);
      await sleep(500);
      const decl = await dumpPulses(page);
      const pulses = await page.evaluate(() => window.__knotPulses());
      const twos = pulses.filter((p) => p.two);
      writeFileSync(join(OUT, "dumps", `${seq}_${state}.json`), JSON.stringify({ seq, round, state, query: st.query, moves: st.moves, decl, pulses }, null, 1));
      const targetItem = st.target === null ? null : (twos.find((p) => p.edge === st.target) || null);
      console.log(`[${seq}] ${state} round ${round}: head ${decl.head}, pulses ${pulses.length}, two-ended ${twos.map((p) => "e" + p.edge).join(",") || "none"}, restWait ${restMs} ms`);
      if (st.target !== null && !targetItem) {
        throw new Error(`${state}: no two-ended e${st.target} in the dumped declaration (two=${JSON.stringify(twos.map((p) => p.edge))}); stopping per batch 8 rule 2`);
      }
      const rest = await page.evaluate(BENCH, SEC_REST);
      const play = await page.evaluate(PLAYBENCH, st.play, st.target, MOVES_PLAY);
      const after = await page.evaluate(() => ({ head: window.__knotFabric().head, twos: window.__knotPulses().filter((p) => p.two).map((p) => p.edge), ctxLost: window.__ctxLost }));
      const rec = {
        seq, round, state, query: st.query, moves: st.moves, target: st.target, playCycle: st.play,
        head: decl.head, targetItem, twoEdges: twos.map((p) => p.edge), stamp: await stampOf(page), restMs,
        rest, play, after, pageErrors: log.filter((l) => l.includes("pageerror")),
      };
      records.push(rec);
      appendFileSync(join(OUT, "rounds.jsonl"), JSON.stringify(rec) + "\n");
      console.log(`  rest frame p50 ${rest.frameMs?.p50} mean ${rest.frameMs?.mean} finish p50 ${rest.finishMs?.p50} (n ${rest.framesDrawn}); play p50 ${play.frameMs?.p50} mean ${play.frameMs?.mean} finish p50 ${play.finishMs?.p50} window ${play.windowSec} s moves ${play.playLog?.length} (n ${play.framesDrawn})`);
      if (rest.contextLost || play.contextLost) throw new Error(`${state}: webgl context lost (rest ${rest.contextLost}, play ${play.contextLost})`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
writeFileSync(join(OUT, "bench_all.json"), JSON.stringify({ when: new Date().toISOString(), host: "desktop 1600x900@2 angle=d3d11 (bench_frame size)", secRest: SEC_REST, movesPlay: MOVES_PLAY, caps, records }, null, 1));
console.log(`wrote ${join(OUT, "bench_all.json")} (${records.length} loads)`);


