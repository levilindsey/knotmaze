// K1139 P8 debug: one stand, one phase: dump every sample's inputs and
// the sampled pixel, plus the debug-5 frame, for offline diagnosis.
//   node p8debug.mjs <stand> <outPrefix> [t]
import { writeFileSync } from "node:fs";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, frames } from "./lib.mjs";
import { decodePNG, toRGB } from "./png.mjs";

const STANDS = {
  fork: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0] },
  cross: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0, 246, 82, 83, 199] },
  src: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0, 246, 82, 83, 199, 150] },
};
const [, , STAND, OUT, T = "100"] = process.argv;
const st = STANDS[STAND];
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await page.evaluate(PIN);
  const t = Number(T);
  await setState(page, { t, dbg: 5, webs: true });
  const pts = await page.evaluate(async () => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const D = MD.kData();
    const r = window.__knotRenderer(), fb = window.__knotFabricRenderer(), W = fb.walk;
    const U = MD.knotUniformValues();
    const view = window.__knotView();
    const wp = new Float32Array(2);
    const out = [];
    for (const p of r.paintState.paintPulses) {
      const e = W.edges.find((e) => e.chain === p.chain && ((e.ctrlA === p.cJunction && e.ctrlB === p.cFar) || (e.ctrlB === p.cJunction && e.ctrlA === p.cFar)));
      if (!e) continue;
      const c = PM.kChain(D, p.chain);
      const samples = r.chainSamples[p.chain];
      const arcJ = c.closed ? PM.kArcU(D, c, p.cJunction) : PM.kArcOfCtrl(D, c, p.cJunction);
      const arcF = c.closed ? PM.kArcU(D, c, p.cFar) : PM.kArcOfCtrl(D, c, p.cFar);
      const span = Math.abs(arcF - arcJ);
      const dir = Math.sign(arcF - arcJ) || 1;
      for (const d of [0.7, span / 2, span - 0.7]) {
        if (span < 1.3) break;
        const target = arcJ + dir * d;
        const wrapped = c.closed ? ((target % c.total) + c.total) % c.total : target;
        let ctrl = PM.kCtrlOfArc(D, c, wrapped);
        if (c.closed) { while (ctrl < e.ctrlA - 0.5) ctrl += c.nCtrl; while (ctrl > e.ctrlB + 0.5) ctrl -= c.nCtrl; }
        r.sampleAt(samples, r.arcAt(samples, ctrl), wp, 0);
        const paint={}; const v = PM.kPaintAt(D, U, c, ctrl, c.closed ? ((arcJ + dir * d) % c.total + c.total) % c.total : arcJ + dir * d, 0, paint).v;
        out.push({ edge: e.id, chain: p.chain, cJ: p.cJunction, cF: p.cFar, d: +d.toFixed(3), span: +span.toFixed(3), dist0: p.dist0 ?? 0, cont: !!p.cont, inward: !!p.inward, hovered: !!p.hovered, ctrl: +ctrl.toFixed(2), x: +(wp[0] * view.s + view.x).toFixed(1), y: +(wp[1] * view.s + view.y).toFixed(1), v: +v.toFixed(4), uPulse: Array.from(U.uKPulse).map((a) => +a.toFixed(3)) });
      }
    }
    return out;
  });
  await frames(page, 2);
  const shot = await page.screenshot({ type: "png" });
  writeFileSync(`${OUT}.png`, Buffer.from(shot));
  const img = toRGB(decodePNG(Buffer.from(shot)));
  for (const p of pts) {
    const x = Math.round(p.x * 1.5), y = Math.round(p.y * 1.5);
    p.px = [x, y];
    p.rgb = x >= 0 && y >= 0 && x < img.W && y < img.H ? Array.from(img.data.slice((y * img.W + x) * 3, (y * img.W + x) * 3 + 3)) : null;
  }
  writeFileSync(`${OUT}.json`, JSON.stringify(pts, null, 1));
  console.log(`${STAND}@${t}: ${pts.length} samples -> ${OUT}.png/.json`);
} finally {
  await browser.close();
}
