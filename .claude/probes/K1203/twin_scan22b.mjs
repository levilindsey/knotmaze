// K1207 22B task 3 (companion to twin22b.mjs): which junction's CPU
// field matches the GPU's fan-only colour at the twin point? The x4
// stand and the pinned phase are twin22b's; every junction's twin is
// evaluated at the point and the ones near the GPU's (134, 190, 174)
// are listed, ji 28 first. Same stand verbatim from stands_cyc.mjs.
//   node twin_scan22b.mjs   (env K1139_HOST, the dev server)
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
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const r = window.__knotRenderer();
    let bt = 100, bv = -1;
    for (let k = 0; k < 400; k++) {
      const t = 100 + (k / 400) * (2.5 / 1.6);
      window.__knotPinClocks(t);
      r.tickPaint(0);
      const U = MD.knotUniformValues();
      const v = PM.kPulseBandV(U, 6.811, 0.91, false, false, 0, false, 1, 0);
      if (v > bv) { bv = v; bt = t; }
    }
    window.__knotPinClocks(bt);
    r.tickPaint(0);
    const fp = r.fieldProbe;
    const c = fp.center(28);
    const a = fp.arms(28)[1];
    const P = [c[0] + a.dx * 0.91, c[1] + a.dy * 0.91];
    const gpu = [134, 190, 174];
    const rows = [];
    for (const on of [false, true]) {
      JF.setPulseBandEndWindow(on);
      r.rebuildFillets(true);
      window.__knotPinClocks(bt);
      r.tickPaint(0);
      await new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      for (let ji = 0; ji < 400; ji++) {
        const ctr = fp.center(ji);
        if (!ctr) continue;
        if (Math.hypot(ctr[0] - P[0], ctr[1] - P[1]) > 3) continue;
        const o = new Float32Array(4);
        if (!fp.at(ji, P[0], P[1], o, 1 / 34.83, false)) continue;
        const rgb = [o[0] * 255, o[1] * 255, o[2] * 255];
        const d = Math.max(...rgb.map((v, i) => Math.abs(v - gpu[i])));
        rows.push({ on, ji, rgb: rgb.map((v) => Math.round(v)), d: +d.toFixed(1), ctr: ctr.map((v) => +v.toFixed(2)) });
      }
    }
    JF.setPulseBandEndWindow(false);
    r.rebuildFillets(true);
    return { t: bt, P, rows };
  });
  console.log(`pinned t ${out.t.toFixed(4)} point (${out.P[0].toFixed(3)}, ${out.P[1].toFixed(3)}) vs GPU fan-only (134, 190, 174)`);
  for (const row of out.rows.sort((x, y) => x.d - y.d)) console.log(`flag ${row.on ? "on " : "off"} ji ${row.ji} centre (${row.ctr.join(", ")}): rgb (${row.rgb.join(", ")}) maxdiff ${row.d}`);
  await page.close();
} finally { await browser.close(); }
