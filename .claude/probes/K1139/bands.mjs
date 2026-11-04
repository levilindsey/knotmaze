// K1139 S3a: dump the pulse bands (__knotPulseBands) on the five stands
// of the plan's 4.4, and cross-check the hook against the pure model
// (pulse_path.ts pulseTree) imported in-page on the live drawn spans.
//   node bands.mjs <stand> <outDir>
// Stands copied verbatim from strips.mjs's STANDS (x4 = pre4 + &pr=8).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, sleep } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  fork: { q: Q, moves: [0], extra: "" },
  cross: { q: Q, moves: [0, 246, 82, 83, 199], extra: "" },
  src: { q: Q, moves: [0, 246, 82, 83, 199, 150], extra: "" },
  four: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180, 176], extra: "" },
  x4: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], extra: "&pr=8" },
};

const [, , STAND, OUTARG] = process.argv;
const st = STANDS[STAND];
if (!st) throw new Error(`stand ${STAND}?`);
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q + st.extra, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  const dump = await page.evaluate(async () => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const PP = await import("/src/render/pulse_path.ts");
    const D = MD.kData();
    const r = window.__knotRenderer(), fb = window.__knotFabricRenderer(), k = window.__knotFabric();
    const W = fb.walk, head = k.head, reach = r.pulseReach;
    const arrival = k.pathEdges.length ? k.pathEdges[k.pathEdges.length - 1] : -1;
    const spanOf = (e) => {
      const c = PM.kChain(D, e.chain);
      return c.closed ? Math.abs(PM.kArcU(D, c, e.ctrlB) - PM.kArcU(D, c, e.ctrlA)) : Math.abs(PM.kArcOfCtrl(D, c, e.ctrlB) - PM.kArcOfCtrl(D, c, e.ctrlA));
    };
    const spans = {};
    for (const e of W.edges) spans[e.id] = spanOf(e);
    // The renderer gates some arms (hidden / burnt / broken); the pure
    // model without gates is the cross-check's expectation only where
    // no gate bites - the stands run plain mazes, so they must agree.
    const model = PP.pulseTree(W, head, arrival, reach, (eid) => spans[eid]);
    return {
      head,
      arrival,
      reach,
      spacing: r.pulseSpacing,
      pulses: window.__knotPulses(),
      bands: window.__knotPulseBands(),
      modelBands: model.bands,
      modelItems: model.items.map((i) => ({ edge: i.edge, dist0: i.dist0, span: i.span })),
      spans,
    };
  });
  // Hook vs pure model: same bands (vertex, arms, distance, direction).
  const key = (b) => `${b.vertex}|${b.aEdge}>${b.bEdge}|${b.inward ? 1 : 0}`;
  const hookKeys = dump.bands.map(key).sort();
  const modelKeys = dump.modelBands.map(key).sort();
  const sameSet = JSON.stringify(hookKeys) === JSON.stringify(modelKeys);
  let maxDD = 0;
  const modelByKey = new Map(dump.modelBands.map((b) => [key(b), b]));
  for (const b of dump.bands) {
    const m = modelByKey.get(key(b));
    if (m) maxDD = Math.max(maxDD, Math.abs(b.distJ - m.distJ));
  }
  writeFileSync(join(OUT, `${STAND}_bands.json`), JSON.stringify({ stand: STAND, ...dump }, null, 1));
  console.log(`${STAND}: head ${dump.head} arrival e${dump.arrival} reach ${dump.reach}: ${dump.bands.length} band(s), hook==model ${sameSet}, max|dDistJ| ${maxDD.toFixed(4)}`);
  for (const b of dump.bands) {
    console.log(`  ${b.vertex}: e${b.aEdge} -> e${b.bEdge} distJ ${b.distJ.toFixed(3)} ${b.inward ? "inward" : "outward"} slot ${b.slot}${b.shared ? " (shared with gold)" : ""}${b.fallback ? " FALLBACK-B" : ""} used ${b.used}`);
  }
  const errs = log.filter((l) => l.includes("pageerror"));
  if (errs.length) console.log("pageerrors:", errs.join(" | "));
  if (!sameSet || maxDD > 1e-3) {
    console.log(`  hook/model mismatch: hook [${hookKeys.join(", ")}] model [${modelKeys.join(", ")}]`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
