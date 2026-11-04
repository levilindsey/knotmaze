// K1139 P9 (flow drift): the cross stand with the flow ON (no fw=0; the
// default flowStrength undulates the threads). Over 10 s, sample the
// declaration every 250 ms: at every lit boundary the phase step
// Q.dist0 - (P.dist0 + P.span) must stay <= 0.01 while spans drift, and
// pulseBorn must not move (a dist0 refresh must not restart the fade-in).
// Declared items come from __knotPulses when the build has it, else from
// lib.mjs's dumpPulses (today's build).   node p9flow.mjs
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses, sleep } from "./lib.mjs";

const Q = "k111&am=instant&snd=none&phw=0"; // fw left at its default: flow on
const MOVES = [0, 246, 82, 83, 199]; // the cross stand, verbatim from strips.mjs
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, Q, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of MOVES) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  const born0 = await page.evaluate(() => window.__knotRenderer().pulseBorn);
  let maxStep = 0, maxStepAt = "", borns = new Set([born0]), refreshes = 0, prevKey = "";
  let maxDrift = 0;
  const first = new Map();
  for (let i = 0; i < 40; i++) {
    const d = await dumpPulses(page);
    const born = await page.evaluate(() => window.__knotRenderer().pulseBorn);
    borns.add(born);
    const key = d.pulses.map((p) => `${p.edge}:${(p.dist0 || 0).toFixed(3)}`).join("|");
    if (prevKey && key !== prevKey) refreshes++;
    prevKey = key;
    for (const p of d.pulses) {
      if (!first.has(p.edge)) first.set(p.edge, p.world);
      maxDrift = Math.max(maxDrift, Math.abs(p.world - first.get(p.edge)));
    }
    for (const p of d.pulses) {
      if (p.inward) continue;
      for (const q of d.pulses) {
        if (q === p || q.near !== p.far || q.inward) continue;
        if ((p.dist0 || 0) + p.world >= d.reach) continue;
        const step = Math.abs((q.dist0 || 0) - ((p.dist0 || 0) + p.world));
        if (step > maxStep) { maxStep = step; maxStepAt = `e${p.edge}->e${q.edge} sample ${i}`; }
      }
    }
    await sleep(250);
  }
  console.log(`cross (flow on): P9 max phase step ${maxStep.toFixed(4)} (${maxStepAt}), max span drift ${maxDrift.toFixed(4)}, declaration refreshes ${refreshes}, pulseBorn values ${[...borns].map((b) => b.toFixed(2)).join(",")} -> ${maxStep <= 0.01 && borns.size === 1 ? "P9 PASS" : "P9 FAIL"}`);
  const errs = log.filter((l) => l.includes("pageerror"));
  if (errs.length) console.log("pageerrors:", errs.join(" | "));
} finally {
  await browser.close();
}
