// K1203 check 4: scan pinned clocks in the page for the phase that
// maximises |band(window 1) - band(childSpan)| at tau 1.01 on e18
// (paint_math's twins, the page's own uniforms), then screenshot the
// tight fan clip at that phase, flag off vs on.
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
  const best = await page.evaluate(async () => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const r = window.__knotRenderer();
    let bt = 100, bd = -1;
    for (let k = 0; k < 400; k++) {
      const t = 100 + (k / 400) * (2.5 / 1.6);
      window.__knotPinClocks(t);
      r.tickPaint(0);
      const U = MD.knotUniformValues();
      const d = Math.abs(
        PM.kPulseBandV(U, 6.811, 1.01, false, false, 0, false, 1, 0) -
        PM.kPulseBandV(U, 6.811, 1.01, false, false, 0, false, 1, 1.3590532541275024)
      );
      if (d > bd) { bd = d; bt = t; }
    }
    return { t: bt, d: bd };
  });
  console.log(`best phase t ${best.t.toFixed(4)} CPU delta ${best.d.toFixed(4)}`);
  await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
  const clip = { x: 922, y: 31, width: 176, height: 176 };
  const shot = async (on) => {
    await page.evaluate(async (o, tt) => {
      const JF = await import("/src/render/junction_field.ts");
      JF.setPulseBandEndWindow(o);
      const r = window.__knotRenderer();
      r.rebuildFillets(true);
      window.__knotPinClocks(tt);
      r.tickPaint(0);
    }, on, best.t);
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await sleep(60);
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  const off = await shot(false);
  const on = await shot(true);
  let n = 0, mx = 0;
  for (let i = 0; i < off.data.length; i += 3) { const d = Math.max(Math.abs(off.data[i] - on.data[i]), Math.abs(off.data[i + 1] - on.data[i + 1]), Math.abs(off.data[i + 2] - on.data[i + 2])); if (d) { n++; if (d > mx) mx = d; } }
  console.log(`at best phase: off vs on ${n} px, max ${mx}/255`);
  await page.close();
} finally { await browser.close(); }
