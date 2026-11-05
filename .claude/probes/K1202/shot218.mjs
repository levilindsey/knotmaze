// K1202: node_218 close-up at row 14's moment (diag_s4.mjs's zoom manner),
// normal and debug-5, for looking at what crosses e210's centreline.
//   node shot218.mjs
import { writeFileSync } from "node:fs";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const st = STANDS.cyc;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  const fpt = await page.evaluate(() => window.__knotFabric().vertexScreen("node_218"));
  const pxPerWorld = () => page.evaluate((p) => { const k = window.__knotFabric(); const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y); return 100 / Math.hypot(b.x - a.x, b.y - a.y); }, fpt);
  const wheel = async (dy) => { await page.mouse.move(fpt.x, fpt.y); await page.keyboard.down("Control"); await page.mouse.wheel({ deltaY: dy }); await page.keyboard.up("Control"); await sleep(250); await viewStill(page); };
  const s0 = await pxPerWorld();
  if (s0 < 58) { await wheel(-30); const s1 = await pxPerWorld(); const kEff = Math.log(s1 / s0) / 30; if (kEff > 0 && s1 < 58) await wheel(-Math.log(60 / s1) / kEff); }
  console.log(`scale ${await pxPerWorld()} css px/world at node_218 ${JSON.stringify(fpt)}`);
  await page.mouse.move(2, 2);
  await sleep(400);
  await viewStill(page);
  await page.evaluate(PIN);
  const CW = 640, CH = 420;
  const clip = { x: Math.max(0, 2 * Math.round((fpt.x - CW / 2) / 2)), y: Math.max(0, 2 * Math.round((fpt.y - CH / 2) / 2)), width: CW, height: CH };
  const t = 100 + (14 * 1.5 * (2.5 / 1.6)) / 72;
  await setState(page, { t, dbg: 0, webs: true });
  writeFileSync("out/px/shot218_normal.png", Buffer.from(await page.screenshot({ type: "png", clip })));
  await setState(page, { t, dbg: 5, webs: true });
  writeFileSync("out/px/shot218_debug5.png", Buffer.from(await page.screenshot({ type: "png", clip })));
  console.log(`shot clip ${JSON.stringify(clip)} t ${t.toFixed(3)}`);
  await page.close();
} finally { await browser.close(); }
