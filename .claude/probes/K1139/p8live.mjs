// K1139 P8 (the real pipeline): debug view 5's G channel at points along
// each declared arm's drawn centerline against the CPU mirror's kPulseV at
// the same arc and pinned clock (K299's recipe: two phases, t=100 and
// t=100.45, so a run with no crest at one phase still reads at the other).
// Samples sit at drawn arcs in [0.3, 0.7] of each arm's span: clear of the
// fan at both ends and of the end window. Pass: max |G - v*255| <= 2.
//   node p8live.mjs <stand> [extraLinkKeys]
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep, frames } from "./lib.mjs";
import { decodePNG, toRGB } from "./png.mjs";

const STANDS = {
  fork: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0] },
  cross: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0, 246, 82, 83, 199] },
  src: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0, 246, 82, 83, 199, 150] },
  four: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0, 247, 248, 69, 72, 73, 95, 140, 180, 176] },
  x4: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], extra: "&pr=8" },
};
const [, , STAND, EXTRA = ""] = process.argv;
const st = STANDS[STAND];
if (!st) throw new Error(`stand ${STAND}?`);
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q + (st.extra || "") + EXTRA, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await page.evaluate(PIN);
  let worst = 0, worstAt = "", n = 0, over = 0;
  for (const t of [100, 100.45]) {
    // Expected v at drawn points along every declared arm (page-side).
    const pts = await page.evaluate(async (t) => {
      const PM = await import("/src/render/paint_math.ts");
      const MD = await import("/src/render/paint_model.ts");
      const D = MD.kData();
      const r = window.__knotRenderer(), k = window.__knotFabric(), fb = window.__knotFabricRenderer(), W = fb.walk;
      const U = MD.knotUniformValues();
      const out = [];
      for (const p of r.paintState.paintPulses) {
        const e = W.edges.find((e) => e.chain === p.chain && ((e.ctrlA === p.cJunction && e.ctrlB === p.cFar) || (e.ctrlB === p.cJunction && e.ctrlA === p.cFar)));
        if (!e) continue;
        const c = PM.kChain(D, p.chain);
        const span = c.closed ? Math.abs(PM.kArcU(D, c, p.cFar) - PM.kArcU(D, c, p.cJunction)) : Math.abs(PM.kArcOfCtrl(D, c, p.cFar) - PM.kArcOfCtrl(D, c, p.cJunction));
        if (span < 0.6) continue;
        const atA = e.ctrlA === p.cJunction;
        for (const f of [0.35, 0.5, 0.65]) {
          const pt = k.runPoint(e.id, atA ? f : 1 - f);
          const d = f * span;
          const v = PM.kPulseV(U, d, span, !!p.inward, !!p.hovered, p.dist0 ?? 0, !!p.cont);
          out.push({ edge: e.id, x: pt.x, y: pt.y, v });
        }
      }
      return out;
    }, t);
    await setState(page, { t, dbg: 5, webs: true });
    await frames(page, 2);
    const shot = await page.screenshot({ type: "png" });
    const img = toRGB(decodePNG(Buffer.from(shot)));
    const dsf = 1.5; // lib.mjs openPage viewport
    for (const p of pts) {
      const x = Math.round(p.x * dsf), y = Math.round(p.y * dsf);
      if (x < 0 || y < 0 || x >= img.W || y >= img.H) continue;
      const g = img.data[(y * img.W + x) * 3 + 1];
      const dv = Math.abs(g - p.v * 255);
      n++;
      if (dv > 2) over++;
      if (dv > worst) { worst = dv; worstAt = `e${p.edge}@t${t} v=${p.v.toFixed(3)} G=${g}`; }
    }
  }
  console.log(`${STAND}: P8 samples ${n}, over 2/255: ${over}, max |dv| ${worst.toFixed(1)}/255 (${worstAt}) -> ${worst <= 2 ? "P8 PASS" : "P8 FAIL"}`);
  const errs = log.filter((l) => l.includes("pageerror"));
  if (errs.length) console.log("pageerrors:", errs.join(" | "));
} finally {
  await browser.close();
}
