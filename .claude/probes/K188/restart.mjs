// K188 probe: a restart drops the confetti (Run F, K1184 batch 17).
//   node .claude/probes/K188/restart.mjs <base> before|after
// Headed Chrome, real time (never --virtual-time-budget). Copies
// K657's banner probe stand (K657/banner.mjs): link ?7&am=instant&snd=none
// verbatim, base URL and output name changed; panel opened (panelOpen
// "1" instead of "0", so the Reset path button is reachable), ports
// 5680-5689. Finishes seed 7 by walking the fewest route
// (__knotFabric().choiceMoves + __knotTurnMove, the K137 page-driver
// way), waits until __knotConfetti().stats.bursts is 1, records the
// alive counts, presses the panel's Reset path button (button whose
// textContent.trim() is "Reset path", as K336/banners/lib.mjs:103-105),
// waits two frames, records again. Then finishes the new solve and
// checks it throws again. A second page presses Reset path while the
// winning move is in flight (path 8, lib.mjs:95-113 timing) and
// records at two frames and at 5 s.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep, waitLive, waitIdle } from "../K120/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
mkdirSync(OUT, { recursive: true });

const base = process.argv[2] || "http://127.0.0.1:5680/";
const mode = process.argv[3] || "before";

const checks = [];
function check(ok, what, detail = "") {
  checks.push({ ok: !!ok, what, detail: String(detail) });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${detail ? " (" + detail + ")" : ""}`);
}

async function openGame(link) {
  const { page, logs, close } = await launch("K188", {});
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem("knotmaze.panelOpen", "1");
    } catch {}
  });
  await page.goto(base + link, { waitUntil: "load" });
  await page.waitForFunction(() => window.__knotFabric?.(), { timeout: 60000 });
  await waitLive(page);
  return { page, logs, close };
}

const confetti = (page) => page.evaluate(() => window.__knotConfetti());
const aliveTotal = (c) => (c ? c.rain + c.spray + c.cannon + c.streamers : -1);
const twoFrames = (page) =>
  page.evaluate(
    () =>
      new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r(true)))
      )
  );

async function pressResetPath(page) {
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (x) => x.textContent.trim() === "Reset path"
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
}

async function waitBursts(page, n, maxMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const c = await confetti(page).catch(() => null);
    if (c && c.stats.bursts >= n) return c;
    await sleep(100);
  }
  return confetti(page).catch(() => null);
}

// Walk the fewest route until solved (K657 finishGame's loop).
async function walkToSolved(page) {
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => {
      const f = window.__knotFabric();
      return { solved: f.solved, choiceMoves: f.choiceMoves };
    });
    if (st.solved) return true;
    const finite = st.choiceMoves.filter((c) => Number.isFinite(c.moves));
    if (finite.length === 0) return false;
    finite.sort((a, b) => a.moves - b.moves);
    const ok = await page.evaluate((e) => window.__knotTurnMove(e), finite[0].edge);
    if (!ok) return false;
    await waitIdle(page);
  }
  return false;
}

// Walk until one move remains (the next move wins); return its edge.
async function walkToLastMove(page) {
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => {
      const f = window.__knotFabric();
      return { solved: f.solved, animating: f.animating, choiceMoves: f.choiceMoves };
    });
    if (st.solved) return -1;
    const finite = st.choiceMoves.filter((c) => Number.isFinite(c.moves));
    if (finite.length === 0) return -1;
    finite.sort((a, b) => a.moves - b.moves);
    if (finite[0].moves === 0) return finite[0].edge;
    const ok = await page.evaluate((e) => window.__knotTurnMove(e), finite[0].edge);
    if (!ok) return -1;
    await waitIdle(page);
  }
  return -1;
}

async function mainScenario() {
  const { page, logs, close } = await openGame("?7&am=instant&snd=none");
  try {
    const solved1 = await walkToSolved(page);
    // The burst follows the winning move's animation, so poll for it.
    const afterWin = await waitBursts(page, 1);
    const pressed = await pressResetPath(page);
    await twoFrames(page);
    const afterRestart = await confetti(page);
    // Finishing the new solve must throw again.
    let afterSecondWin = null;
    let solved2 = false;
    if (pressed) {
      solved2 = await walkToSolved(page);
      if (solved2) afterSecondWin = await waitBursts(page, 2);
    }
    return { solved1, afterWin, pressed, afterRestart, solved2, afterSecondWin, logs };
  } finally {
    await close();
  }
}

async function path8Scenario() {
  const { page, logs, close } = await openGame("?7&am=instant&snd=none");
  try {
    const edge = await walkToLastMove(page);
    if (edge < 0) return { edge, failed: "no last move", logs };
    // Install the path-8 press: on the first frame where the winning
    // tap has landed (solved) click Reset path (lib.mjs:97-109).
    await page.evaluate(() => {
      window.__k188 = { clicked: false, burstsBefore: null };
      const tick = () => {
        let f = null;
        try { f = window.__knotFabric?.(); } catch {}
        if (f && f.solved && !window.__k188.clicked) {
          const btn = [...document.querySelectorAll("button")].find(
            (x) => x.textContent.trim() === "Reset path" || x.title === "Reset path"
          );
          let cb = null;
          try { cb = window.__knotConfetti().stats.bursts; } catch {}
          window.__k188.burstsBefore = cb;
          window.__k188.clicked = !!btn;
          if (btn) btn.click();
          return;
        }
        if (!window.__k188.clicked) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const moved = await page.evaluate((e) => window.__knotTurnMove(e), edge);
    // Wait for the in-page press, then two frames.
    let watch = null;
    for (let i = 0; i < 100; i++) {
      watch = await page.evaluate(() => window.__k188);
      if (watch && watch.clicked) break;
      await sleep(50);
    }
    await twoFrames(page);
    const after2f = await confetti(page).catch(() => null);
    await sleep(5000);
    const after5s = await confetti(page).catch(() => null);
    return { edge, moved, watch, after2f, after5s, logs };
  } finally {
    await close();
  }
}

const main = await mainScenario();
console.log("\n== main: finish seed 7, Reset path after the win (" + mode + ") ==");
console.log("solved1:", main.solved1, "bursts after win:", main.afterWin?.stats?.bursts);
console.log("afterWin:", JSON.stringify(main.afterWin));
console.log("pressed Reset path:", main.pressed);
console.log("afterRestart (2 frames):", JSON.stringify(main.afterRestart));
console.log("solved2:", main.solved2, "afterSecondWin:", JSON.stringify(main.afterSecondWin));

const p8 = await path8Scenario();
console.log("\n== path 8: Reset path during the winning move (" + mode + ") ==");
console.log("edge:", p8.edge, "moved:", p8.moved, "watch:", JSON.stringify(p8.watch));
console.log("after2f:", JSON.stringify(p8.after2f));
console.log("after5s:", JSON.stringify(p8.after5s));

console.log("\n== table (" + mode + ") ==");
console.log(`after win alive: rain=${main.afterWin?.rain} spray=${main.afterWin?.spray} cannon=${main.afterWin?.cannon} streamers=${main.afterWin?.streamers} total=${aliveTotal(main.afterWin)} active=${main.afterWin?.active} bursts=${main.afterWin?.stats?.bursts}`);
console.log(`after restart (2f) alive: rain=${main.afterRestart?.rain} spray=${main.afterRestart?.spray} cannon=${main.afterRestart?.cannon} streamers=${main.afterRestart?.streamers} total=${aliveTotal(main.afterRestart)} active=${main.afterRestart?.active} bursts=${main.afterRestart?.stats?.bursts}`);
console.log(`second win alive: rain=${main.afterSecondWin?.rain} spray=${main.afterSecondWin?.spray} cannon=${main.afterSecondWin?.cannon} streamers=${main.afterSecondWin?.streamers} total=${aliveTotal(main.afterSecondWin)} active=${main.afterSecondWin?.active} bursts=${main.afterSecondWin?.stats?.bursts}`);
console.log(`path8 after 2f alive: total=${aliveTotal(p8.after2f)} active=${p8.after2f?.active} bursts=${p8.after2f?.stats?.bursts}`);
console.log(`path8 after 5s alive: total=${aliveTotal(p8.after5s)} active=${p8.after5s?.active} bursts=${p8.after5s?.stats?.bursts}`);

check(main.solved1, "seed 7 solves");
check(main.afterWin && main.afterWin.stats.bursts === 1, "burst thrown at the win", `bursts=${main.afterWin?.stats?.bursts}`);
check(aliveTotal(main.afterWin) > 0, "pieces alive after the win", `total=${aliveTotal(main.afterWin)}`);
check(main.pressed, "Reset path button found and pressed");
if (mode === "after") {
  check(aliveTotal(main.afterRestart) === 0 && main.afterRestart.active === false, "AFTER: no piece survives the restart (2 frames)", `total=${aliveTotal(main.afterRestart)} active=${main.afterRestart?.active}`);
  check(main.solved2 && main.afterSecondWin && main.afterSecondWin.stats.bursts === 2 && aliveTotal(main.afterSecondWin) > 0, "AFTER: the new solve throws again", `bursts=${main.afterSecondWin?.stats?.bursts} total=${aliveTotal(main.afterSecondWin)}`);
  check(p8.watch && p8.watch.clicked, "AFTER path8: Reset path pressed in flight");
  check(aliveTotal(p8.after2f) === 0 && p8.after2f.active === false, "AFTER path8: 0 alive at 2 frames", `total=${aliveTotal(p8.after2f)}`);
  check(aliveTotal(p8.after5s) === 0, "AFTER path8: 0 alive at 5 s", `total=${aliveTotal(p8.after5s)}`);
} else {
  // Before: the bug — pieces survive the restart.
  check(aliveTotal(main.afterRestart) > 0, "BEFORE: pieces still alive after the restart (the bug)", `total=${aliveTotal(main.afterRestart)}`);
  check(aliveTotal(p8.after5s) > 0, "BEFORE path8: pieces still alive at 5 s (the bug)", `total=${aliveTotal(p8.after5s)}`);
}

writeFileSync(join(OUT, mode + ".json"), JSON.stringify({ mode, main, path8: p8, checks }, null, 2));
console.log("\nwrote", join(OUT, mode + ".json"));
const failed = checks.filter((c) => !c.ok);
console.log(failed.length === 0 ? "ALL CHECKS PASS" : `${failed.length} CHECK(S) FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
