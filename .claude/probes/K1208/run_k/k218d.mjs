// K1208 Run K - K218 v4: scan seeds for a cap that draws (on/off delta).
// Walk: k397's deterministic choice walk, 14 moves. trl 5.
//   node k218d.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, PIN, frames, sleep } from "./lib.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const SEEDS = ["2", "3", "4", "5"];
const browser = await openBrowser();
const all = [];
try {
  for (const seed of SEEDS) {
    const log = [];
    const page = await openPage(browser, `${seed}&am=instant&fw=0&snd=none&phw=0&pv=trail&trl=5`, log);
    await page.waitForFunction(() => { const f = window.__knotFabric && window.__knotFabric(); return !!(f && f.choices && f.choices.length); }, { timeout: 60000 }).catch(() => {});
    const walked = new Set();
    for (let m = 0; m < 14; m++) {
      const f = await page.evaluate(() => { const f = window.__knotFabric(); return { choices: f.choices.map((c) => ({ edge: c.edge, dead: !!c.farDeadEnd })) }; }).catch(() => null);
      if (!f || !f.choices.length) break;
      let cand = f.choices.filter((c) => !walked.has(c.edge) && !c.dead);
      if (!cand.length) cand = f.choices.filter((c) => !walked.has(c.edge));
      if (!cand.length) cand = f.choices;
      const pick = cand[(m * 7 + 3) % cand.length];
      walked.add(pick.edge);
      await page.evaluate((e) => window.__knotTurnMove(e), pick.edge);
      await sleep(150);
      for (let i = 0; i < 100; i++) { if (!(await page.evaluate(() => window.__knotFabric().animating).catch(() => false))) break; await sleep(100); }
      await sleep(80);
    }
    await waitAsleep(page);
    await page.evaluate(PIN);
    await sleep(200);
    const profCaps = (decl) => page.evaluate(async (decl) => {
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
        for (let d = -0.6; d <= 0.6001; d += 0.04) {
          PM.kPaintAt(D, U, c, PM.kCtrlOfArc(D, c, a0 + d), a0 + d, 0.01, out, true);
          prof.push([+d.toFixed(2), +out.p.toFixed(4)]);
        }
        rows.push({ cap, prof });
      }
      return rows;
    }, decl);
    const decl = await page.evaluate(() => window.__knotRenderer().paintState.paintCaps.map((c) => ({ chain: c.chain, ctrl: c.ctrl, radius: c.radius, p: c.p })));
    const on = await profCaps(decl);
    await page.evaluate(() => {
      const r = window.__knotRenderer(), S = r.paintState;
      S.setPaint(S.paintSpans, S.paintPulses, [], S.paintRoutes, S.paintTraveled, S.paintPulseBands);
      r.paintClock = 100;
      r.tickPaint(0);
    });
    await frames(page, 3);
    await sleep(120);
    const off = await profCaps(decl);
    const rows = on.map((r, i) => {
      let maxDelta = 0, deltaAt = 0, edgeStep = 0;
      for (let k = 0; k < r.prof.length; k++) { const d = Math.abs(r.prof[k][1] - off[i].prof[k][1]); if (d > maxDelta) { maxDelta = d; deltaAt = r.prof[k][0]; } }
      for (let k = 1; k < r.prof.length; k++) if (Math.abs(r.prof[k][0]) > r.cap.radius - 0.08 && Math.abs(r.prof[k][0]) < r.cap.radius + 0.1) edgeStep = Math.max(edgeStep, Math.abs(r.prof[k][1] - r.prof[k - 1][1]));
      return { cap: r.cap, maxDelta: +maxDelta.toFixed(4), deltaAt, edgeStep: +edgeStep.toFixed(4) };
    });
    console.log(`seed ${seed}: caps ${rows.length} maxDelta max ${rows.length ? Math.max(...rows.map((r) => r.maxDelta)) : "-"}`);
    for (const r of rows) if (r.maxDelta > 0.001) console.log(`  DRAWS chain${r.cap.chain} ctrl${r.cap.ctrl} p=${r.cap.p.toFixed(3)} delta=${r.maxDelta}@${r.deltaAt} edgeStep=${r.edgeStep}`);
    all.push({ seed, rows });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(join(OUT, "k218d.json"), JSON.stringify(all, null, 1));
console.log("wrote k218d.json");
