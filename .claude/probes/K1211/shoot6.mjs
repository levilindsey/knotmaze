// K1211 S6 shooter (a copy of S4's shoot4.mjs without the webs-off, pure, nomask, bg and return shots: L0_t<k>, nb_t<k>, np.png and meta.json). S4: K1211 S4 shooter (a copy of S3's shoot3.mjs: look 1 = the variant behind uJParams.z when the hook exists; env K1211_MARK = a string the served junction_field.ts must hold; S3: adds the webs-off shot at every phase): one stand, one settled state with every clock pinned,
// FULL-VIEWPORT shots only (crops2.mjs cuts each junction out, so every
// junction of the stand is centred in its own crop: S1's open question).
//   node shoot3.mjs <stand> <outDir> [nf=8]
//   env K1211_HOST (default http://127.0.0.1:5962).
// The fabric re-declares the paint every frame (fabric_maze_renderer
// update(): setPaint(..., computePulseBands().feed)), which overrode S1's
// declared states (its c shots equalled its g shots). Here the instance's
// setPaint is wrapped: while window.__k1211Block is set the fabric's calls
// are dropped and only the probe's own (window.__k1211Set) reach the paint.
// Writes into <outDir>:
//   L<L>_t<k>.png  live declaration, look L (0 today; 2 = look B on the branch), phase k of nf
//   w0_t<k>.png    look 0, phase k, webs (the fan mesh: discs, wedges, cover strips) hidden
//   nb_t<k>.png    look 0, the live declaration without the fan's pulse bands (6th arg [])
//   np.png         look 0, the gold with no light at all (no pulses, no bands), phase 0
//   pure.png       pure colours: no spans, pulses, caps, routes, traveled or bands
//   nomask.png     live declaration (look 0, phase 0) with the crossing-gap mask off
//   bg.png         background only (root hidden)
//   meta.json      scale, fh, every record (centre on screen, arms, routes), stamp, log
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, viewExact, moveEdge, PIN, setState, sleep, frames, stampText, HOST } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  cross: { q: Q, moves: [0, 246, 82, 83, 199], focus: ["node_116", "mnode_48"] },
  x4: { q: Q + "&pr=8", moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], focus: ["node_378"] },
  loop: { q: "1&am=instant&fw=0&snd=none&phw=0&pr=8", moves: [185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178, 57, 101], focus: ["node_635"] },
};

