// K1208 Run K - K15 v3 (CPU gate read, 100 ms polls): for eight
// junctions, the fan's alpha (knotFanAlpha of jointGate at the arms'
// slot+0.8 points, joinery's own gate points) against the base ribbon's
// reveal width mask at those points and farther out. Present would be:
// alpha ~1 while a mask beside it is still well under 1.
//   node k15c.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, sleep, stampText } from "./lib.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const Q = "7&am=trace-roots&as=0.3&fw=0&snd=none&phw=0";
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, Q, log);
  await page.waitForFunction(() => { const r = window.__knotRenderer && window.__knotRenderer(); return !!(r && r.junctionArms && r.junctionArms.length > 0); }, { timeout: 60000 });
  const series = [];
  const t0 = Date.now();
  let doneSeen = false;
  while (Date.now() - t0 < 90000 && !doneSeen) {
    const snap = await page.evaluate(async () => {
      const PM = await import("/src/render/paint_math.ts");
      const MD = await import("/src/render/paint_model.ts");
      const D = MD.kData(), U = MD.knotUniformValues();
      const r = window.__knotRenderer();
      const fx = U.uKFx[2];
      const rows = [];
      for (let ji = 0; ji < r.junctionArms.length; ji += 17) {
        const jn = r.junctionArms[ji];
        const pts = jn.arms.map((a) => [a.chain, a.slot + a.dir * 0.8]);
        const j1 = r.jointGate("probe" + ji, pts);
        const alpha = PM.knotFanAlpha(U, j1[0], j1[1]);
        const masks = jn.arms.map((a) => {
          const c = PM.kChain(D, a.chain);
          const at = (dc) => +PM.kRevealMaskAt(D, U, c, a.slot + a.dir * dc).toFixed(3);
          return { g: at(0.8), m15: at(1.5), m30: at(3.0) };
        });
        rows.push({ ji, alpha: +alpha.toFixed(3), masks });
      }
      const rv = window.__knotReveal && window.__knotReveal();
      return { fx: +fx.toFixed(2), rows, done: rv ? !!rv.done : false };
    });
    series.push({ t: +((Date.now() - t0) / 1000).toFixed(2), ...snap });
    if (snap.done && snap.rows.every((r) => r.alpha >= 0.999)) doneSeen = true;
    await sleep(100);
  }
  // Verdict numbers: at the first poll where a junction's alpha >= 0.99,
  // its arms' masks; and the worst (alpha - min gate mask) lead overall.
  const firstFull = {};
  let worstLead = { lead: -1 };
  for (const s of series) for (const r of s.rows) {
    const minG = Math.min(...r.masks.map((m) => m.g));
    const lead = r.alpha - minG;
    if (lead > worstLead.lead) worstLead = { lead: +lead.toFixed(3), ji: r.ji, t: s.t, alpha: r.alpha, minG };
    if (r.alpha >= 0.99 && !(r.ji in firstFull)) firstFull[r.ji] = { t: s.t, masks: r.masks };
  }
  console.log(`polls ${series.length} worstLead ${JSON.stringify(worstLead)}`);
  for (const [ji, f] of Object.entries(firstFull)) console.log(`  ji${ji} alpha>=0.99 at t=${f.t} masks ${JSON.stringify(f.masks)}`);
  const stamp = await stampText(page);
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  writeFileSync(join(OUT, "k15c.json"), JSON.stringify({ q: Q, series, firstFull, worstLead, stamp, ctxLost }, null, 1));
  console.log(`stamp ${stamp} ctxLost ${ctxLost}`);
  await page.close();
} finally { await browser.close(); }
console.log("wrote k15c.json");
