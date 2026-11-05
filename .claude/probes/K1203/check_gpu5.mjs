// K1203 check 5 (decisive): with the flag on, overwrite the e135->e18
// band's R3.w in the page's records with 0.95 (a span that zeroes the
// crest past tau 0.95) and flush. If the GPU pixels move, the R3.w /
// uJParams.w path works and the true span's effect is sub-byte here.
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
  const clip = { x: 922, y: 31, width: 176, height: 176 };
  const shot = async () => {
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await sleep(60);
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  const prep = async (on) => {
    await page.evaluate(async (o) => {
      const JF = await import("/src/render/junction_field.ts");
      JF.setPulseBandEndWindow(o);
      const r = window.__knotRenderer();
      r.rebuildFillets(true);
      window.__knotPinClocks(100.1992);
      r.tickPaint(0);
    }, on);
  };
  await prep(false);
  const off = await shot();
  await prep(true);
  const on = await shot();
  const hacked = await page.evaluate(async () => {
    const JF = await import("/src/render/junction_field.ts");
    const r = window.__knotRenderer(), fp = r.fieldProbe;
    const D = JF.recordData();
    const data = D.data;
    // Walk ji 28's record to its pulse blocks (dump_cyc's walk).
    const rb = fp.record(28);
    let cur = data[rb * 4 + 3];
    const nr = data[rb * 4 + 7];
    for (let k = 0; k < nr; k++) cur += 1 + data[cur * 4];
    const np = data[cur * 4];
    cur += 1;
    const found = [];
    for (let k = 0; k < np; k++) {
      const o = cur * 4, nv = data[o];
      found.push({ block: cur, r3w: data[o + 15], distJ: data[o + 4] });
      if (Math.abs(data[o + 4] - 6.811) < 1e-3 && data[o + 15] > 1) {
        data[o + 15] = 0.95;
        D.markDirty(cur, cur + 4 + nv);
      }
      cur += 4 + nv;
    }
    D.flush();
    r.tickPaint(0);
    return found;
  });
  console.log("band blocks at ji 28:", JSON.stringify(hacked));
  const hack = await shot();
  const diff = (a, b, name) => { let n = 0, mx = 0; for (let i = 0; i < a.data.length; i += 3) { const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])); if (d) { n++; if (d > mx) mx = d; } } console.log(`${name}: ${n} px, max ${mx}/255`); };
  diff(off, on, "off vs on (true span 1.359)");
  diff(on, hack, "on vs on with R3.w hacked to 0.95");
  await page.close();
} finally { await browser.close(); }
