// K782 probe (batch 18 Run B): the "Snared!" toast waits for the monster.
//   node .claude/probes/K782/toast.mjs <base> before|after
// Headed Chrome, real time (never --virtual-time-budget). Copies K657's
// stand under rule 11 (its base argument, the ../K120/lib.mjs launch it
// imports, the knotmaze.panelOpen preset and its full design links);
// changes from K657: the link is task 1's stand (search.ts: seed 1,
// msp=charge), the game is replayed from that stand's move list, the
// snare is laid through main's own tool path (tools_page.mjs's way:
// __knotTool("snare") plus a click on the run __knotFabric().cutPick
// confirms), and the table is the toast's first frame, not a banner.
// Before the load, prefers-reduced-motion: no-preference is emulated
// (K120's launch does it; K104: reduced motion skips the move's
// animation, so progress would read 1 at once). am=instant sets only
// the intro's appearance; moves still animate. The frame loop runs
// continuously while polling (__knotLoop({continuous:true}), K6-3).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep, waitLive, waitIdle } from "../K120/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
mkdirSync(OUT, { recursive: true });

const base = process.argv[2] || "http://127.0.0.1:5640/";
const mode = process.argv[3] || "before";

// Task 1's stand (search.ts, seed 1): moves, then the snare, then a wait.
const LINK = "?1&am=instant&mt=hunter&lur=3&snr=2&msp=charge&snd=none";
const MOVES = [185, 0, 161, 27, 222, 223, 196, 210, 209, 208];
const SNARE_EDGE = 145;

const checks = [];
function check(ok, what, detail = "") {
  checks.push({ ok: !!ok, what, detail: String(detail) });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${detail ? " (" + detail + ")" : ""}`);
}

const { page, logs, close } = await launch("K782", {});
try {
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem("knotmaze.panelOpen", "0");
    } catch {}
  });
  await page.goto(base + LINK, { waitUntil: "load" });
  await page.waitForFunction(() => window.__knotFabric?.() && window.__knotTurnMino?.(), { timeout: 60000 });
  await waitLive(page);
  await page.evaluate(() => window.__knotLoop?.({ continuous: true }));

  const settle = async () => {
    await waitIdle(page);
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const s = await page.evaluate(() => ({
        anim: window.__knotFabric().animating,
        p: window.__knotTurnMino().progress,
      }));
      if (!s.anim && s.p >= 1) break;
      await sleep(40);
    }
  };

  // Replay the stand's moves, settling between turns (the Node search
  // set progress to 1 after each turn).
  for (const e of MOVES) {
    const ok = await page.evaluate((edge) => window.__knotTurnMove(edge), e);
    if (!ok) throw new Error(`move refused on edge ${e}`);
    await settle();
  }
  const pre = await page.evaluate(() => {
    const tm = window.__knotTurnMino();
    return { inputs: tm.inputs, player: tm.player, minoAt: tm.minoAt, turns: tm.turns, progress: tm.progress };
  });
  console.log("before snare:", JSON.stringify(pre));
  check(JSON.stringify(pre.inputs) === JSON.stringify(MOVES), "replay inputs match the Node stand", JSON.stringify(pre.inputs));

  // Lay the snare through main's tool path (tools_page.mjs's way).
  const armed = await page.evaluate(() => window.__knotTool("snare"));
  check(armed, "the snare tool arms");
  const pt = await page.evaluate((e) => {
    const f = window.__knotFabric();
    for (const t of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.46, 0.54, 0.38, 0.62, 0.3, 0.7]) {
      const p = f.runPoint(e, t);
      if (p && typeof f.cutPick === "function" && f.cutPick(p.x, p.y) === e) return { x: p.x, y: p.y, frac: t };
    }
    const p = f.runPoint(e, 0.5);
    return p ? { x: p.x, y: p.y, frac: 0.5, unverified: true } : null;
  }, SNARE_EDGE);
  if (!pt) throw new Error("no screen point for the snare run");
  await page.mouse.click(pt.x, pt.y);
  await sleep(250);
  const laid = await page.evaluate(() => window.__knotTurnMino().tools);
  console.log("after laying:", JSON.stringify(laid));
  check(
    laid.laid?.length === 1 && laid.laid[0].edge === SNARE_EDGE && laid.laid[0].phase === "set",
    "the snare is laid on the stand's run",
    JSON.stringify(laid.laid)
  );
  await settle();

  // Poll on a short timer from before the springing move (the stand's
  // wait): the first frame the toast reads "Snared! ...", with the
  // turn's progress, the monster's vertex and the snare's phase.
  const samples = [];
  let polling = true;
  const poller = (async () => {
    while (polling) {
      try {
        const s = await page.evaluate(() => {
          const tm = window.__knotTurnMino();
          const toast = document.querySelector(".km-toast.km-toast-on")?.textContent ?? null;
          return {
            toast,
            progress: tm.progress,
            minoAt: tm.minoAt,
            turns: tm.turns,
            phases: tm.tools.laid.map((s) => s.phase),
            animating: window.__knotFabric().animating,
          };
        });
        samples.push({ at: Date.now(), ...s });
        if (samples.length > 2000) samples.shift();
      } catch {}
      await sleep(20);
    }
  })();
  const waited = await page.evaluate(() => window.__knotTurnWait());
  check(waited, "the springing wait is accepted");
  // Keep polling until the toast is first seen (or 12 s pass).
  const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    if (samples.some((s) => s.toast && s.toast.startsWith("Snared!"))) break;
    await sleep(50);
  }
  await sleep(300);
  polling = false;
  await poller;

  const firstToast = samples.find((s) => s.toast && s.toast.startsWith("Snared!")) ?? null;
  const springSample = samples.find((s) => s.phases.includes("holding")) ?? null;
  console.log("\n== table (" + mode + ") ==");
  console.log("first holding sample:", JSON.stringify(springSample));
  console.log("first toast sample:", JSON.stringify(firstToast));
  console.log("logs:", logs.slice(0, 5).join(" | ") || "(none)");

  check(!!firstToast, "the Snared toast appears");
  check(!!springSample, "the snare springs (holding)");
  if (firstToast) {
    console.log(`toast text: ${JSON.stringify(firstToast.toast)}`);
    console.log(`toast first frame: progress=${firstToast.progress} minoAt=${firstToast.minoAt} turns=${firstToast.turns} phases=${JSON.stringify(firstToast.phases)}`);
    if (mode === "before") {
      check(firstToast.progress < 1, "BEFORE: the toast's first frame reads progress < 1", `progress=${firstToast.progress}`);
    } else {
      check(firstToast.progress >= 1, "AFTER: the toast's first frame reads progress >= 1", `progress=${firstToast.progress}`);
      check(firstToast.toast === "Snared! It stands three turns.", "AFTER: the toast text is unchanged", firstToast.toast);
    }
  }
  check(logs.length === 0, "no page errors", logs.slice(0, 3).join(" | "));

  writeFileSync(join(OUT, mode + ".json"), JSON.stringify({ mode, link: LINK, moves: MOVES, snareEdge: SNARE_EDGE, pre, laid, firstToast, springSample, samples: samples.slice(-50), checks }, null, 2));
  console.log("\nwrote", join(OUT, mode + ".json"));
} finally {
  await close();
}
const failed = checks.filter((c) => !c.ok);
console.log(failed.length === 0 ? "ALL CHECKS PASS" : `${failed.length} CHECK(S) FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
