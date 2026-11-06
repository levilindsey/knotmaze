// K1208 Run K - K218: trail mode's junction cap holds a flat p, then steps.
// Stand: K1139's cyc stand (stands_cyc.mjs link/moves verbatim) with the
// trail on at K93's sheet length (trl 5): pv=trail added, named here.
// Measure (the mirror K93's handoff used): kPaintAt along each faded
// cap's chain - flatness inside the cap radius, and the p step across
// its edge. Attribution: re-declare the paint without caps (probe-only
// setPaint in the page) and re-measure the worst cap.
//   node k218.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, PIN, setState, frames, sleep, stampText } from "./lib.mjs";
import { upscale3 } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const Q = "k111&am=instant&fw=0&snd=none&phw=0&pv=trail&trl=5";
const MOVES = [0, 246, 82, 83, 199, 150, 151, 38, 155, 211];
const { moveEdge } = await import("./lib.mjs");
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, Q, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of MOVES) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await waitAsleep(page);
  await page.evaluate(PIN);
  await sleep(200);
  const sample = () => page.evaluate(async () => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const D = MD.kData(), U = MD.knotUniformValues();
    const r = window.__knotRenderer();
    const S = r.paintState;
    const out = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
    const caps = S.paintCaps.map((c) => ({ chain: c.chain, ctrl: c.ctrl, radius: c.radius, p: c.p }));
    const rows = [];
    for (const cap of caps) {
      const c = PM.kChain(D, cap.chain);
      if (!c) continue;
      const a0 = PM.kArcOfCtrl(D, c, cap.ctrl);
      const prof = [];
      for (let d = -0.6; d <= 0.6001; d += 0.02) {
        const ctrl = PM.kCtrlOfArc(D, c, a0 + d);
        PM.kPaintAt(D, U, c, ctrl, a0 + d, 0.01, out, true);
        prof.push([+d.toFixed(2), +out.p.toFixed(4)]);
      }
      const inside = prof.filter(([d]) => Math.abs(d) < cap.radius - 0.04).map(([, p]) => p);
      const flat = inside.length ? Math.max(...inside) - Math.min(...inside) : 0;
      let edgeStep = 0, edgeAt = 0;
      for (let i = 1; i < prof.length; i++) {
        const d = Math.abs(prof[i][1] - prof[i - 1][1]);
        if (Math.abs(prof[i][0]) > cap.radius - 0.06 && Math.abs(prof[i][0]) < cap.radius + 0.08 && d > edgeStep) { edgeStep = d; edgeAt = prof[i][0]; }
      }
      rows.push({ cap, flat: +flat.toFixed(4), edgeStep: +edgeStep.toFixed(4), edgeAt, prof });
    }
    return { caps: caps.length, rows, head: window.__knotFabric().head };
  });
  const before = await sample();
  const faded = before.rows.filter((r) => r.cap.p < 0.98 && r.cap.p > 0.02);
  const worst = faded.slice().sort((a, b) => b.edgeStep - a.edgeStep)[0];
  console.log(`caps ${before.caps} faded ${faded.length} worst edgeStep ${worst ? worst.edgeStep : "-"} at cap p=${worst ? worst.cap.p : "-"} r=${worst ? worst.cap.radius : "-"}`);
  for (const r of faded) console.log(`  cap chain${r.cap.chain} ctrl${r.cap.ctrl} p=${r.cap.p.toFixed(3)} r=${r.cap.radius.toFixed(3)} flat=${r.flat} edgeStep=${r.edgeStep}@${r.edgeAt}`);
  // Crop at the worst cap's junction (its chain point on screen).
  let cropInfo = null;
  if (worst) {
    cropInfo = await page.evaluate((cap) => {
      const r = window.__knotRenderer(), k = window.__knotFabric();
      const cs = r.chainSamples[cap.chain];
      const sc = new Float32Array(4);
      r.plucks.host.sampleAt(cs, cs.controlArcLengths[Math.max(0, Math.min(cs.controlArcLengths.length - 1, Math.round(cap.ctrl)))], sc, 0);
      const v = window.__knotView();
      return { sx: sc[0] * v.s + v.x, sy: sc[1] * v.s + v.y };
    }, worst.cap);
    const S = 220;
    const clip = { x: Math.max(0, Math.round(cropInfo.sx - S / 2)), y: Math.max(0, Math.round(cropInfo.sy - S / 2)), width: S, height: S };
    writeFileSync(join(OUT, "k218_crop.png"), upscale3(await page.screenshot({ type: "png", clip })));
  }
  // Attribution: drop the caps from the declaration, re-profile the
  // worst cap's own span (same chain/ctrl, mirror now sees spans only).
  await page.evaluate(() => {
    const r = window.__knotRenderer(), S = r.paintState;
    S.setPaint(S.paintSpans, S.paintPulses, [], S.paintRoutes, S.paintTraveled, S.paintPulseBands);
    r.paintClock = 100;
    r.tickPaint(0);
  });
  await frames(page, 3);
  await sleep(150);
  let afterProf = null;
  if (worst) {
    afterProf = await page.evaluate(async (cap) => {
      const PM = await import("/src/render/paint_math.ts");
      const MD = await import("/src/render/paint_model.ts");
      const D = MD.kData(), U = MD.knotUniformValues();
      const c = PM.kChain(D, cap.chain);
      const a0 = PM.kArcOfCtrl(D, c, cap.ctrl);
      const out = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
      const prof = [];
      for (let d = -0.6; d <= 0.6001; d += 0.02) {
        const ctrl = PM.kCtrlOfArc(D, c, a0 + d);
        PM.kPaintAt(D, U, c, ctrl, a0 + d, 0.01, out, true);
        prof.push([+d.toFixed(2), +out.p.toFixed(4)]);
      }
      let edgeStep = 0;
      for (let i = 1; i < prof.length; i++) {
        if (Math.abs(prof[i][0]) > cap.radius - 0.06 && Math.abs(prof[i][0]) < cap.radius + 0.08) edgeStep = Math.max(edgeStep, Math.abs(prof[i][1] - prof[i - 1][1]));
      }
      return { prof, edgeStep: +edgeStep.toFixed(4), capsNow: window.__knotRenderer().paintState.paintCaps.length };
    }, worst.cap);
  }
  console.log(`caps-off: caps now ${afterProf ? afterProf.capsNow : "?"}; worst span edgeStep now ${afterProf ? afterProf.edgeStep : "-"}`);
  const stamp = await stampText(page);
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  writeFileSync(join(OUT, "k218.json"), JSON.stringify({ q: Q, moves: MOVES, before, afterProf, stamp, ctxLost }, null, 1));
  console.log(`stamp ${stamp} ctxLost ${ctxLost}`);
  await page.close();
} finally { await browser.close(); }
console.log("wrote k218.json");