const [, , STAND, OUTARG, NF = "8"] = process.argv;
const st = STANDS[STAND];
if (!st) throw new Error(`stand ${STAND}?`);
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const nf = Number(NF);
const browser = await openBrowser();
const log = [];
const t0 = Date.now();
try {
  const page = await openPage(browser, st.q, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  const focusPt = () => page.evaluate((ids) => {
    const k = window.__knotFabric();
    const ps = ids.map((id) => k.vertexScreen(id));
    return { x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length };
  }, st.focus);
  let fpt = await focusPt();
  const pxPerWorld = () => page.evaluate((p) => {
    const k = window.__knotFabric();
    const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
    return 100 / Math.hypot(b.x - a.x, b.y - a.y);
  }, fpt);
  const wheel = async (dy) => {
    await page.mouse.move(fpt.x, fpt.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel({ deltaY: dy });
    await page.keyboard.up("Control");
    await sleep(250);
    await viewStill(page);
  };
  const target = 60;
  const s0 = await pxPerWorld();
  if (s0 < target * 0.97) {
    await wheel(-30);
    const s1 = await pxPerWorld();
    const kEff = Math.log(s1 / s0) / 30;
    if (kEff > 0 && s1 < target * 0.97) await wheel(-Math.log(target / s1) / kEff);
  }
  await page.mouse.move(2, 2);
  await sleep(400);
  await viewStill(page);
  await waitAsleep(page, 20000);
  const exact = await viewExact(page);
  await page.evaluate(PIN);
  await sleep(200);
  fpt = await focusPt();
  const scale = await pxPerWorld();
  const geo = await page.evaluate(() => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const w0 = k.toWorld(0, 0), w1 = k.toWorld(100, 0), w2 = k.toWorld(0, 100);
    const ax = (w1.x - w0.x) / 100, ay = (w1.y - w0.y) / 100, bx = (w2.x - w0.x) / 100, by = (w2.y - w0.y) / 100;
    const det = ax * by - bx * ay;
    const toScreen = (x, y) => {
      const dx = x - w0.x, dy = y - w0.y;
      return [(by * dx - bx * dy) / det, (-ay * dx + ax * dy) / det];
    };
    const fp = r.fieldProbe;
    const recs = [];
    const nJ = r.junctionArms ? r.junctionArms.length : 0;
    for (let ji = 0; ji < nJ; ji++) {
      const c = fp && fp.center(ji);
      const rb = fp ? fp.record(ji) : -1;
      if (!c || rb < 0) continue;
      const [sx, sy] = toScreen(c[0], c[1]);
      const arms = fp.arms(ji).map((a) => ({ ang: a.ang, chain: a.chain, dir: a.dir, domain: a.domain }));
      const routes = fp.routes(ji).map((q) => ({ ia: q.ia, ib: q.ib, d: q.d, m: q.m }));
      recs.push({ ji, rb, c, sx, sy, arms, routes, full: fp.full(ji), fade: fp.fade(ji) });
    }
    const S = r.paintState;
    return {
      fh: r.style.threadWidth / 2, cusp: r.cuspRadius, spacing: r.pulseSpacing, reach: r.pulseReach,
      recs, view: window.__knotView(), head: k.head,
      aff: { w0x: w0.x, w0y: w0.y, ax, ay, bx, by },
      decl: { spans: S.paintSpans.length, pulses: S.paintPulses.length, caps: S.paintCaps.length, routes: S.paintRoutes.length, traveled: S.paintTraveled.length, bands: (S.paintPulseBands || []).length },
    };
  });
  const hasHook = await page.evaluate(() => typeof window.__knotJunctionLight === "function");
  const served = await page.evaluate(async (mark) => { const s = await (await fetch("/src/render/junction_field.ts")).text(); return { len: s.length, mark: mark ? s.includes(mark) : null }; }, process.env.K1211_MARK || "");
  const setLook = (L) => page.evaluate((L) => (window.__knotJunctionLight ? window.__knotJunctionLight(L) : 0), L);
  const shot = async (name) => writeFileSync(join(OUT, name), await page.screenshot({ type: "png" }));
  const period = geo.spacing / 1.6;
  const tOf = (k) => 100 + (k * period) / nf;
  const looks = hasHook ? [0, 1] : [0];
  const lookRead = {};
  for (const L of looks) {
    lookRead[L] = await setLook(L);
    await frames(page, 3);
    for (let k = 0; k < nf; k++) {
      await setState(page, { t: tOf(k), dbg: 0, webs: true });
      await shot(`L${L}_t${k}.png`);
    }
  }
  await setLook(0);
  // Block the fabric's re-declare; the probe declares through __k1211Set.
  const declRead = await page.evaluate(() => {
    const r = window.__knotRenderer(), S = r.paintState;
    const D = { spans: S.paintSpans, pulses: S.paintPulses, caps: S.paintCaps, routes: S.paintRoutes, traveled: S.paintTraveled, bands: S.paintPulseBands || [] };
    window.__k1211D = D;
    const orig = r.setPaint.bind(r);
    window.__k1211Block = true;
    r.setPaint = function (...a) { if (window.__k1211Block) return; return orig(...a); };
    window.__k1211Set = (which) => {
      const E = [];
      if (which === "nb") orig(D.spans, D.pulses, D.caps, D.routes, D.traveled, E);
      else if (which === "np") orig(D.spans, E, D.caps, D.routes, D.traveled, E);
      else if (which === "pure") orig(E, E, E, E, E, E);
      else if (which === "live") orig(D.spans, D.pulses, D.caps, D.routes, D.traveled, D.bands);
      r.pulseBorn = 0;
      r.rebuildFillets(true);
      const T = r.paintState;
      return { which, spans: T.paintSpans.length, pulses: T.paintPulses.length, routes: T.paintRoutes.length, traveled: T.paintTraveled.length, bands: (T.paintPulseBands || []).length };
    };
    return { spans: D.spans.length, pulses: D.pulses.length, routes: D.routes.length, traveled: D.traveled.length, bands: D.bands.length };
  });
  const declared = {};
  declared.nb = await page.evaluate(() => window.__k1211Set("nb"));
  for (let k = 0; k < nf; k++) {
    await setState(page, { t: tOf(k), dbg: 0, webs: true });
    await shot(`nb_t${k}.png`);
  }
  declared.np = await page.evaluate(() => window.__k1211Set("np"));
  await setState(page, { t: tOf(0), dbg: 0, webs: true });
  await shot("np.png");
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  const stamp = await stampText(page);
  const viewEnd = await page.evaluate(() => window.__knotView());
  const meta = { stand: STAND, host: HOST, q: st.q, moves: st.moves, scale, dsf: 1.5, nf, period, tOf: [...Array(nf).keys()].map(tOf), hasHook, served, lookRead, declRead, declared, ...geo, exact, viewEnd, fpt, stamp, ctxLost, secs: (Date.now() - t0) / 1000, log };
  writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 1));
  const drift = JSON.stringify([geo.view.x, geo.view.y, geo.view.s]) !== JSON.stringify([viewEnd.x, viewEnd.y, viewEnd.s]);
  const errs = log.filter((l) => /^\[(error|pageerror)\]/.test(l)).length;
  console.log(`${STAND} @ ${HOST}: exact ${exact} drift ${drift} hook ${hasHook} served ${JSON.stringify(served)} decl ${JSON.stringify(geo.decl)} declared ${JSON.stringify(declared)} scale ${scale.toFixed(1)} fh ${geo.fh.toFixed(4)} recs ${geo.recs.length} ctxLost ${ctxLost} errors ${errs} ${((Date.now() - t0) / 1000).toFixed(0)} s stamp ${stamp}`);
} finally {
  await browser.close();
}
