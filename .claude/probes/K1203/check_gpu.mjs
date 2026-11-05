// K1203 check: debug view 5 (G = kFanPulseV) at mnode_27's fan, flag
// off vs on, x4 stand verbatim, clocks pinned at t 100.391.
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
import { decodePNG, toRGB } from "./png.mjs";
const st = STANDS.x4;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  const ctr = await page.evaluate(() => {
    const k = window.__knotFabric();
    const p = k.vertexScreen("mnode_27");
    return { x: p.x, y: p.y };
  });
  await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
  const clip = { x: Math.max(0, Math.floor(ctr.x - 88)), y: Math.max(0, Math.floor(ctr.y - 88)), width: 176, height: 176 };
  const shot = async (on) => {
    await page.evaluate(async (o) => {
      const JF = await import("/src/render/junction_field.ts");
      JF.setPulseBandEndWindow(o);
      const r = window.__knotRenderer();
      r.paintDebug = 5;
      r.rebuildFillets(true);
      window.__knotPinClocks(100.391);
    }, on);
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await sleep(60);
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  const off = await shot(false);
  const on = await shot(true);
  let n = 0, mx = 0, sum = 0;
  for (let i = 0; i < off.data.length; i += 3) {
    const d = Math.max(Math.abs(off.data[i] - on.data[i]), Math.abs(off.data[i + 1] - on.data[i + 1]), Math.abs(off.data[i + 2] - on.data[i + 2]));
    if (d) { n++; sum += d; if (d > mx) mx = d; }
  }
  console.log(`debug5 clip ${JSON.stringify(clip)}: off vs on ${n} px, max ${mx}/255, mean over changed ${(n ? sum / n : 0).toFixed(1)}`);
  const gAt = (img, fx, fy) => { const x = Math.min(img.W - 1, Math.floor(fx * img.W)), y = Math.min(img.H - 1, Math.floor(fy * img.H)); return img.data[(y * img.W + x) * 3 + 1]; };
  console.log(`centre G off ${gAt(off, 0.5, 0.5)} on ${gAt(on, 0.5, 0.5)}`);
  await page.close();
} finally { await browser.close(); }
