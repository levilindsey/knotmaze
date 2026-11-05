// K1203 check 2: debug view 5's G sampled on e18's drawn centreline
// (runPoint screen points) at the window-fall taus, flag off vs on.
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
import { decodePNG, toRGB } from "./png.mjs";
const st = STANDS.x4;
const SPAN = 1.3590532541275024, DSF = 1.5;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  const pts = await page.evaluate((span) => {
    const k = window.__knotFabric();
    return [0.91, 1.01, 1.1, 1.25].map((tau) => {
      const q = k.runPoint(18, tau / span);
      return { tau, x: q.x, y: q.y };
    });
  }, SPAN);
  console.log("centreline screen pts:", JSON.stringify(pts));
  await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
  const clip = { x: 850, y: 0, width: 340, height: 340 };
  const shot = async (on) => {
    await page.evaluate(async (o) => {
      const JF = await import("/src/render/junction_field.ts");
      JF.setPulseBandEndWindow(o);
      const r = window.__knotRenderer();
      r.paintDebug = 5;
      r.rebuildFillets(true);
      window.__knotPinClocks(100.1992);
      r.tickPaint(0);
    }, on);
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await sleep(60);
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  const off = await shot(false);
  const on = await shot(true);
  for (const p of pts) {
    const x = Math.round((p.x - clip.x) * DSF), y = Math.round((p.y - clip.y) * DSF);
    const g = (img) => img.data[(y * img.W + x) * 3 + 1];
    console.log(`tau ${p.tau}: debug5 G off ${g(off)} on ${g(on)} (screen ${p.x.toFixed(1)},${p.y.toFixed(1)})`);
  }
  let n = 0, mx = 0;
  for (let i = 0; i < off.data.length; i += 3) { const d = Math.abs(off.data[i + 1] - on.data[i + 1]); if (d) { n++; if (d > mx) mx = d; } }
  console.log(`debug5 G channel over clip: ${n} px differ, max ${mx}/255`);
  await page.close();
} finally { await browser.close(); }
