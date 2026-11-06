// K1218 S3: one stand's settled state (shoot_s3.mjs's setup: the same moves,
// zoom and pinned clocks), then a probe module run against the live page.
//   node live_s3.mjs <stand> <outDir> <module.mjs> [args...]
// The module exports `async run({ page, aff, toWorld, toDevice, OUT, args, log })`;
// toWorld/toDevice map DEVICE px (dsf 1.5) <-> world through the page's affine.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { openBrowser, openPage, waitAsleep, viewStill, viewExact, moveEdge, PIN, sleep, stampText, HOST } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  cross: { q: Q, moves: [0, 246, 82, 83, 199], focus: ["node_116", "mnode_48"] },
  x4: { q: Q + "&pr=8", moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], focus: ["node_378"] },
  loop: { q: "1&am=instant&fw=0&snd=none&phw=0&pr=8", moves: [185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178, 57, 101], focus: ["node_635"] },
};
const [, , STAND, OUTARG, MOD, ...ARGS] = process.argv;
const st = STANDS[STAND];
if (!st) throw new Error(`stand ${STAND}?`);
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
  const target = 60;
  const s0 = await pxPerWorld();
  if (s0 < target * 0.97) {
    await wheel(-30);
    const s1 = await pxPerWorld();
    const kEff = Math.log(s1 / s0) / 30;
    if (kEff > 0 && s1 < target * 0.97) await wheel(-Math.log(target / s1) / kEff);
  }
  await page.mouse.move(2, 2);
  await sleep(400);
  await viewStill(page);
  await waitAsleep(page, 20000);
  const exact = await viewExact(page);
  await page.evaluate(PIN);
  await sleep(200);
  const aff = await page.evaluate(() => {
    const k = window.__knotFabric();
    const w0 = k.toWorld(0, 0), w1 = k.toWorld(100, 0), w2 = k.toWorld(0, 100);
    return { w0x: w0.x, w0y: w0.y, ax: (w1.x - w0.x) / 100, ay: (w1.y - w0.y) / 100, bx: (w2.x - w0.x) / 100, by: (w2.y - w0.y) / 100 };
  });
  const toWorld = (dx, dy) => {
    const sx = dx / 1.5, sy = dy / 1.5;
    return [aff.w0x + aff.ax * sx + aff.bx * sy, aff.w0y + aff.ay * sx + aff.by * sy];
  };
  const det = aff.ax * aff.by - aff.bx * aff.ay;
  const toDevice = (x, y) => {
    const dx = x - aff.w0x, dy = y - aff.w0y;
    return [1.5 * (aff.by * dx - aff.bx * dy) / det, 1.5 * (-aff.ay * dx + aff.ax * dy) / det];
  };
  const stamp = await stampText(page);
  console.log(`${STAND} @ ${HOST}: exact ${exact} stamp ${stamp}`);
  const mod = await import(pathToFileURL(resolve(MOD)).href);
  const res = await mod.run({ page, aff, toWorld, toDevice, OUT, args: ARGS, log });
  if (res !== undefined) writeFileSync(resolve(OUT, `${STAND}_result.json`), JSON.stringify(res, null, 1));
} finally {
  await browser.close();
}
