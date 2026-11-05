// K1202 21C: full-frame off/on diff around node_218 (is the ramp
// reaching the shader at all, and where). Cyc stand, PIN, row 14.
//   node pxdiff21c.mjs
import { writeFileSync } from "node:fs";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
import { decodePNG, toRGB } from "./png.mjs";

const st = STANDS.cyc;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  await page.evaluate(PIN);
  const t = 100 + (14 * 1.5 * (2.5 / 1.6)) / 72;
  const fpt = await page.evaluate(() => window.__knotFabric().vertexScreen("node_218"));
  const CW = 640, CH = 420;
  const clip = { x: Math.max(0, Math.round(fpt.x - CW / 2)), y: Math.max(0, Math.round(fpt.y - CH / 2)), width: CW, height: CH };
  const setRamp = async (on) => {
    const got = await page.evaluate(async (o) => {
      const JF = await import("/src/render/junction_field.ts");
      JF.setPulseCoverRamp(o);
      window.__knotRenderer().rebuildFillets(true);
      return JF.pulseCoverRamp;
    }, on);
    if (got !== on) throw new Error(`readback ${got}`);
  };
  const shot = async (dbg) => {
    await setState(page, { t, dbg, webs: true });
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  await setRamp(false);
  const offN = await shot(0), offD = await shot(5);
  await setRamp(true);
  const onN = await shot(0), onD = await shot(5);
  await setRamp(false);
  const off2N = await shot(0);
  writeFileSync("out21c/pxdiff_off_normal.png", Buffer.from(await page.screenshot({ type: "png", clip })));
  const diff = (a, b, name) => {
    let n = 0, mx = 0, sx = 0, sy = 0;
    for (let y = 0; y < a.H; y++) for (let x = 0; x < a.W; x++) {
      const i = (y * a.W + x) * 3;
      const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
      if (d) { n++; sx += x; sy += y; if (d > mx) mx = d; }
    }
    console.log(`${name}: ${n} px differ, max ${mx}/255${n ? `, centroid device (${(sx / n).toFixed(0)},${(sy / n).toFixed(0)}) of ${a.W}x${a.H}` : ""}`);
  };
  diff(offN, off2N, "normal off vs off (control)");
  diff(offN, onN, "normal off vs on");
  diff(offD, onD, "debug5 off vs on");
  await page.close();
} finally { await browser.close(); }
