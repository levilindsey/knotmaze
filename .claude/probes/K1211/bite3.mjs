// K1211 S3 bite attribution (shoot3.mjs's setup): dumps one record's arms, routes, pulse bands and twin colours across the bite at phases 2, 4, 6.
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
  const period = geo.spacing / 1.6;
  const tOf = (k) => 100 + (k * period) / nf;
  const JI = Number(process.env.K1211_JI || 149);
  const BX = Number(process.env.K1211_BX || 1291), BY = Number(process.env.K1211_BY || 520);
  const dump = {};
  for (const kk of [2, 4, 6]) {
    await setState(page, { t: tOf(kk), dbg: 0, webs: true });
    writeFileSync(join(OUT, `bite_L0_t${kk}.png`), await page.screenshot({ type: "png" }));
    dump[kk] = await page.evaluate(({ JI, BX, BY }) => {
      const k = window.__knotFabric(), r = window.__knotRenderer(), fp = r.fieldProbe;
      const arms = fp.arms(JI).map((a, i) => ({ i, ...Object.fromEntries(Object.entries(a).filter(([, v]) => typeof v !== "object")) }));
      const routes = fp.routes(JI);
      const c = fp.center(JI);
      const pl = r.pulseByJn ? r.pulseByJn.get(JI) : null;
      const list = pl ? pl.map((p) => ({ a: p.a, b: p.b, distJ: p.distJ, inward: p.inward, hovered: p.hovered, gR: p.gR, inwardR: p.inwardR })) : null;
      const keys = r.pulseByJn ? [...r.pulseByJn.keys()] : [];
      const w0 = k.toWorld(BX / 1.5, BY / 1.5), w1 = k.toWorld(BX / 1.5 + 1, BY / 1.5);
      const px = Math.hypot(w1.x - w0.x, w1.y - w0.y) / 1.5;
      const samples = [];
      for (let dx = -14; dx <= 14; dx += 2) {
        for (let dy = -6; dy <= 6; dy += 6) {
          const w = k.toWorld((BX + dx) / 1.5, (BY + dy) / 1.5);
          const out = new Float32Array(4);
          fp.at(JI, w.x, w.y, out, px, false);
          samples.push({ dx, dy, out: [...out].map((v) => Math.round(v * 255)) });
        }
      }
      return { arms, routes, c, keysHas: keys.includes(JI), nKeys: keys.length, list, px, bite: [w0.x, w0.y], samples };
    }, { JI, BX, BY });
  }
  writeFileSync(join(OUT, "bite_dump.json"), JSON.stringify(dump, null, 1));
  const d4 = dump[4];
  console.log(JSON.stringify({ arms: d4.arms, routes: d4.routes, list: d4.list, keysHas: d4.keysHas, nKeys: d4.nKeys }));
} finally {
  await browser.close();
}
