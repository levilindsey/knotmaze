// K1211 S4 smoke (a copy of S2's smoke2.mjs; served = the dev server's junction_field.ts holds env K1211_MARK; looks 0 and 1 when the hook exists). S2: one link, live (no pinned clocks), switch 0 then 2: it
// draws, and the console has no error. For Run I's rebase and the explore shot.
//   node smoke2.mjs <query> <outDir> [moves, comma separated walk edges]
//   env K1211_HOST (default http://127.0.0.1:5962).
// Writes L0.png, L2.png (full viewport) and smoke.json: the stamp, the
// switch's read-back, each shot's drawn share (pixels > 30 levels from the
// most common colour), webglcontextlost count, every console error and
// pageerror. Exit 1 on an error, a lost context, a blank shot or a refused move.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, frames, stampText, sleep } from "./lib.mjs";
import { decodePNG, toRGB } from "./png.mjs";

// run_shots2.ps1 passes two args, so "<query>|<moves>" also works.
const [, , QARG, OUTARG, MARG = ""] = process.argv;
const [QUERY, MOVES = MARG] = QARG.split("|");
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const log = [];
const res = { query: QUERY, moves: [], shots: {} };
const browser = await openBrowser();
let bad = 0;
try {
  const page = await openPage(browser, QUERY, log);
  res.asleep = await waitAsleep(page);
  await viewStill(page);
  for (const e of MOVES ? MOVES.split(",").map(Number) : []) {
    const ok = await moveEdge(page, e);
    res.moves.push({ e, ok });
    if (!ok) bad++;
  }
  const hasHook = await page.evaluate(() => typeof window.__knotJunctionLight === "function");
  res.served = await page.evaluate(async (mark) => { const s = await (await fetch("/src/render/junction_field.ts")).text(); return { len: s.length, mark: mark ? s.includes(mark) : null }; }, process.env.K1211_MARK || "");
  if (res.served.mark === false) bad++;
  for (const L of hasHook ? [0, 1] : [0]) {
    res.shots[`L${L}`] = { set: await page.evaluate((L) => (window.__knotJunctionLight ? window.__knotJunctionLight(L) : "no hook"), L) };
    await frames(page, 20);
    await sleep(400);
    const f = join(OUT, `L${L}.png`);
    writeFileSync(f, await page.screenshot({ type: "png" }));
    const im = toRGB(decodePNG(readFileSync(f)));
    const counts = new Map();
    for (let i = 0; i < im.W * im.H; i += 7) {
      const k = (im.data[i * 3] >> 3) << 10 | (im.data[i * 3 + 1] >> 3) << 5 | (im.data[i * 3 + 2] >> 3);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const tc = [(top >> 10) << 3, ((top >> 5) & 31) << 3, (top & 31) << 3];
    let drawn = 0, n = 0;
    for (let i = 0; i < im.W * im.H; i += 7, n++) {
      const d = Math.abs(im.data[i * 3] - tc[0]) + Math.abs(im.data[i * 3 + 1] - tc[1]) + Math.abs(im.data[i * 3 + 2] - tc[2]);
      if (d > 30) drawn++;
    }
    res.shots[`L${L}`].drawnShare = +(drawn / n).toFixed(3);
    if (drawn / n < 0.05) bad++;
  }
  // Run I (K1209, cb5a7301) removed the renderer's filletTopLayer and
  // voteOverride: their absence says the page runs the rebased code.
  res.runI = await page.evaluate(() => { const r = window.__knotRenderer(); return !("filletTopLayer" in r) && !("voteOverride" in r); });
  if (!res.runI) bad++;
  res.stamp = await stampText(page);
  res.ctxLost = await page.evaluate(() => window.__ctxLost);
  if (res.ctxLost) bad++;
} finally {
  await browser.close();
}
res.errors = log.filter((l) => /^\[(error|pageerror)\]/.test(l));
res.warnings = log.filter((l) => /^\[warn/.test(l));
if (res.errors.length) bad++;
res.ok = bad === 0;
writeFileSync(join(OUT, "smoke.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ok: res.ok, moves: res.moves, shots: res.shots, ctxLost: res.ctxLost, errors: res.errors, stamp: res.stamp, served: res.served, asleep: res.asleep.slice(0, 12) }));
process.exit(res.ok ? 0 : 1);
