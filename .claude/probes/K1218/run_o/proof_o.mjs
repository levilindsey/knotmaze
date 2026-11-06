// K1218 Run O single-slot proof: S2's stand and walk, pinned at rest
// (phase 0, look 0), shoot live, then disable ONE gap slot through the
// probe hook (wrap renderer.computeGapSlot so the slot is cleared after
// its solve, then update()) and shoot again. Full-viewport shots; crops
// are cut offline so both share one view.
//   node proof_o.mjs <stand> <slot> <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, viewExact, moveEdge, PIN, setState, sleep, frames, stampText, HOST } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  x4: { q: Q + "&pr=8", moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], focus: ["node_378"] },
  loop: { q: "1&am=instant&fw=0&snd=none&phw=0&pr=8", moves: [185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178, 57, 101], focus: ["node_635"] },
};
const [, , STAND, SLOTARG, OUTARG] = process.argv;
const st = STANDS[STAND];
if (!st) throw new Error(`stand ${STAND}?`);
const SLOT = Number(SLOTARG);
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  const focusPt = () => page.evaluate((ids) => {
    const k = window.__knotFabric();
    const ps = ids.map((id) => k.vertexScreen(id));
    return { x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length };
  }, st.focus);
  let fpt = await focusPt();
  const pxPerWorld = () => page.evaluate((p) => {
    const k = window.__knotFabric();
    const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
    return 100 / Math.hypot(b.x - a.x, b.y - a.y);
  }, fpt);
  const wheel = async (dy) => {
    await page.mouse.move(fpt.x, fpt.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel({ deltaY: dy });
    await page.keyboard.up("Control");
    await sleep(250);
    await viewStill(page);
  };
  const s0 = await pxPerWorld();
  if (s0 < 60 * 0.97) {
    await wheel(-30);
    const s1 = await pxPerWorld();
    const kEff = Math.log(s1 / s0) / 30;
    if (kEff > 0 && s1 < 60 * 0.97) await wheel(-Math.log(60 / s1) / kEff);
  }
  await page.mouse.move(2, 2);
  await sleep(400);
  await viewStill(page);
  await waitAsleep(page, 20000);
  const exact = await viewExact(page);
  await page.evaluate(PIN);
  await sleep(200);
  const scale = await pxPerWorld();
  await page.evaluate((L) => (window.__knotJunctionLight ? window.__knotJunctionLight(L) : 0), 0);
  await frames(page, 3);
  const shot = async (name) => writeFileSync(join(OUT, name), await page.screenshot({ type: "png" }));
  await setState(page, { t: 100, dbg: 0, webs: true });
  await shot("live.png");
  const before = await page.evaluate((s) => {
    const r = window.__knotRenderer();
    return { desc: r.gaps.describeSlot(s), live: r.slotLive[s] };
  }, SLOT);
  const applied = await page.evaluate((s) => {
    const r = window.__knotRenderer();
    const orig = r.computeGapSlot.bind(r);
    r.computeGapSlot = (slot, ...rest) => {
      orig(slot, ...rest);
      if (slot === s) r.gaps.clearSlot(s);
    };
    r.update();
    r.rebuildFillets(true);
    return { desc: r.gaps.describeSlot(s) };
  }, SLOT);
  await setState(page, { t: 100, dbg: 0, webs: true });
  await shot(`noslot${SLOT}.png`);
  const stamp = await stampText(page);
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  writeFileSync(join(OUT, "proof.json"), JSON.stringify({ stand: STAND, slot: SLOT, scale, exact, before, applied, stamp, ctxLost }, null, 1));
  console.log(`${STAND} slot ${SLOT}: exact ${exact} scale ${scale.toFixed(1)} bound before ${before.desc.bound[2].toFixed(3)} after ${applied.desc.bound[2]} ctxLost ${ctxLost} stamp ${stamp}`);
} finally {
  await browser.close();
}
