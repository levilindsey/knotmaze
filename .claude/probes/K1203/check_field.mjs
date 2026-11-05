// K1203 check: cpuJunctionField at mnode_27 (ji 28) along e18, flag
// off vs on, on the x4 stand (verbatim link/moves from stands_cyc).
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
const st = STANDS.x4;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  const out = await page.evaluate(async () => {
    const JF = await import("/src/render/junction_field.ts");
    const r = window.__knotRenderer();
    const fp = r.fieldProbe;
    const ji = 28;
    const c = fp.center(ji);
    const arms = fp.arms(ji);
    const a = arms[1];
    const res = { center: c, armDir: [a.dx, a.dy], rows: [] };
    const pxW = 1 / 34.83;
    for (const on of [false, true]) {
      JF.setPulseBandEndWindow(on);
      r.rebuildFillets(true);
      await new Promise((res2) => { let k = 0; const f = () => (++k >= 3 ? res2() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const row = { on, vals: [] };
      for (const tau of [0.5, 0.91, 1.01, 1.1, 1.25]) {
        const o = new Float32Array(4);
        const ok = fp.at(ji, c[0] + a.dx * tau, c[1] + a.dy * tau, o, pxW, false);
        row.vals.push([tau, ok, +o[0].toFixed(4), +o[1].toFixed(4), +o[2].toFixed(4)]);
      }
      res.rows.push(row);
    }
    JF.setPulseBandEndWindow(false);
    r.rebuildFillets(true);
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await page.close();
} finally { await browser.close(); }
