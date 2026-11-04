// K1139 S2 live checks P6/P7: on one stand, the declared pulses against the
// expected lit set. After S2 the expectation is the pure model itself,
// imported in-page (src/render/pulse_path.ts) and fed the live drawn spans;
// before S2 (or if the import fails) it is today's rule (choices + litArms
// from src/game/route_plan.ts), so the same script reads both builds.
// P6: every walk edge declared once; crest counts per arm/frame are read
// from strips.mjs's profiles by s2check.mjs. P7: declared == expected.
//   node s2live.mjs <stand> [extraLinkKeys]
// Stands copied verbatim from strips.mjs's STANDS (x4 = pre4 + &pr=8).
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, sleep } from "./lib.mjs";

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
  await sleep(300);
  const out = await page.evaluate(async () => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const D = MD.kData();
    const r = window.__knotRenderer(), fb = window.__knotFabricRenderer(), k = window.__knotFabric();
    const W = fb.walk, head = k.head, reach = r.pulseReach;
    const arrival = k.pathEdges.length ? k.pathEdges[k.pathEdges.length - 1] : -1;
    const spanOf = (e) => {
      const c = PM.kChain(D, e.chain);
      return c.closed ? Math.abs(PM.kArcU(D, c, e.ctrlB) - PM.kArcU(D, c, e.ctrlA)) : Math.abs(PM.kArcOfCtrl(D, c, e.ctrlB) - PM.kArcOfCtrl(D, c, e.ctrlA));
    };
    // Declared: the S2 hook when the build has it, else the paint state.
    let declared, source;
    if (typeof window.__knotPulses === "function") {
      declared = window.__knotPulses().map((p) => ({ edge: p.edge, dist0: p.dist0, cont: p.cont, inward: p.inward }));
      source = "__knotPulses";
    } else {
      declared = r.paintState.paintPulses.map((p) => {
        const e = W.edges.find((e) => e.chain === p.chain && ((e.ctrlA === p.cJunction && e.ctrlB === p.cFar) || (e.ctrlB === p.cJunction && e.ctrlA === p.cFar)));
        return { edge: e ? e.id : -1, dist0: p.dist0 ?? 0, cont: !!p.cont, inward: !!p.inward };
      });
      source = "paintState";
    }
    // Expected.
    let expected = null, model = "none";
    try {
      const PP = await import("/src/render/pulse_path.ts");
      const items = PP.pulsePath(W, head, arrival, reach, (eid) => spanOf(W.edges[eid]));
      expected = items.map((p) => ({ edge: p.edge, dist0: p.dist0, cont: p.cont, inward: p.inward }));
      model = "pulse_path";
    } catch {
      const RP = await import("/src/game/route_plan.ts");
      const byEdge = new Map();
      for (const lit of RP.litArms(W, head, reach)) byEdge.set(lit.edge, { edge: lit.edge, dist0: lit.dist0, cont: lit.cont, inward: false });
      for (const c of k.choices) if (!byEdge.has(c.edge)) byEdge.set(c.edge, { edge: c.edge, dist0: 0, cont: false, inward: c.edge === arrival });
      expected = [...byEdge.values()];
      model = "litArms+choices";
    }
    const dup = declared.filter((p, i) => declared.findIndex((q) => q.edge === p.edge) !== i).map((p) => p.edge);
    const dSet = new Set(declared.map((p) => p.edge)), eSet = new Set(expected.map((p) => p.edge));
    const missing = [...eSet].filter((e) => !dSet.has(e)), extra = [...dSet].filter((e) => !eSet.has(e));
    let maxD0 = 0, flagBad = [];
    if (model === "pulse_path") {
      const em = new Map(expected.map((p) => [p.edge, p]));
      for (const p of declared) {
        const e = em.get(p.edge);
        if (!e) continue;
        maxD0 = Math.max(maxD0, Math.abs(p.dist0 - e.dist0));
        if (p.cont !== e.cont || p.inward !== e.inward) flagBad.push(p.edge);
      }
    }
    return { head, arrival, reach, source, model, nDecl: declared.length, nExp: expected.length, dup, missing, extra, maxD0, flagBad };
  });
  console.log(`${STAND}: head ${out.head} arrival e${out.arrival} reach ${out.reach} via ${out.source}/${out.model}: declared ${out.nDecl}, expected ${out.nExp}, dup [${out.dup}], missing [${out.missing}], extra [${out.extra}], max|dDist0| ${out.maxD0.toFixed(4)}, flagBad [${out.flagBad}] -> ${out.dup.length === 0 && out.missing.length === 0 && out.extra.length === 0 && out.maxD0 <= 1e-3 && out.flagBad.length === 0 ? "P6/P7 PASS" : "P6/P7 FAIL"}`);
  const errs = log.filter((l) => l.includes("pageerror"));
  if (errs.length) console.log("pageerrors:", errs.join(" | "));
} finally {
  await browser.close();
}
