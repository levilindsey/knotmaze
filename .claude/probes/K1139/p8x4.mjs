// K1139 P8 x4/e79 diagnosis: where is e79's t=100.45 crest, and what
// crossings sit near it on its chain?
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState } from "./lib.mjs";

const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, "k111&am=instant&fw=0&snd=none&phw=0&pr=8", log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of [0, 247, 248, 69, 72, 73, 95, 140, 180]) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await page.evaluate(PIN);
  await setState(page, { t: 100.45, dbg: 5, webs: true });
  const out = await page.evaluate(async () => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const D = MD.kData();
    const r = window.__knotRenderer(), fb = window.__knotFabricRenderer(), W = fb.walk;
    const U = MD.knotUniformValues();
    const phys = window.__knotPhys();
    const res = [];
    for (const p of r.paintState.paintPulses) {
      const e = W.edges.find((e) => e.chain === p.chain && ((e.ctrlA === p.cJunction && e.ctrlB === p.cFar) || (e.ctrlB === p.cJunction && e.ctrlA === p.cFar)));
      if (!e || e.id !== 79) continue;
      const c = PM.kChain(D, p.chain);
      const arcJ = c.closed ? PM.kArcU(D, c, p.cJunction) : PM.kArcOfCtrl(D, c, p.cJunction);
      const arcF = c.closed ? PM.kArcU(D, c, p.cFar) : PM.kArcOfCtrl(D, c, p.cFar);
      const span = Math.abs(arcF - arcJ), dir = Math.sign(arcF - arcJ) || 1;
      const [tIn, tOut, sp] = U.uKPulse;
      const crests = [];
      for (let m = -1; m * sp < span + sp; m++) {
        const d = (p.inward ? m * sp - tIn : tOut + m * sp) - (p.dist0 ?? 0);
        if (d > 0 && d < span) crests.push(+d.toFixed(3));
      }
      const xs = [];
      for (const cr of phys.crossings) for (const s of [cr.over, cr.under]) {
        const [ch, ct] = s.split(":").map(Number);
        if (ch !== p.chain) continue;
        const a = PM.kArcOfCtrl(D, PM.kChain(D, ch), ct);
        // distance from the arm's junction end along its direction
        const dd = dir > 0 ? a - arcJ : arcJ - a;
        const w = c.closed ? ((dd % c.total) + c.total) % c.total : dd;
        if (w > -0.5 && w < span + 0.5) xs.push(+w.toFixed(3));
      }
      res.push({ edge: e.id, chain: p.chain, span: +span.toFixed(3), dist0: p.dist0 ?? 0, inward: !!p.inward, cont: !!p.cont, crests, crossingDs: xs.sort((a, b) => a - b), uPulse: Array.from(U.uKPulse) });
    }
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
