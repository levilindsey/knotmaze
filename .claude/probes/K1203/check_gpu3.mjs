// K1203 check 3: positive control. Same page, tight clip on mnode_27:
// off, then Run C's cover ramp on (known to move fan pixels), then
// end window on alone. Full-clip byte diffs between successive shots.
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
  const shot = async (mode) => {
    await page.evaluate(async (m) => {
      const JF = await import("/src/render/junction_field.ts");
      JF.setPulseCoverRamp(m === "cover");
      JF.setPulseBandEndWindow(m === "win");
      const r = window.__knotRenderer();
      r.rebuildFillets(true);
      window.__knotPinClocks(100.488);
      r.tickPaint(0);
    }, mode);
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await sleep(60);
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  const off = await shot("off");
  const cover = await shot("cover");
  const win = await shot("win");
  const off2 = await shot("off");
  const diff = (a, b, name) => { let n = 0, mx = 0; for (let i = 0; i < a.data.length; i += 3) { const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])); if (d) { n++; if (d > mx) mx = d; } } console.log(`${name}: ${n} px, max ${mx}/255`); };
  diff(off, off2, "off vs off2 (control)");
  diff(off, cover, "off vs coverRamp on (positive control)");
  diff(off, win, "off vs endWindow on");
  console.log("pageerrors:", log.filter((l) => l.includes("pageerror")).join(" | ") || "none");
  await page.close();
} finally { await browser.close(); }
