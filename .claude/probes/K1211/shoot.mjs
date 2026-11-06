// K1211 S1 shooter: one stand, every junction-light look, one settled state
// with every clock pinned (same-state A/B; phw=0 and fw=0 in the links).
//   node shoot.mjs <stand> <outDir> [nf=24]
//   env K1211_HOST (default http://127.0.0.1:5962): a preview build.
// Works on builds without the K1211 hook (master): it then shoots look 0
// only, for the 0 px check against the branch.
// Writes into <outDir>:
//   m<L>_t<k>.png   look L (0 today, 1 A, 2 B), pulse phase k of nf, clip
//   m<L>_full.png   look L at phase 0, the whole viewport (wide views)
//   m0w_t<k>.png    look 0 with the webs hidden (edge attribution)
//   m0b_t0.png      look 0 again after looks 1 and 2 (the switch returns)
//   g<L>.png, g<L>_full.png  the gold at rest: pulses removed, look L
//   c<L>.png, c_full.png     colours only (no pulses, no gold), look L
//   bg.png, bg_full.png      background only (root hidden): material mask
//   meta.json       clip, scale, fh, records (centre, arms, routes), stamp
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep, frames, stampText, HOST } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  cross: { q: Q, moves: [0, 246, 82, 83, 199], focus: ["node_116", "mnode_48"] },
  x4: { q: Q + "&pr=8", moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], focus: ["node_378"] },
  loop: { q: "1&am=instant&fw=0&snd=none&phw=0&pr=8", moves: [185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178, 57, 101], focus: ["node_635"] },
};

const [, , STAND, OUTARG, NF = "24"] = process.argv;
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
  await page.evaluate(PIN);
  await sleep(200);
  fpt = await focusPt();
  const scale = await pxPerWorld();
  const W = 640, H = 420;
  // Even CSS offsets: at dsf 1.5 the clip starts on a whole device pixel.
  const ev = (v) => 2 * Math.round(v / 2);
  const clip = { x: Math.max(0, ev(fpt.x - W / 2)), y: Math.max(0, ev(fpt.y - H / 2)), width: W, height: H };
  // World -> page CSS affine (inverse of the fabric's toWorld).
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
    return {
      fh: r.style.threadWidth / 2, cusp: r.cuspRadius, spacing: r.pulseSpacing, reach: r.pulseReach,
      recs, view: window.__knotView(), head: k.head,
    };
  });
  const hasHook = await page.evaluate(() => typeof window.__knotJunctionLight === "function");
  const setLook = (L) => page.evaluate((L) => (window.__knotJunctionLight ? window.__knotJunctionLight(L) : 0), L);
  const shot = async (name, full = false) =>
    writeFileSync(join(OUT, name), await page.screenshot(full ? { type: "png" } : { type: "png", clip }));
  const period = geo.spacing / 1.6;
  const tOf = (k) => 100 + (k * period) / nf;
  const looks = hasHook ? [0, 1, 2] : [0];
  const lookRead = {};
  for (const L of looks) {
    lookRead[L] = await setLook(L);
    await frames(page, 3);
    for (let k = 0; k < nf; k++) {
      await setState(page, { t: tOf(k), dbg: 0, webs: true });
      await shot(`m${L}_t${k}.png`);
      if (k === 0) await shot(`m${L}_full.png`, true);
      if (L === 0) {
        await setState(page, { t: tOf(k), dbg: 0, webs: false });
        await shot(`m0w_t${k}.png`);
      }
    }
  }
  if (hasHook) {
    await setLook(0);
    await setState(page, { t: tOf(0), dbg: 0, webs: true });
    await shot("m0b_t0.png");
  }
  // The gold at rest: the live declaration without its pulses.
  await page.evaluate(() => {
    const r = window.__knotRenderer(), S = r.paintState;
    r.setPaint(S.paintSpans, [], S.paintCaps, S.paintRoutes, S.paintTraveled);
    r.pulseBorn = 0;
  });
  for (const L of looks) {
    await setLook(L);
    await setState(page, { t: tOf(0), dbg: 0, webs: true });
    await shot(`g${L}.png`);
    await shot(`g${L}_full.png`, true);
  }
  // Colours only: no pulses, no gold, no routes, no caps.
  await page.evaluate(() => {
    const r = window.__knotRenderer(), S = r.paintState;
    r.setPaint([], [], [], [], S.paintTraveled);
    r.pulseBorn = 0;
  });
  for (const L of looks) {
    await setLook(L);
    await setState(page, { t: tOf(0), dbg: 0, webs: true });
    await shot(`c${L}.png`);
    if (L === 0) await shot("c_full.png", true);
  }
  await setLook(0);
  // Background only: the material mask's reference.
  await page.evaluate(() => { window.__knotRenderer().root.renderable = false; });
  await frames(page, 3);
  await sleep(150);
  await shot("bg.png");
  await shot("bg_full.png", true);
  await page.evaluate(() => { window.__knotRenderer().root.renderable = true; });
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  const stamp = await stampText(page);
  const meta = { stand: STAND, host: HOST, q: st.q, moves: st.moves, clip, scale, dsf: 1.5, nf, period, hasHook, lookRead, ...geo, fpt, stamp, ctxLost, secs: (Date.now() - t0) / 1000, log };
  writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 1));
  console.log(`${STAND} @ ${HOST}: hook ${hasHook} looks ${JSON.stringify(lookRead)} clip ${JSON.stringify(clip)} scale ${scale.toFixed(1)} fh ${geo.fh.toFixed(4)} recs ${geo.recs.length} ctxLost ${ctxLost} ${((Date.now() - t0) / 1000).toFixed(0)} s stamp ${stamp}`);
} finally {
  await browser.close();
}
