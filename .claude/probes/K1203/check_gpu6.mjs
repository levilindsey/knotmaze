// K1203 check 6: debug view 5, flag on, R3.w hacked to 0.45 after the
// last rebuild (crest zero past tau 0.45), shot on the next frame.
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
  await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
  const clip = { x: 850, y: 0, width: 340, height: 340 };
  const shot = async () => {
    await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => res())));
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  await page.evaluate(async () => {
    const JF = await import("/src/render/junction_field.ts");
    JF.setPulseBandEndWindow(true);
    const r = window.__knotRenderer();
    r.paintDebug = 5;
    r.rebuildFillets(true);
    window.__knotPinClocks(100.1992);
    r.tickPaint(0);
  });
  const on = await shot();
  await page.evaluate(async () => {
    const JF = await import("/src/render/junction_field.ts");
    const r = window.__knotRenderer(), fp = r.fieldProbe;
    const D = JF.recordData();
    const data = D.data;
    const rb = fp.record(28);
    let cur = data[rb * 4 + 3];
    const nr = data[rb * 4 + 7];
    for (let k = 0; k < nr; k++) cur += 1 + data[cur * 4];
    const np = data[cur * 4];
    cur += 1;
    for (let k = 0; k < np; k++) {
      const o = cur * 4, nv = data[o];
      if (Math.abs(data[o + 4] - 6.811) < 1e-3 && data[o + 15] > 1) { data[o + 15] = 0.45; D.markDirty(cur, cur + 4 + nv); }
      cur += 4 + nv;
    }
    D.flush();
  });
  const hack = await shot();
  let n = 0, mx = 0;
  for (let i = 0; i < on.data.length; i += 3) { const d = Math.abs(on.data[i + 1] - hack.data[i + 1]); if (d) { n++; if (d > mx) mx = d; } }
  console.log(`debug5 G: on (span 1.359) vs on (span hacked 0.45): ${n} px, max ${mx}/255`);
  await page.close();
} finally { await browser.close(); }
