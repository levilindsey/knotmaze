// K1139 S4: a stand's declared pulses (lib.mjs dumpPulses, plus the raw
// PulseArm records so S4's two-ended fields show) and its pulse bands
// (__knotPulseBands), after the stand's moves (stands_cyc.mjs).
//   node dump_cyc.mjs <outDir> <stand>...
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const [, , OUTARG, ...NAMES] = process.argv;
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const browser = await openBrowser();
try {
  for (const name of NAMES) {
    const st = STANDS[name];
    if (!st) throw new Error(`stand ${name}?`);
    const log = [];
    const page = await openPage(browser, linkOf(st), log);
    await waitAsleep(page);
    await viewStill(page);
    for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`${name}: move e${eid} refused`);
    await sleep(300);
    const decl = await dumpPulses(page);
    const extra = await page.evaluate(() => ({
      raw: window.__knotRenderer().paintState.paintPulses.map((p) => ({ ...p })),
      bands: window.__knotPulseBands(),
      head: window.__knotFabric().head,
    }));
    writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ stand: name, decl, ...extra }, null, 1));
    console.log(`${name}: head ${extra.head}, ${extra.raw.length} pulse(s), ${extra.bands.length} band(s)`);
    for (const p of decl.pulses) {
      const r = extra.raw.find((q) => q.chain === p.chain && q.cJunction === p.cJ && q.cFar === p.cF) || {};
      const two = r.two ? ` TWO dB ${(+r.dB).toFixed(3)} inwB ${!!r.inwardB}` : "";
      console.log(`  e${p.edge} ${p.near}->${p.far} dist0 ${p.dist0.toFixed(3)} world ${p.world.toFixed(3)} lat ${p.lattice.toFixed(3)} ${p.inward ? "in" : "out"}${p.cont ? " cont" : ""}${two}`);
    }
    for (const b of extra.bands) console.log(`  band ${b.vertex}: e${b.aEdge} -> e${b.bEdge} distJ ${b.distJ.toFixed(3)} ${b.inward ? "in" : "out"} slot ${b.slot}${b.fallback ? " FALLBACK" : ""}`);
    const errs = log.filter((l) => l.includes("pageerror"));
    if (errs.length) console.log("  pageerrors:", errs.join(" | "));
    await page.close();
  }
} finally {
  await browser.close();
}
