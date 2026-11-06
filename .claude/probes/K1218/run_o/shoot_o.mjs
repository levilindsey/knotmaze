// K1218 Run O shooter: S2's loop and x4 stands after their walks, at S2's
// size and dsf (1700x950, dsf 1.5, zoom to 60 CSS px per world), at rest
// (phase 0, look 0). Copied from .claude/probes/K1211/shoot2.mjs (never
// edited there): same links, moves, PIN, setPaint blocking and shots
// (live, w0, np, pure, nomask, bg), plus a slot-table dump (meta_o.json)
// read through the __knotRenderer() probe hook - no src/ edit.
//   node shoot_o.mjs <stand> <outDir>
//   env K1211_HOST (lib.mjs) default http://127.0.0.1:5980 in run_o.ps1.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, viewExact, moveEdge, PIN, setState, sleep, frames, stampText, HOST } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  x4: { q: Q + "&pr=8", moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], focus: ["node_378"] },
  loop: { q: "1&am=instant&fw=0&snd=none&phw=0&pr=8", moves: [185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178, 57, 101], focus: ["node_635"] },
};

const [, , STAND, OUTARG] = process.argv;
const st = STANDS[STAND];
if (!st) throw new Error(`stand ${STAND}?`);
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
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
      const arms = fp.arms(ji).map((a) => ({ ang: a.ang, chain: a.chain, dir: a.dir, domain: a.domain, slot: a.slot, arc0: a.arc0 }));
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
  // Slot-table dump through the probe hook (renderer.gaps + renderer.ps).
  const dump = await page.evaluate(() => {
    const r = window.__knotRenderer();
    const out = { slots: [], chains: {}, wins: {}, jctrls: {}, spans: [], caps: [], routes: [], traveled: [], walkEdges: [], crossingsN: 0 };
    try {
      const G = r.gaps;
      out.gapsSlots = G.slots;
      out.crossingsN = r.ps.crossings.length;
      out.emergentBase = r.emergentBase;
      out.markerBase = r.markerBase;
      for (let s = 0; s < G.slots; s++) {
        const d = G.describeSlot(s);
        if (!(d.bound[2] > 0)) continue;
        const rd = G.readSlot(s);
        let cross = null;
        if (s < r.ps.crossings.length) {
          const c = r.ps.crossings[s];
          cross = { over: { chain: c.over.chain, ctrl: c.over.ctrl, displayF: c.over.displayF ?? null }, under: { chain: c.under.chain, ctrl: c.under.ctrl, displayF: c.under.displayF ?? null }, sign: c.sign };
        }
        out.slots.push({
          slot: s, desc: d, range: rd.range, n: rd.n,
          overChain: r.slotOverChain[s], overArc: r.slotOverArc[s], overCtrl: r.slotOverCtrl[s],
          underChain: r.slotUnderChain[s], underCenter: r.slotUnderCenter[s], live: r.slotLive[s],
          cutNeg: r.slotCutNeg[s], cutPos: r.slotCutPos[s], coverNeg: r.slotCoverNeg[s], coverPos: r.slotCoverPos[s],
          cross,
        });
      }
      for (let c = 0; c < r.chainSamples.length; c++) {
        const sm = r.chainSamples[c];
        if (!sm) continue;
        out.chains[c] = { count: sm.count, total: sm.totalLength, closed: sm.closed, ctrlArc: Array.from(sm.controlArcLengths), pos: Array.from(sm.positions) };
      }
      for (const [c, w] of r.chainWins) out.wins[c] = Array.from(w);
      for (const [c, v] of r.junctionArcCtrls) out.jctrls[c] = v.map((x) => ({ ctrl: x.ctrl, jn: x.jn }));
      const S = r.paintState;
      out.spans = S.paintSpans.map((s) => ({ chain: s.chain, c0: s.c0, c1: s.c1, p0: s.p0 ?? 1, p1: s.p1 ?? 1 }));
      out.caps = S.paintCaps.map((s) => ({ chain: s.chain, ctrl: s.ctrl, radius: s.radius, p: s.p ?? 1 }));
      out.routes = S.paintRoutes.map((s) => ({ ...s }));
      out.traveled = S.paintTraveled.map((s) => ({ ...s }));
      const fb = window.__knotFabricRenderer();
      out.walkEdges = fb.walk.edges.map((e) => ({ id: e.id, chain: e.chain, ctrlA: e.ctrlA, ctrlB: e.ctrlB, va: e.va, vb: e.vb, length: e.length }));
      out.jarms = r.junctionArms.map((j, ji) => ({ ji, arms: j.arms.map((a) => ({ chain: a.chain, slot: a.slot, dir: a.dir })) }));
    } catch (e) {
      out.error = String(e && e.stack || e);
    }
    return out;
  });
  const hasHook = await page.evaluate(() => typeof window.__knotJunctionLight === "function");
  const setLook = (L) => page.evaluate((L) => (window.__knotJunctionLight ? window.__knotJunctionLight(L) : 0), L);
  const shot = async (name) => writeFileSync(join(OUT, name), await page.screenshot({ type: "png" }));
  const period = geo.spacing / 1.6;
  const tOf = (k) => 100 + (k * period) / 8;
  const lookRead = { 0: await setLook(0) };
  await frames(page, 3);
  await setState(page, { t: tOf(0), dbg: 0, webs: true });
  await shot("L0_t0.png");
  await setState(page, { t: tOf(0), dbg: 0, webs: false });
  await shot("w0_t0.png");
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
  await setState(page, { t: tOf(0), dbg: 0, webs: true });
  await shot("nb_t0.png");
  declared.np = await page.evaluate(() => window.__k1211Set("np"));
  await setState(page, { t: tOf(0), dbg: 0, webs: true });
  await shot("np.png");
  declared.pure = await page.evaluate(() => window.__k1211Set("pure"));
  await setState(page, { t: tOf(0), dbg: 0, webs: true });
  await shot("pure.png");
  declared.live = await page.evaluate(() => window.__k1211Set("live"));
  await page.evaluate(() => { const r = window.__knotRenderer(); r.maskEnabled = false; r.update(); r.rebuildFillets(true); });
  await setState(page, { t: tOf(0), dbg: 0, webs: true });
  await shot("nomask.png");
  await page.evaluate(() => { const r = window.__knotRenderer(); r.maskEnabled = true; r.update(); r.rebuildFillets(true); });
  await page.evaluate(() => { window.__knotRenderer().root.renderable = false; });
  await frames(page, 3);
  await sleep(150);
  await shot("bg.png");
  await page.evaluate(() => { window.__knotRenderer().root.renderable = true; });
  await setState(page, { t: tOf(0), dbg: 0, webs: true });
  await shot("L0_ret.png");
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  const stamp = await stampText(page);
  const viewEnd = await page.evaluate(() => window.__knotView());
  const meta = { stand: STAND, host: HOST, q: st.q, moves: st.moves, scale, dsf: 1.5, period, t0: tOf(0), hasHook, lookRead, declRead, declared, ...geo, dump, exact, viewEnd, fpt, stamp, ctxLost, secs: (Date.now() - t0) / 1000, log };
  writeFileSync(join(OUT, "meta_o.json"), JSON.stringify(meta, null, 1));
  const drift = JSON.stringify([geo.view.x, geo.view.y, geo.view.s]) !== JSON.stringify([viewEnd.x, viewEnd.y, viewEnd.s]);
  const errs = log.filter((l) => /^\[(error|pageerror)\]/.test(l)).length;
  console.log(`${STAND} @ ${HOST}: exact ${exact} drift ${drift} hook ${hasHook} decl ${JSON.stringify(geo.decl)} declared ${JSON.stringify(declared)} scale ${scale.toFixed(1)} fh ${geo.fh.toFixed(4)} recs ${geo.recs.length} slots ${dump.slots ? dump.slots.length : "?"} ctxLost ${ctxLost} errors ${errs} ${((Date.now() - t0) / 1000).toFixed(0)} s stamp ${stamp}`);
} finally {
  await browser.close();
}
