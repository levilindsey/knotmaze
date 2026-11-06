// K1208 Run K - K218 v3: caps on vs caps off, per declared cap, over
// three stands. A cap draws only where removing it from the declaration
// changes the mirror p; the step is read across its radius there.
//   node k218c.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, PIN, frames, sleep, stampText, moveEdge } from "./lib.mjs";
import { upscale3 } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const STANDS = [
  { name: "cyc10", q: "k111&am=instant&fw=0&snd=none&phw=0&pv=trail&trl=5", moves: [0, 246, 82, 83, 199, 150, 151, 38, 155, 211] },
  { name: "cross5", q: "k111&am=instant&fw=0&snd=none&phw=0&pv=trail&trl=5", moves: [0, 246, 82, 83, 199] },
  { name: "loop13", q: "1&am=instant&fw=0&snd=none&phw=0&pv=trail&trl=5&pr=8", moves: [185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178, 57, 101] },
];
const browser = await openBrowser();
const all = [];
try {
  for (const st of STANDS) {
    const log = [];
    const page = await openPage(browser, st.q, log);
    await waitAsleep(page);
    await viewStill(page);
    for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`${st.name} move e${eid} refused`);
    await waitAsleep(page);
    await page.evaluate(PIN);
    await sleep(200);
    const prof = () => page.evaluate(async () => {
      const PM = await import("/src/render/paint_math.ts");
      const MD = await import("/src/render/paint_model.ts");
      const D = MD.kData(), U = MD.knotUniformValues();
      const r = window.__knotRenderer();
      const S = r.paintState;
      const out = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
      const decl = S.paintCaps.map((c) => ({ chain: c.chain, ctrl: c.ctrl, radius: c.radius, p: c.p }));
      const rows = [];
      for (const cap of decl) {
        const c = PM.kChain(D, cap.chain);
        if (!c) continue;
        const a0 = PM.kArcOfCtrl(D, c, cap.ctrl);
        const prof = [];
        for (let d = -0.6; d <= 0.6001; d += 0.02) {
          PM.kPaintAt(D, U, c, PM.kCtrlOfArc(D, c, a0 + d), a0 + d, 0.01, out, true);
          prof.push([+d.toFixed(2), +out.p.toFixed(4)]);
        }
        rows.push({ cap, prof });
      }
      return rows;
    });
    const declCaps = await page.evaluate(() => window.__knotRenderer().paintState.paintCaps.map((c) => ({ chain: c.chain, ctrl: c.ctrl, radius: c.radius, p: c.p })));
    const on = await prof();
    await page.evaluate(() => {
      const r = window.__knotRenderer(), S = r.paintState;
      S.setPaint(S.paintSpans, S.paintPulses, [], S.paintRoutes, S.paintTraveled, S.paintPulseBands);
      r.paintClock = 100;
      r.tickPaint(0);
    });
    await frames(page, 3);
    await sleep(150);
    // Re-profile the same spans (declaration now has no caps; rebuild rows from saved decl).
    const off = await page.evaluate(async (decl) => {
      const PM = await import("/src/render/paint_math.ts");
      const MD = await import("/src/render/paint_model.ts");
      const D = MD.kData(), U = MD.knotUniformValues();
      const out = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
      const rows = [];
      for (const cap of decl) {
        const c = PM.kChain(D, cap.chain);
        if (!c) continue;
        const a0 = PM.kArcOfCtrl(D, c, cap.ctrl);
        const prof = [];
        for (let d = -0.6; d <= 0.6001; d += 0.02) {
          PM.kPaintAt(D, U, c, PM.kCtrlOfArc(D, c, a0 + d), a0 + d, 0.01, out, true);
          prof.push([+d.toFixed(2), +out.p.toFixed(4)]);
        }
        rows.push({ cap, prof });
      }
      return rows;
    }, declCaps);
    const rows = on.map((r, i) => {
      let maxDelta = 0, deltaAt = 0;
      for (let k = 0; k < r.prof.length; k++) {
        const d = Math.abs(r.prof[k][1] - off[i].prof[k][1]);
        if (d > maxDelta) { maxDelta = d; deltaAt = r.prof[k][0]; }
      }
      let edgeStep = 0;
      for (let k = 1; k < r.prof.length; k++) {
        if (Math.abs(r.prof[k][0]) > r.cap.radius - 0.06 && Math.abs(r.prof[k][0]) < r.cap.radius + 0.08) edgeStep = Math.max(edgeStep, Math.abs(r.prof[k][1] - r.prof[k - 1][1]));
      }
      const inside = r.prof.filter(([d]) => Math.abs(d) < r.cap.radius - 0.04).map(([, p]) => p);
      const flat = inside.length ? Math.max(...inside) - Math.min(...inside) : 0;
      return { cap: r.cap, maxDelta: +maxDelta.toFixed(4), deltaAt, edgeStep: +edgeStep.toFixed(4), flat: +flat.toFixed(4) };
    });
    console.log(`${st.name}: caps ${rows.length}`);
    for (const r of rows) console.log(`  chain${r.cap.chain} ctrl${r.cap.ctrl} p=${r.cap.p.toFixed(3)} maxDelta(on-off)=${r.maxDelta}@${r.deltaAt} flat=${r.flat} edgeStep=${r.edgeStep}`);
    all.push({ stand: st.name, q: st.q, moves: st.moves, rows, on, off });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(join(OUT, "k218c.json"), JSON.stringify(all, null, 1));
console.log("wrote k218c.json");
