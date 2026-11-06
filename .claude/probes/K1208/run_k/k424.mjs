// K1208 Run K - K424: junctions hidden while an arm turns visible.
// Stand from K397 stage 1 (jgate.mjs): seed 2gozcj, xp=threads, the same
// deterministic 12-move walk (k397.mjs walk, salt 3). Run K changes only
// the host/port and adds &phw=0 (named here, rule 11); the link Levi's
// item names, ?2gozcj.MgaM, decodes to this same design (K397 Diagnosis).
// Measure: r.exploreJointState() hidden junctions where an arm reads
// vis>0.002 at its slot or vis05>0.05 at 0.5 ctrl out (jgate's candidate
// rule), with junctions 87 and 160 named either way.
//   node k424.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, viewExact, sleep, stampText } from "./lib.mjs";
import { upscale3 } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const Q = "2gozcj&xp=threads&snd=none&fw=0&am=instant&phw=0";
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, Q, log, { width: 1400, height: 900, deviceScaleFactor: 1.5 });
  // wait for fabric choices
  for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(300)) {
    const ok = await page.evaluate(() => { const f = window.__knotFabric && window.__knotFabric(); return !!(f && f.choices && f.choices.length && !f.animating); });
    if (ok) break;
  }
  // k397.mjs walk (salt 3), verbatim logic.
  const walked = new Set();
  const walkLog = [];
  for (let m = 0; m < 12; m++) {
    const f = await page.evaluate(() => { const f = window.__knotFabric(); return { head: f.head, choices: f.choices.map((c) => ({ edge: c.edge, far: c.far, dead: !!c.farDeadEnd })) }; });
    let cand = f.choices.filter((c) => !walked.has(c.edge) && !c.dead);
    if (!cand.length) cand = f.choices.filter((c) => !walked.has(c.edge));
    if (!cand.length) cand = f.choices;
    const pick = cand[(m * 7 + 3) % cand.length];
    walked.add(pick.edge);
    const ok = await page.evaluate((e) => window.__knotTurnMove(e), pick.edge);
    walkLog.push({ m, head: f.head, edge: pick.edge, far: pick.far, ok });
    await sleep(150);
    for (let i = 0; i < 100; i++) { if (!(await page.evaluate(() => window.__knotFabric().animating))) break; await sleep(100); }
    await sleep(100);
  }
  await waitAsleep(page);
  // freezeHere (k397): pin clocks, explore clock at 1000.
  const build = await page.evaluate(async () => {
    const r = window.__knotRenderer();
    const proto = Object.getPrototypeOf(r);
    if (typeof window.__knotPhysFreeze === "function") await window.__knotPhysFreeze(true);
    r.flowStrength = 0;
    r.advanceClocks = function () {};
    r.paintClock = 100;
    r.pulseBorn = 0;
    r.tickPaint = function () { return proto.tickPaint.call(this, 0); };
    const F = window.__knotFabricRenderer();
    const fp = Object.getPrototypeOf(F);
    F.exploreClock = 1000;
    F.tickExplore = function () { return fp.tickExplore.call(this, 0); };
    if (typeof F.syncExplore === "function") F.syncExplore();
    for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
    const divs = [...document.querySelectorAll("div")].map((d) => d.textContent || "");
    return (divs.find((t) => /^P\d/.test(t)) || "STAMP MISSING").split(" | sim")[0];
  });
  await sleep(400);
  await viewStill(page);
  const state = await page.evaluate(() => {
    const r = window.__knotRenderer();
    const ps = r.ps;
    const js = r.exploreJointState();
    const hidden = new Set(js.junctions);
    const rows = [];
    r.junctionArms.forEach((jn, ji) => {
      if (!hidden.has(ji)) return;
      const arms = jn.arms.map((a) => {
        const n = ps.chains[a.chain].length;
        const closed = ps.chainBreakAfter[a.chain] < 0;
        const c = closed ? a.slot : Math.max(0, Math.min(n - 1, a.slot));
        return {
          chain: a.chain, slot: a.slot, dir: a.dir,
          vis: +r.exploreVisAt(a.chain, c).toFixed(4),
          vis05: +r.exploreVisAt(a.chain, c + 0.5 * a.dir).toFixed(4),
          vis1: +r.exploreVisAt(a.chain, c + 1.0 * a.dir).toFixed(4),
        };
      });
      const cand = arms.some((a) => a.vis > 0.002 || a.vis05 > 0.05);
      rows.push({ jn: ji, cand, arms });
    });
    // Screen point of a junction via the first arm's slot point.
    const ptOf = (ji) => {
      const a0 = r.junctionArms[ji].arms[0];
      const cs = r.chainSamples[a0.chain];
      const v = window.__knotView();
      const sc = new Float32Array(4);
      r.plucks.host.sampleAt(cs, cs.controlArcLengths[Math.max(0, Math.min(cs.controlArcLengths.length - 1, Math.round(a0.slot)))], sc, 0);
      return { sx: sc[0] * v.s + v.x, sy: sc[1] * v.s + v.y };
    };
    return {
      hiddenCount: js.junctions.length, junctionCount: r.junctionArms.length,
      rows, named: [87, 160].map((ji) => ({ jn: ji, hidden: hidden.has(ji), pt: ptOf(ji) })),
      candPts: rows.filter((x) => x.cand).map((x) => ({ jn: x.jn, pt: ptOf(x.jn) })),
      head: window.__knotFabric().head,
    };
  });
  console.log(`build ${build} junctions ${state.junctionCount} hidden ${state.hiddenCount} cands ${state.rows.filter((r) => r.cand).length} named ${JSON.stringify(state.named.map((n) => [n.jn, n.hidden]))} head ${state.head}`);
  for (const r of state.rows.filter((x) => x.cand)) console.log(`  CAND jn${r.jn}`, JSON.stringify(r.arms));
  for (const n of state.named) console.log(`  NAMED jn${n.jn} hidden=${n.hidden} pt ${n.pt.sx.toFixed(0)},${n.pt.sy.toFixed(0)}`);
  // Crop: first candidate junction (or jn87), zoomed to ~60 CSS px/world
  // (shoot.mjs wheel recipe), then re-read its screen point.
  const target = state.candPts[0] || { jn: 87, pt: state.named[0].pt };
  const ptOfJn = (jn) => page.evaluate((jn) => {
    const r = window.__knotRenderer();
    const a0 = r.junctionArms[jn].arms[0];
    const cs = r.chainSamples[a0.chain];
    const v = window.__knotView();
    const sc = new Float32Array(4);
    r.plucks.host.sampleAt(cs, cs.controlArcLengths[Math.max(0, Math.min(cs.controlArcLengths.length - 1, Math.round(a0.slot)))], sc, 0);
    return { sx: sc[0] * v.s + v.x, sy: sc[1] * v.s + v.y };
  }, jn);
  {
    let fpt = await ptOfJn(target.jn);
    const pxPerWorld = (p) => page.evaluate((p) => {
      const k = window.__knotFabric();
      const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
      return 100 / Math.hypot(b.x - a.x, b.y - a.y);
    }, p);
    const wheel = async (dy) => {
      await page.mouse.move(fpt.x, fpt.y);
      await page.keyboard.down("Control");
      await page.mouse.wheel({ deltaY: dy });
      await page.keyboard.up("Control");
      await sleep(250);
      await viewStill(page);
    };
    const s0 = await pxPerWorld(fpt);
    if (s0 < 58) {
      await wheel(-30);
      const s1 = await pxPerWorld(fpt);
      const kEff = Math.log(s1 / s0) / 30;
      if (kEff > 0 && s1 < 58) { fpt = await ptOfJn(target.jn); await wheel(-Math.log(60 / s1) / kEff); }
    }
    await page.mouse.move(2, 2);
    await sleep(300);
    await viewExact(page);
    target.pt = await ptOfJn(target.jn);
  }
  const S = 200;
  const clip = { x: Math.max(0, Math.round(target.pt.sx - S / 2)), y: Math.max(0, Math.round(target.pt.sy - S / 2)), width: S, height: S };
  const buf = await page.screenshot({ type: "png", clip });
  writeFileSync(join(OUT, "k424_crop.png"), upscale3(buf));
  const stamp = await stampText(page);
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  writeFileSync(join(OUT, "k424.json"), JSON.stringify({ q: Q, build, walkLog, state, stamp, ctxLost, cropJn: target.jn }, null, 1));
  console.log(`crop jn${target.jn} stamp ${stamp} ctxLost ${ctxLost}`);
  await page.close();
} finally { await browser.close(); }
console.log("wrote k424.json");
